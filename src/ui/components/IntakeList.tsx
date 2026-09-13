import { useState } from 'react';
import type { Intake } from '../../domain/types';
import { formatClockTime, formatShortDate, fromDatetimeLocalValue, toDatetimeLocalValue } from '../lib/date';
import { NumberField } from './NumberField';

interface IntakeListProps {
  intakes: Intake[];
  emptyMessage: string;
  /** Shows the date alongside the time — useful once the list spans more than one day. */
  showDate?: boolean;
  onUpdate?: (id: string, changes: { caffeineMg: number; takenAt: number }) => void;
  onDelete?: (id: string) => void;
}

export function IntakeList({ intakes, emptyMessage, showDate = false, onUpdate, onDelete }: IntakeListProps) {
  const [editingIntakeId, setEditingIntakeId] = useState<string | null>(null);
  const [draftCaffeineMg, setDraftCaffeineMg] = useState(0);
  const [draftTakenAtValue, setDraftTakenAtValue] = useState('');

  if (intakes.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>;
  }

  function startEditing(intake: Intake) {
    setEditingIntakeId(intake.id);
    setDraftCaffeineMg(intake.caffeineMg);
    setDraftTakenAtValue(toDatetimeLocalValue(intake.takenAt));
  }

  function saveEditing(id: string) {
    onUpdate?.(id, { caffeineMg: draftCaffeineMg, takenAt: fromDatetimeLocalValue(draftTakenAtValue) });
    setEditingIntakeId(null);
  }

  function requestDelete(intake: Intake) {
    if (!window.confirm(`Delete ${intake.label}?`)) return;
    onDelete?.(intake.id);
  }

  return (
    <ul className="intake-list">
      {intakes.map((intake) =>
        editingIntakeId === intake.id ? (
          <li key={intake.id} className="intake-row intake-row-editing">
            <NumberField label="Dose" unit="mg" value={draftCaffeineMg} onChange={setDraftCaffeineMg} min={0} />
            <label className="field intake-edit-time">
              <span>Time</span>
              <input
                type="datetime-local"
                value={draftTakenAtValue}
                onChange={(event) => setDraftTakenAtValue(event.target.value)}
              />
            </label>
            <div className="intake-edit-actions">
              <button type="button" className="button button-primary" onClick={() => saveEditing(intake.id)}>
                Save
              </button>
              <button type="button" className="button" onClick={() => setEditingIntakeId(null)}>
                Cancel
              </button>
            </div>
          </li>
        ) : (
          <li key={intake.id} className="intake-row">
            <div className="intake-row-info">
              <span className="intake-row-time">
                {showDate ? `${formatShortDate(intake.takenAt)}, ` : ''}
                {formatClockTime(intake.takenAt)}
              </span>
              <span className="intake-row-label">{intake.label}</span>
            </div>
            <div className="intake-row-actions">
              <span className="intake-row-dose">{intake.caffeineMg.toFixed(0)} mg</span>
              {onUpdate ? (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Edit ${intake.label}`}
                  onClick={() => startEditing(intake)}
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  aria-label={`Delete ${intake.label}`}
                  onClick={() => requestDelete(intake)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </li>
        ),
      )}
    </ul>
  );
}
