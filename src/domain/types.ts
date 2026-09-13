/**
 * Shared vocabulary for the whole app.
 *
 * `domain` is the innermost layer: it imports nothing from `data`, `ui` or
 * `notifications`, so every number the app claims can be tested in isolation.
 */

export type Sex = 'male' | 'female' | 'other';

export type PregnancyStage = 'none' | 'first' | 'second' | 'third';

export type LiverImpairment = 'none' | 'mild' | 'moderate' | 'severe';

/** Matches `Date.prototype.getDay()`: 0 is Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Minutes since midnight. Values at or above 1440 mean the bedtime falls after midnight. */
export type BedtimeByWeekday = Record<Weekday, number>;

export interface HalfLifeModifiers {
  smokes: boolean;
  usesOralContraceptives: boolean;
  pregnancy: PregnancyStage;
  liverImpairment: LiverImpairment;
}

export interface Profile {
  weightKg: number;
  age: number;
  sex: Sex;
  modifiers: HalfLifeModifiers;
  bedtimeByWeekday: BedtimeByWeekday;
  sleepDisruptionThresholdMgPerL: number;
  /** Replaces the estimated half-life outright once a measured value is known. */
  halfLifeOverrideHours: number | null;
}

/**
 * The only thing the model needs about a drink: when and how much. A stored
 * `Intake` satisfies it, and so does a hypothetical dose the cutoff solver is
 * still deciding whether to recommend.
 */
export interface Dose {
  takenAt: number;
  caffeineMg: number;
}

/**
 * `caffeineMg` is denormalized on purpose: recalibrating a favorite must never
 * rewrite the dose recorded for drinks already consumed.
 */
export interface Intake extends Dose {
  id: string;
  label: string;
  volumeMl: number | null;
  favoriteId: string | null;
  drinkId: string | null;
  sourceId: string | null;
  updatedAt: number;
}

export type PhaseName =
  | 'clear'
  | 'rising'
  | 'peak'
  | 'productive'
  | 'fading'
  | 'crashRisk'
  | 'overloaded';

export interface CurvePoint {
  /** Epoch milliseconds. */
  at: number;
  concentrationMgPerL: number;
}

export interface PhaseReading {
  phase: PhaseName;
  concentrationMgPerL: number;
  slopeMgPerLPerHour: number;
}

export interface DailyTotal {
  /** Local calendar day as `YYYY-MM-DD`. */
  day: string;
  totalMg: number;
}

export interface BaselineStats {
  dailyTotals: DailyTotal[];
  meanMgPerDay: number;
  standardDeviationMg: number;
  /** Mean for each weekday; null where that weekday has no recorded days yet. */
  meanByWeekday: Record<Weekday, number | null>;
  daysOfHistory: number;
}

export type IntakeDeviation = 'unusuallyLow' | 'typical' | 'unusuallyHigh' | 'insufficientHistory';

export interface ToleranceState {
  /** Exponentially weighted mean daily intake, in milligrams. */
  weightedDailyMg: number;
  /** `weightedDailyMg` mapped onto 0..1 for display and threshold scaling. */
  index: number;
}

export type WithdrawalRisk = 'none' | 'possible' | 'likely';

export type RecommendationSeverity = 'info' | 'caution' | 'warning';

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  message: string;
}

/** Everything the recommendation rules are allowed to look at. */
export interface AdvisorSnapshot {
  now: number;
  reading: PhaseReading;
  bedtimeAt: number;
  projectedLevelAtBedtimeMgPerL: number;
  sleepDisruptionThresholdMgPerL: number;
  /** Null when no further intake today can stay under the sleep threshold. */
  cutoffAt: number | null;
  todayTotalMg: number;
  baseline: BaselineStats;
  deviation: IntakeDeviation;
  tolerance: ToleranceState;
  withdrawalRisk: WithdrawalRisk;
  lastIntakeAt: number | null;
}
