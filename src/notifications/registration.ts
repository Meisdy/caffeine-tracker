/**
 * Permission and background-sync wiring.
 *
 * Every capability here is optional and browser-dependent, so each step fails
 * quietly: notifications are an enhancement, and a browser without them must
 * still get a fully working tracker.
 */

const DAILY_DIGEST_TAG = 'daily-digest';
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>;
  getTags: () => Promise<string[]>;
}

export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Chrome only grants Periodic Background Sync to installed apps with enough
 * engagement, and picks the actual cadence itself. `minInterval` is a floor,
 * never a promise.
 */
export async function enableDailyDigest(): Promise<boolean> {
  if (!areNotificationsSupported() || Notification.permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  const periodicSync = (registration as ServiceWorkerRegistration & {
    periodicSync?: PeriodicSyncManager;
  }).periodicSync;
  if (!periodicSync) return false;

  try {
    await periodicSync.register(DAILY_DIGEST_TAG, { minInterval: TWELVE_HOURS_MS });
    return true;
  } catch {
    // Thrown when the app is not installed or permission was refused; neither
    // is an error worth surfacing, the digest is simply unavailable.
    return false;
  }
}
