import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  Camera, 
  Sliders, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Layers, 
  RefreshCw,
  Cpu,
  ShieldCheck,
  X
} from 'lucide-react';
import { linesApi, inspectionsApi } from '../services/api';

export default function InspectionUploader() {
  const navigate = useNavigate();

  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [stationName, setStationName] = useState('AOI Optical Station 1');
  const [itemSku, setItemSku] = useState('');
  const [operatorNotes, setOperatorNotes] = useState('');
  
  // Advisory settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [autoRejectCritical, setAutoRejectCritical] = useState(true);

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera feed simulation state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusStep, setStatusStep] = useState('');

  // Fetch production lines on mount
  useEffect(() => {
    async function loadLines() {
      try {
        const data = await linesApi.getLines();
        setLines(data.lines || []);
        if (data.lines && data.lines.length > 0) {
          setSelectedLineId(data.lines[0].id);
        }
      } catch (err) {
        console.error('Failed to load lines:', err);
      }
    }
    loadLines();
  }, []);

  // Handle file drop & selection
  const handleFileChange = (file) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB industrial upload limit.');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Helper to load sample industrial images for testing
  const loadSampleImage = (type) => {
    let sku = 'PCB-STM32-REV4';
    let notes = 'Triggered from SMT inline automated test bench';
    let svgContent = '';

    if (type === 'pcb') {
      sku = 'PCB-STM32-REV4';
      notes = 'AOI Station detected high probability solder bridge and rotational misalignment.';
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#0d2818"/>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1b4d2e" stroke-width="1"/>
        </pattern>
        <rect width="800" height="600" fill="url(#grid)" />
        <path d="M 50 150 L 250 150 L 320 220 L 480 220" stroke="#00b4d8" stroke-width="4" fill="none"/>
        <rect x="320" y="240" width="160" height="160" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="3"/>
        <text x="400" y="325" fill="#f8fafc" font-size="16" font-family="monospace" text-anchor="middle" font-weight="bold">ARM STM32H7</text>
        <circle cx="310" cy="310" r="14" fill="#ef4444" opacity="0.85"/>
        <text x="50" y="560" fill="#4ade80" font-size="16" font-family="monospace">SMT PRODUCTION CAM FEED 01</text>
      </svg>`;
    } else if (type === 'metal') {
      sku = 'ALUM-HOUSING-CAST-08';
      notes = 'Checking for porosity, stress cracks, and surface scratches post-CNC mill.';
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#1e293b"/>
        <circle cx="400" cy="300" r="220" fill="#334155" stroke="#64748b" stroke-width="8"/>
        <circle cx="400" cy="300" r="140" fill="#0f172a" stroke="#475569" stroke-width="4"/>
        <path d="M 280 230 Q 320 280 340 360" stroke="#ef4444" stroke-width="3" stroke-dasharray="3,3" fill="none"/>
        <text x="50" y="560" fill="#38bdf8" font-size="16" font-family="monospace">DIE-CAST FOUNDRY INSPECTION FEED</text>
      </svg>`;
    } else {
      sku = 'SOLAR-PV-WAFER-M10';
      notes = 'Electroluminescence micro-crack inspection.';
      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#0f172a"/>
        <rect x="150" y="80" width="500" height="440" fill="#1e3a8a" stroke="#3b82f6" stroke-width="2"/>
        <line x1="250" y1="80" x2="250" y2="520" stroke="#93c5fd" stroke-width="3"/>
        <line x1="400" y1="80" x2="400" y2="520" stroke="#93c5fd" stroke-width="3"/>
        <line x1="550" y1="80" x2="550" y2="520" stroke="#93c5fd" stroke-width="3"/>
        <text x="50" y="560" fill="#a855f7" font-size="16" font-family="monospace">SOLAR EL OPTICAL SENSOR 03</text>
      </svg>`;
    }

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const file = new File([blob], `${sku.toLowerCase()}.svg`, { type: 'image/svg+xml' });

    setItemSku(sku);
    setOperatorNotes(notes);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(blob));
    setErrorMessage('');
  };

  // Submit inspection to backend
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select or capture an inspection image.');
      return;
    }
    if (!selectedLineId) {
      setErrorMessage('Please select a production line.');
      return;
    }
    if (!itemSku.trim()) {
      setErrorMessage('Please provide a valid part or SKU number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setStatusStep('Uploading high-resolution inspection frame...');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('lineId', selectedLineId);
      formData.append('stationName', stationName);
      formData.append('itemSku', itemSku.trim());
      formData.append('operatorNotes', operatorNotes);

      setStatusStep('Transmitting to Google Gemini 2.5 Vision AI...');
      const response = await inspectionsApi.createInspection(formData, (progress) => {
        setUploadProgress(progress);
        if (progress === 100) {
          setStatusStep('Gemini Vision AI: Analyzing surface, solder & assembly geometry...');
        }
      });

      setStatusStep('Inspection logged! Navigating to Defect Localization Review...');
      setTimeout(() => {
        navigate(`/inspections/${response.inspection.id}`);
      }, 600);
    } catch (err) {
      console.error('Inspection upload error:', err);
      setErrorMessage(
        err.response?.data?.error || err.message || 'Inspection pipeline failed. Please check backend connection.'
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>Industrial Edge AI Ingestion</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Run AI Vision Quality Inspection</h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload high-resolution camera frames or CAD schematics for automated defect detection, classification, and coordinate extraction.
          </p>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-mono">Quick Test Samples:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadSampleImage('pcb')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              SMT Circuit Board
            </button>
            <button
              type="button"
              onClick={() => loadSampleImage('metal')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              Die-Cast Metal
            </button>
            <button
              type="button"
              onClick={() => loadSampleImage('solar')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 hover:border-cyan-500/50 transition-all"
            >
              Solar Wafer
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Inspection Form */}
      <form onSubmit={handleSubmitInspection} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Image Dropzone & Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative min-h-[380px] rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 bg-[#0f172a] ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : previewUrl
                ? 'border-slate-700'
                : 'border-slate-700/80 hover:border-slate-600'
            }`}
          >
            {previewUrl ? (
              <div className="relative w-full flex flex-col items-center">
                <img
                  src={previewUrl}
                  alt="Inspection Preview"
                  className="max-h-[360px] w-auto object-contain rounded-lg shadow-xl border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-rose-400 border border-slate-700 backdrop-blur-sm"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="mt-3 flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Image Loaded ({selectedFile?.name || 'capture.svg'}) - Ready for Vision AI</span>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-cyan-400">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">Drag & Drop Component Image Here</h3>
                  <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, WEBP, or SVG files up to 20MB</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <label className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md shadow-cyan-500/20 transition-all">
                    Browse File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Progress / Step Feedback */}
          {submitting && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {statusStep}
                </span>
                <span className="text-slate-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadProgress, 25)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Parameters & Advisory Configuration */}
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Inspection Parameters
            </h3>

            {/* Production Line Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Production Line <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {lines.length === 0 && <option value="">No lines available - create one</option>}
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.factory_location})
                  </option>
                ))}
              </select>
            </div>

            {/* Station Identifier */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Station Identifier <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Optical Bench B-02"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Item SKU / Part Number */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Component SKU / Part # <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                placeholder="e.g. PCB-STM32-REV4"
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono uppercase"
              />
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Operator Notes / Observations</label>
              <textarea
                rows={2}
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="Optional notes or anomalies noticed during initial manual feed..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              ></textarea>
            </div>

            {/* Advisory Configuration */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Confidence Threshold</span>
                <span className="font-mono text-cyan-400 font-bold">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-cyan-400 bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">Auto-Reject on Critical Severity</span>
                <input
                  type="checkbox"
                  checked={autoRejectCritical}
                  onChange={(e) => setAutoRejectCritical(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing AI Vision...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Vision Inspection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
