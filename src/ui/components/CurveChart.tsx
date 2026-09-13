import type { CurvePoint, Intake } from '../../domain/types';
import { formatClockTime } from '../lib/date';

/**
 * A single-series area chart needs no legend (the section title above it names
 * the series) — instead, the "now"/"bed"/threshold markers carry direct text
 * labels so identity never rests on color alone.
 */
const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;
const MARGIN = { top: 18, right: 8, bottom: 22, left: 34 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const PLOT_BOTTOM = MARGIN.top + PLOT_HEIGHT;
const TIME_AXIS_TICK_COUNT = 4;
// Headroom above the highest of (peak level, sleep threshold) so the curve
// never touches the top edge and the threshold line is never flush with it.
const VERTICAL_HEADROOM_FACTOR = 1.15;

interface CurveChartProps {
  curve: CurvePoint[];
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
  intakes,
  fromMs,
  toMs,
  nowMs,
  bedtimeAtMs,
  sleepThresholdMgPerL,
  currentConcentrationMgPerL,
}: CurveChartProps) {
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
  const maxConcentration =
    Math.max(peakPoint.concentrationMgPerL, sleepThresholdMgPerL, 1) * VERTICAL_HEADROOM_FACTOR;

  const timeToX = (atMs: number): number => MARGIN.left + ((atMs - fromMs) / timeSpanMs) * PLOT_WIDTH;
  const concentrationToY = (mgPerL: number): number =>
    MARGIN.top + PLOT_HEIGHT - (mgPerL / maxConcentration) * PLOT_HEIGHT;

  const linePathD = curve
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

  const ariaLabel =
    `Caffeine level now ${currentConcentrationMgPerL.toFixed(1)} milligrams per liter, ` +
    `peaking at ${peakPoint.concentrationMgPerL.toFixed(1)} milligrams per liter around ${formatClockTime(peakPoint.at)}.`;

  return (
    <svg
      className="curve-chart"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
    >
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

      {showBedtimeMarker ? (
        <>
          <line
            x1={timeToX(bedtimeAtMs)}
            y1={MARGIN.top}
            x2={timeToX(bedtimeAtMs)}
            y2={PLOT_BOTTOM}
            className="curve-bedtime-line"
          />
          <text x={timeToX(bedtimeAtMs)} y={MARGIN.top - 6} textAnchor="middle" className="curve-marker-label curve-bedtime-label">
            Bed
          </text>
        </>
      ) : null}

      {showNowMarker ? (
        <>
          <line x1={timeToX(nowMs)} y1={MARGIN.top} x2={timeToX(nowMs)} y2={PLOT_BOTTOM} className="curve-now-line" />
          <text x={timeToX(nowMs)} y={MARGIN.top - 6} textAnchor="middle" className="curve-marker-label curve-now-label">
            Now
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
