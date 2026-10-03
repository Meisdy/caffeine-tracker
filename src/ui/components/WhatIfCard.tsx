import { useMemo, useState } from 'react';
import type { Favorite } from '../../data/entities';
import { REFERENCE_COFFEE_MG } from '../../domain/constants';
import { HOUR_MS } from '../../domain/time';
import type { Dose, Profile } from '../../domain/types';
import { simulateIntake } from '../../domain/whatIf';
import { formatClockTime } from '../lib/date';
import { formatCutoffWindow } from './AdviceCard';
import { NumberField } from './NumberField';

const CUSTOM_DOSE = 'custom';

interface WhatIfCardProps {
  /** Everything already counted toward the level, including any planned habit doses. */
  doses: Dose[];
  profile: Profile;
  favorites: Favorite[];
  nowMs: number;
  bedtimeAt: number;
}

export function WhatIfCard({ doses, profile, favorites, nowMs, bedtimeAt }: WhatIfCardProps) {
  const [chosenDoseId, setChosenDoseId] = useState<string | null>(null);
  const [customMg, setCustomMg] = useState(REFERENCE_COFFEE_MG);
  const [timeText, setTimeText] = useState(() => toTimeInputValue(nowMs + HOUR_MS));

  const doseId = chosenDoseId ?? favorites[0]?.id ?? CUSTOM_DOSE;
  const chosenFavorite = favorites.find((favorite) => favorite.id === doseId);
  const doseMg = chosenFavorite?.caffeineMg ?? customMg;
  const takenAt = fromTimeInputValue(timeText, nowMs);

  const result = useMemo(() => {
    if (takenAt === null || takenAt <= nowMs || takenAt >= bedtimeAt || doseMg <= 0) return null;
    return simulateIntake(doses, { takenAt, caffeineMg: doseMg }, profile, nowMs, bedtimeAt);
  }, [doses, profile, nowMs, bedtimeAt, takenAt, doseMg]);

  return (
    <section className="card">
      <h2 className="section-title">What if?</h2>
      <div className="whatif-inputs">
        <label className="field">
          <span>Drink</span>
          <select value={doseId} onChange={(event) => setChosenDoseId(event.target.value)}>
            {favorites.map((favorite) => (
              <option key={favorite.id} value={favorite.id}>
                {favorite.label} · {favorite.caffeineMg.toFixed(0)} mg
              </option>
            ))}
            <option value={CUSTOM_DOSE}>Custom dose</option>
          </select>
        </label>
        {chosenFavorite ? null : <NumberField label="Dose" value={customMg} onChange={setCustomMg} unit="mg" min={1} />}
        <label className="field">
          <span>At</span>
          <input type="time" value={timeText} onChange={(event) => setTimeText(event.target.value)} />
        </label>
      </div>

      {result ? (
        <div className="cutoff-summary">
          <p className={result.exceedsSleepThreshold ? 'cutoff-warning' : 'cutoff-safe'}>
            {result.exceedsSleepThreshold
              ? `Would disturb sleep: ~${result.sleepLevelMgPerL.toFixed(1)} mg/L at bedtime, over your ${profile.sleepDisruptionThresholdMgPerL} mg/L threshold.`
              : `Fine for sleep: ~${result.sleepLevelMgPerL.toFixed(1)} mg/L at bedtime, under your ${profile.sleepDisruptionThresholdMgPerL} mg/L threshold.`}
          </p>
          {result.exceedsSleepThreshold ? (
            <p className="text-muted">
              {result.safeUntil.estimate === null
                ? 'This dose is too late today.'
                : `Latest safe time for this dose: ${formatCutoffWindow(result.safeUntil)}.`}
            </p>
          ) : null}
          <p className="text-muted">
            Peak ~{result.peak.concentrationMgPerL.toFixed(1)} mg/L around {formatClockTime(result.peak.at)}.
          </p>
        </div>
      ) : (
        <p className="text-muted">Pick a time between now and bedtime ({formatClockTime(bedtimeAt)}).</p>
      )}
    </section>
  );
}

function toTimeInputValue(atMs: number): string {
  const date = new Date(atMs);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Interprets `HH:MM` as that time on the local day of `referenceMs`; null for an empty or malformed value. */
function fromTimeInputValue(timeText: string, referenceMs: number): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(timeText);
  if (!match) return null;
  const date = new Date(referenceMs);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.getTime();
}
