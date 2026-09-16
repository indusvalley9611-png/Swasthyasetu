'use client';

import React, { useState } from 'react';
import { SmartReallocationRecommendation, Role } from '@/lib/types';
import {
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Flame,
} from 'lucide-react';

interface SmartReallocationModalProps {
  recommendation: SmartReallocationRecommendation;
  onClose: () => void;
  onApprove: (recommendation: SmartReallocationRecommendation, reason: string) => void;
  onReject: (recommendation: SmartReallocationRecommendation, reason: string) => void;
}

export function SmartReallocationModal({
  recommendation,
  onClose,
  onApprove,
  onReject,
}: SmartReallocationModalProps) {
  const [reason, setReason] = useState(
    recommendation.urgency === 'CRITICAL'
      ? 'Emergency clinical deficit mitigation authorized under DHO protocol'
      : 'Routine buffer rebalancing to prevent stockout'
  );
  const [error, setError] = useState('');

  const handleConfirm = (type: 'APPROVE' | 'REJECT') => {
    if (!reason.trim()) {
      setError('Mandatory reasoning is required for all DHO resource reallocation decisions.');
      return;
    }
    setError('');
    if (type === 'APPROVE') {
      onApprove(recommendation, reason.trim());
    } else {
      onReject(recommendation, reason.trim());
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                SMART RESOURCE REALLOCATION
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                AI-RANKED DISPATCH
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              Reallocate {recommendation.resourceName}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ranked transfer from surplus facility to deficit catchment area
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5 text-xs">
          {/* Transfer Route Visualizer */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              {/* Source Node */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  SURPLUS SOURCE (+{recommendation.sourceAvailableSurplus} {recommendation.unit})
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">{recommendation.sourceFacilityName}</h4>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Origin Warehouse / Facility</span>
                </div>
              </div>

              {/* Transit Details */}
              <div className="flex flex-col items-center justify-center text-center px-2">
                <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 dark:text-blue-400">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{recommendation.recommendedQuantity} {recommendation.unit}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {recommendation.distanceKm} km
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    ~{recommendation.estimatedTransitMinutes} mins
                  </span>
                </div>
              </div>

              {/* Destination Node */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-1">
                <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  DEFICIT DESTINATION (-{recommendation.destinationDeficit} {recommendation.unit})
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">{recommendation.destinationFacilityName}</h4>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Requiring Immediate Supply</span>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Breakdown Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Resource Type</span>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5">{recommendation.resourceType}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Transfer Urgency</span>
              <div className={`font-black mt-0.5 ${recommendation.urgency === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                {recommendation.urgency}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Safe Surplus Post-Transfer</span>
              <div className="font-bold text-emerald-600 mt-0.5">
                +{recommendation.sourceAvailableSurplus - recommendation.recommendedQuantity} {recommendation.unit}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-medium">Audit Trail Linkage</span>
              <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 truncate">
                SHA-256 Chained
              </div>
            </div>
          </div>

          {/* Mandatory Reasoning Section (Feature 5) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Mandatory Decision Reasoning (कायदेशीर ऑडिट कारण) *</span>
              <span className="text-[10px] text-rose-500 font-semibold">Required for State Compliance</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
              placeholder="Enter clinical or operational rationale for this reallocation decision..."
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
            />
            {error && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleConfirm('REJECT')}
              className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Reallocation</span>
            </button>
            <button
              type="button"
              onClick={() => handleConfirm('APPROVE')}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Dispatch Transfer</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
