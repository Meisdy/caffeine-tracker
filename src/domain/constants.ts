import type { LiverImpairment, PregnancyStage } from './types';

/**
 * Every tunable number in the model lives here so the whole thing can be
 * audited from one screen. Sources are listed in README.md.
 */

/** Population mean elimination half-life for a healthy adult. */
export const BASELINE_HALF_LIFE_HOURS = 5;

/** Published individual half-lives span roughly 2-10 h; clamp guards absurd profiles. */
export const MIN_HALF_LIFE_HOURS = 2;
export const MAX_HALF_LIFE_HOURS = 15;

/** First-order absorption rate. 5.0/h places the peak near 45 min after intake. */
export const ABSORPTION_RATE_PER_HOUR = 5;

/** Caffeine distributes into roughly 0.6 L per kg of body mass. */
export const VOLUME_OF_DISTRIBUTION_LITRES_PER_KG = 0.6;

/** Oral caffeine bioavailability is close to complete, so no dose is discounted. */
export const ORAL_BIOAVAILABILITY = 1;

/**
 * Heuristic anchors on the dose-response literature, not validated cutoffs.
 * The UI labels anything derived from them as an estimate.
 */
export const EFFECT_THRESHOLD_MG_PER_L = 1;
export const JITTER_THRESHOLD_MG_PER_L = 8;

/** A tolerant drinker needs more caffeine for the same subjective effect. */
export const TOLERANCE_EFFECT_THRESHOLD_SCALING = 0.6;
export const TOLERANCE_JITTER_THRESHOLD_SCALING = 0.5;

/** Below this slope the level is treated as flat rather than rising or falling. */
export const FLAT_SLOPE_MG_PER_L_PER_HOUR = 0.15;

/** A crash is a steep fall from a real height, not merely any decline. */
export const CRASH_SLOPE_MG_PER_L_PER_HOUR = -0.6;
export const CRASH_LOOKBACK_HOURS = 3;
export const CRASH_PEAK_MULTIPLE = 2;

/** Within this multiple of the effect threshold, the useful window is ending. */
export const FADING_THRESHOLD_MULTIPLE = 1.4;

/**
 * Caffeine taken shortly before bed peaks during sleep onset, so the cutoff is
 * judged on the worst level across this window rather than the instant of bedtime.
 */
export const SLEEP_ONSET_WINDOW_HOURS = 1.5;

/** Dose the cutoff card asks about: "can I still have one more coffee?" */
export const REFERENCE_COFFEE_MG = 80;

/** Tolerance builds over days and fades over roughly a week and a half. */
export const TOLERANCE_HALF_LIFE_DAYS = 7;
export const TOLERANCE_WINDOW_DAYS = 28;
export const TOLERANCE_SATURATION_MG_PER_DAY = 400;

/** Withdrawal only matters for someone with an established habit to withdraw from. */
export const WITHDRAWAL_MINIMUM_HABIT_MG_PER_DAY = 100;
export const WITHDRAWAL_LIKELY_RATIO = 0.25;
export const WITHDRAWAL_POSSIBLE_RATIO = 0.5;

/** Flagging a day as unusual before this much history produces noise, not signal. */
export const MINIMUM_DAYS_FOR_BASELINE = 10;
export const UNUSUAL_INTAKE_DEVIATIONS = 1.5;

/** EFSA 2015 reference values for habitual daily and single-dose intake. */
export const DAILY_REFERENCE_LIMIT_MG = 400;
export const SINGLE_DOSE_REFERENCE_LIMIT_MG = 200;

/**
 * Multiplicative adjustments to the baseline half-life.
 *
 * Sex is deliberately absent: it does not meaningfully change clearance on its
 * own, and is collected only to decide which modifiers to offer. Habitual
 * intake is also absent: tolerance is a receptor-level adaptation, not faster
 * metabolism, so it scales the effect thresholds instead of the curve.
 */
export const SMOKING_HALF_LIFE_FACTOR = 0.65;
export const ORAL_CONTRACEPTIVE_HALF_LIFE_FACTOR = 1.9;
export const OLDER_ADULT_HALF_LIFE_FACTOR = 1.1;
export const OLDER_ADULT_AGE_YEARS = 65;

export const PREGNANCY_HALF_LIFE_FACTORS: Record<PregnancyStage, number> = {
  none: 1,
  first: 1.2,
  second: 1.7,
  third: 2.8,
};

export const LIVER_IMPAIRMENT_HALF_LIFE_FACTORS: Record<LiverImpairment, number> = {
  none: 1,
  mild: 1.5,
  moderate: 2.5,
  severe: 4,
};
