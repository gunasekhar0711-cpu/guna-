import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  User, 
  Factory, 
  Cpu, 
  Layers, 
  FileText, 
  Check, 
  Save, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Crosshair
} from 'lucide-react';
import DefectOverlayViewer from '../components/DefectOverlayViewer';
import { inspectionsApi } from '../services/api';

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusVal, setStatusVal] = useState('WARNING');
  const [notesVal, setNotesVal] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInspection() {
      try {
        setLoading(true);
        setError('');
        const data = await inspectionsApi.getInspectionById(id);
        setInspection(data.inspection);
        setStatusVal(data.inspection.status);
        setNotesVal(data.inspection.operator_notes || '');
        if (data.inspection.defects && data.inspection.defects.length > 0) {
          setSelectedDefect(data.inspection.defects[0]);
        }
      } catch (err) {
        console.error('Error fetching inspection:', err);
        setError('Failed to retrieve inspection details. Report may not exist.');
      } finally {
        setLoading(false);
      }
    }
    fetchInspection();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await inspectionsApi.updateStatus(id, statusVal, notesVal);
      setInspection(prev => ({
        ...prev,
        status: res.inspection.status,
        operator_notes: res.inspection.operator_notes
      }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving status:', err);
      alert('Failed to update inspection status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!inspection) return;
    try {
      await inspectionsApi.downloadCsv(inspection.id, inspection.item_sku);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-cyan-400">
        <RotateCcw className="w-8 h-8 animate-spin mb-3" />
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Loading Optical Defect Coordinates & AI Schema...</p>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm">
          {error || 'Inspection report not found'}
        </div>
        <Link
          to="/inspections"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspections List</span>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    if (status === 'PASSED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          PASSED - NOMINAL
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-500/40 font-mono">
          <AlertTriangle className="w-4 h-4" />
          WARNING - TOLERANCE EXCEEDED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-500/40 font-mono">
        <XCircle className="w-4 h-4" />
        CRITICAL - INTERVENTION REQUIRED
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Action & Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/inspections"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Inspection Logs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white font-mono uppercase tracking-tight">
                {inspection.item_sku}
              </h1>
              {getStatusBadge(inspection.status)}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              REPORT ID: {inspection.id} • {new Date(inspection.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Overview Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-xs">
        <div>
          <span className="text-slate-400 uppercase font-mono text-[10px]">Production Line</span>
          <p className="font-semibold text-slate-100 mt-0.5">{inspection.line_name || 'Production Line'}</p>
          <p className="text-slate-400 text-[11px]">{inspection.factory_location || 'High Bay'}</p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-mono text-[10px]">Inspector / Station</span>
          <p className="font-semibold text-slate-100 mt-0.5">{inspection.inspector_name || 'Automated Pipeline'}</p>
          <p className="text-slate-400 text-[11px]">Optical Station A</p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-mono text-[10px]">Overall AI Confidence</span>
          <p className="font-semibold text-cyan-400 font-mono text-base mt-0.5">
            {Number(inspection.overall_confidence).toFixed(1)}%
          </p>
        </div>
        <div>
          <span className="text-slate-400 uppercase font-mono text-[10px]">Anomalies Found</span>
          <p className={`font-semibold font-mono text-base mt-0.5 ${inspection.defects?.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {inspection.defects?.length || 0} Defect Regions
          </p>
        </div>
      </div>

      {/* Executive Defect Summary */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-1.5">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Gemini Vision AI Executive Condition Summary</span>
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          {inspection.defect_summary}
        </p>
      </div>

      {/* Main Analysis Section: Left Viewer, Right Defect Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Bounding Box Viewer */}
        <div className="lg:col-span-2">
          <DefectOverlayViewer
            imageUrl={inspection.image_url}
            defects={inspection.defects || []}
            selectedDefectId={selectedDefect?.id}
            onSelectDefect={(d) => setSelectedDefect(d)}
            status={inspection.status}
            overallConfidence={inspection.overall_confidence}
          />
        </div>

        {/* Right Col: Selected Defect Deep-Dive & Quality Actions */}
        <div className="space-y-4">
          {/* Defect Cards List */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                Detected Defect Regions
              </span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                {inspection.defects?.length || 0} TOTAL
              </span>
            </h3>

            {(!inspection.defects || inspection.defects.length === 0) ? (
              <div className="py-6 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">Zero Tolerance Defect Clearance</p>
                <p className="text-[11px]">No structural, surface, assembly, or electrical anomalies detected.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {inspection.defects.map((def, idx) => {
                  const isSelected = selectedDefect?.id === def.id;
                  const bbox = def.boundingBox || def.bounding_box || {};

                  return (
                    <div
                      key={def.id || idx}
                      onClick={() => setSelectedDefect(def)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 shadow-md shadow-cyan-500/10'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-cyan-400">#{idx + 1}</span>
                          <span>{def.defectType || def.defect_type}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          def.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                          def.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}>
                          {def.severity}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] line-clamp-2">{def.description}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
                        <span>Confidence: {Math.round(def.confidenceScore || def.confidence_score || 90)}%</span>
                        <span>Box: [{bbox.ymin},{bbox.xmin},{bbox.ymax},{bbox.xmax}]</span>
                      </div>

                      {def.correctiveAction && isSelected && (
                        <div className="mt-2 p-2 rounded bg-slate-950/80 border border-cyan-500/20 text-[11px] text-cyan-200">
                          <span className="font-semibold text-slate-400 block mb-0.5">Corrective Action:</span>
                          {def.correctiveAction || def.corrective_action}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operator Disposition & Sign-off Panel */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Operator Review & Sign-Off</span>
              {saveSuccess && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> SAVED
                </span>
              )}
            </h3>

            <form onSubmit={handleStatusUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Quality Clearance Decision
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="PASSED">PASSED (Approved for Packaging)</option>
                  <option value="WARNING">WARNING (Minor Deviation - Approved with Caveat)</option>
                  <option value="CRITICAL">CRITICAL (Rejected / Rework Required)</option>
                  <option value="PENDING">PENDING (Hold for Engineering Sign-Off)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operator Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  placeholder="Record verification actions or disposition reasons..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Updating...' : 'Save Quality Decision'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
