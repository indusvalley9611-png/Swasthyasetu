'use client';

import React, { useState } from 'react';
import { TamperEvidentAuditBlock } from '@/lib/types';
import { verifyTamperEvidentChain } from '@/lib/dhoIntelligenceEngine';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Lock,
  FileCode,
  KeyRound,
  AlertTriangle,
  Fingerprint,
  Zap,
} from 'lucide-react';

interface TamperEvidentAuditViewProps {
  blocks: TamperEvidentAuditBlock[];
  district: string;
}

export function TamperEvidentAuditView({ blocks, district }: TamperEvidentAuditViewProps) {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    isValid: boolean;
    verifiedCount: number;
    brokenBlockIndex?: number;
    errorDetails?: string;
  } | null>(null);

  // Filtered blocks
  const filteredBlocks = blocks.filter((b) => {
    if (filterAction !== 'ALL' && b.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.actorName.toLowerCase().includes(q) ||
        b.action.toLowerCase().includes(q) ||
        b.resource.toLowerCase().includes(q) ||
        b.reason.toLowerCase().includes(q) ||
        b.hash.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    // Simulated short verification animation for live judge demo
    setTimeout(async () => {
      const res = await verifyTamperEvidentChain(blocks);
      setVerificationResult({
        tested: true,
        isValid: res.isValid,
        verifiedCount: res.verifiedCount,
        brokenBlockIndex: res.brokenBlockIndex,
        errorDetails: res.errorDetails,
      });
      setIsVerifying(false);
    }, 600);
  };

  const handleSimulateTamper = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      // Create a copy with a tampered reason in block 1
      const tamperedCopy = blocks.map((b, idx) => {
        if (idx === 1) {
          return {
            ...b,
            reason: 'TAMPERED_CONTENT: Altered without recalculating cryptographic hash!',
          };
        }
        return b;
      });

      const res = await verifyTamperEvidentChain(tamperedCopy);
      setVerificationResult({
        tested: true,
        isValid: res.isValid,
        verifiedCount: res.verifiedCount,
        brokenBlockIndex: res.brokenBlockIndex,
        errorDetails: res.errorDetails,
      });
      setIsVerifying(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header & Judge Interactive Verification Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              TAMPER-EVIDENT AUDIT TRAIL (SHA-256)
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              CRYPTOGRAPHICALLY SEALED
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
            District Governance & Statutory Compliance Chain
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Every state-changing DHO decision is immutably signed with sequential hash chaining.
          </p>
        </div>

        {/* Live Chain Integrity Validator Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            <span>Verify Chain Integrity (Live Validator)</span>
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={isVerifying}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Inject simulated unauthorized modification to test validator"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Tamper Detection</span>
          </button>
        </div>
      </div>

      {/* Verification Feedback Banner */}
      {verificationResult?.tested && (
        <div
          className={`p-4 rounded-2xl border transition-all animate-in slide-in-from-top-2 shadow-sm ${
            verificationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                verificationResult.isValid
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-rose-500 text-white shadow-md shadow-rose-600/30'
              }`}
            >
              {verificationResult.isValid ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm flex items-center gap-2">
                <span>
                  {verificationResult.isValid
                    ? 'Cryptographic Chain Integrity 100% Verified'
                    : 'Tamper Detected in Audit Chain!'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/20 dark:bg-black/30">
                  {verificationResult.verifiedCount} of {blocks.length} Blocks Validated
                </span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {verificationResult.isValid
                  ? `All ${verificationResult.verifiedCount} audit records match their exact SHA-256 sequential parent hashes. No entries have been retroactively modified, deleted, or reordered.`
                  : `${verificationResult.errorDetails} (Security violation flagged).`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls: Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterAction('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Blocks ({blocks.length})
          </button>
          <button
            onClick={() => setFilterAction('REALLOCATION_APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'REALLOCATION_APPROVED'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
            }`}
          >
            Reallocations
          </button>
          <button
            onClick={() => setFilterAction('REFERRAL_PRIORITY_OVERRIDE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'REFERRAL_PRIORITY_OVERRIDE'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
            }`}
          >
            Referral Decisions
          </button>
          <button
            onClick={() => setFilterAction('STATE_ESCALATION_SUBMITTED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterAction === 'STATE_ESCALATION_SUBMITTED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
            }`}
          >
            State Escalations
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search block, actor, reason, hash..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sequential Hash Chain Block Cards */}
      <div className="space-y-4">
        {filteredBlocks.map((block, idx) => (
          <div
            key={block.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-3"
          >
            {/* Block Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs flex items-center justify-center border border-indigo-500/20">
                  #{block.index}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {block.action}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                      {block.resource}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Actor: <strong className="text-slate-600 dark:text-slate-300">{block.actorName}</strong> ({block.actorRole})</span>
                    <span>&bull;</span>
                    <span className="font-mono">{new Date(block.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SEALED</span>
              </span>
            </div>

            {/* Mandatory Reason & State Diff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Mandatory Legal Reasoning
                </span>
                <p className="text-slate-700 dark:text-slate-200 font-medium">{block.reason}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Before vs After State Transition
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="p-1.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 truncate">
                    PRE: {JSON.stringify(block.beforeState)}
                  </div>
                  <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 truncate">
                    POST: {JSON.stringify(block.afterState)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Hash Bar */}
            <div className="p-3 rounded-2xl bg-slate-900 text-slate-300 text-[10px] font-mono space-y-1.5 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Previous Block Hash:</span>
                <span className="text-slate-400 truncate max-w-[300px] sm:max-w-md">{block.prevHash}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-indigo-400 font-bold">Current SHA-256 Digest:</span>
                <span className="text-indigo-300 font-bold truncate max-w-[300px] sm:max-w-md">{block.hash}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
