import {
  BASELINE_HALF_LIFE_HOURS,
  DAILY_REFERENCE_LIMIT_MG,
  DOSE_UNCERTAINTY,
  EFFECT_THRESHOLD_MG_PER_L,
  HALF_LIFE_UNCERTAINTY,
  JITTER_THRESHOLD_MG_PER_L,
  MAX_HALF_LIFE_HOURS,
  MIN_HALF_LIFE_HOURS,
  PREGNANCY_DAILY_REFERENCE_LIMIT_MG,
  REFERENCE_COFFEE_MG,
  SINGLE_DOSE_REFERENCE_LIMIT_MG,
  SINGLE_DOSE_WINDOW_HOURS,
  SLEEP_ONSET_WINDOW_HOURS,
  TOLERANCE_HALF_LIFE_DAYS,
  TOLERANCE_SATURATION_MG_PER_DAY,
  VOLUME_OF_DISTRIBUTION_LITRES_PER_KG,
} from '../../domain/constants';
import { DEFAULT_PROFILE } from '../../data/entities';

// Mirrors "Sources for the constants" in README.md; keep the two in step.
const RESEARCH_SOURCES = [
  {
    citation: 'Blanchard & Sawers (1983), Eur J Clin Pharmacol 24:93–98',
    usedFor: 'absorption, bioavailability, volume of distribution',
  },
  {
    citation: 'Nehlig (2018), Interindividual differences in caffeine metabolism, Pharmacol Rev 70(2):384–411',
    usedFor: 'half-life range and modifiers',
  },
  { citation: 'Parsons & Neims (1978)', usedFor: 'smoking and caffeine clearance' },
  { citation: 'Abernethy & Todd (1985)', usedFor: 'oral contraceptives and caffeine elimination' },
  {
    citation: 'Drake et al. (2013), Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed, J Clin Sleep Med 9(11):1195–1200',
    usedFor: 'sleep threshold',
  },
  {
    citation: 'Juliano & Griffiths (2004), A critical review of caffeine withdrawal, Psychopharmacology 176:1–29',
    usedFor: 'withdrawal timing, tolerance onset and reversal',
  },
  {
    citation: 'EFSA (2015), Scientific Opinion on the safety of caffeine',
    usedFor: 'daily, single-dose and pregnancy reference values',
  },
];

function toPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function ModelInfoCard() {
  return (
    <section className="card model-info">
      <h2 className="section-title">How the model works</h2>
      <p className="text-muted">
        Every number in the app is an estimate from population data, not a measurement and not medical advice.
      </p>

      <details>
        <summary>The caffeine curve</summary>
        <p>
          Each drink is absorbed over roughly 45 minutes, spreads through about{' '}
          {VOLUME_OF_DISTRIBUTION_LITRES_PER_KG} L of body water per kg of body weight, and is then cleared with
          your personal half-life. Drinks add up, so the curve is the sum of everything you logged.
        </p>
        <p>
          The half-life starts at {BASELINE_HALF_LIFE_HOURS} hours and is adjusted for smoking (faster), oral
          contraceptives, pregnancy, liver impairment and age 65+ (all slower), kept between{' '}
          {MIN_HALF_LIFE_HOURS} and {MAX_HALF_LIFE_HOURS} hours.
        </p>
      </details>

      <details>
        <summary>Phases</summary>
        <p>
          Caffeine is treated as noticeable above about {EFFECT_THRESHOLD_MG_PER_L} mg/L and likely to cause
          jitteriness above about {JITTER_THRESHOLD_MG_PER_L} mg/L. Both move up as your tolerance grows. Whether
          the level is rising or falling decides between rising, peak, productive, fading and crash risk. These
          are rough anchors from the dose-response literature, not validated cutoffs.
        </p>
      </details>

      <details>
        <summary>Sleep cutoff and threshold</summary>
        <p>
          The cutoff is the latest time a {REFERENCE_COFFEE_MG} mg coffee keeps your level under the sleep
          threshold for the first {SLEEP_ONSET_WINDOW_HOURS * 60} minutes after bedtime, when a late coffee is
          still peaking. It is shown as a range because your real half-life may be about{' '}
          {toPercent(HALF_LIFE_UNCERTAINTY)} off.
        </p>
        <p>
          Where the threshold comes from: Drake et al. (2013, J Clin Sleep Med) gave 400 mg of caffeine 0, 3 or
          6 hours before bed. Even at 6 hours it cut measured sleep by more than an hour. In this model, that
          dose still leaves about 4 mg/L at bedtime for a 70 kg adult. The study tested nothing lower, so no
          level has been shown to be safe. The default of {DEFAULT_PROFILE.sleepDisruptionThresholdMgPerL.toFixed(1)}{' '}
          mg/L is a deliberately cautious margin below that, set where caffeine starts to have a noticeable
          effect at all. If you sleep fine with more on board, raise it; if you are sensitive, lower it.
        </p>
      </details>

      <details>
        <summary>Intake limits</summary>
        <p>
          Advice follows the EFSA (2015) reference values for healthy adults: up to {DAILY_REFERENCE_LIMIT_MG} mg
          a day, and up to {SINGLE_DOSE_REFERENCE_LIMIT_MG} mg at once. Drinks within {SINGLE_DOSE_WINDOW_HOURS}{' '}
          hour of each other count as one dose, because they are absorbed together. During pregnancy the daily
          limit is {PREGNANCY_DAILY_REFERENCE_LIMIT_MG} mg. The app also warns when what you already drank is
          heading for the jitter level, before it gets there.
        </p>
      </details>

      <details>
        <summary>Tolerance and withdrawal</summary>
        <p>
          Tolerance is estimated from your recent daily intake, with each day counting half as much after{' '}
          {TOLERANCE_HALF_LIFE_DAYS} days, compared against {TOLERANCE_SATURATION_MG_PER_DAY} mg a day. Withdrawal is
          flagged when today is far below that habit.
        </p>
      </details>

      <details>
        <summary>Drink doses</summary>
        <p>
          Catalog values are typical figures. A real cup can easily be {toPercent(DOSE_UNCERTAINTY)} higher or
          lower depending on beans, grind and machine, which outweighs every other error in the model. If you
          know the dose from your machine, enter it under Log → Custom and save it as a favorite.
        </p>
      </details>

      <details>
        <summary>Sources</summary>
        <ul className="model-info-sources">
          {RESEARCH_SOURCES.map((source) => (
            <li key={source.citation}>
              {source.citation} <span className="text-muted">— {source.usedFor}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
