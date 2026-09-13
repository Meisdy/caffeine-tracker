// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import App from './App';
import { initializeDatabase } from './data/database';
import { logIntake } from './data/repositories';

/**
 * A render smoke test, not a behavioural one.
 *
 * The model is covered by the pure tests in `domain/`; what those cannot catch
 * is a screen that throws on first paint. Mounting every tab against a real
 * (in-memory) database is the cheapest way to prove the app actually starts.
 */

const TAB_NAMES = ['Today', 'Log', 'History', 'Insights', 'Profile'] as const;

beforeAll(async () => {
  await initializeDatabase();
  await logIntake({ caffeineMg: 80, label: 'Espresso', takenAt: Date.now() - 45 * 60 * 1000 });
});

describe('App', () => {
  it('mounts and renders every screen without throwing', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText('Main navigation')).toBeTruthy();
    });

    // Scoped to the nav: screens have their own buttons whose labels would
    // otherwise collide with the tab names.
    const tabBar = within(screen.getByLabelText('Main navigation'));

    for (const tabName of TAB_NAMES) {
      await user.click(tabBar.getByRole('button', { name: new RegExp(tabName) }));
      await waitFor(() => {
        expect(
          tabBar.getByRole('button', { name: new RegExp(tabName) }).getAttribute('aria-current'),
        ).toBe('page');
      });
    }
  });

  it('shows the logged intake on the Today screen', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText(/Espresso/).length).toBeGreaterThan(0);
    });
  });
});
