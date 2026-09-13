'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { DispatchModal } from './DispatchModal';
import { KPICard } from '@/components/ui/design-system';
import { getMedicineStatus, getSafeTransferableQuantity } from '@/lib/resourceManagement';
import { StockTransfer } from '@/lib/types';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import {
  BarChart3,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Share2,
  ShieldCheck,
  Search,
  Clock,
  MapPin,
  Flame,
  FileText,
  Filter,
} from 'lucide-react';

export function StateMahaAushadhiView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers } = useSync();

  const [activeTab, setActiveTab] = useState<'operations' | 'transfers' | 'grid' | 'audit'>('operations');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dispatchTarget, setDispatchTarget] = useState<StockTransfer | null>(null);

  // Critical stockouts across entire state
  const criticalStockouts = useMemo(() => {
    return stocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
  }, [stocks]);

  const limitedStockouts = useMemo(() => {
    return stocks.filter((s) => getMedicineStatus(s) === 'LIMITED');
  }, [stocks]);

  // All emergency / critical transfers across state
  const emergencyTransfers = useMemo(() => {
    return stockTransfers.filter(
      (t) => t.isEmergency || t.urgency === 'CRITICAL' || t.urgency === 'URGENT'
    );
  }, [stockTransfers]);

  const activeTransfers = useMemo(() => {
    return emergencyTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
  }, [emergencyTransfers]);

  const inTransitList = useMemo(() => {
    return emergencyTransfers.filter((t) => t.status === 'DISPATCHED');
  }, [emergencyTransfers]);

  const resolvedTodayList = useMemo(() => {
    return emergencyTransfers.filter((t) => t.status === 'COMPLETED');
  }, [emergencyTransfers]);

  // Filtered stocks for State Buffer Grid
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.facilityName.toLowerCase().includes(searchQuery.toLowerCase());
      const status = getMedicineStatus(s);
      const matchSeverity = severityFilter === 'ALL' || status === severityFilter;
      return matchSearch && matchSeverity;
    });
  }, [stocks, searchQuery, severityFilter]);

  const auditLogs = useMemo(() => {
    return getAuditLogs().slice(0, 40);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header with Apex Command Action */}
      <MahaAushadhiHeader
        roleTitle="State Health Directorate (DHS Mumbai)"
        facilityName="Directorate of Health Services (DHS), Maharashtra"
        primaryActionLabel="Apex State Redistribution Directive"
        onPrimaryAction={() => setActiveTab('operations')}
        primaryActionIcon={Flame}
        primaryActionClass="bg-rose-700 hover:bg-rose-800 text-white"
      />

      {/* 2. 4 State Macro KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Critical Buffer Breaches"
          value={criticalStockouts.length}
          subtext="Across 36 Maharashtra Districts"
          color={criticalStockouts.length > 0 ? 'rose' : 'emerald'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Active Emergency Transfers"
          value={activeTransfers.length}
          subtext="High-priority inter-facility"
          color={activeTransfers.length > 0 ? 'amber' : 'emerald'}
          icon={Truck}
        />
        <KPICard
          label="Consignments in Transit"
          value={inTransitList.length}
          subtext="Police green corridors / EMS"
          color="blue"
          icon={Clock}
        />
        <KPICard
          label="Resolved Today"
          value={resolvedTodayList.length}
          subtext="Emergency requisitions fulfilled"
          color="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('operations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'operations'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          State Critical Operations ({activeTransfers.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transfers'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Active Consignments ({inTransitList.length})
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'grid'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Statewide Buffer Grid (36 Districts) ({filteredStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          ABDM Cryptographic Audit ({auditLogs.length})
        </button>
      </div>

      {/* 4. Tab 1: State Critical Operations */}
      {activeTab === 'operations' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
            <div>
              <h3 className="font-black text-rose-900 dark:text-rose-200 text-sm">
                Maharashtra State Emergency Requisition Grid
              </h3>
              <p className="text-xs text-rose-700/80 dark:text-rose-400">
                Priority requisitions from primary, secondary, and tertiary health units requiring state oversight or regional buffer release
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600">
              Directive 2026-ASV
            </span>
          </div>

          <div className="space-y-4">
            {activeTransfers.map((sos) => {
              const isCritical = sos.urgency === 'CRITICAL';
              const isApproved = sos.status === 'APPROVED';

              return (
                <div
                  key={sos.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 relative overflow-hidden"
                >
                  <div
                    className={`absolute top-0 left-0 w-2 h-full ${
                      isCritical ? 'bg-rose-600' : 'bg-amber-500'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-500">
                          {sos.consignmentCode || sos.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isCritical
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          {sos.urgency} EMERGENCY
                        </span>
                        <span className="text-xs text-slate-400">
                          Logged: {new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {sos.medicineName} &bull; {sos.requestedQuantity} Units
                      </h3>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{sos.emergencyIndication || sos.reason}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-slate-400">Target Delivery:</span>
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {sos.requiredByTime ? new Date(sos.requiredByTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Stat'}
                      </div>
                    </div>
                  </div>

                  {/* Route Pair */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Receiving Unit</span>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{sos.destinationFacilityName}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Supplying Donor Unit</span>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{sos.sourceFacilityName}</div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pl-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <ShieldCheck className="w-4 h-4 text-teal-500" />
                      <span>State Statutory Safety Algorithm Enforced</span>
                    </div>

                    {isApproved && (
                      <button
                        onClick={() => setDispatchTarget(sos)}
                        className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Authorize Green Corridor Dispatch</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {activeTransfers.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Zero Pending Emergency Requisitions Statewide
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All emergency medicine requisitions across Maharashtra have been fulfilled or dispatched under active fleet supervision.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Active Consignments */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          {inTransitList.map((trf) => (
            <div
              key={trf.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-900/80 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-600">
                      {trf.consignmentCode || trf.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      HIGH-PRIORITY TRANSIT
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {trf.medicineName} &bull; {trf.requestedQuantity} Units
                  </h4>
                  <p className="text-xs text-slate-500">
                    Route: <strong>{trf.sourceFacilityName}</strong> &rarr; <strong>{trf.destinationFacilityName}</strong>
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Escort: {trf.transportMode?.replace(/_/g, ' ') || '108 EMS Priority'}
                </div>
              </div>
            </div>
          ))}

          {inTransitList.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No emergency shipments currently in transit across the state network.
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Statewide Buffer Grid */}
      {activeTab === 'grid' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Statewide Critical Lifesaving Drug Buffer Grid
              </h3>
              <p className="text-xs text-slate-500">
                Live monitoring across primary, secondary, and tertiary health centres in Maharashtra
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="CRITICAL">Critical Breaches</option>
                <option value="LIMITED">Limited Buffers</option>
                <option value="HEALTHY">Optimal Buffers</option>
              </select>

              <input
                type="text"
                placeholder="Search drug or facility..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Facility Name</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Safe Buffer</th>
                  <th className="py-2.5 px-3">Transferable Surplus</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStocks.map((s) => {
                  const status = getMedicineStatus(s);
                  const safeQty = getSafeTransferableQuantity(s, stockTransfers);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.drugName}</div>
                        <div className="text-[10px] text-slate-400">{s.category}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {s.facilityName}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                        {s.currentStock} {s.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {s.bufferStock} {s.unit}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${safeQty > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {safeQty} {s.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            status === 'CRITICAL'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                              : status === 'LIMITED'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab 4: ABDM Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            Statewide Cryptographic Logistics Audit Trail
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
                    Officer: <strong>{log.userName}</strong> ({log.userRole}) &bull; Facility: {log.userFacility} &bull; Administrative Level: {log.administrativeLevel}
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

      {/* Dispatch Modal */}
      {dispatchTarget && (
        <DispatchModal
          transfer={dispatchTarget}
          onClose={() => setDispatchTarget(null)}
        />
      )}
    </div>
  );
}
