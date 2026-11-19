"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/**
 * `?at=2026-11-14T18:00` pins the clock, to preview how the screen looks at
 * another time. Read once per page load.
 */
function previewTime(): number | null {
  const at = new URLSearchParams(window.location.search).get("at");
  if (!at) return null;
  const t = new Date(at).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Ticks on each minute boundary, and whenever the app comes back to the front. */
function subscribe(onChange: () => void) {
  let id: number;
  const arm = () => {
    id = window.setTimeout(() => {
      onChange();
      arm();
    }, MINUTE - (Date.now() % MINUTE) + 50);
  };
  const wake = () => {
    window.clearTimeout(id);
    arm();
    onChange();
  };
  arm();
  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pageshow", wake);
  window.addEventListener("focus", wake);
  return () => {
    window.clearTimeout(id);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("pageshow", wake);
    window.removeEventListener("focus", wake);
  };
}

function snapshot(): number {
  return previewTime() ?? Math.floor(Date.now() / MINUTE) * MINUTE;
}

/**
 * The current time on this device, to the minute. Null while rendering on the
 * server, which does not know the device's clock or time zone.
 */
export function useNow(): Date | null {
  const t = useSyncExternalStore<number | null>(subscribe, snapshot, () => null);
  return t === null ? null : new Date(t);
}
