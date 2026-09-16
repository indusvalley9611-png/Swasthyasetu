'use client';

import React, { useState } from 'react';
import { StateEscalation } from '@/lib/types';
import {
  X,
  Share2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Building2,
  FileText,
  Send,
  Zap,
} from 'lucide-react';

interface StateEscalationModalProps {
  district: string;
  actorName: string;
  actorId: string;
  onClose: () => void;
  onEscalate: (escalation: Omit<StateEscalation, 'id' | 'createdAt' | 'slaExpiresAt'>) => void;
}

export function StateEscalationModal({
  district,
  actorName,
  actorId,
  onClose,
  onEscalate,
}: StateEscalationModalProps) {
  const [title, setTitle] = useState('Critical ICU Satiation Across District Facilities');
  const [category, setCategory] = useState<StateEscalation['issueCategory']>('ICU_SATURATION');
  const [urgency, setUrgency] = useState<'CRITICAL' | 'HIGH'>('CRITICAL');
  const [summary, setSummary] = useState(
    'All Level-3 and Level-2 ICU beds in Pune District have reached 92%+ capacity. Intra-district reallocations have been fully exhausted with 3 pending emergency trauma/obstetric surgical cases requiring tertiary ICU support.'
  );
  const [attemptedResolutions, setAttemptedResolutions] = useState<string>([
    'Internal bed reallocation executed at District Hospital Aundh (+4 beds)',
    'Attempted secondary placement at Bhor Rural Hospital (100% full)',
    'Step-down HDU conversion initiated',
  ].join('\n'));
  const [reason, setReason] = useState(
    'Mandatory district-level escalation under Maharashtra Epidemic & Critical Resource Protocol.'
  );
  const [slaWindow, setSlaWindow] = useState(60); // 60 minutes SLA
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !reason.trim()) {
      setError('Please fill in all mandatory fields with clear operational justification.');
      return;
    }

    const resolutionList = attemptedResolutions
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    onEscalate({
      district,
      title: title.trim(),
      issueCategory: category,
      summary: summary.trim(),
      attemptedResolutions: resolutionList,
      urgency,
      status: 'PENDING',
      slaWindowMinutes: Number(slaWindow),
      dhoActorId: actorId,
      dhoActorName: actorName,
      actionReason: reason.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-rose-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                <Share2 className="w-3 h-3 text-rose-400" />
                STATE HEALTH AUTHORITY ESCALATION
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                DEMO-SIMULATED NETWORK
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              Escalate Unresolved Critical Bottleneck
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Directorate of Health Services (DHS Maharashtra) Apex Command Channel
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4 text-xs">
          {/* SLA Notice Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center justify-between font-bold text-[11px]">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                AUTOMATED STATE SLA TRIGGER
              </span>
              <span className="font-mono text-[10px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200">
                {slaWindow} Mins SLA Window
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              If the State Directorate does not acknowledge or resolve this within <strong>{slaWindow} minutes</strong>, the system will <strong>automatically auto-escalate</strong> to the National Health Authority (NHA Apex Mission Control, New Delhi).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                Issue Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="ICU_SATURATION">ICU / Ventilator Saturation (100% In-District)</option>
                <option value="DRUG_STOCKOUT">Critical Drug Stockout (ASV, Oxytocin, Anti-Rabies)</option>
                <option value="SPECIALIST_UNAVAILABLE">Specialist Unavailable (Pediatric Surgeon, Neuro)</option>
                <option value="MASS_CASUALTY">Mass Casualty Incident / Epidemic Inundation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                Urgency Level *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="CRITICAL">CRITICAL — Imminent Loss of Life / Total Stockout</option>
                <option value="HIGH">HIGH — Critical Buffer Depletion within 12 Hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              Escalation Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              placeholder="e.g. Critical ICU Bed Satiation Across District Facilities"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              Comprehensive Situation Summary *
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              placeholder="Describe the clinical/resource deficit and why in-district resolution failed..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              Attempted In-District Resolutions (One per line) *
            </label>
            <textarea
              rows={3}
              required
              value={attemptedResolutions}
              onChange={(e) => setAttemptedResolutions(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              placeholder="List specific steps already taken at the district level..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
              Mandatory DHO Statutory Reasoning *
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              placeholder="Justification for state-level emergency intervention..."
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Transmit Escalation to State HQ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
