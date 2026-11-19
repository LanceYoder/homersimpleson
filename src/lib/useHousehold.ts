"use client";

import { useMemo } from "react";
import { sampleEvents } from "./household/sample";
import { dateKey, householdState, type HouseholdState } from "./household/state";
import type { StoredData } from "./household/types";
import { useNow } from "./useNow";

/**
 * The household state for this device's clock: stored data from the database
 * plus the calendar (sample events until the real one is connected).
 * Null until the device's time is known.
 */
export function useHousehold(stored: StoredData): HouseholdState | null {
  const now = useNow();
  const dayKey = now ? dateKey(now) : null;
  // Sample events only change when the day does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const events = useMemo(() => (now ? sampleEvents(now) : []), [dayKey]);
  return now ? householdState(now, { ...stored, events }) : null;
}
