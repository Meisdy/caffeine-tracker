import { MINUTE_MS } from '../domain/time';

/**
 * Best-effort cutoff warning.
 *
 * An installed PWA cannot guarantee a notification at an exact future time, so
 * this fires from the page instead: once when the app is opened or brought
 * forward inside the warning window, and once from a timer while a tab happens
 * to be alive. The cutoff time itself is always rendered on the Today screen,
 * which is the part that is never allowed to be unreliable.
 */
const WARNING_WINDOW_MS = 30 * MINUTE_MS;
const CUTOFF_TAG = 'cutoff-warning';

export interface CutoffWatcher {
  stop: () => void;
}

export function startCutoffWatcher(getCutoffAt: () => number | null): CutoffWatcher {
  let timerId: number | undefined;
  let lastWarnedCutoffAt: number | null = null;

  const warnIfDue = (): void => {
    const cutoffAt = getCutoffAt();
    if (cutoffAt === null || cutoffAt === lastWarnedCutoffAt) return;

    const millisecondsUntilCutoff = cutoffAt - Date.now();
    if (millisecondsUntilCutoff > WARNING_WINDOW_MS || millisecondsUntilCutoff < 0) return;

    lastWarnedCutoffAt = cutoffAt;
    void showCutoffNotification(cutoffAt);
  };

  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') warnIfDue();
  };

  warnIfDue();
  timerId = window.setInterval(warnIfDue, MINUTE_MS);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    stop: () => {
      window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    },
  };
}

async function showCutoffNotification(cutoffAt: number): Promise<void> {
  if (Notification.permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  const clockTime = new Date(cutoffAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  await registration.showNotification('Caffeine cutoff approaching', {
    body: `After ${clockTime}, another coffee is projected to still be with you at bedtime.`,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: CUTOFF_TAG,
  });
}
