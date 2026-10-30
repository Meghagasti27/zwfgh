import React, { useState } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, Check
} from 'lucide-react';
import type { AvailableDatesResponse } from '../types/api';

interface ControlToolbarProps {
  datesInfo: AvailableDatesResponse | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  dateMode: 'decision' | 'delivery';
  onDateModeChange: (mode: 'decision' | 'delivery') => void;
  cutoffPreset: string;
  onCutoffPresetChange: (preset: string) => void;
  customCutoff: string;
  onCustomCutoffChange: (time: string) => void;
  viewMode: 'hourly' | 'half_hourly';
  onViewModeChange: (mode: 'hourly' | 'half_hourly') => void;
  onApply: () => void;
  loading: boolean;
  syncing: boolean;
  syncMessage: string | null;
  onSync: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  datesInfo,
  selectedDate,
  onDateChange,
  dateMode,
  onDateModeChange,
  cutoffPreset,
  onCutoffPresetChange,
  customCutoff,
  onCustomCutoffChange,
  viewMode,
  onViewModeChange,
  onApply,
  loading,
  syncing,
  syncMessage,
  onSync
}) => {
  const [showCustom, setShowCustom] = useState(cutoffPreset === 'custom');

  const availableDecisionDates = datesInfo?.primary_evaluation_window.decision_dates ||
    Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
  const availableDeliveryDates = datesInfo?.primary_evaluation_window.delivery_dates ||
    Array.from({ length: 31 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, i + 2));
      return d.toISOString().slice(0, 10);
    });

  const currentDates = dateMode === 'decision' ? availableDecisionDates : availableDeliveryDates;
  const currentIndex = currentDates.indexOf(selectedDate);

  const handlePrevDay = () => {
    if (currentIndex > 0) onDateChange(currentDates[currentIndex - 1]);
  };
  const handleNextDay = () => {
    if (currentIndex >= 0 && currentIndex < currentDates.length - 1) onDateChange(currentDates[currentIndex + 1]);
  };

  const handleCutoffSelect = (preset: string) => {
    if (preset === 'custom') {
      setShowCustom(true);
      onCutoffPresetChange('custom');
    } else {
      setShowCustom(false);
      onCutoffPresetChange(preset);
    }
  };

  return (
    <div className="ws-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">

        {/* 1. Perspective Toggle: Decision (D-1) / Delivery (D) */}
        <div className="seg-ctrl">
          <button
            type="button"
            onClick={() => onDateModeChange('decision')}
            className={`seg-btn ${dateMode === 'decision' ? 'active' : ''}`}
            title="Evaluate buying decisions made on D-1"
          >
            Decision (D-1)
          </button>
          <button
            type="button"
            onClick={() => onDateModeChange('delivery')}
            className={`seg-btn ${dateMode === 'delivery' ? 'active' : ''}`}
            title="Evaluate actual delivery on day D"
          >
            Delivery (D)
          </button>
        </div>

        {/* 2. Date Picker with Previous and Next Navigation */}
        <div className="flex items-center gap-0.5 bg-[#f8f9ff] border border-[#e2e8f0] rounded-lg px-0.5 py-0.5">
          <button
            type="button"
            onClick={handlePrevDay}
            disabled={currentIndex <= 0}
            className="p-1 rounded text-[#64748b] hover:text-[#1a1a2e] hover:bg-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1 px-1.5">
            <Calendar className="w-3 h-3 text-[#6366f1]" />
            <input
              type="text"
              list="control-date-options"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent border-0 text-[#1a1a2e] text-xs font-mono font-semibold focus:outline-none w-[82px] text-center cursor-pointer"
            />
            <datalist id="control-date-options">
              {currentDates.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <button
            type="button"
            onClick={handleNextDay}
            disabled={currentIndex >= currentDates.length - 1}
            className="p-1 rounded text-[#64748b] hover:text-[#1a1a2e] hover:bg-white disabled:opacity-30 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-[#e2e8f0] hidden sm:block" />

        {/* 3. Decision Cutoff Presets + Custom Option */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#176B4D] shrink-0" />
          {['09:00', '11:00', '14:00', '17:00'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleCutoffSelect(p)}
              className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                cutoffPreset === p
                  ? 'bg-[#176B4D] text-white border-[#176B4D] shadow-xs'
                  : 'bg-transparent text-[#64748b] border-transparent hover:text-[#1a1a2e] hover:bg-[#f8f9ff]'
              }`}
              title={p === '11:00' ? '11:00 UTC (Recommended Baseline)' : `${p} UTC`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleCutoffSelect('custom')}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border flex items-center gap-0.5 ${
              cutoffPreset === 'custom'
                ? 'bg-[#6366f1] text-white border-[#6366f1] shadow-xs'
                : 'bg-transparent text-[#64748b] border-transparent hover:text-[#1a1a2e] hover:bg-[#f8f9ff]'
            }`}
          >
            <span>Custom</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Custom cutoff input */}
        {showCustom && cutoffPreset === 'custom' && (
          <input
            type="text"
            placeholder="HH:MM"
            value={customCutoff}
            onChange={(e) => onCustomCutoffChange(e.target.value)}
            maxLength={5}
            className="w-16 bg-[#f8f9ff] border border-[#e2e8f0] text-[#1a1a2e] text-xs rounded-md px-2 py-1 text-center font-mono focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30"
          />
        )}

        {/* Separator */}
        <div className="w-px h-6 bg-[#e2e8f0] hidden sm:block" />

        {/* 4. Resolution Toggle: Hourly / Half-Hourly */}
        <div className="seg-ctrl">
          <button
            type="button"
            onClick={() => onViewModeChange('hourly')}
            className={`seg-btn ${viewMode === 'hourly' ? 'active' : ''}`}
            title="Hourly like-for-like averaged power comparison"
          >
            Hourly
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('half_hourly')}
            className={`seg-btn ${viewMode === 'half_hourly' ? 'active' : ''}`}
            title="Settlement periods 1–48 half-hourly resolution"
          >
            Half-Hourly
          </button>
        </div>

        {/* 5. Apply Analysis Button */}
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="px-4 py-1.5 bg-[#176B4D] hover:bg-[#12543C] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {loading ? 'Evaluating…' : 'Apply Analysis'}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 6. Sync Elexon BMRS Action */}
        <div className="flex items-center gap-2">
          {syncMessage && (
            <span className="hidden md:flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" /> {syncMessage}
            </span>
          )}
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#1a1a2e] hover:text-[#176B4D] hover:bg-[#f8f9ff] border border-[#e2e8f0] text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh from Elexon BMRS API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#176B4D]' : 'text-[#64748b]'}`} />
            <span>{syncing ? 'Syncing…' : 'Sync Elexon BMRS'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
