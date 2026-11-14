import React from 'react';

export default function StatCard({ title, value, unit, subtitle, icon: Icon, color = 'cyan', trend }) {
  const colorStyles = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      bgGlow: 'bg-cyan-500/10 text-cyan-400',
      textAccent: 'text-cyan-400'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      bgGlow: 'bg-emerald-500/10 text-emerald-400',
      textAccent: 'text-emerald-400'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      bgGlow: 'bg-amber-500/10 text-amber-400',
      textAccent: 'text-amber-400'
    },
    rose: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      bgGlow: 'bg-rose-500/10 text-rose-400',
      textAccent: 'text-rose-400'
    }
  };

  const currentStyle = colorStyles[color] || colorStyles.cyan;

  return (
    <div className={`bg-[#0f172a] rounded-xl p-5 border ${currentStyle.border} transition-all duration-200 shadow-md flex flex-col justify-between group`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">{value}</span>
            {unit && <span className="text-sm font-semibold text-slate-400 font-mono">{unit}</span>}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${currentStyle.bgGlow} transition-transform group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-slate-400">{subtitle}</span>
        {trend && (
          <span className={`font-mono font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
