// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CurveChart, firstDownwardCrossing, levelAt } from './CurveChart';
import { HOUR_MS } from '../../domain/time';
import type { CurvePoint } from '../../domain/types';
import { formatClockTime } from '../lib/date';

const noon = new Date('2026-01-15T12:00:00').getTime();

// Falls 1 mg/L per hour from 6 mg/L at noon, so it crosses 2 mg/L at 16:00.
const fallingCurve: CurvePoint[] = Array.from({ length: 7 }, (_, hour) => ({
  at: noon + hour * HOUR_MS,
  concentrationMgPerL: 6 - hour,
}));

function renderChart() {
  return render(
    <CurveChart
      curve={fallingCurve}
      intakes={[]}
      fromMs={noon}
      toMs={noon + 6 * HOUR_MS}
      nowMs={noon}
      bedtimeAtMs={noon + 10 * HOUR_MS}
      sleepThresholdMgPerL={2}
      currentConcentrationMgPerL={6}
    />,
  );
}

afterEach(cleanup);

describe('firstDownwardCrossing', () => {
  it('interpolates the time the level drops to the threshold', () => {
    expect(firstDownwardCrossing(fallingCurve, 2.5)).toBe(noon + 3.5 * HOUR_MS);
  });

  it('is null when the level never starts above the threshold', () => {
    expect(firstDownwardCrossing(fallingCurve, 7)).toBeNull();
  });

  it('is null when the level stays above the threshold', () => {
    expect(firstDownwardCrossing(fallingCurve, -1)).toBeNull();
  });
});

describe('levelAt', () => {
  it('interpolates between samples and holds the edges', () => {
    expect(levelAt(fallingCurve, noon + 1.5 * HOUR_MS)).toBe(4.5);
    expect(levelAt(fallingCurve, noon - HOUR_MS)).toBe(6);
    expect(levelAt(fallingCurve, noon + 9 * HOUR_MS)).toBe(0);
  });
});

describe('CurveChart', () => {
  it('marks when the level falls below the threshold', () => {
    renderChart();

    expect(screen.getByText(`↓ ${formatClockTime(noon + 4 * HOUR_MS)}`)).toBeTruthy();
  });

  it('shows a time and level readout while a pointer is on the chart', () => {
    renderChart();
    const chart = screen.getByRole('img');
    chart.getBoundingClientRect = () => ({ left: 0, width: 320 }) as DOMRect;

    // x = 160 is the middle of the plot, i.e. 15:00 at 3 mg/L.
    fireEvent.pointerDown(chart, { clientX: 160 });
    expect(screen.getByText(`${formatClockTime(noon + 3 * HOUR_MS)} · 3.0 mg/L`)).toBeTruthy();

    fireEvent.pointerLeave(chart);
    expect(screen.queryByText(/· 3\.0 mg\/L/)).toBeNull();
  });
});
