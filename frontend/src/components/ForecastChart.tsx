import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import type { IntervalEvaluation } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';

interface ForecastChartProps {
  intervals: IntervalEvaluation[];
  viewMode: 'hourly' | 'half_hourly';
  deliveryDate: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isOver = data.error !== null && data.error > 0;
    return (
      <div className="bg-white border border-[#e2e8f0] p-3.5 rounded-xl shadow-lg text-xs font-sans space-y-1.5 z-50 min-w-[220px]">
        <div className="font-semibold text-[#1a1a2e] border-b border-[#e8eaf6] pb-1.5 flex justify-between gap-4">
          <span>{label} ({data.fullTime ? data.fullTime.slice(11, 16) : ''} UTC)</span>
          <span className="text-[#94a3b8] font-mono font-normal">{data.deliveryDate}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-emerald-700">
          <span className="font-medium">Actual Outturn:</span>
          <span className="font-mono font-bold">{formatMW(data.actual)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#3b82f6]">
          <span className="font-medium">Point-in-Time Forecast:</span>
          <span className="font-mono font-bold">{formatMW(data.forecast)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[#1a1a2e] pt-1.5 border-t border-[#e8eaf6]">
          <span className="font-medium">Variance:</span>
          <span className={`font-mono font-bold ${isOver ? 'text-amber-700' : 'text-[#3b82f6]'}`}>
            {formatSignedMW(data.error)}
          </span>
        </div>
        {data.publishTime && (
          <div className="text-[10px] text-[#94a3b8] pt-1 font-mono">
            Published: {data.publishTime.slice(0, 16).replace('T', ' ')} UTC
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const ForecastChart: React.FC<ForecastChartProps> = ({ intervals, viewMode, deliveryDate }) => {
  const chartData = intervals.map((item) => {
    const label = viewMode === 'hourly'
      ? `${String(item.hour).padStart(2, '0')}:00`
      : `SP ${String(item.settlement_period).padStart(2, '0')}`;
    return {
      label, fullTime: item.start_time, deliveryDate,
      hour: item.hour, settlementPeriod: item.settlement_period,
      actual: item.actual_mw, forecast: item.forecast_mw,
      error: item.error_mw, absError: item.abs_error_mw,
      publishTime: item.publish_time
    };
  });

  return (
    <div className="ws-card p-5">
      {/* Card header — matches Figma "Orders" card header style */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#1a1a2e] m-0 tracking-tight">
            Generation Outturn vs. Point-in-Time Forecast
          </h2>
          <p className="text-[11px] text-[#94a3b8] mt-0.5">
            {viewMode === 'hourly'
              ? 'Hourly like-for-like (Elexon FUELHH actuals averaged to 1h power) · Delivery: ' + deliveryDate
              : 'Half-Hourly Settlement Period resolution (SPs 1–48) · Delivery: ' + deliveryDate}
          </p>
        </div>

        {/* Legend — styled as Figma's Day/Week/Month tabs */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-emerald-500 rounded-full inline-block" />
            <span className="text-[#64748b] font-medium">Actual (MW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-[#3b82f6] rounded-full inline-block border-b-2 border-dashed border-[#3b82f6]" />
            <span className="text-[#64748b] font-medium">Forecast (MW)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={0}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 16 }}>
            <defs>
              <linearGradient id="actualGradientNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
            <XAxis
              dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false}
              interval={viewMode === 'hourly' ? 1 : 3}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis
              stroke="#94a3b8" fontSize={10} tickLine={false} width={40}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
              tick={{ fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="actual"
              fill="url(#actualGradientNew)" stroke="transparent"
              isAnimationActive={false}
            />
            <Line
              type="monotone" dataKey="actual" name="Actual Outturn"
              stroke="#22c55e" strokeWidth={2.5} dot={false}
              activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone" dataKey="forecast" name="Point-in-Time Forecast"
              stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false}
              activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
