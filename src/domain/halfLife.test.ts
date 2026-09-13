import { describe, expect, it } from 'vitest';
import { MAX_HALF_LIFE_HOURS, MIN_HALF_LIFE_HOURS } from './constants';
import { halfLifeFactorsFor, personalHalfLifeHours, volumeOfDistributionLitres } from './halfLife';
import { makeProfile } from './testFixtures';

describe('personalHalfLifeHours', () => {
  it('returns the population baseline for an unmodified adult', () => {
    expect(personalHalfLifeHours(makeProfile())).toBeCloseTo(5, 5);
  });

  it('shortens for smokers and lengthens on oral contraceptives', () => {
    const smoker = makeProfile({
      modifiers: { smokes: true, usesOralContraceptives: false, pregnancy: 'none', liverImpairment: 'none' },
    });
    const onContraceptives = makeProfile({
      modifiers: { smokes: false, usesOralContraceptives: true, pregnancy: 'none', liverImpairment: 'none' },
    });

    expect(personalHalfLifeHours(smoker)).toBeCloseTo(3.25, 5);
    expect(personalHalfLifeHours(onContraceptives)).toBeCloseTo(9.5, 5);
  });

  it('multiplies combined modifiers', () => {
    const both = makeProfile({
      modifiers: { smokes: true, usesOralContraceptives: true, pregnancy: 'none', liverImpairment: 'none' },
    });
    expect(personalHalfLifeHours(both)).toBeCloseTo(5 * 0.65 * 1.9, 5);
  });

  it('clamps at both ends', () => {
    const extremelySlow = makeProfile({
      modifiers: { smokes: false, usesOralContraceptives: true, pregnancy: 'third', liverImpairment: 'severe' },
    });
    const extremelyFast = makeProfile({ halfLifeOverrideHours: 0.2 });

    expect(personalHalfLifeHours(extremelySlow)).toBe(MAX_HALF_LIFE_HOURS);
    expect(personalHalfLifeHours(extremelyFast)).toBe(MIN_HALF_LIFE_HOURS);
  });

  it('prefers an explicit override over the estimate', () => {
    const measured = makeProfile({
      halfLifeOverrideHours: 7,
      modifiers: { smokes: true, usesOralContraceptives: false, pregnancy: 'none', liverImpairment: 'none' },
    });
    expect(personalHalfLifeHours(measured)).toBe(7);
  });
});

describe('halfLifeFactorsFor', () => {
  it('lists nothing for an unmodified adult', () => {
    expect(halfLifeFactorsFor(makeProfile())).toHaveLength(0);
  });

  it('names every modifier that applies', () => {
    const profile = makeProfile({
      age: 70,
      modifiers: { smokes: true, usesOralContraceptives: false, pregnancy: 'second', liverImpairment: 'mild' },
    });
    expect(halfLifeFactorsFor(profile)).toHaveLength(4);
  });
});

describe('volumeOfDistributionLitres', () => {
  it('is 0.6 litres per kilogram', () => {
    expect(volumeOfDistributionLitres(makeProfile({ weightKg: 70 }))).toBeCloseTo(42, 5);
  });
});
