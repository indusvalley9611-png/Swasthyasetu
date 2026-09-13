'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { EmergencyRequestModal } from './EmergencyRequestModal';
import { KPICard } from '@/components/ui/design-system';
import { getMedicineStatus } from '@/lib/resourceManagement';
import { StockTransfer, DrugStockItem } from '@/lib/types';
import {
  Flame,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Siren,
  Pill,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface PhcDoctorMahaAushadhiViewProps {
  isNurse?: boolean;
}

export function PhcDoctorMahaAushadhiView({ isNurse = false }: PhcDoctorMahaAushadhiViewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers, effectiveOnline } = useSync();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'stocks' | 'transit'>('requests');

  const facilityId = user?.facilityId || 'fac-phc-velhe';
  const facilityName = user?.facilityName || 'Velhe Primary Health Centre (PHC)';

  // Facility specific drug stock ledger
  const facilityStocks = useMemo(() => {
    return stocks.filter((s) => s.facilityId === facilityId);
  }, [stocks, facilityId]);

  const criticalStocks = useMemo(() => {
    return facilityStocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
  }, [facilityStocks]);

  const lowStocks = useMemo(() => {
    return facilityStocks.filter((s) => getMedicineStatus(s) === 'LIMITED');
  }, [facilityStocks]);

  // Transfers involving this facility
  const facilityTransfers = useMemo(() => {
    return stockTransfers.filter(
      (t) =>
        t.destinationFacilityId === facilityId ||
        t.sourceFacilityId === facilityId ||
        t.destinationFacilityName.toLowerCase().includes('velhe') ||
        t.isEmergency
    );
  }, [stockTransfers, facilityId]);

  const activeRequisitions = useMemo(() => {
    return facilityTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
  }, [facilityTransfers]);

  const inTransitTransfers = useMemo(() => {
    return facilityTransfers.filter((t) => t.status === 'DISPATCHED');
  }, [facilityTransfers]);

  const completedTransfers = useMemo(() => {
    return facilityTransfers.filter((t) => t.status === 'COMPLETED');
  }, [facilityTransfers]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Single Primary Emergency SOS Action */}
      <MahaAushadhiHeader
        roleTitle={isNurse ? 'PHC Staff Nurse (In-Facility)' : 'PHC Medical Officer (MBBS)'}
        facilityName={facilityName}
        primaryActionLabel="+ Emergency Drug SOS"
        onPrimaryAction={() => setIsRequestModalOpen(true)}
        primaryActionIcon={Siren}
        primaryActionClass="bg-rose-600 hover:bg-rose-700 text-white"
      />

      {/* 2. 4 Clinical & Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Critical Buffer Breaches"
          value={criticalStocks.length}
          subtext={criticalStocks.length > 0 ? 'Urgent replenishment needed' : 'All buffers healthy'}
          color={criticalStocks.length > 0 ? 'rose' : 'emerald'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Active Requisitions"
          value={activeRequisitions.length}
          subtext="Awaiting donor / in-flight"
          color={activeRequisitions.length > 0 ? 'amber' : 'emerald'}
          icon={Flame}
        />
        <KPICard
          label="Consignments in Transit"
          value={inTransitTransfers.length}
          subtext="En route via 108 Ambulance"
          color={inTransitTransfers.length > 0 ? 'blue' : 'slate'}
          icon={Truck}
        />
        <KPICard
          label="Emergency Resolved (30d)"
          value={completedTransfers.length}
          subtext="Stocked in local pharmacy"
          color="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* 3. Single Active Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Facility Emergency Requests ({activeRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('stocks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'stocks'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          PHC Lifesaving Stock Status ({facilityStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Active Consignments ({inTransitTransfers.length})
        </button>
      </div>

      {/* 4. Tab 1: Emergency Requests List */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {activeRequisitions.map((req) => {
            const isCritical = req.urgency === 'CRITICAL';
            const isDispatched = req.status === 'DISPATCHED';

            return (
              <div
                key={req.id}
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
                        {req.consignmentCode || req.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isCritical
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        {req.urgency} SOS
                      </span>
                      <span className="text-xs text-slate-400">
                        Initiated: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {req.medicineName} &bull; {req.requestedQuantity} Units
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{req.emergencyIndication || req.reason}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-block ${
                        isDispatched
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Target Delivery: {req.requiredByTime ? new Date(req.requiredByTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Stat'}
                    </div>
                  </div>
                </div>

                {/* Facility Pair Route */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Requesting Care Centre</span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.destinationFacilityName}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Allocated Donor Facility</span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.donorAllocated
                        ? req.sourceFacilityName
                        : 'Matching in progress (Awaiting District coordination)'}
                    </div>
                    {req.donorAllocated && req.allocatedByDistrictUserName && (
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                        &bull; Endorsed by {req.allocatedByDistrictUserName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Clinical Context Footer */}
                <div className="pt-2 pl-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>Statutory 20% buffer preserved at donor facility &bull; 108 Priority Siren Escalation</span>
                  </span>
                  <span className="font-mono text-slate-400">
                    Carrier: {req.transportMode?.replace(/_/g, ' ') || 'EMS Ambulance'}
                  </span>
                </div>
              </div>
            );
          })}

          {activeRequisitions.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Zero Pending Requisitions for this Facility
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No emergency requisitions are currently active or awaiting donor match. If an incoming casualty requires stat medicines, click the button above to broadcast an emergency SOS.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: PHC Lifesaving Stock Status */}
      {activeTab === 'stocks' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Facility Lifesaving Drug Stock Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Monitored critical medicines at {facilityName}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {facilityStocks.length} Lines Monitored
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Medicine & Category</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Statutory Buffer</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {facilityStocks.map((s) => {
                  const status = getMedicineStatus(s);
                  const isCritical = status === 'CRITICAL';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.drugName}</div>
                        <div className="text-[10px] text-slate-400">
                          {s.category} &bull; Batch: {s.batchNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                        {s.currentStock} {s.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {s.bufferStock} {s.unit}
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
                      <td className="py-3 px-3 text-right">
                        {isCritical ? (
                          <button
                            onClick={() => setIsRequestModalOpen(true)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Trigger SOS
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Active Consignments */}
      {activeTab === 'transit' && (
        <div className="space-y-4">
          {inTransitTransfers.map((trf) => (
            <div
              key={trf.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-900/80 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-600">
                      {trf.consignmentCode || trf.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      IN TRANSIT
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {trf.medicineName} &bull; {trf.requestedQuantity} Units
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dispatched from: <strong>{trf.sourceFacilityName}</strong> &rarr; Delivering to: <strong>{trf.destinationFacilityName}</strong>
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Fleet: {trf.transportMode?.replace(/_/g, ' ') || '108 EMERGENCY AMBULANCE'}
                </div>
              </div>
            </div>
          ))}

          {inTransitTransfers.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No consignments currently in transit for {facilityName}.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isRequestModalOpen && (
        <EmergencyRequestModal
          onClose={() => setIsRequestModalOpen(false)}
          defaultUrgency="CRITICAL"
        />
      )}
    </div>
  );
}
