import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlusCircle, Clock, ShieldCheck, Bell, Search, Terminal } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard') return 'Quality Analytics & Telemetry Dashboard';
    if (pathname === '/inspections/new') return 'AI Computer Vision Inspection Workbench';
    if (pathname === '/inspections') return 'Component Inspection Audit History';
    if (pathname.startsWith('/inspections/')) return 'Inspection Report & Defect Localization';
    if (pathname === '/lines') return 'Production Lines & Plant Station Hierarchy';
    if (pathname === '/settings') return 'System Configuration & Quality Thresholds';
    return 'Industrial Vision Control Center';
  };

  return (
    <header className="h-16 bg-[#0d1424]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
      {/* Title & Station Context */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* Action Bar & Telemetry */}
      <div className="flex items-center gap-4">
        {/* Live Clock / Shift Tracker */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{time}</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">SHIFT 1 (ACTIVE)</span>
        </div>

        {/* Quick Launch Button */}
        {location.pathname !== '/inspections/new' && (
          <Link
            to="/inspections/new"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold tracking-wide shadow-md shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>RUN INSPECTION</span>
          </Link>
        )}
      </div>
    </header>
  );
}
