'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { getMedicineStatus, getSafeTransferableQuantity } from '@/lib/resourceManagement';
import { recordAuditLog, getAuditLogs } from '@/lib/patientPrivacyService';
import { INITIAL_OUTBREAKS } from '@/lib/mockData';
import { Referral, Facility, DrugStockItem, OutbreakData, RrtIntervention } from '@/lib/types';
import {
  Activity,
  BarChart3,
  TrendingUp,
  Users,
  Flame,
  Map,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Package,
  Search,
  ChevronRight,
  MapPin,
  Ambulance,
  HeartPulse,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FileText,
  Lock,
  Compass,
  Layers,
  Radio,
  X,
  Stethoscope,
  Phone,
} from 'lucide-react';

export interface StateAdminDashboardProps {
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
  activeTab?: StateTab;
  onTabChange?: (tab: StateTab) => void;
}

export type StateTab =
  | 'overview'
  | 'tertiary'
  | 'capacity'
  | 'resources'
  | 'surveillance'
  | 'counter_referral'
  | 'gis_map'
  | 'audit';

export function StateAdminDashboard({
  onOpenBedMatrix,
  onOpenStockLedger,
  activeTab: externalTab,
  onTabChange,
}: StateAdminDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    facilities,
    stocks,
    referrals,
    updateReferralStatus,
    createStockTransfer,
    processStockTransfer,
    stockTransfers,
  } = useSync();

  // Active navigation tab
  const [internalTab, setInternalTab] = useState<StateTab>(externalTab || 'overview');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (tab: StateTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Interactive local states for State operations
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Pune');
  const [outbreaks, setOutbreaks] = useState<OutbreakData[]>(INITIAL_OUTBREAKS);
  const [interventions, setInterventions] = useState<RrtIntervention[]>([
    {
      id: 'rrt-01',
      outbreakId: 'out-001',
      district: 'Pune',
      taluka: 'Velhe',
      diseaseName: 'Dengue',
      status: 'UNDER_REVIEW',
      teamLead: 'Dr. Sanjay Pawar (DHO Pune)',
      dispatchedAt: '2026-09-13T09:00:00Z',
      actionsTaken: ['Larval survey initiated across 9 sub-centres', 'Platelet monitoring protocol activated at Velhe PHC'],
    },
  ]);

  // Modals
  const [activeTertiaryModalReferral, setActiveTertiaryModalReferral] = useState<Referral | null>(null);
  const [isDivertModalOpen, setIsDivertModalOpen] = useState(false);
  const [divertSourceFacility, setDivertSourceFacility] = useState<Facility | null>(null);
  const [selectedDivertTarget, setSelectedDivertTarget] = useState<string>('fac-sassoon-pune');
  const [divertReason, setDivertReason] = useState<string>('ICU Capacity Exhausted (90%+ occupancy). Diverting emergency polytrauma.');

  const [activeTransferShortage, setActiveTransferShortage] = useState<{ shortage: DrugStockItem; surplus: DrugStockItem; transferable: number } | null>(null);
  const [transferUnits, setTransferUnits] = useState<number>(10);

  const [activeRrtOutbreak, setActiveRrtOutbreak] = useState<OutbreakData | null>(null);
  const [rrtTeamLead, setRrtTeamLead] = useState('Dr. Sanjay Pawar (District Health Officer, Pune)');
  const [rrtNotes, setRrtNotes] = useState('Deploy Rapid Response Unit with NS1 rapid antigen kits and abate larvicide.');

  const [tertiaryStatusFilter, setTertiaryStatusFilter] = useState<'ALL' | 'ESCALATED' | 'ROUTED_TO_TERTIARY' | 'TRANSFER_APPROVED'>('ALL');

  // --- DERIVED METRICS ---
  const totalBeds = useMemo(() => facilities.reduce((total, f) => total + f.totalBeds, 0), [facilities]);
  const occupiedBeds = useMemo(() => facilities.reduce((total, f) => total + f.occupiedBeds, 0), [facilities]);
  const availableBeds = totalBeds - occupiedBeds;
  const bedUtilization = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const totalIcuBeds = useMemo(() => facilities.reduce((total, f) => total + f.icuBedsTotal, 0), [facilities]);
  const occupiedIcuBeds = useMemo(() => facilities.reduce((total, f) => total + f.icuBedsOccupied, 0), [facilities]);
  const availableIcuBeds = totalIcuBeds - occupiedIcuBeds;
  const icuStressPercent = totalIcuBeds ? Math.round((occupiedIcuBeds / totalIcuBeds) * 100) : 0;

  const totalVentilators = useMemo(() => facilities.reduce((total, f) => total + f.ventilatorsTotal, 0), [facilities]);
  const occupiedVentilators = useMemo(() => facilities.reduce((total, f) => total + f.ventilatorsOccupied, 0), [facilities]);
  const availableVentilators = totalVentilators - occupiedVentilators;

  const criticalShortagesList = useMemo(() => stocks.filter(stock => getMedicineStatus(stock) === 'CRITICAL'), [stocks]);
  const criticalShortagesCount = criticalShortagesList.length;

  const escalatedReferrals = useMemo(() => {
    return referrals.filter(r => r.status === 'ESCALATED' || r.status === 'ROUTED_TO_TERTIARY' || r.status === 'TRANSFER_APPROVED');
  }, [referrals]);

  // District-wise aggregations
  const districtsList = useMemo(() => {
    const dMap: { [district: string]: { district: string; facilities: Facility[]; totalBeds: number; occupiedBeds: number; icuTotal: number; icuOccupied: number; ventsTotal: number; ventsOccupied: number } } = {};
    facilities.forEach(f => {
      const d = f.district || 'Pune';
      if (!dMap[d]) {
        dMap[d] = { district: d, facilities: [], totalBeds: 0, occupiedBeds: 0, icuTotal: 0, icuOccupied: 0, ventsTotal: 0, ventsOccupied: 0 };
      }
      dMap[d].facilities.push(f);
      dMap[d].totalBeds += f.totalBeds;
      dMap[d].occupiedBeds += f.occupiedBeds;
      dMap[d].icuTotal += f.icuBedsTotal;
      dMap[d].icuOccupied += f.icuBedsOccupied;
      dMap[d].ventsTotal += f.ventilatorsTotal;
      dMap[d].ventsOccupied += f.ventilatorsOccupied;
    });
    return Object.values(dMap);
  }, [facilities]);

  // Surplus-shortage matching for state drug command
  const shortageMatchPairs = useMemo(() => {
    const pairs: { shortage: DrugStockItem; surplus: DrugStockItem; transferable: number }[] = [];
    criticalShortagesList.forEach(shortage => {
      const candidates = stocks.filter(s => s.drugName === shortage.drugName && s.facilityId !== shortage.facilityId);
      candidates.forEach(surplus => {
        const transferable = getSafeTransferableQuantity(surplus, stockTransfers);
        if (transferable > 0) {
          pairs.push({ shortage, surplus, transferable });
        }
      });
    });
    return pairs;
  }, [criticalShortagesList, stocks, stockTransfers]);

  // Counter-referral cases
  const counterReferralCases = useMemo(() => {
    return referrals.filter(r => r.counterReferredTo || r.status === 'COMPLETED' || r.dischargeSummary);
  }, [referrals]);

  // --- ACTIONS ---
  const handleApproveTertiaryRouting = (referral: Referral, targetFacilityName?: string) => {
    const assignedTarget = targetFacilityName || referral.targetFacility || 'Sassoon General Hospital & BJMC, Pune';
    updateReferralStatus(referral.id, 'TRANSFER_APPROVED', {
      targetFacility: assignedTarget,
      assignedBed: 'Tertiary Apex Bed Reserved (State Approved)',
    });

    recordAuditLog({
      userId: user?.id || 'state-admin-01',
      userName: user?.name || 'Dr. Nitin Patil',
      userRole: 'state_admin',
      userFacility: user?.facilityName || 'State Medical Reserve Depot, Maharashtra',
      administrativeLevel: 'state',
      patientId: referral.patientId,
      patientName: referral.patientName,
      patientAbha: referral.patientAbha,
      action: 'TERTIARY_ROUTING_APPROVED',
      resource: `Tertiary Referral ${referral.tokenCode} -> ${assignedTarget}`,
      reason: `Director of Health Services approved emergency tertiary routing for ${referral.specialtyRequired}.`,
      accessGranted: true,
    });

    setActiveTertiaryModalReferral(null);
  };

  const handleTriggerDivert = () => {
    if (!divertSourceFacility) return;
    const targetFacility = facilities.find(f => f.id === selectedDivertTarget);

    recordAuditLog({
      userId: user?.id || 'state-admin-01',
      userName: user?.name || 'Dr. Nitin Patil',
      userRole: 'state_admin',
      userFacility: user?.facilityName || 'State Medical Reserve Depot, Maharashtra',
      administrativeLevel: 'state',
      patientId: 'AGGREGATED_SYSTEM_OP',
      patientName: 'Statewide Divert Protocol',
      patientAbha: 'N/A',
      action: 'INTER_DISTRICT_DIVERT',
      resource: `Emergency Divert: ${divertSourceFacility.name} -> ${targetFacility?.name || selectedDivertTarget}`,
      reason: divertReason,
      accessGranted: true,
    });

    setIsDivertModalOpen(false);
    setDivertSourceFacility(null);
  };

  const handleAuthorizeStockTransfer = () => {
    if (!activeTransferShortage) return;
    const { shortage, surplus, transferable } = activeTransferShortage;
    const qty = Math.min(transferUnits, transferable);

    const newTransfer = createStockTransfer({
      medicineName: shortage.drugName,
      sourceStockId: surplus.id,
      destinationStockId: shortage.id,
      sourceFacilityId: surplus.facilityId,
      sourceFacilityName: surplus.facilityName,
      destinationFacilityId: shortage.facilityId,
      destinationFacilityName: shortage.facilityName,
      requestedQuantity: qty,
      urgency: 'CRITICAL',
      reason: 'State Health Directorate Emergency ASV / Critical Stock Authorization',
    });

    if (newTransfer) {
      processStockTransfer(newTransfer.id, 'APPROVE');
      processStockTransfer(newTransfer.id, 'DISPATCH');

      recordAuditLog({
        userId: user?.id || 'state-admin-01',
        userName: user?.name || 'Dr. Nitin Patil',
        userRole: 'state_admin',
        userFacility: user?.facilityName || 'State Medical Reserve Depot, Maharashtra',
        administrativeLevel: 'state',
        patientId: 'STATE_INVENTORY_OP',
        patientName: 'State Stock Redistribution',
        patientAbha: 'N/A',
        action: 'STOCK_TRANSFER_AUTHORIZED',
        resource: `${shortage.drugName} (${qty} units: ${surplus.facilityName} -> ${shortage.facilityName})`,
        reason: 'State Directorate Emergency Lifesaving Medicine Redistribution Protocol',
        accessGranted: true,
      });
    }

    setActiveTransferShortage(null);
  };

  const handleDispatchRrt = () => {
    if (!activeRrtOutbreak) return;

    const newIntervention: RrtIntervention = {
      id: `rrt-${Date.now()}`,
      outbreakId: activeRrtOutbreak.id,
      district: activeRrtOutbreak.district,
      taluka: activeRrtOutbreak.taluka,
      diseaseName: activeRrtOutbreak.diseaseName,
      status: 'RRT_DISPATCHED',
      teamLead: rrtTeamLead,
      dispatchedAt: new Date().toISOString(),
      actionsTaken: [rrtNotes, 'State Rapid Response Contingent mobilized with mobile diagnostic lab.'],
    };

    setInterventions(prev => [newIntervention, ...prev]);

    recordAuditLog({
      userId: user?.id || 'state-admin-01',
      userName: user?.name || 'Dr. Nitin Patil',
      userRole: 'state_admin',
      userFacility: user?.facilityName || 'State Medical Reserve Depot, Maharashtra',
      administrativeLevel: 'state',
      patientId: 'EPIDEMIOLOGY_OUTBREAK',
      patientName: `${activeRrtOutbreak.district} ${activeRrtOutbreak.diseaseName} Outbreak`,
      patientAbha: 'N/A',
      action: 'RRT_DISPATCHED',
      resource: `${activeRrtOutbreak.diseaseName} Cluster in ${activeRrtOutbreak.taluka}, ${activeRrtOutbreak.district}`,
      reason: `Rapid Response Team deployed under ${rrtTeamLead}. Intervention: ${rrtNotes}`,
      accessGranted: true,
    });

    setActiveRrtOutbreak(null);
  };

  // Dynamic jurisdiction configuration based on authenticated role & administrative level
  const isAdminLevelNational = user?.role === 'national_admin';
  const isAdminLevelDistrict = user?.role === 'district_officer';

  const jurisdictionConfig = {
    levelBadge: isAdminLevelNational
      ? 'NATIONAL HEALTH MISSION CONTROL (LEVEL 5)'
      : isAdminLevelDistrict
      ? 'DISTRICT HEALTH OPERATIONS COMMAND (LEVEL 3)'
      : 'STATE HEALTH OPERATIONS CENTER (LEVEL 4)',
    location: isAdminLevelNational
      ? 'National Health Authority (NHA) & MoHFW \u2022 New Delhi'
      : isAdminLevelDistrict
      ? `${user?.facilityName || 'District Hospital Aundh'}, ${user?.district || 'Pune'} District`
      : `${user?.facilityName || 'State Medical Reserve Depot'} \u2022 Maharashtra`,
    officerName: user?.name || (isAdminLevelNational ? 'Dr. Arvind Sharma' : isAdminLevelDistrict ? 'Dr. Vinod Chavan' : 'Dr. Nitin Patil'),
    roleTitle: user?.roleTitleEn || (isAdminLevelNational ? 'National Mission Director' : isAdminLevelDistrict ? 'District Health Officer (DHO)' : 'Director of Health Services'),
    hfrNode: user?.hfrCode || (isAdminLevelNational ? 'HFR-IND-DEL-NHA01' : isAdminLevelDistrict ? 'HFR-MH-PUN-00001' : 'MH-HFR-STATE-01'),
    gatewayName: isAdminLevelNational ? 'National ABDM Health Gateway' : isAdminLevelDistrict ? 'District Health Operations Gateway' : 'Live State Health Gateway',
    actionBannerTitle: isAdminLevelNational
      ? 'National Priority Action Center \u2022 Interstate Interventions Required'
      : isAdminLevelDistrict
      ? `District Priority Action Center \u2022 ${user?.district || 'Pune'} District Interventions`
      : 'State Priority Action Center \u2022 Immediate DHS Interventions Required',
    bedMatrixBtnLabel: isAdminLevelNational ? 'National Bed Grid' : isAdminLevelDistrict ? 'District Bed Matrix' : 'State Bed Matrix',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* 1. ADMINISTRATIVE JURISDICTION BANNER (Dynamically configured for Level 3 District, Level 4 State, or Level 5 National) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0 shadow-lg border border-blue-400/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                {jurisdictionConfig.levelBadge}
              </span>
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {jurisdictionConfig.location}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <span>{jurisdictionConfig.officerName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {jurisdictionConfig.roleTitle}
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>ABDM HFR Registry Node #{jurisdictionConfig.hfrNode}</span>
              <span>&bull;</span>
              <span className="text-blue-300 font-mono">Least-Privilege Aggregated Health Governance</span>
              <span>&bull;</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {jurisdictionConfig.gatewayName}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            onClick={onOpenBedMatrix}
            className="px-3.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-300" />
            <span>{jurisdictionConfig.bedMatrixBtnLabel}</span>
          </button>
          <button
            onClick={onOpenStockLedger}
            className="px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-400/30 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <Package className="w-4 h-4 text-amber-300" />
            <span>Drug Ledger</span>
          </button>
        </div>
      </div>

      {/* 2. PRIORITY ACTIONS BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-white space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>{jurisdictionConfig.actionBannerTitle}</span>
          </div>
          <span className="text-[10px] text-slate-400">Live operational signals aggregated across facilities</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Action 1: ICU Stress Alert */}
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase">
                <span>🔴 CRITICAL CAPACITY</span>
                <span>PUNE DH</span>
              </div>
              <p className="font-bold text-white mt-1">ICU at 90% Capacity (36/40 Beds)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Ventilators constrained (22/25 occupied). Emergency divert recommended.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const puneDH = facilities.find(f => f.id === 'fac-dh-pune');
                  setDivertSourceFacility(puneDH || facilities[0]);
                  setIsDivertModalOpen(true);
                }}
                className="flex-1 py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Initiate Divert</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveTab('capacity')}
                title="Review Capacity & Bed Grid"
                className="py-1.5 px-2.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700/60 text-rose-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Review
              </button>
            </div>
          </div>

          {/* Action 2: Drug Shortage Alert */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase">
                <span>🟠 CRITICAL SHORTAGE</span>
                <span>VELHE PHC</span>
              </div>
              <p className="font-bold text-white mt-1">Anti-Snake Venom (4 Vials Left)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Buffer: 20. Surplus match found at Nashik Civil Hospital (150 vials).</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (shortageMatchPairs[0]) {
                    setActiveTransferShortage(shortageMatchPairs[0]);
                  } else {
                    setActiveTab('resources');
                  }
                }}
                className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Authorize Transfer</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveTab('resources')}
                title="Review MahaAushadhi Buffer"
                className="py-1.5 px-2.5 bg-amber-900/60 hover:bg-amber-800 border border-amber-700/60 text-amber-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Review
              </button>
            </div>
          </div>

          {/* Action 3: Tertiary Escalations Pending */}
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 uppercase">
                <span>🔵 TERTIARY ESCALATION</span>
                <span>{escalatedReferrals.length} Cases</span>
              </div>
              <p className="font-bold text-white mt-1">District Trauma & Cardiology</p>
              <p className="text-[11px] text-slate-300 mt-0.5">Severe TBI craniotomy & post-infarct VSR awaiting State Apex routing.</p>
            </div>
            <button
              onClick={() => setActiveTab('tertiary')}
              className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Review Escalation Desk ({escalatedReferrals.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Action 4: Outbreak Containment */}
          <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-400 uppercase">
                <span>🟣 EPIDEMIOLOGICAL SIGNAL</span>
                <span>VELHE BLOCK</span>
              </div>
              <p className="font-bold text-white mt-1">Dengue Cluster (+28.5% Spike)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">142 active cases across 9 sub-centres. RRT deployment ready.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setActiveRrtOutbreak(outbreaks[0]);
                }}
                className="flex-1 py-1.5 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Dispatch RRT</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => setActiveTab('surveillance')}
                title="Review Surveillance Desk"
                className="py-1.5 px-2.5 bg-purple-900/60 hover:bg-purple-800 border border-purple-700/60 text-purple-200 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Review
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. APEX STATE OPERATIONAL METRICS (Clickable KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total State Bed Utilization */}
        <div
          onClick={() => setActiveTab('capacity')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Bed Capacity</span>
            <Building2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {bedUtilization}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <strong>{availableBeds.toLocaleString()}</strong> Available of {totalBeds.toLocaleString()} Beds
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                bedUtilization > 85 ? 'bg-rose-500' : bedUtilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${bedUtilization}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Critical ICU & Ventilators */}
        <div
          onClick={() => setActiveTab('capacity')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>ICU & Ventilators</span>
            <Activity className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2">
            {icuStressPercent}% <span className="text-xs font-bold text-slate-500 font-sans">Stress</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <strong>{availableIcuBeds}</strong> ICU &bull; <strong>{availableVentilators}</strong> Vents Available
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md w-fit">
            <AlertTriangle className="w-3 h-3" /> Pune & Nashik Under Load
          </div>
        </div>

        {/* Metric 3: Active Tertiary Escalations */}
        <div
          onClick={() => setActiveTab('tertiary')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Tertiary Escalations</span>
            <Ambulance className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-blue-700 dark:text-blue-400 mt-2">
            {escalatedReferrals.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            District Cases Awaiting Apex Approval
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md w-fit">
            <Clock className="w-3 h-3" /> 2 Red Urgent &bull; Sassoon BJMC
          </div>
        </div>

        {/* Metric 4: Critical Drug Shortages */}
        <div
          onClick={() => setActiveTab('resources')}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Critical Drug Buffer</span>
            <Package className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-black text-amber-600 mt-2">
            {criticalShortagesCount}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Facilities Below Minimum Buffer
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Surplus Available for Transfer
          </div>
        </div>
      </div>

      {/* 4. PRIMARY NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'overview' as StateTab, label: 'Overview', icon: Layers },
          { id: 'tertiary' as StateTab, label: `Tertiary Escalations (${escalatedReferrals.length})`, icon: Ambulance },
          { id: 'capacity' as StateTab, label: 'Capacity & ICU Stress', icon: Building2 },
          { id: 'resources' as StateTab, label: `Drug Buffer & Transfers (${shortageMatchPairs.length})`, icon: Package },
          { id: 'surveillance' as StateTab, label: 'Epidemiological Surveillance', icon: Activity },
          { id: 'counter_referral' as StateTab, label: 'Counter-Referral Governance', icon: Radio },
          { id: 'gis_map' as StateTab, label: 'State GIS Map', icon: Map },
          { id: 'audit' as StateTab, label: 'Audit Trail & Accountability', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-900 text-white shadow-md font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Regional Status & Hotspots */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: District Stress Matrix */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span>Maharashtra District Stress Index</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Demo-simulated operational load calculated across sentinel district hospitals
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('capacity')}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Full Capacity Matrix</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {districtsList.map(d => {
                  const util = d.totalBeds ? Math.round((d.occupiedBeds / d.totalBeds) * 100) : 0;
                  const icuStress = d.icuTotal ? Math.round((d.icuOccupied / d.icuTotal) * 100) : 0;
                  const status =
                    icuStress >= 90 || util >= 90
                      ? 'CRITICAL STRESS'
                      : icuStress >= 75 || util >= 75
                      ? 'HIGH LOAD'
                      : 'OPTIMAL';
                  const badgeColor =
                    status === 'CRITICAL STRESS'
                      ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : status === 'HIGH LOAD'
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';

                  return (
                    <div
                      key={d.district}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {d.district} District
                          </span>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {d.facilities.length} Reporting Facilities &bull; {d.totalBeds} Total Beds
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Beds Occupied</div>
                          <div className="font-bold">{d.occupiedBeds} / {d.totalBeds} ({util}%)</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">ICU Stress</div>
                          <div className={`font-bold ${icuStress >= 90 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                            {d.icuOccupied} / {d.icuTotal} ({icuStress}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Ventilators</div>
                          <div className="font-bold">{d.ventsTotal - d.ventsOccupied} Free</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Active Outbreak Sentinel Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>Disease Surveillance Desk</span>
                </h3>
                <button
                  onClick={() => setActiveTab('surveillance')}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  All Signals
                </button>
              </div>

              <div className="space-y-3">
                {outbreaks.slice(0, 3).map(ob => (
                  <div
                    key={ob.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {ob.diseaseName} &bull; {ob.district}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        ob.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {ob.riskLevel} Risk
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                      <span>{ob.activeCases} Active Cases</span>
                      <span className={ob.weeklyChangePercent > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                        {ob.weeklyChangePercent > 0 ? `+${ob.weeklyChangePercent}%` : `${ob.weeklyChangePercent}%`} this week
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Hotspot: {ob.primaryHotspotVillage} ({ob.subCentresAffected} sub-centres reporting)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE STATE TERTIARY ESCALATIONS DESK */}
      {/* ========================================================================= */}
      {activeTab === 'tertiary' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-blue-600" />
                <span>State Tertiary Escalation Desk (District ➔ State Medical Colleges)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                High-acuity clinical escalations from District Hospitals awaiting State Directorate apex bed reservation
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {(['ALL', 'ESCALATED', 'ROUTED_TO_TERTIARY', 'TRANSFER_APPROVED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTertiaryStatusFilter(f)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    tertiaryStatusFilter === f
                      ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {f === 'ALL' ? 'All Escalations' : f.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Tertiary Referrals List */}
          <div className="space-y-4">
            {escalatedReferrals
              .filter(r => (tertiaryStatusFilter === 'ALL' ? true : r.status === tertiaryStatusFilter))
              .map(ref => {
                const isApproved = ref.status === 'TRANSFER_APPROVED';
                const isRouted = ref.status === 'ROUTED_TO_TERTIARY';

                return (
                  <div
                    key={ref.id}
                    className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-blue-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                          {ref.tokenCode}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Patient ID: {ref.patientId} &bull; {ref.patientAge}y {ref.patientGender}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          {ref.triagePriority.toUpperCase()} PRIORITY (Score: {ref.triageScore}/10)
                        </span>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isRouted
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      }`}>
                        {ref.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Referring District & Specialist</div>
                        <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{ref.referringFacility}</div>
                        <div className="text-[11px] text-slate-500">{ref.referringDoctorName}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Required Super-Specialty</div>
                        <div className="font-semibold text-blue-700 dark:text-blue-300 mt-0.5">{ref.specialtyRequired}</div>
                        <div className="text-[11px] text-slate-500">Destination: {ref.targetFacility}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Vitals at Referral</div>
                        <div className="font-mono text-[11px] text-slate-900 dark:text-white mt-0.5">
                          BP: {ref.vitalsAtReferral?.systolicBp}/{ref.vitalsAtReferral?.diastolicBp} &bull; HR: {ref.vitalsAtReferral?.heartRate} &bull; SpO2: {ref.vitalsAtReferral?.spO2}%
                        </div>
                        <div className="text-[10px] text-slate-500">GCS: {ref.vitalsAtReferral?.consciousLevel}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <strong className="text-slate-800 dark:text-slate-200">Clinical Indication:</strong> {ref.referralReason}
                    </div>

                    {/* Operational Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {!isApproved ? (
                        <>
                          <button
                            onClick={() => setActiveTertiaryModalReferral(ref)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Route to Alternate Apex Facility
                          </button>
                          <button
                            onClick={() => handleApproveTertiaryRouting(ref)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Tertiary Routing & Bed</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tertiary Transfer Approved &bull; Bed Reserved at {ref.targetFacility}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {escalatedReferrals.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No active tertiary escalations currently require State Directorate intervention.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CAPACITY & ICU STRESS INDEX */}
      {/* ========================================================================= */}
      {activeTab === 'capacity' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Inter-District Capacity & Critical ICU Stress Index</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitoring operational bed loads, ICU capacity, and ventilator availability across all Maharashtra health facilities
              </p>
            </div>
            <button
              onClick={onOpenBedMatrix}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Building2 className="w-4 h-4" />
              <span>Open Detailed Bed Matrix</span>
            </button>
          </div>

          {/* District Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-3 px-3">Facility Name</th>
                  <th className="py-3 px-3">District / Type</th>
                  <th className="py-3 px-3">Total Beds</th>
                  <th className="py-3 px-3">ICU Available</th>
                  <th className="py-3 px-3">Vents Free</th>
                  <th className="py-3 px-3">Oxygen Beds</th>
                  <th className="py-3 px-3">ICU Stress</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {facilities.map(fac => {
                  const availableGen = fac.totalBeds - fac.occupiedBeds;
                  const availableIcu = fac.icuBedsTotal - fac.icuBedsOccupied;
                  const freeVents = fac.ventilatorsTotal - fac.ventilatorsOccupied;
                  const icuRatio = fac.icuBedsTotal > 0 ? Math.round((fac.icuBedsOccupied / fac.icuBedsTotal) * 100) : 0;

                  const status =
                    fac.icuBedsTotal > 0 && icuRatio >= 90
                      ? 'CRITICAL STRESS'
                      : icuRatio >= 75
                      ? 'HIGH LOAD'
                      : availableGen === 0
                      ? 'WATCH'
                      : 'OPTIMAL';

                  const badgeClass =
                    status === 'CRITICAL STRESS'
                      ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300'
                      : status === 'HIGH LOAD'
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300';

                  return (
                    <tr key={fac.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{fac.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">HFR ID: {fac.id}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{fac.district}</div>
                        <div className="text-[10px] text-slate-500">{fac.type}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white">{fac.occupiedBeds}</span>
                        <span className="text-slate-400"> / {fac.totalBeds} ({availableGen} free)</span>
                      </td>
                      <td className="py-3.5 px-3">
                        {fac.icuBedsTotal > 0 ? (
                          <span className={`font-bold ${availableIcu <= 4 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                            {availableIcu} Free / {fac.icuBedsTotal}
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {fac.ventilatorsTotal > 0 ? (
                          <span className="font-bold">{freeVents} / {fac.ventilatorsTotal}</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-medium">{fac.oxygenBedsTotal - fac.oxygenBedsOccupied} Free</span>
                      </td>
                      <td className="py-3.5 px-3">
                        {fac.icuBedsTotal > 0 ? (
                          <div className="space-y-1">
                            <span className="font-black text-xs">{icuRatio}%</span>
                            <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${icuRatio >= 90 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                style={{ width: `${icuRatio}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {status === 'CRITICAL STRESS' ? (
                          <button
                            onClick={() => {
                              setDivertSourceFacility(fac);
                              setIsDivertModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Initiate Divert
                          </button>
                        ) : (
                          <button
                            onClick={onOpenBedMatrix}
                            className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            View Matrix
                          </button>
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

      {/* ========================================================================= */}
      {/* TAB 4: DRUG BUFFER & REDISTRIBUTION COMMAND */}
      {/* ========================================================================= */}
      {activeTab === 'resources' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                <span>State Medicine Buffer & Emergency Redistribution Command</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detecting critical district & PHC stockouts and pairing them with verified safe surplus facilities
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/maha-aushadhi"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Flame className="w-4 h-4 text-white" />
                <span>MahaAushadhi Grid &rarr;</span>
              </Link>
              <button
                onClick={onOpenStockLedger}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Open Master Drug Ledger</span>
              </button>
            </div>
          </div>

          {/* Surplus Match Pairs Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              State-Recommended Emergency Redistribution Opportunities
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortageMatchPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {pair.shortage.drugName}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded uppercase">
                      Critical Stockout
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] text-rose-500 font-bold uppercase">Destination Shortage</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{pair.shortage.facilityName}</div>
                      <div className="text-[11px] text-slate-500">
                        Stock: <strong className="text-rose-600">{pair.shortage.currentStock}</strong> / Buffer: {pair.shortage.bufferStock}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-emerald-500 font-bold uppercase">Source Surplus</div>
                      <div className="font-bold text-slate-900 dark:text-white mt-0.5">{pair.surplus.facilityName}</div>
                      <div className="text-[11px] text-slate-500">
                        Surplus: <strong className="text-emerald-600">{pair.transferable}</strong> Safe Transferable
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Batch: <strong>{pair.surplus.batchNumber}</strong>
                    </span>
                    <button
                      onClick={() => {
                        setActiveTransferShortage(pair);
                        setTransferUnits(Math.min(16, pair.transferable));
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Authorize Emergency Transfer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {shortageMatchPairs.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs">
                No active critical shortages currently require State redistribution.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EPIDEMIOLOGICAL SURVEILLANCE & RRT DESK */}
      {/* ========================================================================= */}
      {activeTab === 'surveillance' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span>Epidemiological Disease Surveillance & Rapid Response (RRT)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aggregating PHC syndromic fever clusters, maternal anemia flags, and vector-borne outbreak signals
              </p>
            </div>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
              National Center for Disease Control (NCDC) Compliant
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outbreaks.map(ob => (
              <div
                key={ob.id}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {ob.diseaseName} Cluster
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold">{ob.taluka}, {ob.district} District</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                    ob.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {ob.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Active Cases</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">{ob.activeCases}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Weekly Change</div>
                    <div className={`text-lg font-black ${ob.weeklyChangePercent > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {ob.weeklyChangePercent > 0 ? `+${ob.weeklyChangePercent}%` : `${ob.weeklyChangePercent}%`}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Primary Hotspot:</strong> {ob.primaryHotspotVillage} ({ob.subCentresAffected} sub-centres affected)
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <button
                    onClick={() => setActiveRrtOutbreak(ob)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Dispatch RRT</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Live State Interventions Log */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active State Rapid Response Interventions
            </h4>
            <div className="space-y-2">
              {interventions.map(itv => (
                <div
                  key={itv.id}
                  className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {itv.diseaseName} RRT &bull; {itv.taluka}, {itv.district}
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                        {itv.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Team Lead: <strong>{itv.teamLead}</strong> &bull; Dispatched: {new Date(itv.dispatchedAt || '').toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 max-w-md">
                    {itv.actionsTaken.join(' &bull; ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COUNTER-REFERRAL GOVERNANCE */}
      {/* ========================================================================= */}
      {activeTab === 'counter_referral' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Radio className="w-5 h-5 text-teal-600" />
              <span>Closed-Loop Counter-Referral Governance</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring patients discharged from Tertiary & District Care back downward to PHC & ASHA home follow-up
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Tertiary Discharges</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">100%</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Discharge summaries generated</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Counter-Referral Transmission</div>
              <div className="text-2xl font-black text-blue-600 mt-1">100%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Notified to referring PHC</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">ASHA Home Visits Due</div>
              <div className="text-2xl font-black text-amber-600 mt-1">2 Active</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Post-surgical follow-ups</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Loop Completion Rate</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">94.8%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Zero patient abandonment</div>
            </div>
          </div>

          {/* Cases Stream */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Recent Discharges & Counter-Referrals in Downward Transit
            </h4>
            {counterReferralCases.map(ref => (
              <div
                key={ref.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {ref.tokenCode}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {ref.patientName} &bull; {ref.patientAge}y {ref.patientGender}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                    Counter-Referral Active
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <strong>Trajectory:</strong> {ref.referringFacility} ➔ <strong>{ref.counterReferredTo || 'Velhe PHC'}</strong> ➔ Assigned ASHA: Sunita Laxman More
                </div>

                {ref.dischargeSummary && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] space-y-1">
                    <div><strong>Final Diagnosis:</strong> {ref.dischargeSummary.finalDiagnosis}</div>
                    <div><strong>Treatment Given:</strong> {ref.dischargeSummary.treatmentProvided}</div>
                    <div><strong>Follow-up Instructions:</strong> {ref.dischargeSummary.instructions}</div>
                    <div><strong>ASHA Requirement:</strong> {ref.dischargeSummary.communityFollowUpRequirement}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: STATE GIS MAP */}
      {/* ========================================================================= */}
      {activeTab === 'gis_map' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              <span>Maharashtra State Health Intelligence GIS Map</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any district sentinel to inspect live hospital capacity, ICU stress, and active outbreak signals
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Interactive District Selectors */}
            <div className="lg:col-span-2 bg-slate-950 rounded-2xl p-6 border border-slate-800 text-white space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Click a Maharashtra district sentinel:</span>
                <span className="font-mono text-emerald-400">● Live Monitoring Active</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {districtsList.map(d => {
                  const isSelected = selectedDistrict === d.district;
                  const icuStress = d.icuTotal ? Math.round((d.icuOccupied / d.icuTotal) * 100) : 0;
                  const isCritical = icuStress >= 90;

                  return (
                    <button
                      key={d.district}
                      onClick={() => setSelectedDistrict(d.district)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-900/60 border-blue-500 ring-2 ring-blue-500/30 shadow-lg'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{d.district}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {d.facilities.length} Facilities
                      </div>
                      <div className="text-xs font-mono text-blue-300 mt-2">
                        ICU: {icuStress}% Stress
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Geographic visual note */}
              <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Western Maharashtra &bull; Pune HQ Hub</span>
                <span>State Health Operations GIS v3.1</span>
              </div>
            </div>

            {/* Right Col: Selected District Detail Panel */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-3">
                <span className="text-[10px] font-bold text-blue-600 uppercase">District Sentinel Detail</span>
                <h4 className="font-black text-lg text-slate-900 dark:text-white mt-0.5">
                  {selectedDistrict} District
                </h4>
                <p className="text-[11px] text-slate-500">
                  Directorate operational review for {selectedDistrict} healthcare infrastructure
                </p>
              </div>

              <div className="space-y-3">
                {facilities
                  .filter(f => f.district === selectedDistrict)
                  .map(f => (
                    <div key={f.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">{f.name}</div>
                      <div className="text-[11px] text-slate-500">{f.type} &bull; {f.taluka} Taluka</div>
                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-700 dark:text-slate-300">
                        <span>Beds: {f.occupiedBeds}/{f.totalBeds}</span>
                        <span>ICU: {f.icuBedsOccupied}/{f.icuBedsTotal}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AUDIT TRAIL & ACCOUNTABILITY */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>State Operational Audit Trail & Accountability</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tamper-evident log of all State Director approvals, diverts, stock authorizations, and RRT deployments
            </p>
          </div>

          <div className="space-y-2">
            {getAuditLogs()
              .filter(l => l.administrativeLevel === 'state' || l.action.includes('TERTIARY') || l.action.includes('DIVERT') || l.action.includes('STOCK'))
              .slice(0, 15)
              .map(log => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-900 dark:text-white font-medium">
                      {log.resource}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Initiated by: <strong>{log.userName}</strong> ({log.userRole}) &bull; {log.userFacility}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded w-fit shrink-0">
                    VERIFIED STATE EVENT
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TERTIARY REFERRAL ACTION MODAL */}
      {/* ========================================================================= */}
      {activeTertiaryModalReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">State Apex Tertiary Routing & Bed Reservation</h4>
                <p className="text-[11px] text-slate-400">{activeTertiaryModalReferral.tokenCode}</p>
              </div>
              <button
                onClick={() => setActiveTertiaryModalReferral(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {activeTertiaryModalReferral.patientName} &bull; {activeTertiaryModalReferral.patientAge}y {activeTertiaryModalReferral.patientGender}
                </div>
                <div className="text-blue-700 dark:text-blue-300 font-semibold">
                  Required: {activeTertiaryModalReferral.specialtyRequired}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {activeTertiaryModalReferral.referralReason}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Select Destination State Tertiary Hospital
                </label>
                <select
                  defaultValue={activeTertiaryModalReferral.targetFacility}
                  id="tertiarySelect"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Sassoon General Hospital & BJMC, Pune">Sassoon General Hospital & BJMC, Pune (Tertiary Apex)</option>
                  <option value="KEM Hospital & Seth GS Medical College, Mumbai">KEM Hospital, Mumbai (Apex Tertiary)</option>
                  <option value="Government Medical College & Hospital, Nagpur">GMC Nagpur (Apex Trauma)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-900 dark:text-amber-300 text-[11px]">
                Approving this transfer reserves a dedicated tertiary bed, notifies the ambulance dispatch gateway, and updates the patient&apos;s active care owner to TERTIARY.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTertiaryModalReferral(null)}
                  className="w-1/3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sel = (document.getElementById('tertiarySelect') as HTMLSelectElement)?.value;
                    handleApproveTertiaryRouting(activeTertiaryModalReferral, sel);
                  }}
                  className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize Tertiary Bed & Transfer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTER-DISTRICT DIVERT MODAL */}
      {/* ========================================================================= */}
      {isDivertModalOpen && divertSourceFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
            <div className="bg-rose-900 text-white p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  <span>State Emergency Inter-District Divert</span>
                </h4>
                <p className="text-[11px] text-rose-200">DHS Maharashtra Bed Load Relief Protocol</p>
              </div>
              <button
                onClick={() => setIsDivertModalOpen(false)}
                className="text-rose-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Overloaded Facility: {divertSourceFacility.name}
                </div>
                <div className="text-[11px] text-rose-700 dark:text-rose-300">
                  Current ICU: {divertSourceFacility.icuBedsOccupied}/{divertSourceFacility.icuBedsTotal} Occupied &bull; Total Beds: {divertSourceFacility.occupiedBeds}/{divertSourceFacility.totalBeds}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Select Receiving Relief Facility
                </label>
                <select
                  value={selectedDivertTarget}
                  onChange={e => setSelectedDivertTarget(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="fac-sassoon-pune">Sassoon General Hospital & BJMC, Pune (1,200 Beds &bull; 8 Free ICUs)</option>
                  <option value="fac-dh-nashik">District Civil Hospital, Nashik (450 Beds &bull; 6 Free ICUs)</option>
                  <option value="fac-rh-bhor">Bhor Rural Hospital (50 Beds &bull; Stable)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Divert Operational Justification
                </label>
                <textarea
                  value={divertReason}
                  onChange={e => setDivertReason(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDivertModalOpen(false)}
                  className="w-1/3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerDivert}
                  className="w-2/3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Broadcast Inter-District Divert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EMERGENCY DRUG TRANSFER AUTHORIZATION */}
      {/* ========================================================================= */}
      {activeTransferShortage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
            <div className="bg-amber-900 text-white p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">Authorize State Emergency Stock Transfer</h4>
                <p className="text-[11px] text-amber-200">{activeTransferShortage.shortage.drugName}</p>
              </div>
              <button
                onClick={() => setActiveTransferShortage(null)}
                className="text-amber-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Source Facility</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{activeTransferShortage.surplus.facilityName}</div>
                  <div className="text-[11px] text-emerald-600 font-semibold">{activeTransferShortage.transferable} Safe Transferable</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Destination Facility</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{activeTransferShortage.shortage.facilityName}</div>
                  <div className="text-[11px] text-rose-600 font-semibold">{activeTransferShortage.shortage.currentStock} Remaining (Shortage)</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Transfer Quantity ({activeTransferShortage.shortage.unit || 'units'})
                </label>
                <input
                  type="number"
                  min={1}
                  max={activeTransferShortage.transferable}
                  value={transferUnits}
                  onChange={e => setTransferUnits(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-base font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Guarantees source inventory remains strictly above minimum buffer stock ({activeTransferShortage.surplus.bufferStock} units).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTransferShortage(null)}
                  className="w-1/3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizeStockTransfer}
                  className="w-2/3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Execute Emergency Transfer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RRT DISPATCH MODAL */}
      {/* ========================================================================= */}
      {activeRrtOutbreak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700 text-xs">
            <div className="bg-purple-900 text-white p-4 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-300" />
                  <span>Dispatch Rapid Response Medical Team (RRT)</span>
                </h4>
                <p className="text-[11px] text-purple-200">{activeRrtOutbreak.diseaseName} &bull; {activeRrtOutbreak.district}</p>
              </div>
              <button
                onClick={() => setActiveRrtOutbreak(null)}
                className="text-purple-300 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">
                  Cluster: {activeRrtOutbreak.diseaseName} &bull; {activeRrtOutbreak.activeCases} Cases ({activeRrtOutbreak.weeklyChangePercent}% weekly change)
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Target Hotspot: {activeRrtOutbreak.primaryHotspotVillage} ({activeRrtOutbreak.subCentresAffected} Sub-Centres Affected)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Assigned Team Leader / District Officer
                </label>
                <input
                  type="text"
                  value={rrtTeamLead}
                  onChange={e => setRrtTeamLead(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Containment Instructions & Mandate
                </label>
                <textarea
                  value={rrtNotes}
                  onChange={e => setRrtNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRrtOutbreak(null)}
                  className="w-1/3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchRrt}
                  className="w-2/3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Authorize & Dispatch Team</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
