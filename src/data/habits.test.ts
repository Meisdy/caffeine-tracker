// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, initializeDatabase } from './database';
import { exportToJson, importFromJson } from './backup';
import { deleteFavorite, listHabits, saveFavorite, saveHabit, skipHabitOn } from './repositories';

beforeEach(async () => {
  await database.delete();
  await database.open();
  await initializeDatabase();
});

async function saveEspressoFavorite() {
  return saveFavorite({
    drinkId: null,
    sourceId: null,
    label: 'Espresso, work',
    volumeMl: 30,
    caffeineMg: 64,
    sortOrder: 0,
  });
}

describe('habits', () => {
  it('are removed together with their favorite', async () => {
    const favorite = await saveEspressoFavorite();
    const other = await saveFavorite({ ...favorite, id: undefined, label: 'Tea' });
    await saveHabit({ favoriteId: favorite.id, weekdays: [1], minutesSinceMidnight: 600, skippedOn: null });
    await saveHabit({ favoriteId: other.id, weekdays: [1], minutesSinceMidnight: 900, skippedOn: null });

    await deleteFavorite(favorite.id);

    const remaining = await listHabits();
    expect(remaining.map((habit) => habit.favoriteId)).toEqual([other.id]);
  });

  it('remember a skip for one day', async () => {
    const favorite = await saveEspressoFavorite();
    const habit = await saveHabit({ favoriteId: favorite.id, weekdays: [1], minutesSinceMidnight: 600, skippedOn: null });

    await skipHabitOn(habit.id, '2026-01-15');

    expect((await listHabits())[0]?.skippedOn).toBe('2026-01-15');
  });

  it('survive a backup round trip', async () => {
    const favorite = await saveEspressoFavorite();
    await saveHabit({ favoriteId: favorite.id, weekdays: [1, 2], minutesSinceMidnight: 600, skippedOn: null });
    const json = await exportToJson();

    await database.habits.clear();
    await importFromJson(json);

    expect(await listHabits()).toHaveLength(1);
  });

  it('import from a backup made before habits existed', async () => {
    const { habits: _habits, ...legacyBackup } = JSON.parse(await exportToJson());

    await importFromJson(JSON.stringify(legacyBackup));

    expect(await listHabits()).toEqual([]);
  });
});
