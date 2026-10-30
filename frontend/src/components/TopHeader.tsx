import React from 'react';
import { Wind } from 'lucide-react';
import type { HealthResponse } from '../types/api';

interface TopHeaderProps {
  currentRoute: '/' | '/analytics';
  health: HealthResponse | null;
  healthLoading: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentRoute,
  health,
  healthLoading
}) => {
  const isOnline = health?.status === 'ok';
  const dbCount = health?.database?.actual_days_count;

  return (
    <header className="ws-header">
      {/* Brand & Page Title */}
      <div className="flex items-center gap-2.5 flex-1">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ background: 'linear-gradient(135deg, #176B4D 0%, #22c55e 100%)' }}
        >
          <Wind className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-[#1a1a2e] tracking-tight">
            WindSight
          </span>
          <span className="text-xs text-[#94a3b8] font-medium hidden sm:inline">
            / {currentRoute === '/' ? 'Overview Dashboard' : 'Detailed Forecast Analytics'}
          </span>
        </div>
      </div>

      {/* Right: Elexon BMRS Connection Status */}
      <div className="flex items-center gap-3 text-xs">
        {healthLoading ? (
          <span className="text-[#94a3b8] text-[11px]">Connecting…</span>
        ) : isOnline ? (
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Elexon BMRS Live
            {dbCount !== undefined && (
              <span className="text-[#94a3b8] font-mono ml-0.5">({dbCount}d)</span>
            )}
          </span>
        ) : (
          <span className="text-rose-500 font-medium text-[11px]">Backend Offline</span>
        )}
      </div>
    </header>
  );
};
