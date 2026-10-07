"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const configuredMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
// The tag ID is public by design. Keep the fallback restricted to the canonical production host
// so local development, forks, previews, and other deployments stay analytics-free by default.
const publicProductionMeasurementId = "G-ZVK91RRTTJ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean>;

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
  if (!/^G-[A-Z0-9]+$/i.test(activeMeasurementId()) || typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params ?? {});
    return;
  }

  window.dataLayer?.push(["event", eventName, params ?? {}]);
}

function currentPage(pathname: string) {
  return `${window.location.origin}${pathname || "/"}`;
}

export function GoogleAnalytics() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady) return;

    trackAnalyticsEvent("page_view", {
      page_path: pathname || "/",
      page_location: currentPage(pathname || "/"),
    });
  }, [pathname, scriptReady]);

  const measurementId = mounted ? activeMeasurementId() : "";
  if (!/^G-[A-Z0-9]+$/i.test(measurementId)) return null;

  const configScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      send_page_view: false,
      page_location: window.location.origin + window.location.pathname
    });
  `;

  return (
    <>
      <Script
        async
        id="google-analytics-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <Script id="google-analytics-config" strategy="afterInteractive">
        {configScript}
      </Script>
    </>
  );
}
