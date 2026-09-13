/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { buildDailyDigest } from './dailyDigest';

declare const self: ServiceWorkerGlobalScope;

/**
 * Chrome shelved the Notification Triggers API, so a service worker cannot
 * schedule a notification for an exact future moment. Periodic Background Sync
 * is the only offline-capable wakeup available, and the browser decides when it
 * runs — roughly daily in practice. That is enough for the digest; the
 * time-critical cutoff warning is handled best-effort in the page instead.
 */
const DAILY_DIGEST_TAG = 'daily-digest';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('periodicsync', (event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag !== DAILY_DIGEST_TAG) return;
  syncEvent.waitUntil(showDigestIfNoteworthy());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openApp());
});

async function showDigestIfNoteworthy(): Promise<void> {
  const digest = await buildDailyDigest(Date.now());
  if (!digest) return;

  await self.registration.showNotification(digest.title, {
    body: digest.body,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: DAILY_DIGEST_TAG,
  });
}

async function openApp(): Promise<void> {
  const existingClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const firstClient = existingClients[0];
  if (firstClient) {
    await firstClient.focus();
    return;
  }
  await self.clients.openWindow(self.registration.scope);
}
