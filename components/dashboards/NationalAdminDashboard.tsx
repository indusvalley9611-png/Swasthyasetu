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
  Globe,
  Share2,
  Truck,
  ShieldAlert,
} from 'lucide-react';

export interface NationalAdminDashboardProps {
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
  activeTab?: NationalTab;
  onTabChange?: (tab: NationalTab) => void;
}

export type NationalTab =
  | 'overview'
  | 'tertiary'
  | 'capacity'
  | 'resources'
  | 'surveillance'
  | 'counter_referral'
  | 'gis_map'
  | 'audit';

interface StateStressItem {
  state: string;
  region: string;
  status: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'OPTIMAL';
  reportingFacilities: number;
  totalBeds: number;
  occupiedBeds: number;
  bedUtilization: number;
  icuTotal: number;
  icuOccupied: number;
  icuStress: number;
  freeVentilators: number;
  criticalAlertsCount: number;
  alertSummary: string;
}

interface InterStateEscalation {
  id: string;
  tokenCode: string;
  originState: string;
  originFacility: string;
  destinationState: string;
  destinationFacility: string;
  specialtyRequired: string;
  triagePriority: 'red' | 'yellow' | 'green';
  status: 'RAISED' | 'STATE_REVIEW' | 'NATIONAL_ESCALATION' | 'DESTINATION_ACCEPTED' | 'TRANSFERRED' | 'RESOLVED';
  timeRaised: string;
  clinicalIndication: string;
}

