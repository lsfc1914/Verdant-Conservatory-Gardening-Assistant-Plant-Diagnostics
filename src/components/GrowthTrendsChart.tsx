import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Plus, Activity, Ruler } from 'lucide-react';
import { HealthStatus, PlantSpecimen } from '../types/plant';

interface GrowthTrendsChartProps {
  specimen: PlantSpecimen;
  onRequestAddLog: () => void;
}

type ChartMode = 'health_logs' | 'height_health';

interface TrendPoint {
  id: string;
  dateStr: string;
  dateLabel: string;
  dayDelta: number;
  healthStatus: HealthStatus;
  healthScore: number;
  healthLabel: string;
  cumulativeLogs: number;
  heightCm: number | null;
  rawHeight?: string;
  stageLabel: string;
  note: string;
  isBaseline: boolean;
}

function toDateOnly(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = toDateOnly(dateStr).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function daysBetween(earlier: string, later: string): number {
  const a = new Date(toDateOnly(earlier)).getTime();
  const b = new Date(toDateOnly(later)).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function healthToScore(status: HealthStatus): number {
  if (status === 'healthy') return 3;
  if (status === 'attention') return 2;
  return 1;
}

function healthToLabel(status: HealthStatus): string {
  if (status === 'healthy') return 'Healthy';
  if (status === 'attention') return 'Needs Attention';
  return 'Treatment';
}

function healthColor(status: HealthStatus): string {
  if (status === 'healthy') return '#34D399';
  if (status === 'attention') return '#F59E0B';
  return '#FB7185';
}

function parseHeightToCm(raw?: string): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const val = Number.parseFloat(match[1]);
  if (!Number.isFinite(val)) return null;
  const lower = raw.toLowerCase();
  if (lower.includes('in')) {
    return Math.round(val * 2.54 * 10) / 10;
  }
  if (lower.includes('mm')) {
    return Math.round((val / 10) * 10) / 10;
  }
  return Math.round(val * 10) / 10;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: TrendPoint }>;
}

function CustomTrendTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-[#22312B] bg-[#0A0F0D]/95 p-3 shadow-lg max-w-[240px] space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-mono tabular-nums font-medium text-[#ECF2EF]">
          {point.dateLabel}
        </span>
        <span className="font-mono tabular-nums text-[#8FA399]">
          {point.isBaseline ? 'Baseline' : `Day ${point.dayDelta}`}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: healthColor(point.healthStatus) }}
        />
        <span className="font-medium text-[#ECF2EF]">{point.healthLabel}</span>
        <span className="text-[#8FA399]">· {point.stageLabel}</span>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[#A3B5AC]">
        <span>Logs: {point.cumulativeLogs}</span>
        {point.heightCm !== null && (
          <span>
            Height: {point.rawHeight || `${point.heightCm} cm`}
          </span>
        )}
      </div>

      {point.note && (
        <p className="text-[11px] text-[#8FA399] leading-snug line-clamp-2 pt-1 border-t border-[#1E2B26]">
          {point.note}
        </p>
      )}
    </div>
  );
}

