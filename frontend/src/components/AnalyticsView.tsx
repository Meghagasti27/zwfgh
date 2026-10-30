import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine
} from 'recharts';

import type {
  DailyAnalysisResponse,
  CutoffComparisonResponse,
  IntervalEvaluation
} from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';
import { TrendingDown, TrendingUp, Check } from 'lucide-react';

interface AnalyticsViewProps {
  analysis: DailyAnalysisResponse;
  cutoffComparison: CutoffComparisonResponse | null;
  cutoffPreset: string;
  onSelectCutoffPreset: (preset: string) => void;
  viewMode: 'hourly' | 'half_hourly';
  cutoffLoading: boolean;
}

interface HistogramBin {
  binLabel: string;
  minVal: number;
  maxVal: number;
  count: number;
  percentage: number;
  isNegative: boolean;
  isPositive: boolean;
}

/**
 * Derives residual histogram bins and frequency counts from interval errors.
 */
function computeResidualHistogram(intervals: IntervalEvaluation[], numBins = 7): HistogramBin[] {
  const errors = intervals
    .map((i) => i.error_mw)
    .filter((e): e is number => e !== null && !isNaN(e));

  if (errors.length === 0) return [];

  const min = Math.min(...errors);
  const max = Math.max(...errors);

  if (min === max) {
    return [{
      binLabel: `${Math.round(min).toLocaleString()} MW`,
      minVal: min,
      maxVal: max,
      count: errors.length,
      percentage: 100,
      isNegative: min < 0,
      isPositive: min > 0
    }];
  }

  const range = max - min;
  const binWidth = range / numBins;
  const bins: HistogramBin[] = [];

  for (let b = 0; b < numBins; b++) {
    const bMin = min + b * binWidth;
    const bMax = b === numBins - 1 ? max : min + (b + 1) * binWidth;
    const count = errors.filter((err) => {
      if (b === numBins - 1) {
        return err >= bMin && err <= bMax;
      }
      return err >= bMin && err < bMax;
    }).length;

    const label = `${Math.round(bMin).toLocaleString()} to ${Math.round(bMax).toLocaleString()}`;
    const mid = (bMin + bMax) / 2;

    bins.push({
      binLabel: label,
      minVal: bMin,
      maxVal: bMax,
      count,
      percentage: (count / errors.length) * 100,
      isNegative: mid < 0,
      isPositive: mid > 0
    });
  }

  return bins;
}

/**
 * Derives 24-hour average actual, forecast, and error series from intervals.
 */
