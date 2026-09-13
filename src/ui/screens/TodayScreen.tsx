import { useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProfile } from '../hooks/useProfile';
import { useIntakes } from '../hooks/useIntakes';
import { useNow } from '../hooks/useNow';
import { curveOverWindow } from '../../domain/pharmacokinetics';
import { phaseAt } from '../../domain/phases';
import { bedtimeAfter, latestSafeIntakeTime, projectedSleepLevel } from '../../domain/sleep';
import { rollingDailyStats, classifyTodayIntake, totalMgOnDay } from '../../domain/baseline';
import { toleranceState, withdrawalRisk as calculateWithdrawalRisk } from '../../domain/tolerance';
import { buildRecommendations } from '../../domain/recommendations';
import { REFERENCE_COFFEE_MG } from '../../domain/constants';
import { DAY_MS, HOUR_MS, startOfLocalDay, weekdayOf } from '../../domain/time';
import type { AdvisorSnapshot } from '../../domain/types';
import { logIntake, recordAlertness, listFavorites } from '../../data/repositories';
import type { Favorite } from '../../data/entities';
import { startCutoffWatcher } from '../../notifications/cutoffWatcher';
import { PhaseBadge } from '../components/PhaseBadge';
import { CurveChart } from '../components/CurveChart';
import { CutoffCard } from '../components/CutoffCard';
import { RecommendationCard } from '../components/RecommendationCard';
import { FavoriteGrid } from '../components/FavoriteGrid';
import { IntakeList } from '../components/IntakeList';
import { AlertnessPrompt } from '../components/AlertnessPrompt';

const CURVE_HOURS_BEFORE_NOW = 6;
const CURVE_HOURS_AFTER_NOW = 18;
const CURVE_STEP_MINUTES = 15;
const BASELINE_WINDOW_DAYS = 30;
// Long enough for the baseline window plus enough runway for caffeine from
// before it to have decayed to a negligible contribution to today's curve.
const INTAKE_HISTORY_DAYS = BASELINE_WINDOW_DAYS + 5;

export function TodayScreen() {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const now = useNow();

  const historyStartMs = now - INTAKE_HISTORY_DAYS * DAY_MS;
  const curveFromMs = now - CURVE_HOURS_BEFORE_NOW * HOUR_MS;
  const curveToMs = now + CURVE_HOURS_AFTER_NOW * HOUR_MS;

  const intakes = useIntakes(historyStartMs, now);
  const favorites = useLiveQuery(() => listFavorites(), []) ?? [];

  const snapshot = useMemo<AdvisorSnapshot | null>(() => {
    if (!profile) return null;

    const bedtimeAt = bedtimeAfter(profile, now);
    const tolerance = toleranceState(intakes, now);
    const reading = phaseAt(intakes, now, profile, tolerance);
    const baseline = rollingDailyStats(intakes, now, BASELINE_WINDOW_DAYS);
    const todayTotalMg = totalMgOnDay(intakes, now);
    const deviation = classifyTodayIntake(todayTotalMg, baseline, weekdayOf(now));
    const risk = calculateWithdrawalRisk(todayTotalMg, tolerance);
    const cutoffAt = latestSafeIntakeTime(intakes, REFERENCE_COFFEE_MG, profile, now, bedtimeAt);
    const projectedLevelAtBedtimeMgPerL = projectedSleepLevel(intakes, profile, bedtimeAt);
    const lastIntakeAt = intakes.reduce<number | null>(
      (latest, intake) => (latest === null || intake.takenAt > latest ? intake.takenAt : latest),
      null,
    );

    return {
      now,
      reading,
      bedtimeAt,
      projectedLevelAtBedtimeMgPerL,
      sleepDisruptionThresholdMgPerL: profile.sleepDisruptionThresholdMgPerL,
      cutoffAt,
      todayTotalMg,
      baseline,
      deviation,
      tolerance,
      withdrawalRisk: risk,
      lastIntakeAt,
    };
  }, [profile, intakes, now]);

  const curve = useMemo(() => {
    if (!profile) return [];
    return curveOverWindow(intakes, curveFromMs, curveToMs, CURVE_STEP_MINUTES, profile);
  }, [profile, intakes, curveFromMs, curveToMs]);

  const todaysIntakes = useMemo(() => {
    const todayStartMs = startOfLocalDay(now);
    return intakes.filter((intake) => intake.takenAt >= todayStartMs).sort((a, b) => b.takenAt - a.takenAt);
  }, [intakes, now]);

  // The watcher polls this ref on its own timer/visibility-change triggers, so
  // it must always see the latest cutoff without restarting on every render.
  const cutoffAtRef = useRef<number | null>(null);
  cutoffAtRef.current = snapshot?.cutoffAt ?? null;

  useEffect(() => {
    const watcher = startCutoffWatcher(() => cutoffAtRef.current);
    return () => watcher.stop();
  }, []);

  if (isProfileLoading || !profile || !snapshot) {
    return <p className="text-muted">Loading…</p>;
  }

  const recommendations = buildRecommendations(snapshot);

  async function handleLogFavorite(favorite: Favorite) {
    await logIntake({
      caffeineMg: favorite.caffeineMg,
      label: favorite.label,
      takenAt: Date.now(),
      volumeMl: favorite.volumeMl,
      favoriteId: favorite.id,
      drinkId: favorite.drinkId,
      sourceId: favorite.sourceId,
    });
  }

  async function handleRateAlertness(rating: 1 | 2 | 3 | 4 | 5) {
    await recordAlertness(rating);
  }

  return (
    <div className="screen today-screen">
      <section className="card today-current-level">
        <p className="today-concentration">
          {snapshot.reading.concentrationMgPerL.toFixed(1)} <span className="unit">mg/L</span>
        </p>
        <PhaseBadge reading={snapshot.reading} />
      </section>

      <section className="card">
        <h2 className="section-title">Next 24 hours</h2>
        <CurveChart
          curve={curve}
          intakes={intakes}
          fromMs={curveFromMs}
          toMs={curveToMs}
          nowMs={now}
          bedtimeAtMs={snapshot.bedtimeAt}
          sleepThresholdMgPerL={profile.sleepDisruptionThresholdMgPerL}
          currentConcentrationMgPerL={snapshot.reading.concentrationMgPerL}
        />
      </section>

      <CutoffCard
        cutoffAt={snapshot.cutoffAt}
        bedtimeAt={snapshot.bedtimeAt}
        projectedBedtimeLevelMgPerL={snapshot.projectedLevelAtBedtimeMgPerL}
        sleepThresholdMgPerL={profile.sleepDisruptionThresholdMgPerL}
        referenceDoseMg={REFERENCE_COFFEE_MG}
      />

      <RecommendationCard recommendations={recommendations} />

      <section className="card">
        <h2 className="section-title">Favorites</h2>
        <FavoriteGrid favorites={favorites} onLogFavorite={handleLogFavorite} />
      </section>

      <section className="card">
        <h2 className="section-title">Today so far</h2>
        <IntakeList intakes={todaysIntakes} emptyMessage="No caffeine logged yet today." />
      </section>

      <AlertnessPrompt onRate={handleRateAlertness} />
    </div>
  );
}
