import React from 'react';
import type { MetricsSummary, CoverageStats } from '../types/api';
import { formatMW, formatSignedMW, formatPercent } from '../utils/formatters';

interface KpiGridProps {
  metrics: MetricsSummary;
  coverage: CoverageStats;
  viewMode: 'hourly' | 'half_hourly';
}

interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  accentColor: string;
  detailColor?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, detail, accentColor, detailColor }) => (
  <div className="ws-card flex flex-col overflow-hidden">
    <div className="p-4 pb-3">
      <div className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-2xl font-bold font-mono text-[#1a1a2e] tracking-tight leading-none">{value}</div>
      {detail && (
        <div className={`text-[11px] font-medium mt-1.5 ${detailColor || 'text-[#64748b]'}`}>{detail}</div>
      )}
    </div>
    <div className="h-[3px] mt-auto" style={{ background: accentColor }} />
  </div>
);

export const KpiGrid: React.FC<KpiGridProps> = ({ metrics, coverage, viewMode }) => {
  const isOverforecast = metrics.bias_mw > 0;
  const intervalLabel = viewMode === 'hourly' ? 'hours' : 'SPs';

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <KpiCard
        label="MAE"
        value={formatMW(metrics.mae_mw)}
        detail={`nMAE ${formatPercent(metrics.nmae_pct)}`}
        accentColor="#22c55e"
      />
      <KpiCard
        label="Forecast Bias"
        value={formatSignedMW(metrics.bias_mw)}
        detail={isOverforecast ? 'Over-forecast → SHORT' : 'Under-forecast → LONG'}
        accentColor={isOverforecast ? '#f59e0b' : '#3b82f6'}
        detailColor={isOverforecast ? 'text-amber-600' : 'text-blue-600'}
      />
      <KpiCard
        label="RMSE"
        value={formatMW(metrics.rmse_mw)}
        detail={metrics.mae_mw > 0 ? `${(metrics.rmse_mw / metrics.mae_mw).toFixed(2)}× MAE` : undefined}
        accentColor="#6366f1"
      />
      <KpiCard
        label="Mean Outturn"
        value={formatMW(metrics.mean_actual_mw)}
        detail={`${coverage.evaluated_intervals}/${(coverage.total_intervals ?? coverage.total_expected_intervals) ?? '—'} ${intervalLabel} · ${formatPercent(coverage.coverage_pct)}`}
        accentColor="#176B4D"
      />
    </div>
  );
};
