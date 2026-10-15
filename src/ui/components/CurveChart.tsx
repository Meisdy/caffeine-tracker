import { useState } from 'react';
import type { PointerEvent } from 'react';
import type { CurvePoint, Intake } from '../../domain/types';
import { formatClockTime } from '../lib/date';

/**
 * A single-series area chart needs no legend (the section title above it names
 * the series) — instead, the "now"/"bed"/threshold markers carry direct text
 * labels so identity never rests on color alone.
 */
const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const MARGIN = { top: 18, right: 10, bottom: 22, left: 10 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const PLOT_BOTTOM = MARGIN.top + PLOT_HEIGHT;
const TIME_AXIS_TICK_COUNT = 4;
// Headroom above the highest of (peak level, sleep threshold) so the curve
// never touches the top edge and the threshold line is never flush with it.
const VERTICAL_HEADROOM_FACTOR = 1.15;
// Labels this close to a side edge are anchored to that edge so they stay inside the viewBox.
const LABEL_EDGE_FRACTION = 0.2;

interface CurveChartProps {
  curve: CurvePoint[];
  /** The same window with planned habit doses added; only its future part is drawn. */
  plannedCurve?: CurvePoint[];
  intakes: Intake[];
  fromMs: number;
  toMs: number;
  nowMs: number;
  bedtimeAtMs: number;
  sleepThresholdMgPerL: number;
  currentConcentrationMgPerL: number;
}

export function CurveChart({
  curve,
  plannedCurve = [],
  intakes,
  fromMs,
  toMs,
  nowMs,
  bedtimeAtMs,
  sleepThresholdMgPerL,
  currentConcentrationMgPerL,
}: CurveChartProps) {
  const [scrubAtMs, setScrubAtMs] = useState<number | null>(null);
  const firstPoint = curve[0];
  const lastPoint = curve[curve.length - 1];

  if (!firstPoint || !lastPoint) {
    return <p className="text-muted">Not enough data yet to draw a curve.</p>;
  }

  const timeSpanMs = toMs - fromMs;
  const peakPoint = curve.reduce(
    (peak, point) => (point.concentrationMgPerL > peak.concentrationMgPerL ? point : peak),
    firstPoint,
  );
  const plannedFuture = plannedCurve.filter((point) => point.at >= nowMs);
  const highestPlanned = plannedFuture.reduce((highest, point) => Math.max(highest, point.concentrationMgPerL), 0);
  const maxConcentration =
    Math.max(peakPoint.concentrationMgPerL, highestPlanned, sleepThresholdMgPerL, 1) * VERTICAL_HEADROOM_FACTOR;

  const timeToX = (atMs: number): number => MARGIN.left + ((atMs - fromMs) / timeSpanMs) * PLOT_WIDTH;
  const concentrationToY = (mgPerL: number): number =>
    MARGIN.top + PLOT_HEIGHT - (mgPerL / maxConcentration) * PLOT_HEIGHT;

  const linePathD = curve
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${timeToX(point.at)} ${concentrationToY(point.concentrationMgPerL)}`,
    )
    .join(' ');
  const plannedPathD = plannedFuture
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${timeToX(point.at)} ${concentrationToY(point.concentrationMgPerL)}`,
    )
    .join(' ');
  const areaPathD = `${linePathD} L ${timeToX(lastPoint.at)} ${PLOT_BOTTOM} L ${timeToX(firstPoint.at)} ${PLOT_BOTTOM} Z`;

  const timeAxisTicks = Array.from({ length: TIME_AXIS_TICK_COUNT + 1 }, (_, index) => {
    const atMs = fromMs + (timeSpanMs / TIME_AXIS_TICK_COUNT) * index;
    return { atMs, x: timeToX(atMs) };
  });

  const intakeTicks = intakes.filter((intake) => intake.takenAt >= fromMs && intake.takenAt <= toMs);
  const thresholdY = concentrationToY(sleepThresholdMgPerL);
  const showBedtimeMarker = bedtimeAtMs >= fromMs && bedtimeAtMs <= toMs;
  const showNowMarker = nowMs >= fromMs && nowMs <= toMs;

  // The future follows the planned curve when habits are counted, matching the advice card.
  const futureCurve = plannedFuture.length > 0 ? plannedFuture : curve.filter((point) => point.at >= nowMs);
  const belowThresholdAtMs = firstDownwardCrossing(futureCurve, sleepThresholdMgPerL);

  const scrub =
    scrubAtMs === null
      ? null
      : { atMs: scrubAtMs, levelMgPerL: levelAt(scrubAtMs >= nowMs ? futureCurve : curve, scrubAtMs) };

  function handleScrub(event: PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;
    const viewBoxX = ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH;
    const plotFraction = Math.min(Math.max((viewBoxX - MARGIN.left) / PLOT_WIDTH, 0), 1);
    setScrubAtMs(fromMs + plotFraction * timeSpanMs);
  }

  const ariaLabel =
    `Caffeine level now ${currentConcentrationMgPerL.toFixed(1)} milligrams per liter, ` +
    `peaking at ${peakPoint.concentrationMgPerL.toFixed(1)} milligrams per liter around ${formatClockTime(peakPoint.at)}.` +
    (belowThresholdAtMs === null ? '' : ` Falls below the threshold around ${formatClockTime(belowThresholdAtMs)}.`);

  return (
    <svg
      className="curve-chart"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      onPointerDown={handleScrub}
      onPointerMove={handleScrub}
      // Touch fires pointerleave right after pointerup, so this also ends a finger drag.
      onPointerLeave={() => setScrubAtMs(null)}
      onPointerCancel={() => setScrubAtMs(null)}
    >
      <defs>
        <linearGradient id="curve-area-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="curve-area-stop-top" />
          <stop offset="1" className="curve-area-stop-bottom" />
        </linearGradient>
      </defs>

      <line x1={MARGIN.left} y1={PLOT_BOTTOM} x2={MARGIN.left + PLOT_WIDTH} y2={PLOT_BOTTOM} className="curve-axis-line" />

      <line
        x1={MARGIN.left}
        y1={thresholdY}
        x2={MARGIN.left + PLOT_WIDTH}
        y2={thresholdY}
        className="curve-threshold-line"
      />
      <text x={MARGIN.left + PLOT_WIDTH} y={thresholdY - 4} textAnchor="end" className="curve-threshold-label">
        threshold {sleepThresholdMgPerL.toFixed(1)} mg/L
      </text>

      <path d={areaPathD} className="curve-area" />
      <path d={linePathD} className="curve-line" />
      {plannedPathD ? <path d={plannedPathD} className="curve-planned-line" /> : null}

      {intakeTicks.map((intake) => (
        <line
          key={intake.id}
          x1={timeToX(intake.takenAt)}
          y1={PLOT_BOTTOM}
          x2={timeToX(intake.takenAt)}
          y2={PLOT_BOTTOM - 6}
          className="curve-intake-tick"
        />
      ))}

      {belowThresholdAtMs !== null ? (
        <>
          <circle cx={timeToX(belowThresholdAtMs)} cy={thresholdY} r={3.5} className="curve-crossing-dot" />
          <text
            x={timeToX(belowThresholdAtMs)}
            y={thresholdY + 13}
            textAnchor={edgeAwareAnchor(timeToX(belowThresholdAtMs))}
            className="curve-crossing-label"
          >
            ↓ {formatClockTime(belowThresholdAtMs)}
          </text>
        </>
      ) : null}

      {showBedtimeMarker ? (
        <>
          <line
            x1={timeToX(bedtimeAtMs)}
            y1={MARGIN.top}
            x2={timeToX(bedtimeAtMs)}
            y2={PLOT_BOTTOM}
            className="curve-bedtime-line"
          />
          {/* The scrub readout takes over the label row while a finger is on the chart. */}
          {scrub ? null : (
            <text x={timeToX(bedtimeAtMs)} y={MARGIN.top - 6} textAnchor="middle" className="curve-marker-label curve-bedtime-label">
              Bed
            </text>
          )}
        </>
      ) : null}

      {showNowMarker ? (
        <>
          <line x1={timeToX(nowMs)} y1={MARGIN.top} x2={timeToX(nowMs)} y2={PLOT_BOTTOM} className="curve-now-line" />
          {scrub ? null : (
            <text x={timeToX(nowMs)} y={MARGIN.top - 6} textAnchor="middle" className="curve-marker-label curve-now-label">
              Now
            </text>
          )}
          <circle
            cx={timeToX(nowMs)}
            cy={concentrationToY(currentConcentrationMgPerL)}
            r={4.5}
            className="curve-now-dot"
          />
        </>
      ) : null}

      {scrub ? (
        <>
          <line x1={timeToX(scrub.atMs)} y1={MARGIN.top} x2={timeToX(scrub.atMs)} y2={PLOT_BOTTOM} className="curve-scrub-line" />
          <circle cx={timeToX(scrub.atMs)} cy={concentrationToY(scrub.levelMgPerL)} r={4} className="curve-scrub-dot" />
          <text
            x={timeToX(scrub.atMs)}
            y={MARGIN.top - 6}
            textAnchor={edgeAwareAnchor(timeToX(scrub.atMs))}
            className="curve-marker-label curve-scrub-label"
          >
            {formatClockTime(scrub.atMs)} · {scrub.levelMgPerL.toFixed(1)} mg/L
          </text>
        </>
      ) : null}

      {timeAxisTicks.map((tick, index) => (
        <text
          key={tick.atMs}
          x={tick.x}
          y={PLOT_BOTTOM + 14}
          textAnchor={axisLabelAnchor(index, timeAxisTicks.length)}
          className="curve-axis-label"
        >
          {formatClockTime(tick.atMs)}
        </text>
      ))}
    </svg>
  );
}

