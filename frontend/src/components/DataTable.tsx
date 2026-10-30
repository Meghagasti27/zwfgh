import React, { useState } from 'react';
import { Download, Table, Search } from 'lucide-react';
import type { IntervalEvaluation } from '../types/api';
import { formatMW, formatSignedMW, exportAnalysisToCSV } from '../utils/formatters';

interface DataTableProps {
  intervals: IntervalEvaluation[];
  deliveryDate: string;
  decisionDate: string;
  cutoffTime: string;
  viewMode: 'hourly' | 'half_hourly';
  title?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  intervals, deliveryDate, decisionDate, cutoffTime, viewMode, title
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = intervals.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.interval_id.toLowerCase().includes(term) ||
      item.start_time.toLowerCase().includes(term) ||
      (item.sp_span && item.sp_span.toLowerCase().includes(term))
    );
  });

  const handleExport = () => exportAnalysisToCSV(intervals, deliveryDate, decisionDate, cutoffTime, viewMode);

  return (
    <div className="ws-card p-5 space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eaf6] pb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-[#6366f1]" />
          <h3 className="text-sm font-bold text-[#1a1a2e] m-0">
            {title || 'Complete Interval Audit Records'}
          </h3>
          <span className="text-xs text-[#94a3b8] font-mono">
            ({filtered.length} intervals)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text" placeholder="Search interval / time…"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#f8f9ff] border border-[#e2e8f0] text-[#1a1a2e] text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/30 w-44 transition-shadow"
            />
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#f8f9ff] text-[#64748b] border border-[#e2e8f0] text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            title="Download analysis as CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#6366f1]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-[#e8eaf6] rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f8f9ff] text-[#94a3b8] sticky top-0 border-b border-[#e8eaf6] text-[10px] font-semibold tracking-wider uppercase z-10">
            <tr>
              <th className="py-3 px-4">Interval</th>
              <th className="py-3 px-4">Time (UTC)</th>
              <th className="py-3 px-4">Span</th>
              <th className="py-3 px-4 text-right">Actual Outturn</th>
              <th className="py-3 px-4 text-right">PIT Forecast</th>
              <th className="py-3 px-4 text-right">Variance</th>
              <th className="py-3 px-4">Publish Time (UTC)</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8eaf6] font-mono text-[#1a1a2e]">
            {filtered.map((item) => {
              const isOver  = item.error_mw !== null && item.error_mw > 0;
              const isUnder = item.error_mw !== null && item.error_mw < 0;

              return (
                <tr key={item.interval_id} className="ws-table-row transition-colors">
                  <td className="py-2.5 px-4 font-semibold text-[#1a1a2e] text-[11px]">{item.interval_id}</td>
                  <td className="py-2.5 px-4 text-[#64748b] text-[11px]">{item.start_time.slice(11, 16)}</td>
                  <td className="py-2.5 px-4 text-[#64748b] font-sans text-[11px]">
                    {item.sp_span || (item.settlement_period ? `SP ${item.settlement_period}` : `H ${item.hour}`)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-700 text-[11px]">
                    {formatMW(item.actual_mw)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-[#3b82f6] text-[11px]">
                    {formatMW(item.forecast_mw)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[11px]">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      isOver
                        ? 'text-amber-800 bg-amber-50 border border-amber-200'
                        : isUnder
                        ? 'text-blue-800 bg-blue-50 border border-blue-200'
                        : 'text-[#94a3b8]'
                    }`}>
                      {formatSignedMW(item.error_mw)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[#94a3b8] text-[11px]">
                    {item.publish_time ? item.publish_time.slice(0, 16).replace('T', ' ') : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center font-sans text-[11px]">
                    {item.status === 'complete' ? (
                      <span className="badge-delivered inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        Delivered
                      </span>
                    ) : (
                      <span className="badge-missing inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase">
                        {item.status}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
