// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { TodayScreen } from './TodayScreen';
import { initializeDatabase } from '../../data/database';

/**
 * First run: a seeded catalog, a default profile, and nothing logged. This is
 * the state every new install starts in, so it must render real content rather
 * than sitting on the loading placeholder.
 */

beforeAll(async () => {
  await initializeDatabase();
});

describe('TodayScreen with an empty history', () => {
  it('leaves the loading state and shows a zero level', async () => {
    render(<TodayScreen />);

    // `mg/L` also appears inside the chart's threshold label, so match all.
    await waitFor(() => {
      expect(screen.getAllByText(/mg\/L/).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('Loading…')).toBeNull();
    expect(screen.getByText('0.0')).toBeTruthy();
  });

  it('shows the empty state for today rather than an empty list', async () => {
    render(<TodayScreen />);

    await waitFor(() => {
      expect(screen.getAllByText('No caffeine logged yet today.').length).toBeGreaterThan(0);
    });
  });

  it('renders the curve chart with an accessible label', async () => {
    render(<TodayScreen />);

    await waitFor(() => {
      expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
    });
  });
});
