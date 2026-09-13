'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { EmergencyRequestModal } from './EmergencyRequestModal';
import { KPICard } from '@/components/ui/design-system';
import { StockTransfer } from '@/lib/types';
import {
  Flame,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  Siren,
  Wifi,
  Package,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export function AshaMahaAushadhiView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stockTransfers, effectiveOnline } = useSync();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracking' | 'history'>('tracking');
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Filter transfers relevant to this ASHA's catchment / facility
  const userFacilityName = user?.facilityName || 'Velhe Sub-Centre';
  const myTransfers = useMemo(() => {
    return stockTransfers.filter((t) => {
      const isMyFacility =
        t.destinationFacilityName.toLowerCase().includes('velhe') ||
        t.destinationFacilityName.toLowerCase().includes(userFacilityName.toLowerCase()) ||
        t.reason.toLowerCase().includes('asha') ||
        t.reason.toLowerCase().includes('kondhur');
      return isMyFacility || t.isEmergency;
    });
  }, [stockTransfers, userFacilityName]);

  const activeRequisitions = useMemo(() => {
    return myTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
  }, [myTransfers]);

  const deliveredRequisitions = useMemo(() => {
    return myTransfers.filter((t) => t.status === 'COMPLETED');
  }, [myTransfers]);

  const inTransitCount = useMemo(() => {
    return activeRequisitions.filter((t) => t.status === 'DISPATCHED').length;
  }, [activeRequisitions]);

  // Dynamic lifecycle step mapping
  const getLifecycleSteps = (t: StockTransfer) => {
    const isDispatched = t.status === 'DISPATCHED';
    const isCompleted = t.status === 'COMPLETED';
    const isApproved = t.status === 'APPROVED' || isDispatched || isCompleted;

    return [
      { name: '1. Requested', done: true },
      { name: '2. Matching', done: true },
      { name: `3. Source Found (${t.sourceFacilityName?.split(' ')[0] || 'PHC'})`, done: isApproved },
      { name: '4. Dispatched', done: isDispatched || isCompleted },
      { name: '5. In Transit', done: isDispatched, current: isDispatched },
      { name: '6. Received at PHC', done: isCompleted, current: isCompleted },
    ];
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Single Primary Action */}
      <MahaAushadhiHeader
        roleTitle="ASHA Field Worker (Sub-Centre)"
        facilityName={user?.facilityName || 'Velhe Sub-Centre, Pune'}
        primaryActionLabel="+ Request Emergency Medicine"
        onPrimaryAction={() => setIsRequestModalOpen(true)}
        primaryActionIcon={Siren}
        primaryActionClass="bg-rose-600 hover:bg-rose-700 text-white"
      />

      {/* 2. 4 Focused Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Active Requests"
          value={activeRequisitions.length}
          subtext="Community life-safety"
          color={activeRequisitions.length > 0 ? 'rose' : 'emerald'}
          icon={Flame}
        />
        <KPICard
          label="Dispatched / In Transit"
          value={inTransitCount}
          subtext="108 Ambulance en route"
          color={inTransitCount > 0 ? 'amber' : 'emerald'}
          icon={Truck}
        />
        <KPICard
          label="Delivered & Received"
          value={deliveredRequisitions.length}
          subtext="Stocked at local PHC"
          color="emerald"
          icon={CheckCircle2}
        />
        <KPICard
          label="Field Connectivity"
          value={effectiveOnline ? 'Online' : 'Offline Ready'}
          subtext={effectiveOnline ? 'Instant cloud broadcast' : 'Queued in IndexedDB'}
          color={effectiveOnline ? 'blue' : 'amber'}
          icon={Wifi}
        />
      </div>

      {/* 3. Navigation Tabs (Render only ONE tab at a time) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tracking'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Active Requisitions & Live Tracking ({activeRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Delivered Requisitions Archive ({deliveredRequisitions.length})
        </button>
      </div>

      {/* 4. Tab 1: Active Requisitions Queue */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          {activeRequisitions.map((req) => {
            const steps = getLifecycleSteps(req);
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
                        {req.urgency} EMERGENCY
                      </span>
                      {isDispatched && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300">
                          108 AMBULANCE EN ROUTE
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Logged: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                      {req.medicineName}
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{req.emergencyIndication || req.reason}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {req.requestedQuantity} <span className="text-xs text-slate-500 font-normal">units</span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Destination: {req.destinationFacilityName}
                    </div>
                  </div>
                </div>

                {/* 6-Stage Visual Timeline */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 pl-3">
                  {steps.map((s, idx) => (
                    <React.Fragment key={s.name}>
                      <div
                        className={`flex items-center gap-1.5 text-xs ${
                          s.done
                            ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                            : s.current
                            ? 'text-rose-600 font-black animate-pulse'
                            : 'text-slate-400'
                        }`}
                      >
                        <span>{s.done ? '✓' : s.current ? '●' : '○'}</span>
                        <span>{s.name}</span>
                      </div>
                      {idx < steps.length - 1 && (
                        <span className="text-slate-300 dark:text-slate-700 text-xs hidden sm:inline">&rarr;</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Route Context */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Allocated Donor Facility</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {req.sourceFacilityName || 'Matching nearby PHC with verified surplus...'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Receiving PHC Centre</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {req.destinationFacilityName}
                    </div>
                  </div>
                </div>

                {/* ASHA Role Safety Footer */}
                <div className="pt-2 pl-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>Requisition monitored by PHC Medical Officer & 108 Emergency Dispatch</span>
                  </span>
                  <span className="font-bold text-teal-600">Live Status Active</span>
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
                No Pending Community Emergency Requests
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Your village sub-centre has zero unaddressed emergency requisitions. If a critical patient presents with snakebite, PPH, or severe trauma, use the button above to request emergency support immediately.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Delivered Requisitions Archive */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Past Delivered Community Requisitions
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {deliveredRequisitions.map((req) => (
              <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{req.medicineName} ({req.requestedQuantity} units)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      RECEIVED & STOCKED
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Origin: {req.sourceFacilityName} &bull; Delivered: {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {req.consignmentCode || req.id}
                </span>
              </div>
            ))}
            {deliveredRequisitions.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No past delivered requisitions found for this sub-centre.
              </div>
            )}
          </div>
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
