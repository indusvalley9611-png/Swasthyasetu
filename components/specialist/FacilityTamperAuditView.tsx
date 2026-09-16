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

interface FacilityTamperAuditViewProps {
  hospitalName: string;
  blocks: TamperEvidentAuditBlock[];
}

export function FacilityTamperAuditView({
  hospitalName,
  blocks,
}: FacilityTamperAuditViewProps) {
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

  const distinctActions = Array.from(new Set(blocks.map((b) => b.action)));

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    setVerificationResult(null);

    // Run verification algorithm
    const result = await verifyTamperEvidentChain(blocks);
    setTimeout(() => {
      setVerificationResult({
        tested: true,
        isValid: result.isValid,
        verifiedCount: result.verifiedCount,
        brokenBlockIndex: result.brokenBlockIndex,
        errorDetails: result.errorDetails,
      });
      setIsVerifying(false);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Validator */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              FACILITY TAMPER-EVIDENT AUDIT CHAIN (SHA-256)
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {hospitalName}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            Hospital Clinical &amp; Admission Audit Trail
          </h3>
          <p className="text-xs text-indigo-200/80 mt-0.5">
            Cryptographically linked immutable log of admissions, discharges, referral decisions, and specialist overrides.
          </p>
        </div>

        {/* Live Integrity Auditor Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            <span>Verify Hospital Chain Integrity</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult?.tested && (
        <div
          className={`p-4 rounded-3xl border animate-in fade-in flex items-start gap-3.5 shadow-md ${
            verificationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200'
          }`}
        >
          {verificationResult.isValid ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="text-sm font-black">
              {verificationResult.isValid
                ? `Cryptographic Chain Verified: All ${verificationResult.verifiedCount} Hospital Blocks Valid`
                : `Tamper Detected at Block #${verificationResult.brokenBlockIndex}!`}
            </h4>
            <p className="text-xs leading-relaxed opacity-90">
              {verificationResult.isValid
                ? 'Every SHA-256 link from Genesis to current block conforms to cryptographic integrity. No unauthorized modifications detected in this facility trail.'
                : verificationResult.errorDetails}
            </p>
          </div>
        </div>
      )}

      {/* Controls: Action Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterAction('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterAction === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Actions ({blocks.length})
          </button>
          {distinctActions.map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterAction === action
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {action.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hash, doctor, action..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Block Chain List */}
      <div className="space-y-3">
        {filteredBlocks.map((block) => (
          <div
            key={block.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 transition-all space-y-3"
          >
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase font-mono">
                  BLOCK #{block.index}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold uppercase">
                  {block.action.replace(/_/g, ' ')}
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-400">
                {new Date(block.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            {/* Main Information */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {block.actorName} ({block.actorRole.toUpperCase()}) &bull; <span className="font-normal text-slate-500">{block.resource}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <strong>Mandatory Justification:</strong> {block.reason}
              </p>
            </div>

            {/* Cryptographic Hash Badges */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-[10px] font-mono space-y-1">
              <div className="flex items-center justify-between text-slate-400 truncate">
                <span>PREV HASH:</span>
                <span className="text-slate-500 truncate ml-2">{block.prevHash}</span>
              </div>
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 truncate font-bold">
                <span>CURR HASH:</span>
                <span className="truncate ml-2">{block.hash}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
