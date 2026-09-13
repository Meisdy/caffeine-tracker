import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useProfile } from '../hooks/useProfile';
import { personalHalfLifeHours, halfLifeFactorsFor } from '../../domain/halfLife';
import type { LiverImpairment, PregnancyStage, Sex, Weekday } from '../../domain/types';
import { getSettings, saveSettings } from '../../data/repositories';
import type { Settings } from '../../data/entities';
import { exportToJson, importFromJson } from '../../data/backup';
import { areNotificationsSupported, requestNotificationPermission, enableDailyDigest } from '../../notifications/registration';
import { NumberField } from '../components/NumberField';
import { formatWeekdayLabel } from '../lib/date';

const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const SEX_OPTIONS: Sex[] = ['female', 'male', 'other'];
const PREGNANCY_OPTIONS: PregnancyStage[] = ['none', 'first', 'second', 'third'];
const LIVER_IMPAIRMENT_OPTIONS: LiverImpairment[] = ['none', 'mild', 'moderate', 'severe'];
const MINUTES_PER_DAY = 1440;

function bedtimeMinutesToParts(totalMinutes: number): { time: string; isAfterMidnight: boolean } {
  const isAfterMidnight = totalMinutes >= MINUTES_PER_DAY;
  const minutesInDay = totalMinutes % MINUTES_PER_DAY;
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return { time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, isAfterMidnight };
}

function bedtimePartsToMinutes(time: string, isAfterMidnight: boolean): number {
  const [hoursText, minutesText] = time.split(':');
  const minutesInDay = Number(hoursText ?? 0) * 60 + Number(minutesText ?? 0);
  return isAfterMidnight ? minutesInDay + MINUTES_PER_DAY : minutesInDay;
}

