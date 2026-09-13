'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { KPICard } from '@/components/ui/design-system';
import { getMedicineStatus } from '@/lib/resourceManagement';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import {
  Globe,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Clock,
  Flame,
  FileText,
  Lock,
} from 'lucide-react';

export function NationalMahaAushadhiView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers } = useSync();

  const [activeTab, setActiveTab] = useState<'network' | 'interstate' | 'performance' | 'audit'>('network');

  const criticalStockouts = useMemo(() => {
    return stocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
  }, [stocks]);

  const activeTransfers = useMemo(() => {
    return stockTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
  }, [stockTransfers]);

  const completedTransfers = useMemo(() => {
    return stockTransfers.filter((t) => t.status === 'COMPLETED');
  }, [stockTransfers]);

  const auditLogs = useMemo(() => {
    return getAuditLogs().slice(0, 30);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header with National Apex Oversight */}
      <MahaAushadhiHeader
        roleTitle="National Health Authority (NHA / MoHFW New Delhi)"
        facilityName="Ministry of Health and Family Welfare, Government of India"
        primaryActionLabel="Issue National Stock Advisory"
        onPrimaryAction={() => setActiveTab('interstate')}
        primaryActionIcon={Globe}
        primaryActionClass="bg-indigo-600 hover:bg-indigo-700 text-white"
      />

      {/* 2. 4 National Strategic KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="States Monitored"
          value="28 + 8 UTs"
          subtext="Maharashtra Grid Active"
          color="indigo"
          icon={Globe}
        />
        <KPICard
          label="State Buffer Breaches"
          value={criticalStockouts.length}
          subtext="Under active regional escort"
          color={criticalStockouts.length > 0 ? 'rose' : 'emerald'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Active Inter-Facility Shipments"
          value={activeTransfers.length}
          subtext="108 Priority Siren transit"
          color="amber"
          icon={Truck}
        />
        <KPICard
          label="ABDM Interoperability"
          value="100%"
          subtext="Zero schema violations"
          color="emerald"
          icon={ShieldCheck}
        />
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            <strong>ABDM Privacy Guard:</strong> Individual patient identifiable clinical information is strictly masked at the National Command layer. Only aggregated public health supply and logistics metrics are displayed.
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">DISHA Compliant</span>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'network'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          National Network Intelligence ({activeTransfers.length})
        </button>
        <button
          onClick={() => setActiveTab('interstate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'interstate'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Interstate Requirements (Central Depots)
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'performance'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          State Redistribution Performance
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          National Cryptographic Audit Trail
        </button>
      </div>

      {/* 4. Tab 1: National Network Intelligence */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>State Command Center Status</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Maharashtra DHS (Mumbai)</div>
                    <div className="text-[11px] text-slate-500">Pune, Nashik, Gadchiroli, Thane Grids Active</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ONLINE & SYNCED
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Gujarat DHS (Gandhinagar)</div>
                    <div className="text-[11px] text-slate-500">Border corridor interlinked with Nashik</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    INTEROPERABLE
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                <span>Strategic National Stock Reserve</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Anti-Snake Venom (ASV Central Reserve)</span>
                  <span className="font-bold text-slate-900 dark:text-white">96.4% Reserve Target</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '96.4%' }} />
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pt-2">
                  <span>Emergency Oxytocin & Magnesium Sulphate</span>
                  <span className="font-bold text-slate-900 dark:text-white">98.1% Reserve Target</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '98.1%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab 2: Interstate Requirements */}
      {activeTab === 'interstate' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Interstate Emergency Drug Coordination Matrix
          </h3>
          <p>
            Central Medical Services Society (CMSS) strategic stockpile allocations for vector outbreaks and regional disaster escalations.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Western Zonal Buffer: Maharashtra & Gujarat Corridor
            </div>
            <p className="text-slate-500">
              No cross-border escalation requested in the past 24 hours. Maharashtra state internal redistribution grid is successfully meeting local demand with an average response time of 42 minutes.
            </p>
          </div>
        </div>
      )}

      {/* 6. Tab 3: State Redistribution Performance */}
      {activeTab === 'performance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            State Redistribution Performance Scorecard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400">Average Transit Time</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">42 Minutes</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">18 min faster than national benchmark</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400">Donor Buffer Compliance</span>
              <div className="text-xl font-black text-emerald-600 mt-1">100.0%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero statutory buffer breaches caused</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400">2FA OTP Handover Verification</span>
              <div className="text-xl font-black text-teal-600 mt-1">100.0%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero unverified physical deliveries</div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Audit */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            National Health Authority Cryptographic Audit Trail
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black text-teal-600">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{log.resource}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Actor: <strong>{log.userName}</strong> &bull; Level: {log.administrativeLevel} &bull; Facility: {log.userFacility}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