export function GrowthTrendsChart({
  specimen,
  onRequestAddLog,
}: GrowthTrendsChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('health_logs');

  const entries = specimen.growthLog ?? [];
  const baselineDate = toDateOnly(specimen.savedAt);

  const chartData = useMemo<TrendPoint[]>(() => {
    const baselinePoint: TrendPoint = {
      id: 'baseline',
      dateStr: baselineDate,
      dateLabel: formatShortDate(baselineDate),
      dayDelta: 0,
      healthStatus: specimen.diagnosis.healthStatus,
      healthScore: healthToScore(specimen.diagnosis.healthStatus),
      healthLabel: healthToLabel(specimen.diagnosis.healthStatus),
      cumulativeLogs: 0,
      heightCm: null,
      stageLabel: 'Initial Scan',
      note: specimen.diagnosis.statusHeadline,
      isBaseline: true,
    };

    const sortedAsc = [...entries].sort(
      (a, b) =>
        new Date(toDateOnly(a.capturedAt)).getTime() -
        new Date(toDateOnly(b.capturedAt)).getTime()
    );

    const logPoints: TrendPoint[] = sortedAsc.map((entry, idx) => {
      const status: HealthStatus =
        entry.healthStatus ?? specimen.diagnosis.healthStatus;
      const dStr = toDateOnly(entry.capturedAt);
      return {
        id: entry.id,
        dateStr: dStr,
        dateLabel: formatShortDate(dStr),
        dayDelta: daysBetween(baselineDate, dStr),
        healthStatus: status,
        healthScore: healthToScore(status),
        healthLabel: healthToLabel(status),
        cumulativeLogs: idx + 1,
        heightCm: parseHeightToCm(entry.heightLabel),
        rawHeight: entry.heightLabel,
        stageLabel: entry.stage ?? 'Progress',
        note: entry.note,
        isBaseline: false,
      };
    });

    return [baselinePoint, ...logPoints];
  }, [
    baselineDate,
    entries,
    specimen.diagnosis.healthStatus,
    specimen.diagnosis.statusHeadline,
  ]);

  const hasMeasurements = chartData.some((d) => d.heightCm !== null);
  const latestPoint = chartData[chartData.length - 1];
  const latestHeightPoint = [...chartData]
    .reverse()
    .find((d) => d.heightCm !== null);
  const spanDays =
    chartData.length > 1
      ? Math.max(0, latestPoint.dayDelta)
      : 0;

  return (
    <section className="rounded-xl border border-[#22312B] bg-[#111916] divide-y divide-[#22312B]">
      {/* Header & Mode Controls */}
      <div className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#8FA399]">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Development Analytics</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#D2DDD7]">
              {chartData.length}{' '}
              {chartData.length === 1 ? 'checkpoint' : 'checkpoints'}
            </span>
          </div>
          <h2 className="font-display text-xl font-semibold text-[#ECF2EF]">
            Growth &amp; Health Trends
          </h2>
        </div>

        <div
          role="group"
          aria-label="Chart metric view"
          className="inline-flex items-center p-1 rounded-lg bg-[#0A0F0D] border border-[#22312B]"
        >
          <button
            type="button"
            onClick={() => setChartMode('health_logs')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'health_logs'
                ? 'bg-[#1D2B25] text-emerald-300'
                : 'text-[#8FA399] hover:text-[#ECF2EF]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Health &amp; Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setChartMode('height_health')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              chartMode === 'height_health'
                ? 'bg-[#1D2B25] text-emerald-300'
                : 'text-[#8FA399] hover:text-[#ECF2EF]'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Height &amp; Health</span>
          </button>
        </div>
      </div>

      {/* Tabular Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#22312B] bg-[#0E1512]">
        <div className="px-6 py-3.5 space-y-0.5">
          <p className="text-xs text-[#8FA399]">Latest Health Status</p>
          <p
            className="text-sm font-semibold"
            style={{ color: healthColor(latestPoint.healthStatus) }}
          >
            {latestPoint.healthLabel}
          </p>
        </div>

        <div className="px-6 py-3.5 space-y-0.5">
          <p className="text-xs text-[#8FA399]">Logged Progress Snapshots</p>
          <p className="font-mono tabular-nums text-sm font-semibold text-[#ECF2EF]">
            {entries.length}{' '}
            <span className="font-sans font-normal text-xs text-[#8FA399]">
              over {spanDays} {spanDays === 1 ? 'day' : 'days'}
            </span>
          </p>
        </div>

        <div className="px-6 py-3.5 space-y-0.5">
          <p className="text-xs text-[#8FA399]">Latest Measured Height</p>
          <p className="font-mono tabular-nums text-sm font-semibold text-[#ECF2EF]">
            {latestHeightPoint
              ? latestHeightPoint.rawHeight || `${latestHeightPoint.heightCm} cm`
              : 'Not recorded'}
          </p>
        </div>
      </div>

      {/* Chart Stage */}
      <div className="p-6 space-y-4">
        {chartMode === 'height_health' && !hasMeasurements && (
          <div className="rounded-lg border border-[#22312B] bg-[#0D1411] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#A3B5AC]">
            <span>
              No numeric height measurements recorded yet. Add a measurement (for
              example, <span className="font-mono text-[#ECF2EF]">32 cm</span>) to
              a growth log entry to plot physical growth alongside health status.
            </span>
            <button
              type="button"
              onClick={onRequestAddLog}
              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        )}

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="growthLogFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#1E2B26"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="dateLabel"
                stroke="#5B7066"
                tick={{
                  fill: '#8FA399',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
                tickLine={false}
                axisLine={{ stroke: '#22312B' }}
              />

              <YAxis
                yAxisId="health"
                domain={[0.75, 3.25]}
                ticks={[1, 2, 3]}
                width={76}
                stroke="#5B7066"
                tickFormatter={(val: number) => {
                  if (val === 3) return 'Healthy';
                  if (val === 2) return 'Attention';
                  if (val === 1) return 'Treatment';
                  return '';
                }}
                tick={{
                  fill: '#8FA399',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}
                tickLine={false}
                axisLine={false}
              />

              {chartMode === 'health_logs' ? (
                <YAxis
                  yAxisId="metric"
                  orientation="right"
                  allowDecimals={false}
                  domain={[0, 'dataMax + 1']}
                  width={36}
                  stroke="#5B7066"
                  tick={{
                    fill: '#8FA399',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                  tickLine={false}
                  axisLine={false}
                />
              ) : (
                <YAxis
                  yAxisId="metric"
                  orientation="right"
                  domain={[0, 'auto']}
                  width={48}
                  stroke="#5B7066"
                  tickFormatter={(val: number) => `${val}cm`}
                  tick={{
                    fill: '#F59E0B',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                  }}
                  tickLine={false}
                  axisLine={false}
                />
              )}

              <Tooltip
                content={<CustomTrendTooltip />}
                cursor={{ stroke: '#344A41', strokeDasharray: '4 4' }}
              />

              {chartMode === 'health_logs' ? (
                <>
                  <Area
                    yAxisId="metric"
                    type="monotone"
                    dataKey="cumulativeLogs"
                    name="Cumulative Growth Logs"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    strokeOpacity={0.55}
                    fill="url(#growthLogFill)"
                    isAnimationActive={false}
                  />
                  <Bar
                    yAxisId="metric"
                    dataKey="cumulativeLogs"
                    barSize={14}
                    fill="#1D352B"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </>
              ) : (
                <Line
                  yAxisId="metric"
                  type="monotone"
                  dataKey="heightCm"
                  name="Height (cm)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 4, fill: '#F59E0B', stroke: '#0A0F0D', strokeWidth: 1.5 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              )}

              <Line
                yAxisId="health"
                type="monotone"
                dataKey="healthScore"
                name="Health Status"
                stroke="#34D399"
                strokeWidth={2.5}
                dot={(dotProps) => {
                  const { cx, cy, payload } = dotProps as {
                    cx?: number;
                    cy?: number;
                    payload?: TrendPoint;
                  };
                  if (typeof cx !== 'number' || typeof cy !== 'number' || !payload) {
                    return <g key={dotProps.index} />;
                  }
                  return (
                    <circle
                      key={payload.id}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={healthColor(payload.healthStatus)}
                      stroke="#0A0F0D"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 7, stroke: '#ECF2EF', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Empty CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#1E2B26] text-xs text-[#8FA399]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
              <span>Health Status Trend</span>
            </span>
            {chartMode === 'health_logs' ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1D352B] border border-emerald-500/40 inline-block" />
                <span>Cumulative Logs</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                <span>Height (cm)</span>
              </span>
            )}
          </div>

          {entries.length === 0 && (
            <button
              type="button"
              onClick={onRequestAddLog}
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log first progress checkpoint</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
