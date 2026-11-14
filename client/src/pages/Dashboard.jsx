import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Activity, 
  Scan, 
  PlusCircle, 
  RefreshCw,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import StatCard from '../components/StatCard';
import AnalyticsCharts from '../components/AnalyticsCharts';
import InspectionTable from '../components/InspectionTable';
import { analyticsApi, inspectionsApi, linesApi } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [recentInspections, setRecentInspections] = useState([]);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [analyticsRes, inspectionsRes, linesRes] = await Promise.all([
        analyticsApi.getSummary(),
        inspectionsApi.getInspections({ limit: 8 }),
        linesApi.getLines()
      ]);

      setSummaryData(analyticsRes);
      setRecentInspections(inspectionsRes.inspections || []);
      setLines(linesRes.lines || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to fetch real-time telemetry metrics. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading && !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-cyan-400">
        <RefreshCw className="w-8 h-8 animate-spin mb-3" />
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Aggregating Plant Telemetry & Defect Analytics...</p>
      </div>
    );
  }

  const summary = summaryData?.summary || {
    totalInspections: 0,
    passedInspections: 0,
    warningInspections: 0,
    criticalInspections: 0,
    passRate: 0,
    averageConfidence: 96.5,
    avgProcessingTimeSec: 1.4
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome / Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>REAL-TIME SENSORY TELEMETRY STREAM</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Plant Quality Assurance & Defect Analytics</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
          <Link
            to="/inspections/new"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold tracking-wide shadow-md shadow-cyan-500/20"
          >
            <Scan className="w-4 h-4" />
            <span>RUN INSPECTION</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboardData} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inspected Parts"
          value={summary.totalInspections}
          unit="UNITS"
          subtitle="Processed through Gemini Vision"
          icon={Scan}
          color="cyan"
          trend={{ value: '+12.4% vs last shift', isPositive: true }}
        />
        <StatCard
          title="First-Pass Quality Yield"
          value={summary.passRate}
          unit="%"
          subtitle={`${summary.passedInspections} nominal zero-defect units`}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: 'Target: >95.0%', isPositive: summary.passRate >= 95 }}
        />
        <StatCard
          title="Critical Anomaly Alerts"
          value={summary.criticalInspections}
          unit="STOP"
          subtitle="Urgent line intervention required"
          icon={XCircle}
          color="rose"
          trend={{ value: `${summary.warningInspections} warnings pending`, isPositive: false }}
        />
        <StatCard
          title="Mean AI Latency"
          value={summary.avgProcessingTimeSec}
          unit="SEC"
          subtitle={`Avg Confidence: ${summary.averageConfidence}%`}
          icon={Cpu}
          color="amber"
          trend={{ value: 'Multimodal Flash 2.5', isPositive: true }}
        />
      </div>

      {/* Critical Defect Alert Banner (if any) */}
      {summaryData?.criticalAlerts && summaryData.criticalAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-300 uppercase font-mono">Critical Quality Interventions:</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-200 text-[10px] font-mono font-bold">
                  {summaryData.criticalAlerts.length} ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Most recent on Line: <span className="font-semibold text-white">{summaryData.criticalAlerts[0].line_name}</span> for SKU{' '}
                <span className="font-mono text-cyan-300 font-bold">{summaryData.criticalAlerts[0].item_sku}</span>.
              </p>
            </div>
          </div>
          <Link
            to={`/inspections/${summaryData.criticalAlerts[0].id}`}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold self-start md:self-auto shrink-0 transition-colors shadow-md shadow-rose-600/30"
          >
            Review Root Cause
          </Link>
        </div>
      )}

      {/* Analytics Charts */}
      <AnalyticsCharts
        timeline={summaryData?.timeline || []}
        categories={summaryData?.categories || []}
        severity={summaryData?.severity || []}
      />

      {/* Recent Inspection Records Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Recent Vision Inspections</span>
            <span className="text-xs font-mono text-slate-400 font-normal">({recentInspections.length} logs)</span>
          </h2>
          <Link
            to="/inspections"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>View All Inspection Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <InspectionTable inspections={recentInspections} lines={lines} onRefresh={loadDashboardData} />
      </div>
    </div>
  );
}
