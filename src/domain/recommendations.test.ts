import { describe, expect, it } from 'vitest';
import { buildRecommendations } from './recommendations';
import { HOUR_MS } from './time';
import type { AdvisorSnapshot } from './types';

const now = new Date('2026-01-15T10:00:00').getTime();

function makeSnapshot(overrides: Partial<AdvisorSnapshot> = {}): AdvisorSnapshot {
  return {
    now,
    reading: { phase: 'productive', concentrationMgPerL: 3, slopeMgPerLPerHour: 0 },
    bedtimeAt: new Date('2026-01-15T23:00:00').getTime(),
    projectedLevelAtBedtimeMgPerL: 0.2,
    sleepDisruptionThresholdMgPerL: 1,
    cutoffAt: new Date('2026-01-15T16:00:00').getTime(),
    todayTotalMg: 100,
    baseline: {
      dailyTotals: [],
      meanMgPerDay: 100,
      standardDeviationMg: 0,
      meanByWeekday: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      daysOfHistory: 0,
    },
    deviation: 'insufficientHistory',
    tolerance: { weightedDailyMg: 100, index: 0.25 },
    withdrawalRisk: 'none',
    lastIntakeAt: now - HOUR_MS,
    isPregnant: false,
    recentDoseMg: 0,
    upcomingPeak: { at: now, concentrationMgPerL: 3 },
    jitterThresholdMgPerL: 8,
    ...overrides,
  };
}

function idsFor(overrides: Partial<AdvisorSnapshot>): string[] {
  return buildRecommendations(makeSnapshot(overrides)).map((recommendation) => recommendation.id);
}

describe('buildRecommendations', () => {
  it('warns once today goes past the 400 mg daily reference', () => {
    expect(idsFor({ todayTotalMg: 450 })).toContain('daily-limit-exceeded');
    expect(idsFor({ todayTotalMg: 350 })).not.toContain('daily-limit-exceeded');
  });

  it('uses the 200 mg pregnancy limit for both today and the habit', () => {
    const [topRecommendation] = buildRecommendations(makeSnapshot({ isPregnant: true, todayTotalMg: 250 }));
    expect(topRecommendation?.id).toBe('daily-limit-exceeded');
    expect(topRecommendation?.message).toContain('200 mg');

    expect(idsFor({ isPregnant: true, baseline: { ...makeSnapshot().baseline, meanMgPerDay: 250 } })).toContain(
      'sustained-high-intake',
    );
  });

  it('does not repeat an unusually high day on top of the daily limit warning', () => {
    expect(idsFor({ todayTotalMg: 500, deviation: 'unusuallyHigh' })).not.toContain('unusually-high');
  });

  it('flags drinks stacked above the 200 mg single-dose reference', () => {
    expect(idsFor({ recentDoseMg: 240 })).toContain('large-single-dose');
    expect(idsFor({ recentDoseMg: 180 })).not.toContain('large-single-dose');
  });

  it('warns about a coming peak above the jitter threshold', () => {
    const comingPeak = { at: now + HOUR_MS, concentrationMgPerL: 9 };
    expect(idsFor({ upcomingPeak: comingPeak })).toContain('overload-coming');
  });

  it('stays quiet about a coming peak once already overloaded', () => {
    const overloaded = makeSnapshot().reading;
    expect(
      idsFor({
        reading: { ...overloaded, phase: 'overloaded' },
        upcomingPeak: { at: now + HOUR_MS, concentrationMgPerL: 9 },
      }),
    ).not.toContain('overload-coming');
  });
});
