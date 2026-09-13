import { useCallback, useEffect, useState } from 'react';

const TICK_INTERVAL_MS = 30_000;

/**
 * A clock that updates every 30 seconds — enough to keep the decay curve and phase live.
 * Call `refreshNow` after logging: queries bounded by `now` would otherwise miss the new
 * entry until the next tick.
 */
export function useNow(): [now: number, refreshNow: () => void] {
  const [now, setNow] = useState(() => Date.now());
  const refreshNow = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const intervalId = setInterval(refreshNow, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refreshNow]);

  return [now, refreshNow];
}
