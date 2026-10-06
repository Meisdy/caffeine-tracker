// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, initializeDatabase } from './database';
import { exportToJson, importFromJson } from './backup';
import { getProfile, listProfileHistory, saveProfile } from './repositories';
import { localDayKey } from '../domain/time';

beforeEach(async () => {
  await database.delete();
  await database.open();
  await initializeDatabase();
});

describe('profile history', () => {
  it('starts with the current profile as the earliest snapshot', async () => {
    const history = await listProfileHistory();
    expect(history).toEqual([{ effectiveFrom: localDayKey(Date.now()), profile: await getProfile() }]);
  });

  it('keeps one snapshot per day, holding the last save', async () => {
    const profile = await getProfile();
    await saveProfile({ ...profile, weightKg: 60 });
    await saveProfile({ ...profile, weightKg: 62 });

    const history = await listProfileHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.profile.weightKg).toBe(62);
  });

  it('survives a backup round trip', async () => {
    await database.profileHistory.put({ effectiveFrom: '2026-01-01', profile: await getProfile() });
    const backup = await exportToJson();

    await database.profileHistory.clear();
    await importFromJson(backup);

    expect(await listProfileHistory()).toHaveLength(2);
  });
});
