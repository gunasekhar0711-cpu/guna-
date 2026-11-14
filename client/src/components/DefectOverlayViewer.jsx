import React, { useState, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Crosshair,
  Maximize2
} from 'lucide-react';

const CATEGORY_COLORS = {
  STRUCTURAL: {
    border: 'border-rose-500',
    bg: 'bg-rose-500/20 hover:bg-rose-500/30',
    tag: 'bg-rose-500 text-white',
    badge: 'border-rose-500/50 text-rose-400 bg-rose-950/60'
  },
  SURFACE: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
    tag: 'bg-emerald-500 text-white',
    badge: 'border-emerald-500/50 text-emerald-400 bg-emerald-950/60'
  },
  ASSEMBLY: {
    border: 'border-amber-500',
    bg: 'bg-amber-500/20 hover:bg-amber-500/30',
    tag: 'bg-amber-500 text-white',
    badge: 'border-amber-500/50 text-amber-400 bg-amber-950/60'
  },
  ELECTRICAL_OR_THERMAL: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-500/20 hover:bg-cyan-500/30',
    tag: 'bg-cyan-500 text-white',
    badge: 'border-cyan-500/50 text-cyan-400 bg-cyan-950/60'
  }
};

export default function DefectOverlayViewer({ 
  imageUrl, 
  defects = [], 
  selectedDefectId, 
  onSelectDefect,
  status = 'PASSED',
  overallConfidence = 95
}) {
  const [zoom, setZoom] = useState(1);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredDefect, setHoveredDefect] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const containerRef = useRef(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoom(1);

  const filteredDefects = defects.filter(d => {
    if (filterCategory === 'ALL') return true;
    return d.category === filterCategory;
  });

  const getDefectStyle = (category) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.SURFACE;
  };

  return (
    <div className="bg-[#0f172a] rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
      {/* Viewer Control Toolbar */}
      <div className="px-4 py-3 bg-[#0d1424] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-slate-300">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>OPTICAL RETICLE: {defects.length} ANOMALIES</span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1"></div>

          {/* Category Filter Chips */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs">
            {['ALL', 'ELECTRICAL_OR_THERMAL', 'ASSEMBLY', 'SURFACE', 'STRUCTURAL'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filterCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat === 'ELECTRICAL_OR_THERMAL' ? 'ELECTRICAL' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            title={showOverlays ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
            className={`p-1.5 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
              showOverlays ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {showOverlays ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden sm:inline">OVERLAYS</span>
          </button>

          <div className="flex items-center bg-slate-800 rounded p-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.75}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-cyan-400 ml-1 border-l border-slate-700"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div 
        ref={containerRef}
        className="relative min-h-[420px] max-h-[640px] overflow-auto flex items-center justify-center p-4 bg-slate-950/70 select-none"
      >
        {/* Optical Alignment Crosshairs Grid */}
        <div 
          className="relative inline-block transition-transform duration-150 ease-out origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt="Component Visual Inspection"
            className="max-h-[560px] w-auto object-contain rounded-md shadow-2xl block border border-slate-800"
            onError={(e) => {
              // Fallback placeholder if image fails to load
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><text x="300" y="200" fill="%2394a3b8" font-size="18" text-anchor="middle" font-family="sans-serif">Camera Image Stream</text></svg>';
            }}
          />

          {/* Bounding Box Annotations */}
          {showOverlays && filteredDefects.map((defect, index) => {
            const bbox = defect.boundingBox || defect.bounding_box || { ymin: 0, xmin: 0, ymax: 0, xmax: 0 };
            const topPct = (bbox.ymin / 1000) * 100;
            const leftPct = (bbox.xmin / 1000) * 100;
            const heightPct = Math.max(((bbox.ymax - bbox.ymin) / 1000) * 100, 3);
            const widthPct = Math.max(((bbox.xmax - bbox.xmin) / 1000) * 100, 3);

            const isSelected = selectedDefectId === defect.id;
            const isHovered = hoveredDefect?.id === defect.id;
            const style = getDefectStyle(defect.category);

            return (
              <div
                key={defect.id || index}
                onClick={() => onSelectDefect && onSelectDefect(defect)}
                onMouseEnter={() => setHoveredDefect(defect)}
                onMouseLeave={() => setHoveredDefect(null)}
                style={{
                  top: `${topPct}%`,
                  left: `${leftPct}%`,
                  height: `${heightPct}%`,
                  width: `${widthPct}%`,
                }}
                className={`absolute cursor-pointer border-2 transition-all duration-150 z-10 ${style.border} ${style.bg} ${
                  isSelected ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900 border-white' : ''
                }`}
              >
                {/* Defect Marker Tag */}
                <div 
                  className={`absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono whitespace-nowrap shadow-md pointer-events-none ${style.tag}`}
                >
                  #{index + 1} {defect.defectType || defect.defect_type} ({Math.round(defect.confidenceScore || defect.confidence_score || 90)}%)
                </div>

                {/* Corner reticle notches */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* Live Hover Tooltip Card */}
        {hoveredDefect && (
          <div className="absolute bottom-6 right-6 z-30 max-w-sm bg-[#0d1424]/95 backdrop-blur-md border border-cyan-500/40 rounded-lg p-3.5 shadow-2xl text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span className="font-bold text-white text-sm">
                {hoveredDefect.defectType || hoveredDefect.defect_type}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                hoveredDefect.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                hoveredDefect.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {hoveredDefect.severity}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">{hoveredDefect.description}</p>
            {hoveredDefect.correctiveAction && (
              <div className="pt-1.5 border-t border-slate-800 text-[11px] text-cyan-300">
                <span className="font-semibold text-slate-400">Action: </span>
                {hoveredDefect.correctiveAction || hoveredDefect.corrective_action}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Legend Bar */}
      <div className="px-4 py-2.5 bg-[#0a0f1d] border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-300">Category Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span>
            <span>Electrical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span>Assembly</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span>Surface</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span>Structural</span>
          </div>
        </div>

        <div className="font-mono text-[11px] text-slate-400">
          Click any bounding box to inspect root-cause analysis
        </div>
      </div>
    </div>
  );
}
