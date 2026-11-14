import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Scan, 
  LayoutDashboard, 
  ClipboardList, 
  Factory, 
  Settings, 
  LogOut, 
  Cpu, 
  ShieldAlert,
  ChevronRight,
  Activity
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Analytics Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Vision Workbench', path: '/inspections/new', icon: Scan, highlight: true },
    { name: 'Inspection Audit Logs', path: '/inspections', icon: ClipboardList },
    { name: 'Production Lines', path: '/lines', icon: Factory },
    { name: 'System Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0d1424] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
              VisionInspect <span className="text-cyan-400 font-mono text-xs px-1 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Industrial QA Platform</p>
          </div>
        </div>

        {/* System Status Pill */}
        <div className="px-4 py-3 border-b border-slate-800/40 bg-slate-900/40">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-400 font-medium">ONLINE</span>
            </span>
            <span className="text-[11px] text-slate-500">Gemini 2.5 Flash</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : item.highlight
                      ? 'text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-200'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${item.highlight ? 'text-cyan-400' : ''}`} />
                  <span>{item.name}</span>
                </div>
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400"></span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Section & Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-cyan-400 uppercase">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.fullName || 'Quality Operator'}</p>
              <p className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider">{user?.role || 'operator'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/40 text-[10px] text-slate-500 flex justify-between font-mono">
          <span>Enterprise v1.0</span>
          <span>ISO 9001 Compliant</span>
        </div>
      </div>
    </aside>
  );
}
