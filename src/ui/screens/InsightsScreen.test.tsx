// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { InsightsScreen } from './InsightsScreen';
import { initializeDatabase } from '../../data/database';

beforeAll(async () => {
  await initializeDatabase();
});

describe('InsightsScreen with an empty history', () => {
  it('explains that there are no nights to judge yet', async () => {
    render(<InsightsScreen />);

    expect(await screen.findByText(/No nights to judge yet/)).toBeTruthy();
  });
});
