import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { listDrinks, listSources, logIntake, saveFavorite } from '../../data/repositories';
import type { Drink, Source } from '../../data/entities';
import { typicalDoseRangeMg } from '../../domain/doseRange';
import { NumberField } from '../components/NumberField';
import { toDatetimeLocalValue, fromDatetimeLocalValue } from '../lib/date';

type LogMode = 'catalog' | 'custom';

function computeCaffeineMg(drink: Drink, volumeMl: number): number {
  if (drink.fixedMg !== null) return drink.fixedMg;
  return ((drink.mgPer100Ml ?? 0) * volumeMl) / 100;
}

function buildIntakeLabel(drink: Drink, source: Source | null): string {
  return source ? `${drink.name} — ${source.name}` : drink.name;
}

// Strip accents so "caffe" finds "Caffè Crema" on keyboards without them.
function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function LogScreen() {
  const [mode, setMode] = useState<LogMode>('catalog');

  const drinks = useLiveQuery(() => listDrinks(), []) ?? [];
  const sources = useLiveQuery(() => listSources(), []) ?? [];

  const [drinkSearch, setDrinkSearch] = useState('');
  const [selectedDrinkId, setSelectedDrinkId] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [volumeMl, setVolumeMl] = useState(0);
  const [takenAtValue, setTakenAtValue] = useState(() => toDatetimeLocalValue(Date.now()));
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);
  const [favoriteLabel, setFavoriteLabel] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const [customName, setCustomName] = useState('');
  const [customCaffeineMg, setCustomCaffeineMg] = useState(0);

  const selectedDrink = drinks.find((drink) => drink.id === selectedDrinkId) ?? null;
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? null;

  // The selected drink stays listed even when filtered out, so the select never shows a stale value.
  const normalizedDrinkSearch = normalizeForSearch(drinkSearch.trim());
  const matchingDrinks = drinks.filter(
    (drink) => drink.id === selectedDrinkId || normalizeForSearch(drink.name).includes(normalizedDrinkSearch),
  );

  // Pick sensible defaults whenever the drink or source selection changes.
  useEffect(() => {
    if (!selectedDrink) return;
    setVolumeMl(selectedDrink.defaultVolumeMl ?? 0);
    setFavoriteLabel(buildIntakeLabel(selectedDrink, selectedSource));
  }, [selectedDrink, selectedSource]);

  const computedCaffeineMg = selectedDrink ? computeCaffeineMg(selectedDrink, volumeMl) : 0;

  function resetTakenAtToNow() {
    setTakenAtValue(toDatetimeLocalValue(Date.now()));
  }

  async function handleSaveCatalogIntake() {
    if (!selectedDrink) return;

    const takenAt = fromDatetimeLocalValue(takenAtValue);
    const usesVolume = selectedDrink.fixedMg === null;
    const label = buildIntakeLabel(selectedDrink, selectedSource);

    await logIntake({
      caffeineMg: computedCaffeineMg,
      label,
      takenAt,
      volumeMl: usesVolume ? volumeMl : null,
      drinkId: selectedDrink.id,
      sourceId: selectedSource?.id ?? null,
    });

    if (saveAsFavorite) {
      await saveFavorite({
        drinkId: selectedDrink.id,
        sourceId: selectedSource?.id ?? null,
        label: favoriteLabel,
        volumeMl: usesVolume ? volumeMl : null,
        caffeineMg: computedCaffeineMg,
        sortOrder: Date.now(),
      });
    }

    setConfirmationMessage(`Logged ${computedCaffeineMg.toFixed(0)} mg`);
    setSaveAsFavorite(false);
    resetTakenAtToNow();
  }

  async function handleSaveCustomIntake() {
    const trimmedName = customName.trim();
    if (!trimmedName || customCaffeineMg <= 0) return;

    const takenAt = fromDatetimeLocalValue(takenAtValue);
    await logIntake({
      caffeineMg: customCaffeineMg,
      label: trimmedName,
      takenAt,
      volumeMl: null,
      drinkId: null,
      sourceId: null,
    });

    setConfirmationMessage(`Logged ${customCaffeineMg.toFixed(0)} mg`);
    setCustomName('');
    setCustomCaffeineMg(0);
    resetTakenAtToNow();
  }

  return (
    <div className="screen log-screen">
      <div className="segmented-control">
        <button type="button" className={mode === 'catalog' ? 'is-active' : ''} onClick={() => setMode('catalog')}>
          From catalog
        </button>
        <button type="button" className={mode === 'custom' ? 'is-active' : ''} onClick={() => setMode('custom')}>
          Custom
        </button>
      </div>

      {confirmationMessage ? <p className="confirmation-banner">{confirmationMessage}</p> : null}

      {mode === 'catalog' ? (
        <section className="card">
          <label className="field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Filter drinks…"
              value={drinkSearch}
              onChange={(event) => setDrinkSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Drink</span>
            <select value={selectedDrinkId} onChange={(event) => setSelectedDrinkId(event.target.value)}>
              <option value="" disabled>
                {matchingDrinks.length === 0 ? 'No matching drinks' : 'Choose a drink…'}
              </option>
              {matchingDrinks.map((drink) => (
                <option key={drink.id} value={drink.id}>
                  {drink.name}
                </option>
              ))}
            </select>
          </label>

          {selectedDrink && selectedDrink.fixedMg === null ? (
            <NumberField label="Volume" unit="ml" value={volumeMl} onChange={setVolumeMl} min={0} />
          ) : null}

          <label className="field">
            <span>Source</span>
            <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
              <option value="">None</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>

          <p className="computed-dose">{computedCaffeineMg.toFixed(0)} mg</p>
          {computedCaffeineMg > 0 ? (
            <p className="text-muted dose-range-hint">
              Real drinks of this kind usually land between {typicalDoseRangeMg(computedCaffeineMg).lowMg} and{' '}
              {typicalDoseRangeMg(computedCaffeineMg).highMg} mg. Grind, machine and pour move it more
              than anything else in the model — if this is a drink you repeat, set the figure for
              your machine once and save it as a favorite.
            </p>
          ) : null}

          <label className="field">
            <span>Time</span>
            <input type="datetime-local" value={takenAtValue} onChange={(event) => setTakenAtValue(event.target.value)} />
          </label>
          <button type="button" className="button" onClick={resetTakenAtToNow}>
            Now
          </button>

          <label className="field field-checkbox">
            <input type="checkbox" checked={saveAsFavorite} onChange={(event) => setSaveAsFavorite(event.target.checked)} />
            <span>Save as favorite</span>
          </label>

          {saveAsFavorite ? (
            <label className="field">
              <span>Favorite name</span>
              <input type="text" value={favoriteLabel} onChange={(event) => setFavoriteLabel(event.target.value)} />
            </label>
          ) : null}

          <button
            type="button"
            className="button button-primary"
            disabled={!selectedDrink}
            onClick={() => void handleSaveCatalogIntake()}
          >
            Log intake
          </button>
        </section>
      ) : (
        <section className="card">
          <label className="field">
            <span>Name</span>
            <input type="text" value={customName} onChange={(event) => setCustomName(event.target.value)} />
          </label>

          <NumberField label="Dose" unit="mg" value={customCaffeineMg} onChange={setCustomCaffeineMg} min={0} />

          <label className="field">
            <span>Time</span>
            <input type="datetime-local" value={takenAtValue} onChange={(event) => setTakenAtValue(event.target.value)} />
          </label>
          <button type="button" className="button" onClick={resetTakenAtToNow}>
            Now
          </button>

          <button
            type="button"
            className="button button-primary"
            disabled={!customName.trim() || customCaffeineMg <= 0}
            onClick={() => void handleSaveCustomIntake()}
          >
            Log intake
          </button>
        </section>
      )}
    </div>
  );
}
