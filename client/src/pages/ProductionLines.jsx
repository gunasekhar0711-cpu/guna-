import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  Plus, 
  MapPin, 
  Calendar, 
  Layers, 
  CheckCircle, 
  Cpu, 
  RefreshCw, 
  X,
  AlertCircle
} from 'lucide-react';
import { linesApi } from '../services/api';

export default function ProductionLines() {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [factoryLocation, setFactoryLocation] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLines = async () => {
    try {
      setLoading(true);
      const data = await linesApi.getLines();
      setLines(data.lines || []);
    } catch (err) {
      console.error('Error fetching lines:', err);
      setError('Failed to load production lines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLines();
  }, []);

  const handleCreateLine = async (e) => {
    e.preventDefault();
    if (!name.trim() || !factoryLocation.trim()) {
      setError('Please provide line name and factory location.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await linesApi.createLine({
        name: name.trim(),
        factoryLocation: factoryLocation.trim(),
        description: description.trim()
      });

      setSuccess('Production line registered successfully.');
      setName('');
      setFactoryLocation('');
      setDescription('');
      setShowModal(false);
      fetchLines();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Error creating line:', err);
      setError(err.response?.data?.error || 'Failed to create production line.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-cyan-400" />
            <span>Manufacturing Plants & Production Lines</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure industrial plants, automated optical stations, and inspection routing hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLines}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Production Line</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Lines */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-mono text-xs">
          Loading active production lines...
        </div>
      ) : lines.length === 0 ? (
        <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-12 text-center space-y-3">
          <Factory className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Production Lines Configured</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Get started by adding your facility's first assembly, SMT, or fabrication line.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase tracking-wider"
          >
            Create Line
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lines.map((line) => (
            <div
              key={line.id}
              className="bg-[#0f172a] rounded-xl border border-slate-800 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80 text-cyan-400 group-hover:scale-105 transition-transform">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">{line.name}</h3>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-cyan-500" />
                        <span>{line.factory_location}</span>
                      </div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>

                <p className="text-xs text-slate-400 mt-4 line-clamp-2 leading-relaxed">
                  {line.description || 'Automated multi-spectral inspection node.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Inspections Logged:</span>
                <span className="text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {line.inspection_count || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Creating Production Line */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Factory className="w-4 h-4 text-cyan-400" />
                <span>Register Production Line</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLine} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Line Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SMT PCB Assembly Line 5"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Factory Location / Facility Wing <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={factoryLocation}
                  onChange={(e) => setFactoryLocation(e.target.value)}
                  placeholder="e.g. Building B - Cleanroom Bay 3"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Inspection Scope
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Process details, tolerances, component types..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save Production Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
