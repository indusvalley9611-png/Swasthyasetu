'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { KPICard } from '@/components/ui/design-system';
import { getMedicineStatus, getSafeTransferableQuantity, findSurplusSources } from '@/lib/resourceManagement';
import { StockTransfer } from '@/lib/types';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import {
  Building2,
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
} from 'lucide-react';

interface DistrictMahaAushadhiViewProps {
  isSpecialist?: boolean;
}

export function DistrictMahaAushadhiView({ isSpecialist = false }: DistrictMahaAushadhiViewProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, facilities, stockTransfers, processStockTransfer, allocateStockTransferDonor } = useSync();

  const [activeTab, setActiveTab] = useState<'coordination' | 'transit' | 'buffer_matrix' | 'audit'>('coordination');
  const [districtFilter, setDistrictFilter] = useState('Pune');
  const [searchQuery, setSearchQuery] = useState('');

  // Critical stockouts across district facilities
  const districtStocks = useMemo(() => {
    return stocks.filter(
      (s) =>
        s.facilityName.toLowerCase().includes('pune') ||
        s.facilityName.toLowerCase().includes('velhe') ||
        s.facilityName.toLowerCase().includes('nasrapur') ||
        s.facilityName.toLowerCase().includes('aundh') ||
        s.facilityName.toLowerCase().includes('bhor') ||
        s.facilityName.toLowerCase().includes('khed') ||
        s.facilityName.toLowerCase().includes('kikvi')
    );
  }, [stocks]);

  const shortageStocks = useMemo(() => {
    return districtStocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
  }, [districtStocks]);

  const surplusStocks = useMemo(() => {
    return districtStocks.filter((s) => getSafeTransferableQuantity(s, stockTransfers) > 0);
  }, [districtStocks, stockTransfers]);

  // Canonical incoming emergency requests originating from or destined to district facilities
  const districtIncomingRequests = useMemo(() => {
    return stockTransfers.filter((t) => {
      const isDestinationInDistrict =
        t.destinationFacilityName.toLowerCase().includes('pune') ||
        t.destinationFacilityName.toLowerCase().includes('velhe') ||
        t.destinationFacilityName.toLowerCase().includes('nasrapur') ||
        t.destinationFacilityName.toLowerCase().includes('aundh') ||
        t.destinationFacilityName.toLowerCase().includes('bhor') ||
        t.destinationFacilityName.toLowerCase().includes('khed') ||
        t.destinationFacilityName.toLowerCase().includes('kikvi');
      return isDestinationInDistrict && t.status !== 'COMPLETED' && t.status !== 'REJECTED';
    });
  }, [stockTransfers]);

  // Active district transfers
  const districtTransfers = useMemo(() => {
    return stockTransfers.filter(
      (t) =>
        t.isEmergency ||
        t.destinationFacilityName.toLowerCase().includes('pune') ||
        t.sourceFacilityName.toLowerCase().includes('pune') ||
        t.destinationFacilityName.toLowerCase().includes('velhe') ||
        t.sourceFacilityName.toLowerCase().includes('nasrapur') ||
        t.sourceFacilityName.toLowerCase().includes('khed') ||
        t.destinationFacilityName.toLowerCase().includes('khed')
    );
  }, [stockTransfers]);

  const activeTransfers = useMemo(() => {
    return districtTransfers.filter((t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED');
  }, [districtTransfers]);

  const inTransitList = useMemo(() => {
    return districtTransfers.filter((t) => t.status === 'DISPATCHED');
  }, [districtTransfers]);

  const auditLogs = useMemo(() => {
    return getAuditLogs().slice(0, 30);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header with Oversight Action */}
      <MahaAushadhiHeader
        roleTitle={isSpecialist ? 'District Specialist / Casualty Triage' : 'District Health Officer (DHO) / Civil Surgeon'}
        facilityName={user?.facilityName || 'District Hospital Aundh, Pune'}
        primaryActionLabel="Trigger District Rebalance"
        onPrimaryAction={() => setActiveTab('coordination')}
        primaryActionIcon={Share2}
        primaryActionClass="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90"
      />

      {/* 2. 4 District Coordination KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Facilities in Shortage"
          value={shortageStocks.length}
          subtext="Critical buffer breaches"
          color={shortageStocks.length > 0 ? 'rose' : 'emerald'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Facilities with Safe Surplus"
          value={surplusStocks.length}
          subtext="Available donor depots"
          color="emerald"
          icon={Building2}
        />
        <KPICard
          label="Active Consignments"
          value={inTransitList.length}
          subtext="En route via EMS ambulance"
          color={inTransitList.length > 0 ? 'amber' : 'emerald'}
          icon={Truck}
        />
        <KPICard
          label="Mean Fulfillment Time"
          value="42 min"
          subtext="108 Green Corridor"
          color="blue"
          icon={Clock}
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('coordination')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'coordination'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          District Requests & Shortage Coordination ({districtIncomingRequests.length + shortageStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('transit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'transit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Active Consignments & Fleet ({inTransitList.length})
        </button>
        <button
          onClick={() => setActiveTab('buffer_matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'buffer_matrix'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          District Facility Buffer Matrix ({districtStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          District Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* 4. Tab 1: Coordination View (Incoming PHC Requisitions + Facility Shortages) */}
      {activeTab === 'coordination' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                District Redistribution & Emergency Coordination
              </h3>
              <p className="text-xs text-slate-500">
                AI Proximity Matching: Pairing health centres facing stockouts with nearby facilities retaining statutory safe buffer
              </p>
            </div>
            <span className="text-xs font-bold text-teal-600 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Buffer Protected</span>
            </span>
          </div>

          {/* Section A: Incoming PHC Emergency Requests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Incoming PHC Emergency Requests ({districtIncomingRequests.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Live Requisitions Requiring District Allocation / Oversight
              </span>
            </div>

            {districtIncomingRequests.map((req) => {
              const destStock =
                stocks.find((s) => s.id === req.destinationStockId) ||
                stocks.find((s) => s.drugName === req.medicineName && s.facilityName === req.destinationFacilityName);
              const surplusCandidates = destStock
                ? findSurplusSources(destStock, stocks, stockTransfers, facilities)
                : [];
              const bestSource = surplusCandidates[0];

              return (
                <div
                  key={req.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
                    req.isEmergency
                      ? 'border-rose-200 dark:border-rose-900/80'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-500">
                          {req.consignmentCode || req.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            req.urgency === 'CRITICAL'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                          }`}
                        >
                          {req.urgency} SOS
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : req.status === 'DISPATCHED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : req.status === 'APPROVED'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {req.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                        {req.medicineName} &bull; {req.requestedQuantity} Units
                      </h4>
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{req.emergencyIndication || req.reason}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right text-xs">
                      <span className="text-slate-400 font-bold">Target Fulfillment:</span>
                      <div className="font-black text-slate-900 dark:text-white">
                        {req.requiredByTime
                          ? new Date(req.requiredByTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Immediate / Golden Hour'}
                      </div>
                    </div>
                  </div>

                  {/* Route & Matching Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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

                  {/* District Coordination Action Card */}
                  {!req.donorAllocated ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          Recommended Surplus Donor (Nearest Route)
                        </span>
                        {bestSource ? (
                          <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                            {bestSource.facility?.name || bestSource.stock.facilityName} &bull; Available Safe Surplus:{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                              {bestSource.transferable} {destStock?.unit || 'Units'}
                            </strong>{' '}
                            <span className="text-[11px] text-slate-500 font-normal">
                              (Min Buffer: {bestSource.stock.bufferStock} preserved)
                            </span>
                          </div>
                        ) : (
                          <div className="text-amber-700 dark:text-amber-300 font-bold mt-0.5">
                            No nearby PHC has surplus above statutory buffer. Escalate to District Reserve or State Depot.
                          </div>
                        )}
                      </div>

                      {bestSource && (
                        <button
                          onClick={() => {
                            if (bestSource.facility) {
                              allocateStockTransferDonor(
                                req.id,
                                bestSource.stock,
                                bestSource.facility,
                                user ? { id: user.id, name: user.name } : null
                              );
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs hover:opacity-90 cursor-pointer shrink-0"
                        >
                          Allocate &amp; Endorse Donor
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Donor Endorsed: {req.sourceFacilityName}. Awaiting dispatch from donor depot.</span>
                      </span>
                      <span className="font-mono text-[10px] text-emerald-600">
                        {req.allocatedAt ? new Date(req.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Endorsed'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {districtIncomingRequests.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  Zero Pending PHC Emergency Requisitions
                </h5>
                <p className="text-[11px] text-slate-500">
                  No primary health centre in Pune district is currently broadcasting an unallocated emergency request.
                </p>
              </div>
            )}
          </div>

          {/* Section B: District Facility Shortage Surveillance */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  District Facility Shortage Surveillance ({shortageStocks.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                Facilities Operating Below Statutory 20% Safe Buffer
              </span>
            </div>

            {shortageStocks.map((shortage) => {
              const surplusSources = findSurplusSources(shortage, stocks, stockTransfers, facilities);
              const bestSource = surplusSources[0];
              const activeReq = districtIncomingRequests.find(
                (r) =>
                  r.destinationStockId === shortage.id ||
                  (r.medicineName === shortage.drugName && r.destinationFacilityName === shortage.facilityName)
              );

              return (
                <div
                  key={shortage.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/80 p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                          CRITICAL SHORTAGE
                        </span>
                        {activeReq && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300">
                            Requisition Active: {activeReq.id}
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {shortage.drugName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Affected Facility: <strong>{shortage.facilityName}</strong> &bull; Current Stock:{' '}
                        <span className="font-bold text-rose-600">{shortage.currentStock} {shortage.unit}</span> (Min Buffer: {shortage.bufferStock} {shortage.unit})
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-slate-400">Shortage Deficit:</span>
                      <div className="text-lg font-black text-rose-600">
                        -{shortage.bufferStock - shortage.currentStock} {shortage.unit}
                      </div>
                    </div>
                  </div>

                  {/* Proximity Match Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                        Recommended Surplus Donor (Nearest Route)
                      </span>
                      {bestSource ? (
                        <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {bestSource.facility?.name || bestSource.stock.facilityName} &bull; Available Safe Surplus:{' '}
                          <strong className="text-emerald-600">{bestSource.transferable} {shortage.unit}</strong>
                        </div>
                      ) : (
                        <div className="text-amber-600 font-bold mt-0.5">
                          No nearby PHC has surplus above statutory buffer. Escalate to District Reserve or State Depot.
                        </div>
                      )}
                    </div>

                    {bestSource && !activeReq && (
                      <button
                        onClick={() => {
                          if (bestSource.facility) {
                            alert(`District Coordination: Rebalance notice routed to ${bestSource.facility.name}.`);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                      >
                        Initiate Route
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {shortageStocks.length === 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Zero Critical Shortages in Pune District
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All monitored primary health centres and rural hospitals are maintaining statutory drug buffers above threshold.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab 2: Active Consignments & Fleet */}
      {activeTab === 'transit' && (
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
                      IN TRANSIT
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
                  Carrier: {trf.transportMode?.replace(/_/g, ' ') || '108 EMERGENCY AMBULANCE'}
                </div>
              </div>
            </div>
          ))}

          {inTransitList.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No emergency consignments currently in transit in this district.
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: District Facility Buffer Matrix */}
      {activeTab === 'buffer_matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                District Health Facility Buffer Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Network view of drug stocks across Velhe, Nasrapur, Bhor, and Aundh District Hospital
              </p>
            </div>
            <input
              type="text"
              placeholder="Search drug or facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Facility</th>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Current</th>
                  <th className="py-2.5 px-3">Buffer</th>
                  <th className="py-2.5 px-3">Safe Transferable</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {districtStocks
                  .filter((s) => {
                    if (!searchQuery) return true;
                    return (
                      s.drugName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.facilityName.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                  })
                  .map((s) => {
                    const status = getMedicineStatus(s);
                    const safeQty = getSafeTransferableQuantity(s, stockTransfers);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {s.facilityName}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {s.drugName}
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

      {/* 7. Tab 4: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-800 pb-3">
            District Logistics Audit Trail
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
                    Officer: <strong>{log.userName}</strong> ({log.userRole}) &bull; Facility: {log.userFacility}
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