/** Centred end labels overflow the viewBox, since the side margins are narrower than a timestamp. */
function axisLabelAnchor(index: number, tickCount: number): 'start' | 'middle' | 'end' {
  if (index === 0) return 'start';
  if (index === tickCount - 1) return 'end';
  return 'middle';
}

function edgeAwareAnchor(x: number): 'start' | 'middle' | 'end' {
  if (x < CHART_WIDTH * LABEL_EDGE_FRACTION) return 'start';
  if (x > CHART_WIDTH * (1 - LABEL_EDGE_FRACTION)) return 'end';
  return 'middle';
}

/** Interpolates between curve samples; outside them it holds the nearest sample. */
export function levelAt(points: readonly CurvePoint[], atMs: number): number {
  const afterIndex = points.findIndex((point) => point.at >= atMs);
  const after = points[afterIndex];
  const before = points[afterIndex - 1];
  if (!after) return points[points.length - 1]?.concentrationMgPerL ?? 0;
  if (!before) return after.concentrationMgPerL;
  const fraction = (atMs - before.at) / (after.at - before.at);
  return before.concentrationMgPerL + fraction * (after.concentrationMgPerL - before.concentrationMgPerL);
}

/** When the level first drops from above the threshold to at or below it, interpolated between samples. */
export function firstDownwardCrossing(points: readonly CurvePoint[], thresholdMgPerL: number): number | null {
  for (let index = 1; index < points.length; index++) {
    const before = points[index - 1];
    const after = points[index];
    if (!before || !after) continue;
    if (before.concentrationMgPerL > thresholdMgPerL && after.concentrationMgPerL <= thresholdMgPerL) {
      const fraction =
        (before.concentrationMgPerL - thresholdMgPerL) / (before.concentrationMgPerL - after.concentrationMgPerL);
      return before.at + fraction * (after.at - before.at);
    }
  }
  return null;
}
