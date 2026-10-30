import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar }               from './components/Sidebar';
import { TopHeader }             from './components/TopHeader';
import { ControlToolbar }        from './components/ControlToolbar';
import { DashboardView }         from './components/DashboardView';
import { AnalyticsView }         from './components/AnalyticsView';
import { MethodologyModal }      from './components/MethodologyModal';
import {
  fetchHealth,
  fetchAvailableDates,
  fetchDailyAnalysis,
  fetchMonthlySummary,
  fetchCutoffComparison,
  triggerSync
} from './api/client';
import type {
  HealthResponse,
  AvailableDatesResponse,
  DailyAnalysisResponse,
  MonthlySummaryResponse,
  CutoffComparisonResponse
} from './types/api';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export const App: React.FC = () => {
  // ── Router state: '/' (Dashboard) or '/analytics' (Analytics) ────────
  const [currentRoute, setCurrentRoute]   = useState<'/' | '/analytics'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/analytics' || path.startsWith('/analytics') || hash.includes('analytics')) {
        return '/analytics';
      }
    }
    return '/';
  });

  // ── App state ─────────────────────────────────────────────────────────
  const [health, setHealth]               = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [datesInfo, setDatesInfo]         = useState<AvailableDatesResponse | null>(null);

  // ── Analysis parameters (Shared across Dashboard and Analytics) ───────
  const [selectedDate,   setSelectedDate]   = useState('2026-01-14');
  const [dateMode,       setDateMode]       = useState<'decision' | 'delivery'>('decision');
  const [cutoffPreset,   setCutoffPreset]   = useState('11:00');
  const [customCutoff,   setCustomCutoff]   = useState('');
  const [viewMode,       setViewMode]       = useState<'hourly' | 'half_hourly'>('hourly');

  // ── Analysis data ────────────────────────────────────────────────────
  const [analysis,          setAnalysis]          = useState<DailyAnalysisResponse | null>(null);
  const [monthlyData,       setMonthlyData]       = useState<MonthlySummaryResponse | null>(null);
  const [cutoffComparison,  setCutoffComparison]  = useState<CutoffComparisonResponse | null>(null);
  const [loading,           setLoading]           = useState(false);
  const [monthlyLoading,    setMonthlyLoading]    = useState(false);
  const [cutoffLoading,     setCutoffLoading]     = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  // ── Operational states ───────────────────────────────────────────────
  const [syncing,           setSyncing]           = useState(false);
  const [syncMessage,       setSyncMessage]       = useState<string | null>(null);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // ── Client-side SPA Router with HTML5 History & Back/Forward Support ──
  const navigateTo = useCallback((route: '/' | '/analytics') => {
    setCurrentRoute(route);
    if (window.location.pathname !== route) {
      window.history.pushState({ route }, '', route);
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/analytics' || path.startsWith('/analytics') || hash.includes('analytics')) {
        setCurrentRoute('/analytics');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // ── Initial setup: Health & Available dates ──────────────────────────
  useEffect(() => {
    async function init() {
      try {
        setHealthLoading(true);
        const [hRes, dRes] = await Promise.all([
          fetchHealth().catch((err) => { console.error('Health check failed:', err); return null; }),
          fetchAvailableDates().catch((err) => { console.error('Available dates failed:', err); return null; })
        ]);
        setHealth(hRes);
        setDatesInfo(dRes);
      } finally {
        setHealthLoading(false);
      }
    }
    init();
  }, []);

  // ── Data loaders ─────────────────────────────────────────────────────
  const loadDailyAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyAnalysis({
        date: selectedDate,
        date_mode: dateMode,
        cutoff_preset: cutoffPreset,
        custom_cutoff_time: cutoffPreset === 'custom' ? customCutoff : undefined,
        view_mode: viewMode
      });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve analysis.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, dateMode, cutoffPreset, customCutoff, viewMode]);

  const loadCutoffSensitivity = useCallback(async () => {
    setCutoffLoading(true);
    try {
      const data = await fetchCutoffComparison({ date: selectedDate, date_mode: dateMode, view_mode: viewMode });
      setCutoffComparison(data);
    } catch (err: any) {
      console.error('Failed to load cutoff sensitivity:', err);
    } finally {
      setCutoffLoading(false);
    }
  }, [selectedDate, dateMode, viewMode]);

  const loadMonthlySummary = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const data = await fetchMonthlySummary({
        cutoff_preset: cutoffPreset,
        custom_cutoff_time: cutoffPreset === 'custom' ? customCutoff : undefined,
        view_mode: viewMode
      });
      setMonthlyData(data);
    } catch (err: any) {
      console.error('Failed to load monthly summary:', err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [cutoffPreset, customCutoff, viewMode]);

  // ── Reactive data reload on param change ─────────────────────────────
  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (!active) return;
      loadDailyAnalysis();
      loadCutoffSensitivity();
      loadMonthlySummary();
    };
    run();
    return () => { active = false; };
  }, [loadDailyAnalysis, loadCutoffSensitivity, loadMonthlySummary]);

  // ── Elexon BMRS Synchronization Action ───────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await triggerSync();
      setSyncMessage(res.message);
      const h = await fetchHealth();
      setHealth(h);
      loadDailyAnalysis();
      loadCutoffSensitivity();
      loadMonthlySummary();
    } catch (err: any) {
      setError(`Elexon Sync Failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleApply = () => {
    loadDailyAnalysis();
    loadCutoffSensitivity();
    loadMonthlySummary();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#EEF0FF' }}>

      {/* Sidebar: Navigates between '/' (Dashboard) and '/analytics' (Analytics) */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Main area */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* Top Header: Branding, Title, Elexon BMRS Live Connection */}
        <TopHeader
          currentRoute={currentRoute}
          health={health}
          healthLoading={healthLoading}
        />

        <main className="ws-main">

          {/* Compact Control Toolbar: Perspective, Date, Cutoff, Resolution, Apply, Sync */}
          <ControlToolbar
            datesInfo={datesInfo}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            dateMode={dateMode}
            onDateModeChange={setDateMode}
            cutoffPreset={cutoffPreset}
            onCutoffPresetChange={(preset: string) => { setCutoffPreset(preset); setCustomCutoff(''); }}
            customCutoff={customCutoff}
            onCustomCutoffChange={setCustomCutoff}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onApply={handleApply}
            loading={loading}
            syncing={syncing}
            syncMessage={syncMessage}
            onSync={handleSync}
          />

          {/* Query Error Notification */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-rose-700">{error}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-0.5 text-rose-400 hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !analysis ? (
            <div className="flex flex-col items-center justify-center gap-3 text-[#64748b]" style={{ minHeight: '50vh' }}>
              <div className="w-7 h-7 border-2 border-[#176B4D] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Reconstructing point-in-time forecast from Elexon lakehouse…</span>
            </div>
          ) : analysis ? (
            currentRoute === '/' ? (
              /* 1. Complete Dashboard Page ('/') with all 9 core sections */
              <DashboardView
                analysis={analysis}
                monthlyData={monthlyData}
                cutoffComparison={cutoffComparison}
                cutoffPreset={cutoffPreset}
                onSelectCutoffPreset={(preset) => { setCutoffPreset(preset); setCustomCutoff(''); }}
                viewMode={viewMode}
                cutoffLoading={cutoffLoading}
                monthlyLoading={monthlyLoading}
              />
            ) : (
              /* 2. Separate Detailed Analytics Page ('/analytics') with 4 focused sections */
              <AnalyticsView
                analysis={analysis}
                cutoffComparison={cutoffComparison}
                cutoffPreset={cutoffPreset}
                onSelectCutoffPreset={(preset) => { setCutoffPreset(preset); setCustomCutoff(''); }}
                viewMode={viewMode}
                cutoffLoading={cutoffLoading}
              />
            )
          ) : null}
        </main>
      </div>

      {/* Methodology & Market Context Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />
    </div>
  );
};

export default App;
