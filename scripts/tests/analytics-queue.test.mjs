import assert from "node:assert/strict";
import test from "node:test";
import { createGtagQueue } from "../../lib/analytics-queue.ts";

test("gtag queues arguments objects in order without replacing existing entries", () => {
  const existing = { event: "existing" };
  const dataLayer = [existing];
  const gtag = createGtagQueue(dataLayer);
  const startedAt = new Date("2026-10-15T01:00:00Z");
  const config = { send_page_view: false };
  const event = { page_path: "/cases/example" };
  gtag("js", startedAt);
  gtag("config", "G-TEST", config);
  gtag("event", "page_view", event);

  assert.equal(dataLayer[0], existing);
  assert.equal(dataLayer.length, 4);
  for (const command of dataLayer.slice(1)) {
    assert.equal(Object.prototype.toString.call(command), "[object Arguments]");
    assert.equal(Array.isArray(command), false);
  }
  assert.deepEqual(Array.from(dataLayer[1]), ["js", startedAt]);
  assert.deepEqual(Array.from(dataLayer[2]), ["config", "G-TEST", config]);
  assert.deepEqual(Array.from(dataLayer[3]), ["event", "page_view", event]);
});