export function ProfileScreen() {
  const { profile, saveProfile, isLoading } = useProfile();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getSettings().then((loadedSettings) => {
      if (isMounted) setSettings(loadedSettings);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading || !profile || !settings) {
    return <p className="text-muted">Loading…</p>;
  }

  // Rebind as fresh consts: TypeScript's null-narrowing above does not carry
  // into the closures declared below, but a fresh const keeps its narrowed type.
  const currentProfile = profile;
  const currentSettings = settings;

  const halfLifeHours = personalHalfLifeHours(currentProfile);
  const halfLifeFactors = halfLifeFactorsFor(currentProfile);

  function handleBedtimeChange(weekday: Weekday, changes: { time?: string; isAfterMidnight?: boolean }) {
    const current = bedtimeMinutesToParts(currentProfile.bedtimeByWeekday[weekday]);
    const nextMinutes = bedtimePartsToMinutes(
      changes.time ?? current.time,
      changes.isAfterMidnight ?? current.isAfterMidnight,
    );
    void saveProfile({
      ...currentProfile,
      bedtimeByWeekday: { ...currentProfile.bedtimeByWeekday, [weekday]: nextMinutes },
    });
  }

  async function handleNotificationToggle(
    key: keyof Pick<Settings, 'notifyCutoff' | 'notifyUnusualIntake' | 'notifyToleranceAdvice'>,
    enabled: boolean,
  ) {
    const nextSettings: Settings = { ...currentSettings, [key]: enabled };
    setSettings(nextSettings);
    await saveSettings(nextSettings);
    if (!enabled) return;
    await requestNotificationPermission();
    await enableDailyDigest();
  }

  async function handleExport() {
    const json = await exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `caffeine-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage('Exported backup.');
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const json = await file.text();
      await importFromJson(json);
      // A restored backup can change every table at once; reloading is the
      // simplest way to guarantee every screen reflects it consistently.
      window.location.reload();
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Could not import that file.');
    }
  }

  return (
    <div className="screen profile-screen">
      <section className="card">
        <h2 className="section-title">About you</h2>
        <NumberField
          label="Weight"
          unit="kg"
          value={currentProfile.weightKg}
          onChange={(weightKg) => void saveProfile({ ...currentProfile, weightKg })}
          min={0}
        />
        <NumberField
          label="Age"
          unit="years"
          value={currentProfile.age}
          onChange={(age) => void saveProfile({ ...currentProfile, age })}
          min={0}
        />
        <label className="field">
          <span>Sex</span>
          <select
            value={currentProfile.sex}
            onChange={(event) => void saveProfile({ ...currentProfile, sex: event.target.value as Sex })}
          >
            {SEX_OPTIONS.map((sex) => (
              <option key={sex} value={sex}>
                {sex}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card">
        <h2 className="section-title">Half-life modifiers</h2>
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={currentProfile.modifiers.smokes}
            onChange={(event) =>
              void saveProfile({
                ...currentProfile,
                modifiers: { ...currentProfile.modifiers, smokes: event.target.checked },
              })
            }
          />
          <span>Smokes</span>
        </label>
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={currentProfile.modifiers.usesOralContraceptives}
            onChange={(event) =>
              void saveProfile({
                ...currentProfile,
                modifiers: { ...currentProfile.modifiers, usesOralContraceptives: event.target.checked },
              })
            }
          />
          <span>Uses oral contraceptives</span>
        </label>
        <label className="field">
          <span>Pregnancy</span>
          <select
            value={currentProfile.modifiers.pregnancy}
            onChange={(event) =>
              void saveProfile({
                ...currentProfile,
                modifiers: { ...currentProfile.modifiers, pregnancy: event.target.value as PregnancyStage },
              })
            }
          >
            {PREGNANCY_OPTIONS.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Liver impairment</span>
          <select
            value={currentProfile.modifiers.liverImpairment}
            onChange={(event) =>
              void saveProfile({
                ...currentProfile,
                modifiers: { ...currentProfile.modifiers, liverImpairment: event.target.value as LiverImpairment },
              })
            }
          >
            {LIVER_IMPAIRMENT_OPTIONS.map((impairment) => (
              <option key={impairment} value={impairment}>
                {impairment}
              </option>
            ))}
          </select>
        </label>

        <p className="insights-big-number">{halfLifeHours.toFixed(1)} h (estimate)</p>
        {halfLifeFactors.length === 0 ? (
          <p className="text-muted">No modifiers apply — this is the baseline population estimate.</p>
        ) : (
          <ul className="modifier-list">
            {halfLifeFactors.map((factor) => (
              <li key={factor.label}>
                {factor.label}: ×{factor.factor.toFixed(2)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Bedtime</h2>
        {WEEKDAYS.map((weekday) => {
          const { time, isAfterMidnight } = bedtimeMinutesToParts(currentProfile.bedtimeByWeekday[weekday]);
          return (
            <div key={weekday} className="bedtime-row">
              <span className="bedtime-row-label">{formatWeekdayLabel(weekday)}</span>
              <input
                type="time"
                value={time}
                onChange={(event) => handleBedtimeChange(weekday, { time: event.target.value })}
              />
              <label className="field-checkbox">
                <input
                  type="checkbox"
                  checked={isAfterMidnight}
                  onChange={(event) => handleBedtimeChange(weekday, { isAfterMidnight: event.target.checked })}
                />
                <span>after midnight</span>
              </label>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h2 className="section-title">Sleep threshold</h2>
        <NumberField
          label="Sleep disruption threshold"
          unit="mg/L"
          value={currentProfile.sleepDisruptionThresholdMgPerL}
          onChange={(sleepDisruptionThresholdMgPerL) =>
            void saveProfile({ ...currentProfile, sleepDisruptionThresholdMgPerL })
          }
          min={0}
          step={0.1}
        />
      </section>

      <section className="card">
        <h2 className="section-title">Notifications</h2>
        {!areNotificationsSupported() ? (
          <p className="text-muted">Notifications aren&apos;t supported in this browser.</p>
        ) : null}
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={currentSettings.notifyCutoff}
            onChange={(event) => void handleNotificationToggle('notifyCutoff', event.target.checked)}
          />
          <span>Cutoff warnings</span>
        </label>
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={currentSettings.notifyUnusualIntake}
            onChange={(event) => void handleNotificationToggle('notifyUnusualIntake', event.target.checked)}
          />
          <span>Unusual intake alerts</span>
        </label>
        <label className="field field-checkbox">
          <input
            type="checkbox"
            checked={currentSettings.notifyToleranceAdvice}
            onChange={(event) => void handleNotificationToggle('notifyToleranceAdvice', event.target.checked)}
          />
          <span>Tolerance advice</span>
        </label>
      </section>

      <section className="card">
        <h2 className="section-title">Backup</h2>
        <div className="backup-actions">
          <button type="button" className="button" onClick={() => void handleExport()}>
            Export JSON
          </button>
          <label className="button">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="visually-hidden"
              onChange={(event) => void handleImportFileChange(event)}
            />
          </label>
        </div>
        {backupMessage ? <p className="text-muted">{backupMessage}</p> : null}
      </section>
    </div>
  );
}
