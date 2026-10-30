
import React from 'react';
import { KpiGrid } from './KpiGrid';
import { ForecastChart } from './ForecastChart';
import { CutoffSensitivityCard } from './CutoffSensitivityCard';
import { ErrorAnalysisSection } from './ErrorAnalysisSection';
import { DataTable } from './DataTable';
import type {
  DailyAnalysisResponse,
  MonthlySummaryResponse,
  CutoffComparisonResponse
} from '../types/api';

interface DashboardViewProps {
  analysis: DailyAnalysisResponse;
  monthlyData: MonthlySummaryResponse | null;
  cutoffComparison: CutoffComparisonResponse | null;
  cutoffPreset: string;
  onSelectCutoffPreset: (preset: string) => void;
  viewMode: 'hourly' | 'half_hourly';
  cutoffLoading: boolean;
  monthlyLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analysis,
  monthlyData,
  cutoffComparison,
  cutoffPreset,
  onSelectCutoffPreset,
  viewMode,
  cutoffLoading,
  monthlyLoading
}) => {
  return (
    <div className="space-y-4">

      {/* 1. Four KPI Summary Cards */}
      <KpiGrid
        metrics={analysis.metrics}
        coverage={analysis.coverage}
        viewMode={viewMode}
      />

      {/* 2. Forecast Chart and Cutoff Sensitivity */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3">
          <ForecastChart
            intervals={analysis.intervals}
            viewMode={viewMode}
            deliveryDate={analysis.delivery_date}
          />
        </div>

        <div className="xl:col-span-2">
          <CutoffSensitivityCard
            comparisonData={cutoffComparison}
            currentPreset={cutoffPreset}
            onSelectPreset={onSelectCutoffPreset}
            loading={cutoffLoading}
          />
        </div>
      </div>

      {/* 3. Forecast Error Analysis */}
      <ErrorAnalysisSection
        intervals={analysis.intervals}
        viewMode={viewMode}
        monthlyData={monthlyData}
        monthlyLoading={monthlyLoading}
      />

      {/* 4. Complete Interval Audit Records */}
      <section>
        <DataTable
          intervals={analysis.intervals}
          deliveryDate={analysis.delivery_date}
          decisionDate={analysis.decision_date}
          cutoffTime={analysis.cutoff_time}
          viewMode={viewMode}
          title="4. Complete Interval Audit Records"
        />
      </section>

    </div>
  );
};
