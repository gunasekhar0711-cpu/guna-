import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  ShieldCheck, 
  Sliders, 
  Database, 
  Save, 
  Check, 
  User, 
  Key,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [defaultThreshold, setDefaultThreshold] = useState(85);
  const [autoRejectCritical, setAutoRejectCritical] = useState(true);
  const [ipcClass3Enforced, setIpcClass3Enforced] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          <span>System & Vision Engine Configuration</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Tune AI vision sensitivity thresholds, industrial compliance parameters, and operator preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Operator Profile Card */}
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Authenticated Operator Identity</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Operator Name</span>
              <p className="font-semibold text-white bg-slate-900 p-2 rounded-lg border border-slate-700/80">
                {user?.fullName || 'Active Operator'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Email / SSO Handle</span>
              <p className="font-semibold text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-700/80 font-mono">
                {user?.email || 'operator@factory.com'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Security Role</span>
              <p className="font-mono font-bold text-cyan-400 bg-cyan-950/40 p-2 rounded-lg border border-cyan-800/40 uppercase">
                {user?.role || 'operator'} (Active)
              </p>
            </div>
          </div>
        </div>

        {/* 2. Gemini Vision Engine Settings */}
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Multimodal Vision AI Engine Parameters</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Vision Model Selection</label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Sub-second edge inference)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep complex metallurgical defect reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Structured Schema Strictness</label>
              <input
                type="text"
                disabled
                value="Strict JSON Response Schema (Normalized Coordinates 0-1000)"
                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-slate-400 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Server-Side API Key Protection</span>
              <p className="text-slate-400 mt-0.5">
                The Google Gemini API Key is isolated inside the backend environment (<code className="text-cyan-400">server/.env</code>) and is never exposed to client-side scripts.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Advisory Thresholds */}
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Quality Thresholds & Safety Interlocks</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 font-medium">Default Confidence Threshold</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{defaultThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="99"
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-slate-500 text-[11px] mt-1">
                Detections falling below this percentage score will be flagged for secondary operator inspection.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">Auto-Reject on Critical Severity</span>
                <span className="text-slate-400 text-[11px]">
                  Automatically classify component as CRITICAL whenever any high-risk defect is detected.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoRejectCritical}
                onChange={(e) => setAutoRejectCritical(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-200 font-medium block">IPC-A-610 Class 3 Electronics Standard</span>
                <span className="text-slate-400 text-[11px]">
                  Enforces zero tolerance on solder bridging, dewetting, and pad misalignment.
                </span>
              </div>
              <input
                type="checkbox"
                checked={ipcClass3Enforced}
                onChange={(e) => setIpcClass3Enforced(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
              <Check className="w-4 h-4" /> Parameters saved successfully.
            </span>
          ) : (
            <span></span>
          )}

          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
