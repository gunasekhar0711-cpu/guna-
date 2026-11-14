import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { inspectionsApi } from '../services/api';

export default function InspectionTable({ inspections = [], onRefresh, lines = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lineFilter, setLineFilter] = useState('ALL');
  const [downloadingId, setDownloadingId] = useState(null);

  const filtered = inspections.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.item_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.defect_summary && item.defect_summary.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesLine = lineFilter === 'ALL' || item.line_id === lineFilter;

    return matchesSearch && matchesStatus && matchesLine;
  });

  const handleDownloadCsv = async (e, id, sku) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDownloadingId(id);
      await inspectionsApi.downloadCsv(id, sku);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'PASSED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-mono">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PASSED
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30 font-mono">
          <AlertTriangle className="w-3.5 h-3.5" />
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30 font-mono">
        <XCircle className="w-3.5 h-3.5" />
        CRITICAL
      </span>
    );
  };

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-4 bg-[#0d1424] border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SKU, keyword, defect..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filters */}
          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700/80 text-xs">
            {['ALL', 'PASSED', 'WARNING', 'CRITICAL'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Line Filter */}
          {lines.length > 0 && (
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Production Lines</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800 tracking-wider">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Item SKU</th>
              <th className="px-4 py-3">Production Line</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Defects</th>
              <th className="px-4 py-3 text-right">Confidence</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500 font-mono">
                  No inspection records match the current criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                    <Link
                      to={`/inspections/${item.id}`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      {item.item_sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                    <div>{item.line_name || 'Production Line'}</div>
                    <div className="text-[10px] text-slate-500">{item.factory_location || 'Main Bay'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                      Number(item.defect_count) > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.defect_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
                    {Number(item.overall_confidence).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => handleDownloadCsv(e, item.id, item.item_sku)}
                        disabled={downloadingId === item.id}
                        title="Export CSV Audit"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/inspections/${item.id}`}
                        className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <span>Review</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="px-4 py-3 bg-[#0d1424] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {filtered.length} of {inspections.length} recorded inspections</span>
        <span className="font-mono text-[11px] text-slate-500">Live Database Sync: Active</span>
      </div>
    </div>
  );
}
