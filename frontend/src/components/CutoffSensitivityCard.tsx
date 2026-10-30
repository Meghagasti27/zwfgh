import React from 'react';
import { Clock, TrendingDown, TrendingUp, Check } from 'lucide-react';
import type { CutoffComparisonResponse } from '../types/api';
import { formatMW, formatSignedMW } from '../utils/formatters';

interface CutoffSensitivityCardProps {
  comparisonData: CutoffComparisonResponse | null;
  currentPreset: string;
  onSelectPreset: (preset: string) => void;
  loading: boolean;
}

export const CutoffSensitivityCard: React.FC<CutoffSensitivityCardProps> = ({
  comparisonData, currentPreset, onSelectPreset, loading
}) => {
  if (loading || !comparisonData) {
    return (
      <div className="ws-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[#6366f1]" />
          <h3 className="text-sm font-bold text-[#1a1a2e] m-0">Cutoff Sensitivity</h3>
        </div>
        <div className="h-[240px] flex items-center justify-center text-xs text-[#94a3b8] animate-pulse">
          Loading…
        </div>
      </div>
    );
  }

  const { comparisons, delivery_date } = comparisonData;

  return (
    <div className="ws-card p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e8eaf6]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6366f1]" />
          <h3 className="text-sm font-bold text-[#1a1a2e] m-0">Cutoff Sensitivity</h3>
        </div>
        <span className="text-[10px] text-[#94a3b8] font-mono">{delivery_date}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {comparisons.map((item) => {
          const isSelected = currentPreset === item.preset;
          const isBaseline = item.preset === '11:00';
          const isBetter   = item.delta_mae_mw < 0;
          const isWorse    = item.delta_mae_mw > 0;

          return (
            <div key={item.preset}
              onClick={() => onSelectPreset(item.preset)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#6366f1] bg-[#eef0ff]'
                  : 'border-[#e8eaf6] hover:border-[#6366f1]/40 hover:bg-[#f8f9ff]'
              }`}>

              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-[#1a1a2e]">{item.cutoff_time}</span>
                <div className="flex items-center gap-1">
                  {isBaseline && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-[#176B4D]/10 text-[#176B4D]">Base</span>
                  )}
                  {isSelected && <Check className="w-3 h-3 text-[#6366f1]" />}
                </div>
              </div>

              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">MAE</span>
                  <span className="font-mono font-bold text-[#1a1a2e]">{formatMW(item.mae_mw)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Bias</span>
                  <span className={`font-mono font-medium ${item.bias_mw > 0 ? 'text-amber-700' : 'text-[#3b82f6]'}`}>
                    {formatSignedMW(item.bias_mw)}
                  </span>
                </div>
              </div>

              {!isBaseline && (
                <div className="mt-1.5 pt-1 border-t border-[#e8eaf6] flex items-center justify-between text-[10px]">
                  <span className="text-[#94a3b8]">vs 11:00</span>
                  {isBetter ? (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
