import type { PhaseName, PhaseReading } from '../../domain/types';
import { PHASE_LABELS, PHASE_DESCRIPTIONS } from '../../domain/phases';

type Tone = 'ok' | 'accent' | 'caution' | 'danger';

// Purely a display concern — which of the app's four status colors a given
// pharmacokinetic phase reads as. Not a domain judgement.
const PHASE_TONE: Record<PhaseName, Tone> = {
  clear: 'ok',
  rising: 'accent',
  peak: 'accent',
  productive: 'accent',
  fading: 'caution',
  crashRisk: 'caution',
  overloaded: 'danger',
};

interface PhaseBadgeProps {
  reading: PhaseReading;
}

export function PhaseBadge({ reading }: PhaseBadgeProps) {
  const tone = PHASE_TONE[reading.phase];

  return (
    <div className={`phase-badge phase-badge-${tone}`}>
      <span className="phase-badge-label">{PHASE_LABELS[reading.phase]}</span>
      <p className="phase-badge-description">{PHASE_DESCRIPTIONS[reading.phase]}</p>
    </div>
  );
}
