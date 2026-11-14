import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export default function AnalyticsCharts({ timeline = [], categories = [], severity = [] }) {
  const customTooltipStyle = {
    backgroundColor: '#0d1424',
    borderColor: '#334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '12px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Quality Yield & Inspection Trend Over Time */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
            <span>Inspection Throughput & Defect Trend</span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Last 7 Days
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Daily count of passed vs critical/warning defect detections</p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="passedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area 
                type="monotone" 
                dataKey="passed" 
                name="Passed (Nominal)" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#passedGradient)" 
              />
              <Area 
                type="monotone" 
                dataKey="critical" 
                name="Critical Defects" 
                stroke="#ef4444" 
                fillOpacity={1} 
                fill="url(#criticalGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Defect Category Distribution */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center justify-between">
            <span>Defects by Engineering Category</span>
            <span className="text-[11px] font-mono text-slate-400">Class 3 IPC Standard</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Aggregated distribution across Electrical, Assembly, Surface, and Structural</p>
        </div>

        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="count" name="Identified Defects" radius={[4, 4, 0, 0]}>
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || '#06b6d4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
