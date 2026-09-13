// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { database, initializeDatabase } from './database';
import { SEED_DRINKS } from './seedDrinks';
import { saveCustomDrink, saveFavorite } from './repositories';

/**
 * The catalog has to stay correctable after release: installs are long-lived
 * and updates arrive silently, so a fix that only applied on first run would
 * never reach anyone already using the app.
 */

beforeEach(async () => {
  await database.delete();
  await database.open();
});

describe('initializeDatabase', () => {
  it('seeds the catalog on a fresh database', async () => {
    await initializeDatabase();
    expect(await database.drinks.count()).toBe(SEED_DRINKS.length);
  });

  it('is idempotent', async () => {
    await initializeDatabase();
    await initializeDatabase();
    expect(await database.drinks.count()).toBe(SEED_DRINKS.length);
  });

  it('removes a seeded drink that is no longer shipped', async () => {
    await initializeDatabase();
    await database.drinks.put({
      id: 'decaf-coffee',
      name: 'Decaf Coffee',
      category: 'coffee',
      defaultVolumeMl: 240,
      mgPer100Ml: 1.5,
      fixedMg: null,
      isSeeded: true,
    });

    await initializeDatabase();

    expect(await database.drinks.get('decaf-coffee')).toBeUndefined();
  });

  it('keeps a withdrawn drink that a favorite still points at', async () => {
    await initializeDatabase();
    await database.drinks.put({
      id: 'milk-chocolate',
      name: 'Milk Chocolate (100g)',
      category: 'chocolate',
      defaultVolumeMl: null,
      mgPer100Ml: null,
      fixedMg: 20,
      isSeeded: true,
    });
    await saveFavorite({
      drinkId: 'milk-chocolate',
      sourceId: null,
      label: 'Chocolate',
      volumeMl: null,
      caffeineMg: 20,
      sortOrder: 0,
    });

    await initializeDatabase();

    expect(await database.drinks.get('milk-chocolate')).toBeDefined();
  });

  it('never overwrites a drink the user has edited', async () => {
    await initializeDatabase();
    await saveCustomDrink({
      id: 'espresso',
      name: 'Espresso (my machine)',
      category: 'coffee',
      defaultVolumeMl: 30,
      mgPer100Ml: 300,
      fixedMg: null,
    });

    await initializeDatabase();

    const espresso = await database.drinks.get('espresso');
    expect(espresso?.name).toBe('Espresso (my machine)');
    expect(espresso?.mgPer100Ml).toBe(300);
  });

  it('applies a corrected value to an untouched seeded drink', async () => {
    await initializeDatabase();
    await database.drinks.update('americano', { mgPer100Ml: 999 });

    await initializeDatabase();

    const shipped = SEED_DRINKS.find((drink) => drink.id === 'americano');
    expect((await database.drinks.get('americano'))?.mgPer100Ml).toBe(shipped?.mgPer100Ml);
  });
});
