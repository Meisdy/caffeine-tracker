// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { HistoryScreen } from './HistoryScreen';
import { initializeDatabase } from '../../data/database';
import { logIntake } from '../../data/repositories';
import { DAY_MS } from '../../domain/time';
import { formatShortDate } from '../lib/date';

const yesterdayMs = Date.now() - DAY_MS;

beforeAll(async () => {
  await initializeDatabase();
  await logIntake({ caffeineMg: 120, label: 'Filter coffee', takenAt: yesterdayMs });
});

describe('HistoryScreen day curve', () => {
  it('starts on today and steps back to the previous day', async () => {
    render(<HistoryScreen />);

    expect(await screen.findByText('Caffeine curve · Today')).toBeTruthy();
    const previousDayButton = await screen.findByRole<HTMLButtonElement>('button', { name: 'Previous day' });
    // It stays disabled until the intake history has loaded.
    await waitFor(() => expect(previousDayButton.disabled).toBe(false));
    fireEvent.click(previousDayButton);

    expect(await screen.findByText(`Caffeine curve · ${formatShortDate(yesterdayMs)}`)).toBeTruthy();
    expect(await screen.findByText(/^120 mg · peak/)).toBeTruthy();
  });

  it('jumps to a day when its bar is tapped', async () => {
    render(<HistoryScreen />);

    fireEvent.click(await screen.findByRole('button', { name: /Show curve for .*, 120 mg/ }));

    expect(await screen.findByText(`Caffeine curve · ${formatShortDate(yesterdayMs)}`)).toBeTruthy();
  });
});