export function NationalAdminDashboard({
  onOpenBedMatrix,
  onOpenStockLedger,
  activeTab: externalTab,
  onTabChange,
}: NationalAdminDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    facilities,
    stocks,
    referrals,
    updateReferralStatus,
    stockTransfers,
  } = useSync();

  // Active navigation tab
  const [internalTab, setInternalTab] = useState<NationalTab>(externalTab || 'overview');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (tab: NationalTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Selected state for drill-down inspection
  const [selectedStateDrilldown, setSelectedStateDrilldown] = useState<string | null>(null);

  // Active Inter-State Escalation Modal
  const [activeEscalationModal, setActiveEscalationModal] = useState<InterStateEscalation | null>(null);

  // --- LIVE DERIVED METRICS ---
  // Live facility calculations for Maharashtra
  const mhTotalBeds = useMemo(() => facilities.reduce((t, f) => t + f.totalBeds, 0), [facilities]);
  const mhOccupiedBeds = useMemo(() => facilities.reduce((t, f) => t + f.occupiedBeds, 0), [facilities]);
  const mhBedUtil = mhTotalBeds ? Math.round((mhOccupiedBeds / mhTotalBeds) * 100) : 89;

  const mhTotalIcu = useMemo(() => facilities.reduce((t, f) => t + f.icuBedsTotal, 0), [facilities]);
  const mhOccupiedIcu = useMemo(() => facilities.reduce((t, f) => t + f.icuBedsOccupied, 0), [facilities]);
  const mhIcuStress = mhTotalIcu ? Math.round((mhOccupiedIcu / mhTotalIcu) * 100) : 93;

  const mhTotalVents = useMemo(() => facilities.reduce((t, f) => t + f.ventilatorsTotal, 0), [facilities]);
  const mhOccupiedVents = useMemo(() => facilities.reduce((t, f) => t + f.ventilatorsOccupied, 0), [facilities]);
  const mhFreeVents = Math.max(mhTotalVents - mhOccupiedVents, 15);

  const mhCriticalStockouts = useMemo(() => {
    return stocks.filter(s => getMedicineStatus(s) === 'CRITICAL');
  }, [stocks]);

  // National State Stress Index: Connected State Health Networks
  const stateStressData: StateStressItem[] = useMemo(() => {
    const list: StateStressItem[] = [
      {
        state: 'Maharashtra',
        region: 'Western Healthcare Grid',
        status: (mhIcuStress >= 90 ? 'CRITICAL' : 'HIGH') as StateStressItem['status'],
        reportingFacilities: 14,
        totalBeds: mhTotalBeds || 2480,
        occupiedBeds: mhOccupiedBeds || 2210,
        bedUtilization: mhBedUtil,
        icuTotal: mhTotalIcu || 230,
        icuOccupied: mhOccupiedIcu || 214,
        icuStress: mhIcuStress,
        freeVentilators: mhFreeVents,
        criticalAlertsCount: mhCriticalStockouts.length || 2,
        alertSummary: 'Pune DH ICU at 90% load; Velhe PHC ASV buffer breached.',
      },
      {
        state: 'Madhya Pradesh',
        region: 'Central Health Corridor',
        status: 'HIGH',
        reportingFacilities: 52,
        totalBeds: 7850,
        occupiedBeds: 6515,
        bedUtilization: 83,
        icuTotal: 680,
        icuOccupied: 591,
        icuStress: 87,
        freeVentilators: 42,
        criticalAlertsCount: 3,
        alertSummary: 'Bhopal & Jabalpur tertiary centers reporting high pediatric ICU occupancy.',
      },
      {
        state: 'Karnataka',
        region: 'Southern Healthcare Grid',
        status: 'HIGH',
        reportingFacilities: 31,
        totalBeds: 6200,
        occupiedBeds: 4898,
        bedUtilization: 79,
        icuTotal: 580,
        icuOccupied: 470,
        icuStress: 81,
        freeVentilators: 68,
        criticalAlertsCount: 2,
        alertSummary: 'North Karnataka border hospitals facing seasonal vector caseload.',
      },
      {
        state: 'Gujarat',
        region: 'Western Healthcare Grid',
        status: 'MODERATE',
        reportingFacilities: 33,
        totalBeds: 5400,
        occupiedBeds: 3834,
        bedUtilization: 71,
        icuTotal: 490,
        icuOccupied: 362,
        icuStress: 74,
        freeVentilators: 94,
        criticalAlertsCount: 0,
        alertSummary: 'Ahmedabad Civil Hospital operating within safe operational buffer.',
      },
      {
        state: 'Tamil Nadu',
        region: 'Southern Healthcare Grid',
        status: 'OPTIMAL',
        reportingFacilities: 38,
        totalBeds: 7470,
        occupiedBeds: 4855,
        bedUtilization: 65,
        icuTotal: 660,
        icuOccupied: 448,
        icuStress: 68,
        freeVentilators: 142,
        criticalAlertsCount: 0,
        alertSummary: 'Tertiary apex capacity fully available with surplus emergency reserves.',
      },
    ];

    const order: Record<StateStressItem['status'], number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, OPTIMAL: 3 };
    return list.sort((a, b) => order[a.status] - order[b.status]);
  }, [mhBedUtil, mhIcuStress, mhFreeVents, mhTotalBeds, mhOccupiedBeds, mhTotalIcu, mhOccupiedIcu, mhCriticalStockouts.length]);

  // Aggregate National Totals
  const nationalTotalBeds = useMemo(() => stateStressData.reduce((t, s) => t + s.totalBeds, 0), [stateStressData]);
  const nationalOccupiedBeds = useMemo(() => stateStressData.reduce((t, s) => t + s.occupiedBeds, 0), [stateStressData]);
  const nationalBedUtilization = nationalTotalBeds ? Math.round((nationalOccupiedBeds / nationalTotalBeds) * 100) : 78;

  const nationalTotalIcu = useMemo(() => stateStressData.reduce((t, s) => t + s.icuTotal, 0), [stateStressData]);
  const nationalOccupiedIcu = useMemo(() => stateStressData.reduce((t, s) => t + s.icuOccupied, 0), [stateStressData]);
  const nationalIcuStress = nationalTotalIcu ? Math.round((nationalOccupiedIcu / nationalTotalIcu) * 100) : 84;

  const nationalFreeVentilators = useMemo(() => stateStressData.reduce((t, s) => t + s.freeVentilators, 0), [stateStressData]);
  const nationalCriticalAlertsTotal = useMemo(() => stateStressData.reduce((t, s) => t + s.criticalAlertsCount, 0), [stateStressData]);

  // Inter-State Escalations (Cases requiring National / Apex Hospital Intervention)
  const [interStateEscalations, setInterStateEscalations] = useState<InterStateEscalation[]>([
    {
      id: 'ISE-2026-001',
      tokenCode: 'AIIMS-ND-MH01',
      originState: 'Maharashtra',
      originFacility: 'District Hospital Aundh, Pune',
      destinationState: 'Delhi NCR',
      destinationFacility: 'AIIMS New Delhi (Apex Trauma & Neurosurgery)',
      specialtyRequired: 'Complex Pediatric Craniosynostosis & Neuro-Trauma',
      triagePriority: 'red',
      status: 'NATIONAL_ESCALATION',
      timeRaised: '2026-09-13T08:30:00Z',
      clinicalIndication: 'Severe compound basilar skull fracture with CSF leak requiring specialized pediatric micro-neurosurgical reconstruction.',
    },
    {
      id: 'ISE-2026-002',
      tokenCode: 'PGI-CHD-MP04',
      originState: 'Madhya Pradesh',
      originFacility: 'District Hospital Jabalpur',
      destinationState: 'Chandigarh',
      destinationFacility: 'PGIMER Chandigarh (Advanced Cardiac Centre)',
      specialtyRequired: 'Neonatal Arterial Switch & ECMO Support',
      triagePriority: 'red',
      status: 'NATIONAL_ESCALATION',
      timeRaised: '2026-09-13T09:15:00Z',
      clinicalIndication: 'Transposition of Great Arteries (TGA) with intact ventricular septum in a 4-day-old neonate requiring immediate arterial switch.',
    },
    {
      id: 'ISE-2026-003',
      tokenCode: 'SGH-BJMC-KA02',
      originState: 'Karnataka',
      originFacility: 'District Hospital Belagavi',
      destinationState: 'Maharashtra',
      destinationFacility: 'Sassoon General Hospital & BJMC, Pune',
      specialtyRequired: 'Super-Specialty Hepato-Biliary & Liver Trauma',
      triagePriority: 'red',
      status: 'DESTINATION_ACCEPTED',
      timeRaised: '2026-09-13T07:45:00Z',
      clinicalIndication: 'Grade V blunt liver laceration with active contrast extravasation. Sassoon HPB unit bed reserved.',
    },
    {
      id: 'ISE-2026-004',
      tokenCode: 'AIIMS-BPL-MH05',
      originState: 'Maharashtra',
      originFacility: 'General District Hospital, Gadchiroli',
      destinationState: 'Madhya Pradesh',
      destinationFacility: 'AIIMS Bhopal (Apex Infectious Diseases & Critical Care)',
      specialtyRequired: 'Complicated Resistant Falciparum Malaria & ARDS',
      triagePriority: 'red',
      status: 'STATE_REVIEW',
      timeRaised: '2026-09-13T10:00:00Z',
      clinicalIndication: 'Cerebral malaria with multiorgan dysfunction syndrome (MODS) refractory to parenteral artesunate.',
    },
    {
      id: 'ISE-2026-005',
      tokenCode: 'JIPMER-TN-KA01',
      originState: 'Karnataka',
      originFacility: 'District Hospital Mysuru',
      destinationState: 'Puducherry / Tamil Nadu',
      destinationFacility: 'JIPMER Puducherry (Apex Bone Marrow Centre)',
      specialtyRequired: 'Allogeneic Hematopoietic Stem Cell Transplant',
      triagePriority: 'yellow',
      status: 'RAISED',
      timeRaised: '2026-09-13T10:30:00Z',
      clinicalIndication: 'Very severe aplastic anemia (VSAA) with matched sibling donor awaiting tertiary conditioning bed.',
    },
  ]);

  // National Disease Surveillance Signals (NCDC Integrated)
  const nationalDiseaseSignals = useMemo(() => {
    return [
      {
        id: 'nds-01',
        disease: 'Dengue Fever Cluster',
        state: 'Maharashtra',
        region: 'Western Hub (Pune / Velhe Block)',
        riskLevel: 'HIGH RISK',
        trend: '+28.5%',
        activeCases: 142,
        signalScope: 'District Sentinel Spike & NCDC Threshold Breach',
        actionRequired: 'Central RRT deployed with NS1 rapid antigen kits and mobile diagnostic van.',
      },
      {
        id: 'nds-02',
        disease: 'Plasmodium Falciparum Malaria',
        state: 'Maharashtra & MP Border',
        region: 'Gadchiroli & Balaghat Forest Corridor',
        riskLevel: 'HIGH RISK',
        trend: '+15.2%',
        activeCases: 84,
        signalScope: 'Cross-Border Tribal Health Sentinel Watch',
        actionRequired: 'Joint inter-state surveillance camp and indoor residual spraying (IRS) mobilized.',
      },
      {
        id: 'nds-03',
        disease: 'Acute Encephalitis Syndrome (AES)',
        state: 'Eastern Sentinel Grid',
        region: 'Gorakhpur & Muzaffarpur Basin',
        riskLevel: 'WATCH',
        trend: '-4.1%',
        activeCases: 29,
        signalScope: 'Regional Seasonal Baseline Surveillance',
        actionRequired: 'ICU step-down capacity monitored; zero pediatric mortality flagged this reporting week.',
      },
    ];
  }, []);

  // Action: Approve Inter-State Apex Referral
  const handleApproveInterStateEscalation = (esc: InterStateEscalation) => {
    setInterStateEscalations(prev =>
      prev.map(item =>
        item.id === esc.id ? { ...item, status: 'DESTINATION_ACCEPTED' } : item
      )
    );

    recordAuditLog({
      userId: user?.id || 'national-admin-01',
      userName: user?.name || 'Dr. Arvind Sharma',
      userRole: 'national_admin',
      userFacility: 'National Health Authority (NHA) & MoHFW, New Delhi',
      administrativeLevel: 'national',
      patientId: 'NATIONAL_ESCALATION_OP',
      patientName: `Inter-State Case ${esc.tokenCode}`,
      patientAbha: 'N/A (DISHA Aggregated)',
      action: 'INTER_STATE_ESCALATION_APPROVED',
      resource: `${esc.tokenCode}: ${esc.originState} -> ${esc.destinationFacility}`,
      reason: `National Mission Director endorsed tertiary apex transfer for ${esc.specialtyRequired}.`,
      accessGranted: true,
    });

    setActiveEscalationModal(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-20">
      
      {/* 1. COMPACT NATIONAL MISSION CONTROL IDENTITY HEADER */}
      {/* Reduced vertical space as required by Section 13 */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center shrink-0 shadow-md border border-blue-400/30">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                NATIONAL HEALTH MISSION CONTROL (LEVEL 5)
              </span>
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                National Health Authority (NHA) & MoHFW &bull; New Delhi
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <span>{user?.name || 'Dr. Arvind Sharma'}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {user?.roleTitleEn || 'National Mission Director'}
              </span>
            </h1>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>ABDM Registry Node #HFR-IND-DEL-NHA01</span>
              <span>&bull;</span>
              <span className="text-blue-300 font-mono">DISHA-Compliant Macro Health Telemetry</span>
              <span>&bull;</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                National ABDM Gateway Active
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            onClick={onOpenBedMatrix}
            className="px-3.5 py-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02] cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-300" />
            <span>National Bed Grid</span>
          </button>
          <Link
            href="/maha-aushadhi"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 border border-rose-400/30 text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:scale-[1.02]"
          >
            <Flame className="w-4 h-4 text-white animate-pulse" />
            <span>MahaAushadhi Grid</span>
          </Link>
        </div>
      </div>

      {/* 2. NATIONAL PRIORITY ACTION CENTER (INTER-STATE INTERVENTIONS REQUIRED) */}
      {/* Kept as dark component, exactly 4 cards, each with ONE clear action as required by Section 3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-white space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>NATIONAL PRIORITY ACTION CENTER &bull; INTER-STATE INTERVENTIONS REQUIRED</span>
          </div>
          <span className="text-[10px] text-slate-400">Live operational signals aggregated across connected state health networks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Action 1: Critical Capacity (Maharashtra) */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase">
                <span>🔴 CRITICAL CAPACITY</span>
                <span>MAHARASHTRA</span>
              </div>
              <p className="font-bold text-white mt-1 text-sm">ICU at 93% Load (Western Hub)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Sassoon BJMC & Pune DH ICU constrained. Inter-state referral diversion to Gujarat/Karnataka recommended.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('capacity')}
              className="w-full py-1.5 px-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Review Capacity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 2: Critical Drug Shortage (State Network) */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase">
                <span>🟠 CRITICAL DRUG SHORTAGE</span>
                <span>STATE NETWORK</span>
              </div>
              <p className="font-bold text-white mt-1 text-sm">Anti-Snake Venom Buffer Alert</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Maharashtra rural sentinel (Velhe PHC) reports 4 vials vs 20 buffer. Central reserve dispatch recommended.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('resources')}
              className="w-full py-1.5 px-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Open MahaAushadhi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 3: Inter-State Escalation (5 Cases) */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 uppercase">
                <span>🔵 INTER-STATE ESCALATION</span>
                <span>{interStateEscalations.length} Cases</span>
              </div>
              <p className="font-bold text-white mt-1 text-sm">Tertiary Coordination Grid</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                5 high-acuity pediatric cardio & neurotrauma cases awaiting AIIMS New Delhi & PGIMER bed reservation.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('tertiary')}
              className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Review Escalation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 4: National Epidemiological Signal */}
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-400 uppercase">
                <span>🟣 EPIDEMIOLOGICAL SIGNAL</span>
                <span>NCDC ALERT</span>
              </div>
              <p className="font-bold text-white mt-1 text-sm">Dengue Cluster (+28.5% Spike)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Western Maharashtra sentinel breach & cross-border vector surveillance alert in central corridor.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('surveillance')}
              className="w-full py-1.5 px-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Review Surveillance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. NATIONAL KPI ROW (4 Compact Cards as required by Section 4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Metric 1: National Bed Capacity */}
        <div
          onClick={() => setActiveTab('capacity')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>National Bed Capacity</span>
            <Building2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5">
            {nationalBedUtilization}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <strong>{(nationalTotalBeds - nationalOccupiedBeds).toLocaleString()}</strong> Free of {nationalTotalBeds.toLocaleString()} Beds
          </div>
          <div className="mt-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${nationalBedUtilization}%` }}
            />
          </div>
        </div>

        {/* Metric 2: ICU / Ventilator Stress */}
        <div
          onClick={() => setActiveTab('capacity')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>ICU / Ventilator Stress</span>
            <Activity className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1.5">
            {nationalIcuStress}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <strong>{nationalTotalIcu - nationalOccupiedIcu}</strong> ICU Beds &bull; <strong>{nationalFreeVentilators}</strong> Vents Free
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md w-fit">
            <AlertTriangle className="w-3 h-3" /> Maharashtra & MP Under Stress
          </div>
        </div>

        {/* Metric 3: Active Inter-State Escalations */}
        <div
          onClick={() => setActiveTab('tertiary')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Inter-State Escalations</span>
            <Share2 className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">
            {interStateEscalations.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Cases in Cross-State Apex Transit
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md w-fit">
            <Clock className="w-3 h-3" /> 3 AIIMS &bull; 1 PGIMER &bull; 1 BJMC
          </div>
        </div>

        {/* Metric 4: Critical Resource Alerts */}
        <div
          onClick={() => setActiveTab('resources')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <span>Critical Resource Alerts</span>
            <Package className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1.5">
            {nationalCriticalAlertsTotal}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            State Networks Below Safe Reserve
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit">
            <Flame className="w-3 h-3 text-rose-500" /> Central Buffer Dispatch Active
          </div>
        </div>
      </div>

      {/* 4. PRIMARY MODULE TABS (Section 5) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
        {[
          { id: 'overview' as NationalTab, label: 'Overview', icon: Layers },
          { id: 'tertiary' as NationalTab, label: `Inter-State Escalations (${interStateEscalations.length})`, icon: Share2 },
          { id: 'capacity' as NationalTab, label: 'National Capacity', icon: Building2 },
          { id: 'resources' as NationalTab, label: `MahaAushadhi Network (${nationalCriticalAlertsTotal})`, icon: Flame },
          { id: 'surveillance' as NationalTab, label: 'National Disease Surveillance', icon: Activity },
          { id: 'counter_referral' as NationalTab, label: 'Counter-Referral', icon: Radio },
          { id: 'gis_map' as NationalTab, label: 'GIS Facility Network', icon: Map },
          { id: 'audit' as NationalTab, label: 'Audit Trail', icon: FileText },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-900 text-white shadow-md font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-300' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (Section 6: LEFT 65-70% State Stress / RIGHT 30-35% Signals) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEFT ~68%: National State Stress Index (Section 7) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>National State Stress Index</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Operational load across connected state health networks
                </p>
              </div>
              <button
                onClick={() => setActiveTab('capacity')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full National Grid</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* State Stress Table / Cards Sorted by Severity */}
            <div className="space-y-2.5">
              {stateStressData.map(st => {
                const badgeColor =
                  st.status === 'CRITICAL'
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    : st.status === 'HIGH'
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : st.status === 'MODERATE'
                    ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';

                return (
                  <div
                    key={st.state}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-300 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-slate-900 dark:text-white text-base">
                          {st.state}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          &bull; {st.region}
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${badgeColor}`}>
                          {st.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {st.reportingFacilities} Reporting Nodes &bull; {st.totalBeds.toLocaleString()} Monitored Beds
                      </div>
                    </div>

                    {/* Operational Metrics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Beds Occupied</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {st.occupiedBeds.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">({st.bedUtilization}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">ICU Stress</div>
                        <div className={`font-bold ${st.icuStress >= 90 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                          {st.icuOccupied} / {st.icuTotal} <span className="text-[11px] font-normal text-slate-500">({st.icuStress}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Ventilators</div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {st.freeVentilators} Free
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Critical Alerts</div>
                        <div className={`font-bold ${st.criticalAlertsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {st.criticalAlertsCount} Active
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-lg">
                        <strong>Telemetry Note:</strong> {st.alertSummary}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedStateDrilldown(st.state);
                          setActiveTab('capacity');
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Drill-Down</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT ~32%: National Disease Surveillance (Section 8) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <span>National Disease Surveillance</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  High-priority epidemic signals & sentinel surveillance
                </p>
              </div>
              <button
                onClick={() => setActiveTab('surveillance')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                All Signals
              </button>
            </div>

            <div className="space-y-3">
              {nationalDiseaseSignals.map(sig => (
                <div
                  key={sig.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 dark:text-white text-sm">
                      {sig.disease}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      sig.riskLevel === 'HIGH RISK'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {sig.riskLevel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{sig.state} &bull; {sig.region}</span>
                    <span className={sig.trend.startsWith('+') ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {sig.trend} this week
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <strong className="text-slate-700 dark:text-slate-300">Action:</strong> {sig.actionRequired}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick NCDC Interop Note */}
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>NCDC Integrated Disease Surveillance (IDSP)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Automated threshold alarms fire when local syndromic caseload exceeds 2 standard deviations above historical 5-year seasonal baseline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INTER-STATE ESCALATIONS (Section 11) */}
      {/* ========================================================================= */}
      {activeTab === 'tertiary' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <span>National Inter-State Escalation Desk</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                High-acuity clinical cases exceeding state-level tertiary capacity, routed to National Centres of Excellence (AIIMS / PGIMER / Apex Medical Colleges)
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
              5 Active Cross-State Referrals
            </span>
          </div>

          <div className="space-y-3">
            {interStateEscalations.map(esc => (
              <div
                key={esc.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-indigo-300 transition-all space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">
                      {esc.tokenCode}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {esc.specialtyRequired}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      CRITICAL APEX CASE
                    </span>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                    esc.status === 'DESTINATION_ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  }`}>
                    {esc.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Origin Facility & State</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">{esc.originFacility}</div>
                    <div className="text-[11px] text-slate-500">{esc.originState}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Destination Apex Centre</div>
                    <div className="font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{esc.destinationFacility}</div>
                    <div className="text-[11px] text-slate-500">{esc.destinationState}</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                  <strong className="text-slate-800 dark:text-slate-200">Clinical Indication:</strong> {esc.clinicalIndication}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Logged: {new Date(esc.timeRaised).toLocaleString()}
                  </span>
                  {esc.status !== 'DESTINATION_ACCEPTED' ? (
                    <button
                      onClick={() => handleApproveInterStateEscalation(esc)}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Endorse Inter-State Apex Bed</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Destination Apex Bed Reserved</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NATIONAL CAPACITY (Section 10) */}
      {/* ========================================================================= */}
      {activeTab === 'capacity' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>National Health Grid & Capacity Stress</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-state operational bed loads, ICU capacity, and ventilator availability with hierarchical drill-down
              </p>
            </div>
            <button
              onClick={onOpenBedMatrix}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Launch Live Bed Matrix Modal</span>
            </button>
          </div>

          {/* Connected States Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                  <th className="py-2.5 px-3">State / Health Network</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Reporting Nodes</th>
                  <th className="py-2.5 px-3">Bed Load</th>
                  <th className="py-2.5 px-3">ICU Available</th>
                  <th className="py-2.5 px-3">Ventilators Free</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Drill-Down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stateStressData.map(st => (
                  <tr key={st.state} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{st.state}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{st.region}</td>
                    <td className="py-3 px-3 font-mono">{st.reportingFacilities} Facilities</td>
                    <td className="py-3 px-3">
                      <span className="font-bold">{st.occupiedBeds.toLocaleString()}</span> / {st.totalBeds.toLocaleString()} ({st.bedUtilization}%)
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-bold ${st.icuStress >= 90 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                        {st.icuTotal - st.icuOccupied} Free / {st.icuTotal} ({st.icuStress}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold">{st.freeVentilators} Free</td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                        st.status === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : st.status === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedStateDrilldown(selectedStateDrilldown === st.state ? null : st.state)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                      >
                        {selectedStateDrilldown === st.state ? 'Close' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Drill-Down Section if selected */}
          {selectedStateDrilldown === 'Maharashtra' && (
            <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  Maharashtra Sentinel Facility Drill-Down (Simulated ABDM Telemetry)
                </h4>
                <span className="text-[11px] text-blue-600 font-bold">14 Facilities Reporting</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {facilities.slice(0, 6).map(f => (
                  <div key={f.id} className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{f.name}</div>
                    <div className="text-[11px] text-slate-500">{f.type} &bull; {f.district}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-700 dark:text-slate-300">
                      <span>Beds: {f.occupiedBeds}/{f.totalBeds}</span>
                      <span>ICU: {f.icuBedsOccupied}/{f.icuBedsTotal}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MAHAAUSHADHI NETWORK (Section 9) */}
      {/* ========================================================================= */}
      {activeTab === 'resources' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <span>MahaAushadhi National Emergency Drug Network</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aggregated national intelligence: State buffer breaches, inter-state emergency requests, and strategic central reserves
              </p>
            </div>
            <Link
              href="/maha-aushadhi"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Flame className="w-4 h-4 text-white animate-pulse" />
              <span>Open Dedicated MahaAushadhi Console &rarr;</span>
            </Link>
          </div>

          {/* Strategic Reserves Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
              <div className="text-[10px] font-black uppercase text-rose-600">Strategic Reserve Alert</div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">Anti-Snake Venom (Polyvalent)</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Velhe PHC & Gadchiroli DH in Maharashtra report critical stockout. Nashik surplus consignment in 108 transit.
              </p>
              <div className="text-[11px] font-mono text-rose-700 dark:text-rose-300 font-bold">
                16 Vials in Transit &bull; 110 Vials Safe Surplus Available
              </div>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
              <div className="text-[10px] font-black uppercase text-amber-600">Inter-State Transit Corridor</div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">Emergency Oxytocin & Magnesium Sulphate</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Belagavi-Kolhapur border maternity buffer active. Green corridor clearance authorized.
              </p>
              <div className="text-[11px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                2 Active Border Consignments
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
              <div className="text-[10px] font-black uppercase text-emerald-600">Statutory Reserve Compliance</div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">20% Minimum Buffer Protection</div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Mathematical safety formula blocks unauthorized transfers below 20-unit threshold across all nodes.
              </p>
              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                100% Policy Enforcement &bull; Zero Breaches
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NATIONAL DISEASE SURVEILLANCE (Section 8) */}
      {/* ========================================================================= */}
      {activeTab === 'surveillance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span>NCDC National Integrated Disease Surveillance (IDSP)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aggregating syndromic fever clusters, vector-borne outbreaks, and multi-state epidemic signals
              </p>
            </div>
            <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
              Epidemic Intelligence Unit (EIU)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {nationalDiseaseSignals.map(sig => (
              <div
                key={sig.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{sig.disease}</h4>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                    sig.riskLevel === 'HIGH RISK' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {sig.riskLevel}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 font-semibold">{sig.state} &bull; {sig.region}</div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Active Cases</div>
                    <div className="text-base font-black text-slate-900 dark:text-white">{sig.activeCases}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Weekly Spike</div>
                    <div className={`text-base font-black ${sig.trend.startsWith('+') ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {sig.trend}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <strong>Scope:</strong> {sig.signalScope}
                </div>

                <div className="text-[11px] text-slate-500 bg-purple-50/40 dark:bg-purple-950/20 p-2 rounded-lg border border-purple-100 dark:border-purple-900/40">
                  <strong>Action:</strong> {sig.actionRequired}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COUNTER-REFERRAL (Section 12) */}
      {/* ========================================================================= */}
      {activeTab === 'counter_referral' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Radio className="w-5 h-5 text-teal-600" />
              <span>National Closed-Loop Counter-Referral Governance</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monitoring system-level multi-tier referral loop completion: Tertiary Discharge ➔ District ➔ PHC ➔ ASHA Field Follow-up
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Apex Discharges</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">100%</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Structured discharge summaries</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Downward Transmission</div>
              <div className="text-2xl font-black text-blue-600 mt-1">100%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Dispatched to referring PHC</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Community Follow-Up</div>
              <div className="text-2xl font-black text-amber-600 mt-1">94.8%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">ASHA home verification completed</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Zero Patient Abandonment</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">VERIFIED</div>
              <div className="text-[11px] text-slate-500 mt-0.5">DISHA/ABDM policy compliant</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: GIS FACILITY NETWORK */}
      {/* ========================================================================= */}
      {activeTab === 'gis_map' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-600" />
              <span>National Health Infrastructure GIS Grid</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Geospatial mapping of connected state health gateways and apex medical colleges
            </p>
          </div>

          <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
            <Globe className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
            <div className="text-sm font-bold text-white">5 State Health Networks Telemetry Online</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Maharashtra, Madhya Pradesh, Karnataka, Gujarat, and Tamil Nadu networks actively synchronized with the National Health Authority HFR Node.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>National Mission Director Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tamper-evident record of all inter-state escalations, strategic reserve allocations, and macro telemetry queries
            </p>
          </div>

          <div className="space-y-2">
            {getAuditLogs()
              .slice(0, 10)
              .map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-900 dark:text-white font-medium">{log.resource}</div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded w-fit">
                    VERIFIED ABDM EVENT
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
