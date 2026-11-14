import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, PlusCircle, RefreshCw, Filter, FileSpreadsheet } from 'lucide-react';
import InspectionTable from '../components/InspectionTable';
import { inspectionsApi, linesApi } from '../services/api';

export default function InspectionsList() {
  const [inspections, setInspections] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [inspectionsRes, linesRes] = await Promise.all([
        inspectionsApi.getInspections({ limit: 100 }),
        linesApi.getLines()
      ]);
      setInspections(inspectionsRes.inspections || []);
      setLines(linesRes.lines || []);
    } catch (err) {
      console.error('Error fetching inspection logs:', err);
      setError('Failed to load inspection records. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-cyan-400" />
            <span>Inspection Audit Records</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Complete historical quality logs, defect coordinates, and operator verification records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <Link
            to="/inspections/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Inspection</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Main Table */}
      <InspectionTable
        inspections={inspections}
        lines={lines}
        onRefresh={loadData}
      />
    </div>
  );
}
