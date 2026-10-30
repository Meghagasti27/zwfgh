import React, { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, ReferenceLine,
  LineChart, Line, ComposedChart
} from 'recharts';
import type { IntervalEvaluation, MonthlySummaryResponse } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';

interface ErrorAnalysisSectionProps {
  intervals: IntervalEvaluation[];
  viewMode: 'hourly' | 'half_hourly';
  monthlyData: MonthlySummaryResponse | null;
  monthlyLoading: boolean;
}

export const ErrorAnalysisSection: React.FC<ErrorAnalysisSectionProps> = ({
  intervals, viewMode, monthlyData, monthlyLoading
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'diurnal'>('daily');

  const dailyErrorData = intervals
    .filter((item) => item.error_mw !== null)
    .map((item) => ({
      label: viewMode === 'hourly' ? `${String(item.hour).padStart(2, '0')}:00` : `SP ${item.settlement_period}`,
      error: item.error_mw,
      actual: item.actual_mw,
      forecast: item.forecast_mw
    }));

  const monthlyTrendData = monthlyData?.daily_trends.map((item) => ({
    label: item.decision_date.slice(5),
    mae: item.mae_mw, bias: item.bias_mw,
    rmse: item.rmse_mw
  })) || [];

  const diurnalData = monthlyData?.diurnal_profile.map((item) => ({
    label: item.period_label,
    mae: item.mae_mw, bias: item.mean_error_mw,
    samples: item.sample_count
  })) || [];

  const TABS = [
    { key: 'daily',   label: 'Residuals' },
    { key: 'diurnal', label: 'Diurnal' },
    { key: 'monthly', label: 'Monthly' },
  ] as const;

  return (
    <div className="ws-card p-4">
      {/* Header + tabs */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e8eaf6]">
        <h3 className="text-sm font-bold text-[#1a1a2e] m-0">
          Error Analysis
        </h3>
        <div className="seg-ctrl">
          {TABS.map(({ key, label }) => (
            <button key={key} type="button"
              onClick={() => setActiveTab(key as any)}
              className={`seg-btn ${activeTab === key ? 'active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily Residuals */}
      {activeTab === 'daily' && (
        <div className="w-full h-[240px]">
          <ResponsiveContainer width="100%" height={240} minWidth={0} debounce={0}>
            <BarChart data={dailyErrorData} margin={{ top: 8, right: 12, left: 8, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false}
                     interval={viewMode === 'hourly' ? 1 : 3} tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} width={38}
                     tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} tick={{ fill: '#94a3b8' }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-lg shadow-lg text-xs space-y-1 min-w-[160px]">
                        <div className="font-semibold text-[#1a1a2e]">{d.label}</div>
                        <div className="flex justify-between">
                          <span className="text-[#94a3b8]">Variance</span>
                          <span className={`font-mono font-bold ${d.error > 0 ? 'text-amber-700' : 'text-[#3b82f6]'}`}>
                            {formatSignedMW(d.error)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94a3b8]">Actual</span>
                          <span className="font-mono text-[#1a1a2e]">{formatMW(d.actual)}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="error" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {dailyErrorData.map((entry) => (
                  <Cell key={`cell-${entry.label}`}
                        fill={entry.error !== null && entry.error > 0 ? '#f59e0b' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Diurnal Profile */}
      {activeTab === 'diurnal' && (
        <div>
          {monthlyLoading && !monthlyData ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-[#94a3b8] animate-pulse">Loading…</div>
          ) : (
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height={240} minWidth={0} debounce={0}>
                <ComposedChart data={diurnalData} margin={{ top: 8, right: 12, left: 8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false}
                         interval={1} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} width={38}
                         tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-lg shadow-lg text-xs space-y-1 min-w-[160px]">
                            <div className="font-semibold text-[#1a1a2e]">{d.label} UTC</div>
                            <div className="flex justify-between">
                              <span className="text-[#94a3b8]">Avg MAE</span>
                              <span className="font-mono font-bold text-emerald-700">{formatMW(d.mae)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#94a3b8]">Avg Bias</span>
                              <span className="font-mono font-bold text-amber-700">{formatSignedMW(d.bias)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="mae" fill="#176B4D" opacity={0.85} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bias" stroke="#f59e0b" strokeWidth={2.5} dot={false}
                        activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Monthly Horizon */}
      {activeTab === 'monthly' && (
        <div>
          {monthlyLoading && !monthlyData ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-[#94a3b8] animate-pulse">Loading…</div>
          ) : (
            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height={240} minWidth={0} debounce={0}>
                <LineChart data={monthlyTrendData} margin={{ top: 8, right: 12, left: 8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false}
                         interval={2} tick={{ fill: '#94a3b8' }} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} width={38}
                         tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8' }} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-[#e2e8f0] p-2.5 rounded-lg shadow-lg text-xs space-y-1 min-w-[160px]">
                            <div className="font-semibold text-[#1a1a2e]">2026-{d.label}</div>
                            <div className="flex justify-between">
                              <span className="text-[#94a3b8]">MAE</span>
                              <span className="font-mono font-bold text-emerald-700">{formatMW(d.mae)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#94a3b8]">Bias</span>
                              <span className="font-mono font-bold text-amber-700">{formatSignedMW(d.bias)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="mae" stroke="#176B4D" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: '#176B4D', stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={false} />
                  <Line type="monotone" dataKey="bias" stroke="#f59e0b" strokeWidth={2}
                        strokeDasharray="4 4" dot={false}
                        activeDot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
