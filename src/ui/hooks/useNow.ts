import { useEffect, useState } from 'react';

const TICK_INTERVAL_MS = 30_000;

/** A clock that updates every 30 seconds — enough to keep the decay curve and phase live. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return now;
}
