// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { LogScreen } from './LogScreen';
import { initializeDatabase } from '../../data/database';
import { listFavorites } from '../../data/repositories';

beforeAll(async () => {
  await initializeDatabase();
});

describe('LogScreen custom intake', () => {
  it('saves an exact dose as a favorite with no catalog drink behind it', async () => {
    render(<LogScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Espresso — work Eversys' } });
    fireEvent.change(screen.getByLabelText(/Dose/), { target: { value: '95' } });
    fireEvent.click(screen.getByLabelText('Save as favorite'));
    fireEvent.click(screen.getByRole('button', { name: 'Log intake' }));

    await waitFor(async () => {
      const favorites = await listFavorites();
      expect(favorites).toMatchObject([
        { label: 'Espresso — work Eversys', caffeineMg: 95, drinkId: null, volumeMl: null },
      ]);
    });
  });
});