function computeHourlyPerformance(intervals: IntervalEvaluation[]) {
  const hoursMap = new Map<number, { actuals: number[]; forecasts: number[]; errors: number[] }>();

  for (let h = 0; h < 24; h++) {
    hoursMap.set(h, { actuals: [], forecasts: [], errors: [] });
  }

  for (const item of intervals) {
    const h = item.hour ?? (item.start_time ? parseInt(item.start_time.slice(11, 13), 10) : 0);
    const entry = hoursMap.get(h);
    if (entry) {
      if (item.actual_mw !== null && !isNaN(item.actual_mw)) entry.actuals.push(item.actual_mw);
      if (item.forecast_mw !== null && !isNaN(item.forecast_mw)) entry.forecasts.push(item.forecast_mw);
      if (item.error_mw !== null && !isNaN(item.error_mw)) entry.errors.push(item.error_mw);
    }
  }

  const result = [];
  for (let h = 0; h < 24; h++) {
    const entry = hoursMap.get(h)!;
    const avgActual = entry.actuals.length > 0
      ? Math.round(entry.actuals.reduce((a, b) => a + b, 0) / entry.actuals.length)
      : null;
    const avgForecast = entry.forecasts.length > 0
      ? Math.round(entry.forecasts.reduce((a, b) => a + b, 0) / entry.forecasts.length)
      : null;
    const avgError = entry.errors.length > 0
      ? Math.round(entry.errors.reduce((a, b) => a + b, 0) / entry.errors.length)
      : null;

    result.push({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      actual: avgActual,
      forecast: avgForecast,
      error: avgError
    });
  }

  return result;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analysis,
  cutoffComparison,
  cutoffPreset,
  onSelectCutoffPreset,
  cutoffLoading
}) => {
  // 1. Forecast Error Distribution data
  const histogramData = useMemo(
    () => computeResidualHistogram(analysis.intervals, 7),
    [analysis.intervals]
  );

  // 2. Hourly Forecast Performance data
  const hourlyData = useMemo(
    () => computeHourlyPerformance(analysis.intervals),
    [analysis.intervals]
  );

  // 3. Cutoff Performance chart data
  const cutoffChartData = useMemo(() => {
    if (!cutoffComparison?.comparisons) return [];
    return cutoffComparison.comparisons.map((c) => ({
      preset: c.preset,
      label: `${c.cutoff_time} UTC`,
      mae: c.mae_mw,
      rmse: c.rmse_mw,
      bias: c.bias_mw
    }));
  }, [cutoffComparison]);

  return (
    <div className="space-y-5">

      {/* ── 1. Forecast Error Distribution ───────────────────────────────── */}
      <section className="ws-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#e8eaf6]">
          <div>
            <h2 className="text-sm font-bold text-[#1a1a2e] m-0">
              1. Forecast Error Distribution
            </h2>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Frequency distribution of forecast residuals (Forecast − Actual MW) across delivery intervals
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#3b82f6] inline-block" />
              <span className="text-[#64748b] text-[11px] font-medium">Under-forecast (Residual &lt; 0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b] inline-block" />
              <span className="text-[#64748b] text-[11px] font-medium">Over-forecast (Residual &gt; 0)</span>
            </span>
          </div>
        </div>

        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height={260} minWidth={0} debounce={0}>
            <BarChart data={histogramData} margin={{ top: 8, right: 12, left: 8, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
              <XAxis
                dataKey="binLabel"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                width={36}
                allowDecimals={false}
                tick={{ fill: '#94a3b8' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d: HistogramBin = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#e2e8f0] p-3 rounded-xl shadow-lg text-xs space-y-1 min-w-[200px]">
                        <div className="font-semibold text-[#1a1a2e] border-b border-[#e8eaf6] pb-1">
                          Residual Bin: {d.binLabel} MW
                        </div>
                        <div className="flex justify-between text-[#64748b]">
                          <span>Interval Count:</span>
                          <span className="font-mono font-bold text-[#1a1a2e]">{d.count} intervals</span>
                        </div>
                        <div className="flex justify-between text-[#64748b]">
                          <span>Share of Delivery:</span>
                          <span className="font-mono font-semibold text-[#176B4D]">{d.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-[#64748b] pt-1 border-t border-[#e8eaf6] text-[10px]">
                          <span>Classification:</span>
                          <span className={`font-semibold ${d.isNegative ? 'text-blue-700' : d.isPositive ? 'text-amber-700' : 'text-[#64748b]'}`}>
                            {d.isNegative ? 'Under-forecast (Long)' : d.isPositive ? 'Over-forecast (Short)' : 'Balanced'}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {histogramData.map((entry, idx) => (
                  <Cell
                    key={`hist-cell-${idx}`}
                    fill={entry.isNegative ? '#3b82f6' : entry.isPositive ? '#f59e0b' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 2. Hourly Forecast Performance ──────────────────────────────── */}
      <section className="ws-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#e8eaf6]">
          <div>
            <h2 className="text-sm font-bold text-[#1a1a2e] m-0">
              2. Hourly Forecast Performance
            </h2>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Average actual generation, forecast generation, and forecast error across 24 delivery hours
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded-full bg-[#22c55e] inline-block" />
              <span className="text-[#64748b] text-[11px] font-medium">Actual (MW)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded-full bg-[#3b82f6] border-b border-dashed border-[#3b82f6] inline-block" />
              <span className="text-[#64748b] text-[11px] font-medium">Forecast (MW)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 rounded-full bg-[#f59e0b] inline-block" />
              <span className="text-[#64748b] text-[11px] font-medium">Error (MW)</span>
            </span>
          </div>
        </div>

        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={0}>
            <LineChart data={hourlyData} margin={{ top: 8, right: 12, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                interval={1}
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                width={42}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fill: '#94a3b8' }}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#e2e8f0] p-3 rounded-xl shadow-lg text-xs space-y-1 min-w-[200px]">
                        <div className="font-semibold text-[#1a1a2e] border-b border-[#e8eaf6] pb-1">
                          Hour {d.label} UTC
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Actual Generation:</span>
                          <span className="font-mono font-bold">{formatMW(d.actual)}</span>
                        </div>
                        <div className="flex justify-between text-[#3b82f6]">
                          <span>Forecast Generation:</span>
                          <span className="font-mono font-bold">{formatMW(d.forecast)}</span>
                        </div>
                        <div className="flex justify-between text-[#1a1a2e] pt-1 border-t border-[#e8eaf6]">
                          <span>Forecast Error:</span>
                          <span className={`font-mono font-bold ${d.error > 0 ? 'text-amber-700' : 'text-[#3b82f6]'}`}>
                            {formatSignedMW(d.error)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Generation"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast Generation"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="error"
                name="Forecast Error"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── 3. Cutoff Performance Comparison ────────────────────────────── */}
      <section className="ws-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#e8eaf6]">
          <div>
            <h2 className="text-sm font-bold text-[#1a1a2e] m-0">
              3. Cutoff Performance Comparison
            </h2>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Evaluation of 09:00, 11:00, 14:00, and 17:00 UTC trading decision cutoffs using MAE, RMSE, and Bias
            </p>
          </div>
          <span className="text-[11px] text-[#94a3b8] font-mono">
            Baseline: <span className="font-semibold text-[#1a1a2e]">11:00 UTC</span>
          </span>
        </div>

        {cutoffLoading && !cutoffComparison ? (
          <div className="h-44 flex items-center justify-center text-xs text-[#94a3b8] animate-pulse">
            Loading cutoff metrics…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cutoff metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cutoffComparison?.comparisons.map((item) => {
                const isSelected = cutoffPreset === item.preset;
                const isBaseline = item.preset === '11:00';
                const isBetter = item.delta_mae_mw < 0;
                const isWorse = item.delta_mae_mw > 0;

                return (
                  <div
                    key={item.preset}
                    onClick={() => onSelectCutoffPreset(item.preset)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#6366f1] bg-[#eef0ff] shadow-xs ring-1 ring-[#6366f1]/30'
                        : 'border-[#e8eaf6] bg-white hover:border-[#6366f1]/40 hover:bg-[#f8f9ff]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-[#1a1a2e]">
                        {item.cutoff_time} UTC
                      </span>
                      <div className="flex items-center gap-1">
                        {isBaseline && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-[#176B4D]/10 text-[#176B4D]">
                            Baseline
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6366f1]" />}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">MAE:</span>
                        <span className="font-mono font-bold text-[#1a1a2e]">{formatMW(item.mae_mw)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">RMSE:</span>
                        <span className="font-mono font-semibold text-[#1a1a2e]">{formatMW(item.rmse_mw)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748b]">Bias:</span>
                        <span className={`font-mono font-semibold ${item.bias_mw > 0 ? 'text-amber-700' : 'text-[#3b82f6]'}`}>
                          {formatSignedMW(item.bias_mw)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-1.5 border-t border-[#e8eaf6] flex items-center justify-between text-[11px]">
                      <span className="text-[#94a3b8]">vs Baseline</span>
                      {isBaseline ? (
                        <span className="text-[#94a3b8] font-mono">0 MW</span>
                      ) : isBetter ? (
                        <span className="font-mono font-bold text-emerald-600 flex items-center gap-0.5">
                          <TrendingDown className="w-3 h-3" />{item.delta_mae_mw} MW
                        </span>
                      ) : isWorse ? (
                        <span className="font-mono font-bold text-amber-700 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />+{item.delta_mae_mw} MW
                        </span>
                      ) : (
                        <span className="text-[#94a3b8] font-mono">0 MW</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison Bar Chart */}
            <div className="w-full h-[220px] pt-2">
              <ResponsiveContainer width="100%" height={220} minWidth={0} debounce={0}>
                <BarChart data={cutoffChartData} margin={{ top: 8, right: 12, left: 8, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} width={42} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#e2e8f0] p-3 rounded-xl shadow-lg text-xs space-y-1 min-w-[180px]">
                            <div className="font-semibold text-[#1a1a2e] border-b border-[#e8eaf6] pb-1">{d.label} Cutoff</div>
                            <div className="flex justify-between text-emerald-700">
                              <span>MAE:</span>
                              <span className="font-mono font-bold">{formatMW(d.mae)}</span>
                            </div>
                            <div className="flex justify-between text-indigo-700">
                              <span>RMSE:</span>
                              <span className="font-mono font-bold">{formatMW(d.rmse)}</span>
                            </div>
                            <div className="flex justify-between text-amber-700">
                              <span>Bias:</span>
                              <span className="font-mono font-bold">{formatSignedMW(d.bias)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mae" name="MAE" fill="#176B4D" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="rmse" name="RMSE" fill="#6366f1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="bias" name="Bias" fill="#f59e0b" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      

    </div>
  );
};
