// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { TodayScreen } from './TodayScreen';
import { initializeDatabase } from '../../data/database';
import { saveFavorite } from '../../data/repositories';

const FAVORITE_LABEL = 'Morning Espresso';

beforeAll(async () => {
  await initializeDatabase();
  await saveFavorite({
    drinkId: 'espresso',
    sourceId: null,
    label: FAVORITE_LABEL,
    volumeMl: 30,
    caffeineMg: 64,
    sortOrder: 0,
  });
});

describe('TodayScreen favorites', () => {
  it('confirms the tap and lists the intake without waiting for the clock to tick', async () => {
    render(<TodayScreen />);

    const favoriteTile = await screen.findByRole('button', { name: new RegExp(FAVORITE_LABEL) });
    fireEvent.click(favoriteTile);

    expect(await screen.findByText('✓ Logged 64 mg')).toBeTruthy();
    // Once on the tile, once in "Today so far".
    await waitFor(() => {
      expect(screen.getAllByText(FAVORITE_LABEL)).toHaveLength(2);
    });
    expect(screen.queryByText('No caffeine logged yet today.')).toBeNull();
  });
});
