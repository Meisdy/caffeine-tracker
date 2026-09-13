/**
 * Tombstone for the service worker that used to live at this URL.
 *
 * The app moved from /caffeine-tracker/ to /caffeine-tracker/app/, but the old
 * worker stays registered on every device that installed the app before the
 * move, and its precache answers navigations to the site root — so it would go
 * on serving the old app shell in place of the landing page indefinitely.
 *
 * A browser re-fetches a registered worker's script when a page in its scope is
 * navigated to. Serving this in its place retires the old registration on the
 * next visit.
 */

self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(retire());
});

async function retire() {
  // Narrow on both sides: this origin hosts other GitHub Pages projects whose
  // caches are none of our business, and the app's own caches name the /app/
  // scope they were created under.
  const cacheKeys = await caches.keys();
  const staleKeys = cacheKeys.filter(
    (key) => key.includes('caffeine-tracker/') && !key.includes('caffeine-tracker/app/'),
  );
  await Promise.all(staleKeys.map((key) => caches.delete(key)));

  await self.registration.unregister();

  // Pages already open are still controlled by this worker, so they keep
  // showing whatever it last served until they navigate again.
  const openClients = await self.clients.matchAll({ type: 'window' });
  for (const client of openClients) {
    client.navigate(client.url);
  }
}
