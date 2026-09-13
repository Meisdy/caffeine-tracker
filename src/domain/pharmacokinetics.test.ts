import { describe, expect, it } from 'vitest';
import { concentrationAt, curveOverWindow, slopeAt } from './pharmacokinetics';
import { makeIntake, makeProfile } from './testFixtures';
import { HOUR_MS, MINUTE_MS } from './time';

const profile = makeProfile();
const noon = new Date('2026-01-15T12:00:00').getTime();

describe('concentrationAt', () => {
  it('is zero before the drink was taken', () => {
    const intakes = [makeIntake(noon, 100)];
    expect(concentrationAt(intakes, noon - MINUTE_MS, profile)).toBe(0);
    expect(concentrationAt(intakes, noon, profile)).toBe(0);
  });

  it('peaks near 2.1 mg/L about 45 minutes after 100 mg in a 70 kg adult', () => {
    const intakes = [makeIntake(noon, 100)];
    const curve = curveOverWindow(intakes, noon, noon + 3 * HOUR_MS, 1, profile);

    const peak = curve.reduce((highest, point) =>
      point.concentrationMgPerL > highest.concentrationMgPerL ? point : highest,
    );
    const minutesToPeak = (peak.at - noon) / MINUTE_MS;

    expect(peak.concentrationMgPerL).toBeGreaterThan(1.9);
    expect(peak.concentrationMgPerL).toBeLessThan(2.4);
    expect(minutesToPeak).toBeGreaterThan(35);
    expect(minutesToPeak).toBeLessThan(55);
  });

  it('halves over one half-life once absorption is finished', () => {
    const intakes = [makeIntake(noon, 100)];
    const early = concentrationAt(intakes, noon + 6 * HOUR_MS, profile);
    const oneHalfLifeLater = concentrationAt(intakes, noon + 11 * HOUR_MS, profile);

    expect(oneHalfLifeLater / early).toBeCloseTo(0.5, 2);
  });

  it('superposes doses linearly', () => {
    const twoSmall = [makeIntake(noon, 100), makeIntake(noon, 100)];
    const oneLarge = [makeIntake(noon, 200)];
    const at = noon + 90 * MINUTE_MS;

    expect(concentrationAt(twoSmall, at, profile)).toBeCloseTo(
      concentrationAt(oneLarge, at, profile),
      10,
    );
  });

  it('scales inversely with body weight', () => {
    const intakes = [makeIntake(noon, 100)];
    const at = noon + 2 * HOUR_MS;
    const lighter = concentrationAt(intakes, at, makeProfile({ weightKg: 55 }));
    const heavier = concentrationAt(intakes, at, makeProfile({ weightKg: 95 }));

    expect(lighter).toBeGreaterThan(heavier);
  });
});

describe('slopeAt', () => {
  it('is positive while absorbing and negative once past the peak', () => {
    const intakes = [makeIntake(noon, 100)];
    expect(slopeAt(intakes, noon + 10 * MINUTE_MS, profile)).toBeGreaterThan(0);
    expect(slopeAt(intakes, noon + 3 * HOUR_MS, profile)).toBeLessThan(0);
  });

  it('matches a numeric derivative of the curve', () => {
    const intakes = [makeIntake(noon, 150)];
    const at = noon + 2 * HOUR_MS;
    const step = MINUTE_MS;

    const numeric =
      ((concentrationAt(intakes, at + step, profile) -
        concentrationAt(intakes, at - step, profile)) /
        (2 * step)) *
      HOUR_MS;

    expect(slopeAt(intakes, at, profile)).toBeCloseTo(numeric, 4);
  });
});

describe('curveOverWindow', () => {
  it('rejects a non-positive step', () => {
    expect(() => curveOverWindow([], noon, noon + HOUR_MS, 0, profile)).toThrow();
  });
});
