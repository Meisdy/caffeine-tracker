import { describe, expect, it } from 'vitest';
import { dayWindow, profileOnDay, summarizeDay } from './dayHistory';
import { makeIntake, makeProfile } from './testFixtures';
import { HOUR_MS } from './time';

const profile = makeProfile();
const dayStart = new Date('2026-01-15T00:00:00').getTime();
const nextDayStart = new Date('2026-01-16T00:00:00').getTime();

describe('dayWindow', () => {
  it('runs from midnight to midnight when sleep onset ends before then', () => {
    const early = makeProfile({ bedtimeByWeekday: { 0: 1320, 1: 1320, 2: 1320, 3: 1320, 4: 1320, 5: 1320, 6: 1320 } });
    expect(dayWindow(early, dayStart)).toEqual({
      fromMs: dayStart,
      toMs: nextDayStart,
      bedtimeAt: new Date('2026-01-15T22:00:00').getTime(),
    });
  });

  it('extends past midnight to cover the sleep-onset window', () => {
    const window = dayWindow(profile, dayStart);
    expect(window.bedtimeAt).toBe(new Date('2026-01-15T23:00:00').getTime());
    expect(window.toMs).toBe(new Date('2026-01-16T00:30:00').getTime());
  });

  it('ends at the next calendar midnight on a daylight-saving day', () => {
    const early = makeProfile({ bedtimeByWeekday: { 0: 1320, 1: 1320, 2: 1320, 3: 1320, 4: 1320, 5: 1320, 6: 1320 } });
    const springForward = new Date('2026-03-29T00:00:00').getTime();
    expect(dayWindow(early, springForward).toMs).toBe(new Date('2026-03-30T00:00:00').getTime());
  });
});

describe('summarizeDay', () => {
  it('includes carry-over from the evening before in the curve but not in the total', () => {
    const lateLastNight = makeIntake(dayStart - 2 * HOUR_MS, 200);
    const summary = summarizeDay([lateLastNight], profile, dayWindow(profile, dayStart));
    expect(summary.totalMg).toBe(0);
    expect(summary.peak.concentrationMgPerL).toBeGreaterThan(0);
  });

  it('flags a night whose sleep onset is over the threshold', () => {
    const eveningCoffee = makeIntake(new Date('2026-01-15T21:00:00').getTime(), 150);
    const summary = summarizeDay([eveningCoffee], profile, dayWindow(profile, dayStart));
    expect(summary.totalMg).toBe(150);
    expect(summary.isOverSleepThreshold).toBe(true);
  });

  it('leaves a night clear after a morning coffee', () => {
    const morningCoffee = makeIntake(new Date('2026-01-15T08:00:00').getTime(), 80);
    const summary = summarizeDay([morningCoffee], profile, dayWindow(profile, dayStart));
    expect(summary.isOverSleepThreshold).toBe(false);
    expect(summary.peak.at).toBeGreaterThan(morningCoffee.takenAt);
  });
});

describe('profileOnDay', () => {
  const light = makeProfile({ weightKg: 60 });
  const heavy = makeProfile({ weightKg: 90 });
  const snapshots = [
    { effectiveFrom: '2026-01-20', profile: heavy },
    { effectiveFrom: '2026-01-10', profile: light },
  ];

  it('picks the latest snapshot in effect on that day', () => {
    expect(profileOnDay(snapshots, dayStart)).toBe(light);
    expect(profileOnDay(snapshots, new Date('2026-01-20T00:00:00').getTime())).toBe(heavy);
  });

  it('falls back to the oldest snapshot for days before any was recorded', () => {
    expect(profileOnDay(snapshots, new Date('2026-01-01T00:00:00').getTime())).toBe(light);
  });

  it('returns null without any snapshot', () => {
    expect(profileOnDay([], dayStart)).toBeNull();
  });
});
