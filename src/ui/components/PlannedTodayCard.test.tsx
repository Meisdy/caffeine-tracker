// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlannedTodayCard } from './PlannedTodayCard';
import type { PendingHabit } from '../../domain/habits';

const now = new Date('2026-01-15T11:00:00').getTime();
const overdueEntry: PendingHabit = {
  habit: { id: 'habit-1', favoriteId: 'fav', weekdays: [4], minutesSinceMidnight: 600, skippedOn: null },
  label: 'Espresso, work',
  caffeineMg: 64,
  scheduledAt: new Date('2026-01-15T10:00:00').getTime(),
};

afterEach(cleanup);

function renderCard(pending: PendingHabit[], overrides: Partial<Parameters<typeof PlannedTodayCard>[0]> = {}) {
  return render(
    <PlannedTodayCard
      pending={pending}
      nowMs={now}
      countInForecast
      onToggleCountInForecast={() => {}}
      onLog={() => {}}
      onSkip={() => {}}
      {...overrides}
    />,
  );
}

describe('PlannedTodayCard', () => {
  it('renders nothing when no habit is pending', () => {
    const { container } = renderCard([]);

    expect(container.firstChild).toBeNull();
  });

  it('marks an overdue habit and reports log and skip taps', () => {
    const onLog = vi.fn();
    const onSkip = vi.fn();
    renderCard([overdueEntry], { onLog, onSkip });

    expect(screen.getByText(/overdue/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Log' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onLog).toHaveBeenCalledWith(overdueEntry);
    expect(onSkip).toHaveBeenCalledWith(overdueEntry);
  });

  it('reports the forecast toggle', () => {
    const onToggleCountInForecast = vi.fn();
    renderCard([overdueEntry], { onToggleCountInForecast });

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onToggleCountInForecast).toHaveBeenCalledWith(false);
  });
});
