import { describe, expect, it } from 'vitest';
import { typicalDoseRangeMg } from './doseRange';

describe('typicalDoseRangeMg', () => {
  it('brackets the catalog dose', () => {
    const { lowMg, highMg } = typicalDoseRangeMg(64);
    expect(lowMg).toBeLessThan(64);
    expect(highMg).toBeGreaterThan(64);
  });

  it('widens with the dose', () => {
    const small = typicalDoseRangeMg(40);
    const large = typicalDoseRangeMg(200);
    expect(large.highMg - large.lowMg).toBeGreaterThan(small.highMg - small.lowMg);
  });

  it('returns whole milligrams, since the input is already an estimate', () => {
    const { lowMg, highMg } = typicalDoseRangeMg(63.7);
    expect(Number.isInteger(lowMg)).toBe(true);
    expect(Number.isInteger(highMg)).toBe(true);
  });
});
