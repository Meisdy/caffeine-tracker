import { DAILY_REFERENCE_LIMIT_MG } from './constants';
import type { AdvisorSnapshot, Recommendation, RecommendationSeverity } from './types';

const MAXIMUM_SHOWN = 2;
const HIGH_TOLERANCE_INDEX = 0.75;

interface Rule {
  id: string;
  severity: RecommendationSeverity;
  applies: (snapshot: AdvisorSnapshot) => boolean;
  message: (snapshot: AdvisorSnapshot) => string;
}

/**
 * Deterministic and ordered by urgency, so the same situation always produces
 * the same advice and the most important line is never pushed off the card.
 */
const RULES: Rule[] = [
  {
    id: 'withdrawal-likely',
    severity: 'warning',
    applies: (snapshot) => snapshot.withdrawalRisk === 'likely',
    message: (snapshot) =>
      `You are far below your usual ${Math.round(snapshot.tolerance.weightedDailyMg)} mg a day. ` +
      'Withdrawal headache typically starts 12 to 24 hours after the drop. A small dose now would head it off.',
  },
  {
    id: 'past-cutoff',
    severity: 'warning',
    applies: (snapshot) =>
      snapshot.projectedLevelAtBedtimeMgPerL > snapshot.sleepDisruptionThresholdMgPerL,
    message: () =>
      'You are already on track to be above your sleep threshold at bedtime. ' +
      'Expect a longer time to fall asleep and less deep sleep.',
  },
  {
    id: 'overloaded',
    severity: 'warning',
    applies: (snapshot) => snapshot.reading.phase === 'overloaded',
    message: () =>
      'Level is high enough that jitteriness and a raised heart rate are likely. Water and a break beat more caffeine.',
  },
  {
    id: 'unusually-high',
    severity: 'caution',
    applies: (snapshot) => snapshot.deviation === 'unusuallyHigh',
    message: (snapshot) =>
      `${Math.round(snapshot.todayTotalMg)} mg today, well above your usual for this weekday. ` +
      'Sleep is the first thing to suffer.',
  },
  {
    id: 'sustained-high-intake',
    severity: 'caution',
    applies: (snapshot) => snapshot.baseline.meanMgPerDay > DAILY_REFERENCE_LIMIT_MG,
    message: (snapshot) =>
      `Averaging ${Math.round(snapshot.baseline.meanMgPerDay)} mg a day, above the ${DAILY_REFERENCE_LIMIT_MG} mg ` +
      'EFSA reference for habitual intake in healthy adults.',
  },
  {
    id: 'crash-incoming',
    severity: 'info',
    applies: (snapshot) =>
      snapshot.reading.phase === 'crashRisk' || snapshot.reading.phase === 'fading',
    message: (snapshot) =>
      snapshot.cutoffAt !== null
        ? 'Dropping out of your productive window. A small dose now costs less sleep than a large one later.'
        : 'Dropping out of your productive window, and it is past your cutoff. Ride it out.',
  },
  {
    id: 'tolerance-high',
    severity: 'info',
    applies: (snapshot) => snapshot.tolerance.index >= HIGH_TOLERANCE_INDEX,
    message: () =>
      'Your tolerance estimate is high, so each cup is doing less than it used to. ' +
      'Seven to ten days at a reduced dose restores most of the sensitivity.',
  },
  {
    id: 'unusually-low',
    severity: 'info',
    applies: (snapshot) => snapshot.deviation === 'unusuallyLow',
    message: () =>
      'Noticeably less than your usual for this weekday. Worth watching for a late-afternoon headache.',
  },
  {
    id: 'clear-and-steady',
    severity: 'info',
    applies: (snapshot) => snapshot.reading.phase === 'clear',
    message: () => 'Baseline. Nothing meaningful on board right now.',
  },
];

export function buildRecommendations(snapshot: AdvisorSnapshot): Recommendation[] {
  return RULES.filter((rule) => rule.applies(snapshot))
    .slice(0, MAXIMUM_SHOWN)
    .map((rule) => ({ id: rule.id, severity: rule.severity, message: rule.message(snapshot) }));
}
