"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createGtagQueue } from "@/lib/analytics-queue";

const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
// The tag ID is public by design. Keep the fallback restricted to the canonical production host
// so local development, forks, previews, and other deployments stay analytics-free by default.
const publicProductionMeasurementId = "G-ZVK91RRTTJ";
const exclusionStorageKey = "codex-study-club:analytics-excluded";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    codexStudyClubAnalyticsExcluded?: boolean;
    codexStudyClubAnalyticsPreviousDisabled?: boolean;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

type EventParams = Record<string, string | number | boolean>;

function analyticsExcluded() {
  if (typeof window === "undefined") return false;
  const preference = new URLSearchParams(window.location.search).get("analytics");
  if (preference === "off") return true;
  if (preference === "on") return false;
  if (window.codexStudyClubAnalyticsExcluded !== undefined) {
    return window.codexStudyClubAnalyticsExcluded;
  }
  try {
    return window.sessionStorage.getItem(exclusionStorageKey) === "1";
  } catch {
    return false;
  }
}

function syncAnalyticsExclusion(measurementId: string, excluded: boolean) {
  const wasExcluded = window.codexStudyClubAnalyticsExcluded === true;
  try {
    if (excluded) window.sessionStorage.setItem(exclusionStorageKey, "1");
    else window.sessionStorage.removeItem(exclusionStorageKey);
  } catch {
    // Keep the preference for client navigation even when tab storage is unavailable.
  }
  if (/^G-[A-Z0-9]+$/i.test(measurementId)) {
    const disableKey = `ga-disable-${measurementId}` as const;
    if (excluded) {
      if (!wasExcluded) window.codexStudyClubAnalyticsPreviousDisabled = window[disableKey];
      window[disableKey] = true;
    } else if (wasExcluded) {
      window[disableKey] = window.codexStudyClubAnalyticsPreviousDisabled ?? false;
      delete window.codexStudyClubAnalyticsPreviousDisabled;
    }
  }
  window.codexStudyClubAnalyticsExcluded = excluded;
  if (excluded) {
    document.documentElement.dataset.analyticsExcluded = "true";
    delete document.documentElement.dataset.analyticsReady;
  } else {
    delete document.documentElement.dataset.analyticsExcluded;
  }
}

function activeMeasurementId() {
  if (configuredMeasurementId) return configuredMeasurementId;
  if (typeof window !== "undefined" && window.location.hostname === "codex.modelsp.com") {
    return publicProductionMeasurementId;
  }
  return "";
}

/**
 * Send a small, non-content event when GA4 is enabled for the canonical host or by env.
 * Never pass prompts, assistant responses, or query strings to this helper.
 */
export function trackAnalyticsEvent(eventName: string, params?: EventParams) {
  if (!/^G-[A-Z0-9]+$/i.test(activeMeasurementId()) || typeof window === "undefined" || analyticsExcluded()) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params ?? {});
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = createGtagQueue(window.dataLayer);
  window.gtag("event", eventName, params ?? {});
}

function currentPage(pathname: string) {
  return `${window.location.origin}${pathname || "/"}`;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const measurementId = mounted ? activeMeasurementId() : "";
  const excluded = mounted && analyticsExcluded();
  const preference = searchParams.get("analytics");
  const initialized = useRef(false);

  useEffect(() => {
    if (!mounted) return;
    syncAnalyticsExclusion(measurementId, excluded);
    if (excluded) return;
    if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return;

    if (!initialized.current) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || createGtagQueue(window.dataLayer);
      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        send_page_view: false,
        page_location: currentPage(pathname || "/"),
      });
      initialized.current = true;
    }

    document.documentElement.dataset.analyticsReady = "true";
    trackAnalyticsEvent("page_view", {
      page_path: pathname || "/",
      page_location: currentPage(pathname || "/"),
    });
  }, [measurementId, pathname, mounted, excluded, preference]);

  if (excluded || !/^G-[A-Z0-9]+$/i.test(measurementId)) return null;

  return (
    <>
      <Script
        async
        id="google-analytics-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
