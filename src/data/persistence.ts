/**
 * Marks the database as persistent so the browser stops treating it as cache.
 *
 * Storage is device-only, so an eviction under storage pressure would destroy
 * the intake history outright — and the habit insights are precisely the part
 * that needs months of it. Chrome grants this silently for installed apps and
 * refuses it elsewhere, so a refusal is normal and never surfaced as an error.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  return navigator.storage.persisted();
}
