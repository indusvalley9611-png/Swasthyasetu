'use client';

import React from 'react';
import { FacilityHealthScorecard } from '@/lib/types';
import {
  X,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Package,
  Bed,
  HeartPulse,
} from 'lucide-react';

interface DistrictScorecardModalProps {
  scorecard: FacilityHealthScorecard;
  onClose: () => void;
  onExecuteCorrectiveAction: (scorecard: FacilityHealthScorecard) => void;
}

export function DistrictScorecardModal({
  scorecard,
  onClose,
  onExecuteCorrectiveAction,
}: DistrictScorecardModalProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 65) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                DISTRICT HEALTH SCORECARD DIAGNOSTIC
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Rank #{scorecard.rank}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              {scorecard.facilityName}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span>{scorecard.facilityType}</span>
              <span>&bull;</span>
              <span>{scorecard.taluka} Taluka</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-5 text-xs">
          {/* Main Composite Score Banner */}
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Composite Performance Rating</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{scorecard.compositeScore}</span>
                <span className="text-xs text-slate-400 font-bold">/ 100 PTS</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated across 4 operational safety and efficiency dimensions
              </p>
            </div>

            <div className="flex flex-col items-end">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
                  scorecard.trend === 'IMPROVING'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : scorecard.trend === 'DECLINING'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                }`}
              >
                {scorecard.trend === 'IMPROVING' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : scorecard.trend === 'DECLINING' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{scorecard.changePercent7Days > 0 ? `+${scorecard.changePercent7Days}%` : `${scorecard.changePercent7Days}%`} (7D)</span>
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-semibold">
                Status: {scorecard.trend}
              </span>
            </div>
          </div>

          {/* 4 Dimension Sub-Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-500" />
                  Stock Adequacy
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getScoreColor(scorecard.metrics.stockAdequacyScore)}`}>
                  {scorecard.metrics.stockAdequacyScore}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${scorecard.metrics.stockAdequacyScore}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-500" />
                  Referral Speed
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getScoreColor(scorecard.metrics.referralSpeedScore)}`}>
                  {scorecard.metrics.referralSpeedScore}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${scorecard.metrics.referralSpeedScore}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-purple-500" />
                  Bed Safety Buffer
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getScoreColor(scorecard.metrics.bedSafetyScore)}`}>
                  {scorecard.metrics.bedSafetyScore}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${scorecard.metrics.bedSafetyScore}%` }} />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  ICU Stability
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getScoreColor(scorecard.metrics.icuStabilityScore)}`}>
                  {scorecard.metrics.icuStabilityScore}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${scorecard.metrics.icuStabilityScore}%` }} />
              </div>
            </div>
          </div>

          {/* Root Causes Analysis */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-950 dark:text-rose-100 space-y-2">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4" />
              <span>Identified Diagnostic Deficits & Bottlenecks</span>
            </h4>
            {scorecard.rootCauses.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                No critical operational bottlenecks detected. Facility operating within optimal parameters.
              </p>
            ) : (
              <ul className="space-y-1 pl-5 list-disc text-[11px] text-slate-700 dark:text-slate-200 font-medium">
                {scorecard.rootCauses.map((rc, idx) => (
                  <li key={idx}>{rc}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Suggested Corrective Action */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-850 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
            <h4 className="font-bold text-xs flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Recommended DHO Corrective Action</span>
            </h4>
            <p className="text-[11px] text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
              {scorecard.suggestedCorrectiveAction}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Diagnostic
          </button>
          <button
            type="button"
            onClick={() => {
              onExecuteCorrectiveAction(scorecard);
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Execute Suggested Corrective Action</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
