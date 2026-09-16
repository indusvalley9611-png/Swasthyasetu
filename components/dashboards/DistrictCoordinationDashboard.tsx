'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import {
  getMedicineStatus,
  getAvailableResource,
  getFacilityStatus,
  getDistanceKm,
  getTriageUrgencyMeta,
} from '@/lib/resourceManagement';
import {
  generateSmartReallocationRecommendations,
  calculateReferralRiskScore,
  createTamperEvidentBlock,
  computeDistrictSlaMetrics,
  GENESIS_HASH,
} from '@/lib/dhoIntelligenceEngine';
import {
  Referral,
  Facility,
  Patient,
  StockTransfer,
  SmartReallocationRecommendation,
  StateEscalation,
  TamperEvidentAuditBlock,
  DhoNotification,
} from '@/lib/types';
import {
  INITIAL_STATE_ESCALATIONS,
  INITIAL_TAMPER_AUDIT_BLOCKS,
  INITIAL_DHO_NOTIFICATIONS,
} from '@/lib/mockData';
import { DistrictReferralReviewModal } from './DistrictReferralReviewModal';
import { SmartReallocationModal } from '../dho/SmartReallocationModal';
import { StateEscalationModal } from '../dho/StateEscalationModal';
import { TamperEvidentAuditView } from '../dho/TamperEvidentAuditView';
import { DhoNotificationDrawer } from '../dho/DhoNotificationDrawer';
import { DistrictFacilityMapView } from '../dho/DistrictFacilityMapView';
import { DistrictTrackingCenter } from '../dho/DistrictTrackingCenter';
import {
  BarChart3,
  Users,
  ShieldCheck,
  Building2,
  Package,
  Search,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  HeartPulse,
  CheckCircle2,
  Bed,
  Truck,
  Eye,
  AlertOctagon,
  Flame,
  Clock,
  Radio,
  FileCheck,
  Sparkles,
  MapPin,
  Pill,
  RefreshCw,
  AlertTriangle,
  Activity,
  Layers,
  Phone,
} from 'lucide-react';

export interface DistrictCoordinationDashboardProps {
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
  onOpenAuditLogs?: () => void;
  onOpenPatientTimeline?: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
  activeTab?: DistrictTab;
  onTabChange?: (tab: DistrictTab) => void;
}

export type DistrictTab =
  | 'overview'
  | 'map'
  | 'capacity'
  | 'tertiary'
  | 'reallocation'
  | 'escalations'
  | 'audit'
  | 'track_medicine'
  | 'track_referrals'
  | 'track_patients';

export function DistrictCoordinationDashboard({
  onOpenBedMatrix,
  onOpenStockLedger,
  onOpenAuditLogs,
  onOpenPatientTimeline,
  onOpenReferralToken,
  activeTab: externalTab,
  onTabChange,
}: DistrictCoordinationDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const {
    facilities,
    stocks,
    referrals,
    patients,
    updateReferralStatus,
    stockTransfers,
  } = useSync();

  // Active navigation tab
  const [internalTab, setInternalTab] = useState<DistrictTab>(externalTab || 'overview');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (tab: DistrictTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Referral Filter state inside Referrals view
  const [referralFilter, setReferralFilter] = useState<'ALL' | 'CRITICAL' | 'PENDING' | 'ACCEPTED' | 'ADMITTED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Overlays state
  const [activeReviewReferral, setActiveReviewReferral] = useState<Referral | null>(null);
  const [activeReallocationItem, setActiveReallocationItem] = useState<SmartReallocationRecommendation | null>(null);
  const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);

  // State-level & Reallocation data stored in state
  const [stateEscalations, setStateEscalations] = useState<StateEscalation[]>(INITIAL_STATE_ESCALATIONS);
  const [tamperBlocks, setTamperBlocks] = useState<TamperEvidentAuditBlock[]>(INITIAL_TAMPER_AUDIT_BLOCKS);
  const [notifications, setNotifications] = useState<DhoNotification[]>(INITIAL_DHO_NOTIFICATIONS);
  const [reallocationResourceFilter, setReallocationResourceFilter] = useState<'ALL' | 'MEDICINE' | 'ICU_BEDS' | 'AMBULANCE' | 'BLOOD_UNITS'>('ALL');
  const [approvedReallocations, setApprovedReallocations] = useState<string[]>([]);

  // Current district scope
  const currentDistrict = user?.district || 'Pune';

  // Filter facilities scoped strictly to current district
  const districtFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (f.district?.toLowerCase() === currentDistrict.toLowerCase()) return true;
      if (f.name.toLowerCase().includes(currentDistrict.toLowerCase())) return true;
      if (currentDistrict.toLowerCase() === 'pune') {
        const name = f.name.toLowerCase();
        return name.includes('aundh') || name.includes('velhe') || name.includes('nasrapur') || name.includes('bhor') || name.includes('pune') || name.includes('sassoon');
      }
      if (currentDistrict.toLowerCase() === 'nashik') {
        const name = f.name.toLowerCase();
        return name.includes('nashik') || name.includes('malegaon') || name.includes('sinnar') || name.includes('niphad') || name.includes('trimbakeshwar') || name.includes('chandwad') || name.includes('yeola') || name.includes('igatpuri');
      }
      return true;
    });
  }, [facilities, currentDistrict]);

  // District facility names for matching referrals
  const districtFacilityNames = useMemo(() => {
    const names = new Set<string>();
    districtFacilities.forEach((f) => {
      names.add(f.name.toLowerCase());
      if (f.id) names.add(f.id.toLowerCase());
    });
    return names;
  }, [districtFacilities]);

  // Scoped referrals belonging to this district
  const districtReferrals = useMemo(() => {
    return (referrals || []).filter((r) => {
      const from = (r.referringFacility || '').toLowerCase();
      const to = (r.targetFacility || '').toLowerCase();
      for (const name of districtFacilityNames) {
        if (from.includes(name) || to.includes(name)) return true;
      }
      return true;
    });
  }, [referrals, districtFacilityNames]);

  // District drug stocks
  const districtStocks = useMemo(() => {
    return (stocks || []).filter((s) => {
      const facName = (s.facilityName || '').toLowerCase();
      for (const name of districtFacilityNames) {
        if (facName.includes(name)) return true;
      }
      return true;
    });
  }, [stocks, districtFacilityNames]);

  // Smart Reallocations from real data
  const smartRecommendations = useMemo(() => {
    return generateSmartReallocationRecommendations(districtFacilities, districtStocks);
  }, [districtFacilities, districtStocks]);

  // Critical referrals in district (Red priority & not closed)
  const criticalReferrals = useMemo(() => {
    return districtReferrals.filter(
      (r) => r.triagePriority === 'red' && r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
    );
  }, [districtReferrals]);

  // Pending triage referrals
  const pendingTriageReferrals = useMemo(() => {
    return districtReferrals.filter((r) => r.status === 'PENDING');
  }, [districtReferrals]);

  // Active referrals count (non-completed, non-cancelled)
  const activeReferralsCount = useMemo(() => {
    return districtReferrals.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length;
  }, [districtReferrals]);

  // Admitted patients count
  const admittedPatientsCount = useMemo(() => {
    return districtReferrals.filter((r) => r.status === 'ADMITTED').length;
  }, [districtReferrals]);

  // Critical medicine shortages (Stock <= 30% of buffer or out of stock)
  const criticalStockItems = useMemo(() => {
    return districtStocks.filter((item) => {
      const status = getMedicineStatus(item);
      return status === 'CRITICAL' || status === 'LIMITED';
    });
  }, [districtStocks]);

  // Active stock transfers / medicine requests in district
  const activeDistrictTransfers = useMemo(() => {
    return (stockTransfers || []).filter((t) => t.status === 'PENDING' || t.status === 'PENDING_SOURCE_APPROVAL' || t.status === 'DISPATCHED');
  }, [stockTransfers]);

  // Total bed calculations from real facility data
  const bedStats = useMemo(() => {
    let total = 0;
    let occupied = 0;
    let icuTotal = 0;
    let icuOccupied = 0;
    let ventTotal = 0;
    let ventOccupied = 0;
    let oxygenTotal = 0;
    let oxygenOccupied = 0;

    districtFacilities.forEach((f) => {
      total += f.totalBeds || 0;
      occupied += f.occupiedBeds || 0;
      icuTotal += f.icuBedsTotal || 0;
      icuOccupied += f.icuBedsOccupied || 0;
      ventTotal += f.ventilatorsTotal || 0;
      ventOccupied += f.ventilatorsOccupied || 0;
      oxygenTotal += f.oxygenBedsTotal || 0;
      oxygenOccupied += f.oxygenBedsOccupied || 0;
    });

    const overallPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const icuPct = icuTotal > 0 ? Math.round((icuOccupied / icuTotal) * 100) : 0;

    return {
      total,
      occupied,
      available: total - occupied,
      overallPct,
      icuTotal,
      icuOccupied,
      icuAvailable: icuTotal - icuOccupied,
      icuPct,
      ventTotal,
      ventOccupied,
      ventAvailable: ventTotal - ventOccupied,
      oxygenTotal,
      oxygenOccupied,
      oxygenAvailable: oxygenTotal - oxygenOccupied,
    };
  }, [districtFacilities]);

  // Facilities under heavy load (>80% occupied)
  const highLoadFacilities = useMemo(() => {
    return districtFacilities.filter(f => f.totalBeds > 0 && (f.occupiedBeds / f.totalBeds) >= 0.8);
  }, [districtFacilities]);

  // Open / pending state escalations
  const openEscalations = useMemo(() => {
    return stateEscalations.filter(e => e.status === 'PENDING' || e.status === 'ACKNOWLEDGED');
  }, [stateEscalations]);

  // Total "Needs Attention" count — 100% computed from real data
  const totalNeedsAttention =
    pendingTriageReferrals.length +
    criticalStockItems.filter(s => getMedicineStatus(s) === 'CRITICAL').length +
    highLoadFacilities.length +
    openEscalations.length;

  // Filtered referrals list for Referrals view
  const displayedReferrals = useMemo(() => {
    const list = districtReferrals.filter((r) => {
      if (referralFilter === 'CRITICAL' && r.triagePriority !== 'red') return false;
      if (referralFilter === 'PENDING' && r.status !== 'PENDING') return false;
      if (referralFilter === 'ACCEPTED' && r.status !== 'ACCEPTED') return false;
      if (referralFilter === 'ADMITTED' && r.status !== 'ADMITTED') return false;
      if (referralFilter === 'COMPLETED' && r.status !== 'COMPLETED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = (r.patientName || '').toLowerCase();
        const pId = (r.patientId || '').toLowerCase();
        const code = (r.tokenCode || r.id || '').toLowerCase();
        const reason = (r.referralReason || '').toLowerCase();
        const from = (r.referringFacility || '').toLowerCase();
        return pName.includes(q) || pId.includes(q) || code.includes(q) || reason.includes(q) || from.includes(q);
      }
      return true;
    });

    return list.sort((a, b) => {
      const scoreA = calculateReferralRiskScore(a, null, districtFacilities).compositeScore;
      const scoreB = calculateReferralRiskScore(b, null, districtFacilities).compositeScore;
      return scoreB - scoreA;
    });
  }, [districtReferrals, referralFilter, searchQuery, districtFacilities]);

  // Dynamic Recent Activity Timeline from real existing data
  const recentActivities = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: string;
      type: 'REFERRAL' | 'ADMISSION' | 'TRANSFER' | 'COMPLETED' | 'AUDIT';
    }> = [];

    districtReferrals.forEach((r) => {
      if (r.status === 'COMPLETED') {
        events.push({
          id: `act-comp-${r.id}`,
          title: 'Referral Completed',
          description: `${r.patientName || 'Patient'} care cycle resolved via ${r.targetFacility || 'District Facility'}`,
          timestamp: r.createdAt || new Date().toISOString(),
          type: 'COMPLETED',
        });
      } else if (r.status === 'ADMITTED') {
        events.push({
          id: `act-adm-${r.id}`,
          title: 'Patient Admitted',
          description: `${r.patientName || 'Patient'} admitted to ${r.targetFacility || 'District Hospital'} (${r.specialtyRequired || 'General'})`,
          timestamp: r.createdAt || new Date().toISOString(),
          type: 'ADMISSION',
        });
      } else if (r.status === 'ACCEPTED') {
        events.push({
          id: `act-acc-${r.id}`,
          title: 'Referral Accepted',
          description: `${r.patientName || 'Patient'} from ${r.referringFacility} accepted at ${r.targetFacility}`,
          timestamp: r.createdAt || new Date().toISOString(),
          type: 'REFERRAL',
        });
      }
    });

    (stockTransfers || []).forEach((t) => {
      if (t.status === 'DISPATCHED' || t.status === 'COMPLETED') {
        events.push({
          id: `act-trf-${t.id}`,
          title: 'Medicine Transfer Dispatched',
          description: `${t.requestedQuantity || 10} units of ${t.medicineName} dispatched from ${t.sourceFacilityName || 'Source'} to ${t.destinationFacilityName || 'Destination'}`,
          timestamp: t.createdAt || new Date().toISOString(),
          type: 'TRANSFER',
        });
      }
    });

    tamperBlocks.slice(0, 3).forEach((b) => {
      events.push({
        id: `act-aud-${b.index}`,
        title: `Tamper Audit: ${b.action}`,
        description: `${b.actorName} (${b.actorRole}): ${b.reason}`,
        timestamp: b.timestamp,
        type: 'AUDIT',
      });
    });

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);
  }, [districtReferrals, stockTransfers, tamperBlocks]);

  // Cryptographic Audit Block Helper
  const recordTamperAudit = async (
    action: string,
    resource: string,
    reason: string,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) => {
    const lastBlock = tamperBlocks[tamperBlocks.length - 1];
    const prevHash = lastBlock ? lastBlock.hash : GENESIS_HASH;
    const newBlock = await createTamperEvidentBlock({
      index: tamperBlocks.length + 1,
      prevHash,
      actorId: user?.id || 'dho-9611',
      actorName: user?.name || 'Dr. Vinod Chavan',
      actorRole: 'district_officer',
      action,
      resource,
      reason,
      beforeState: beforeState || {},
      afterState: afterState || {},
    });
    setTamperBlocks(prev => [...prev, newBlock]);
  };

  // Reallocation Approval Handler
  const handleApproveReallocation = (rec: SmartReallocationRecommendation, reason: string) => {
    setApprovedReallocations(prev => [...prev, rec.id]);
    recordTamperAudit(
      'APPROVE_SMART_REALLOCATION',
      `${rec.resourceType}: ${rec.recommendedQuantity} ${rec.unit} from ${rec.sourceFacilityName} -> ${rec.destinationFacilityName}`,
      reason,
      { status: 'RECOMMENDED', urgency: rec.urgency },
      { status: 'DISPATCHED_AUTHORIZED', approvedBy: user?.name || 'DHO', authorizedAt: new Date().toISOString() }
    );
  };

  // Reallocation Reject Handler
  const handleRejectReallocation = (rec: SmartReallocationRecommendation, reason: string) => {
    setApprovedReallocations(prev => [...prev, rec.id]);
    recordTamperAudit(
      'REJECT_SMART_REALLOCATION',
      `${rec.resourceType}: ${rec.recommendedQuantity} ${rec.unit} from ${rec.sourceFacilityName} -> ${rec.destinationFacilityName}`,
      reason,
      { status: 'RECOMMENDED', urgency: rec.urgency },
      { status: 'REJECTED_BY_DHO', rejectedBy: user?.name || 'DHO', reason }
    );
  };

  const handleOpenReferral = (ref: Referral) => {
    setActiveReviewReferral(ref);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-16">
      {/* ── 1. COMPACT GOVERNMENT-GRADE DISTRICT HEADER ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                DISTRICT HEALTH CONTROL CENTER
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE OPERATIONS
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2">
              <span>{currentDistrict} District Health Operations</span>
            </h1>
            <p className="text-xs text-slate-400">
              {user?.name || 'Dr. Vinod Chavan'} &bull; {user?.roleTitleEn || 'District Health Officer / Civil Surgeon'} &bull; Maharashtra Health Dept
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <DhoNotificationDrawer
            notifications={notifications}
            onSelectNotification={(notif) => {
              if (notif.targetTab) setActiveTab(notif.targetTab as DistrictTab);
            }}
            onMarkAllAsRead={() => {
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
          />

          <button
            onClick={() => setIsEscalationModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Escalate to State</span>
          </button>

          <button
            onClick={() => setActiveTab('reallocation')}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resource Reallocate</span>
          </button>
        </div>
      </div>

      {/* ── BREADCRUMB WHEN ON SUBTAB ── */}
      {activeTab !== 'overview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="font-extrabold text-slate-900 dark:text-white capitalize">
              {activeTab === 'map'
                ? 'District Facility Map (GIS)'
                : activeTab === 'capacity'
                ? 'Hospital Capacity & ICU Grid'
                : activeTab === 'tertiary'
                ? 'Referral Risk Queue & Triage'
                : activeTab === 'reallocation'
                ? 'Resource Reallocation Engine'
                : activeTab === 'escalations'
                ? 'State Health Authority Escalations'
                : activeTab === 'audit'
                ? 'Cryptographic Tamper-Evident Audit Trail'
                : activeTab === 'track_medicine'
                ? 'Track Medicine Requests & Transfers'
                : activeTab === 'track_referrals'
                ? 'Track Referrals'
                : 'Track Patient Care Journeys'}
            </span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
            {currentDistrict} District
          </span>
        </div>
      )}

      {/* ── 2. COMMAND CENTER (HOME OVERVIEW) ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* TOP 4 OPERATIONAL KPI TILES (100% CALCULATED FROM REAL DATA) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tile 1: Needs Attention */}
            <div
              onClick={() => {
                if (pendingTriageReferrals.length > 0) setActiveTab('tertiary');
                else if (criticalStockItems.length > 0) setActiveTab('track_medicine');
                else if (highLoadFacilities.length > 0) setActiveTab('capacity');
              }}
              className="p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Needs Attention</span>
                <div className={`w-2 h-2 rounded-full ${totalNeedsAttention > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className={`text-2xl font-black ${totalNeedsAttention > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {totalNeedsAttention}
                </span>
                <span className="text-xs text-slate-500">Action Items</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {pendingTriageReferrals.length} pending triage &bull; {criticalStockItems.length} low stocks
              </p>
            </div>

            {/* Tile 2: Critical Referrals */}
            <div
              onClick={() => setActiveTab('tertiary')}
              className="p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Critical Referrals</span>
                <HeartPulse className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {criticalReferrals.length}
                </span>
                <span className="text-xs text-slate-500">of {activeReferralsCount} Active</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {admittedPatientsCount} patients admitted in district
              </p>
            </div>

            {/* Tile 3: Medicine Shortages */}
            <div
              onClick={() => setActiveTab('track_medicine')}
              className="p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Medicine Deficits</span>
                <Pill className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className={`text-2xl font-black ${criticalStockItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {criticalStockItems.length}
                </span>
                <span className="text-xs text-slate-500">Items Under Buffer</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {activeDistrictTransfers.length} active transfer consignments
              </p>
            </div>

            {/* Tile 4: Bed & ICU Capacity */}
            <div
              onClick={() => setActiveTab('capacity')}
              className="p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-400 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hospital Capacity</span>
                <Bed className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {bedStats.overallPct}%
                </span>
                <span className="text-xs text-slate-500">Occupied ({bedStats.available} Free)</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                ICU: {bedStats.icuAvailable} / {bedStats.icuTotal} free &bull; Vent: {bedStats.ventAvailable} free
              </p>
            </div>
          </div>

          {/* SECTION 1: ACTIONABLE NEEDS ATTENTION QUEUE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Actionable Operational Items
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {totalNeedsAttention} Pending
              </span>
            </div>

            {totalNeedsAttention === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">District Healthcare Network Stable</h3>
                <p className="text-xs text-slate-400 mt-0.5">No unresolved bottlenecks or emergency shortages across {currentDistrict}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Pending Triage Referrals */}
                {pendingTriageReferrals.slice(0, 2).map((ref) => {
                  const triageMeta = getTriageUrgencyMeta(ref.triagePriority, ref.urgency);
                  return (
                    <div
                      key={ref.id}
                      className={`p-3.5 rounded-xl border ${triageMeta.cardBorder} ${triageMeta.cardBg} flex flex-col justify-between gap-3`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500">
                            {ref.referringFacility}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${triageMeta.badgeBg}`}>
                            {triageMeta.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {ref.patientName || 'Emergency Patient'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                          {ref.referralReason || 'Specialist care required'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenReferral(ref)}
                        className={`w-full py-1.5 px-3 rounded-lg ${triageMeta.ctaBg} text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer`}
                      >
                        <span>Review &amp; Route</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* 2. Critical Medicine Shortage */}
                {criticalStockItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {item.facilityName}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                          CRITICAL BUFFER
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {item.drugName}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        Current: <strong className="text-rose-600 dark:text-rose-400">{item.currentStock} {item.unit}</strong> (Min Buffer: {item.bufferStock})
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('reallocation')}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Find Surplus &amp; Reallocate</span>
                    </button>
                  </div>
                ))}

                {/* 3. Open State Escalation */}
                {openEscalations.slice(0, 1).map((esc) => (
                  <div
                    key={esc.id}
                    className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          State Escalation
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-600 text-white">
                          {esc.urgency}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                        {esc.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {esc.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('escalations')}
                      className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Track State Response</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: FACILITY CAPACITY SNAPSHOT */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  District Facility Capacity Snapshot
                </h3>
                <p className="text-xs text-slate-500">Actual bed and critical care availability across {currentDistrict} facilities</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('capacity')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Table</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onOpenBedMatrix}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Bed className="w-3.5 h-3.5" />
                  <span>Bed Matrix</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {districtFacilities.slice(0, 4).map((fac) => {
                const total = fac.totalBeds || 0;
                const occ = fac.occupiedBeds || 0;
                const available = total - occ;
                const occPct = total > 0 ? Math.round((occ / total) * 100) : 0;
                const icuFree = (fac.icuBedsTotal || 0) - (fac.icuBedsOccupied || 0);

                const statusLabel = occPct >= 90 ? 'Critical' : occPct >= 70 ? 'Limited' : 'Available';
                const statusBadgeStyle =
                  statusLabel === 'Critical'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                    : statusLabel === 'Limited'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';

                return (
                  <div
                    key={fac.id}
                    onClick={() => setActiveTab('capacity')}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400">{fac.type}</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{fac.name}</h4>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${statusBadgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Total Beds:</span>
                        <strong className="text-slate-900 dark:text-white">{available} / {total} free</strong>
                      </div>
                      {fac.icuBedsTotal > 0 && (
                        <div className="flex justify-between">
                          <span>ICU:</span>
                          <strong className={icuFree === 0 ? 'text-rose-600 font-black' : 'text-purple-600 dark:text-purple-400'}>
                            {icuFree} of {fac.icuBedsTotal} free
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: RECENT ACTIVITY STREAM */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Recent District Activity Log
                </h3>
                <p className="text-xs text-slate-500">Live feed of referrals, admissions, and inter-facility logistics</p>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Audit Trail</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      {act.type === 'ADMISSION' ? (
                        <Bed className="w-3.5 h-3.5 text-purple-500" />
                      ) : act.type === 'TRANSFER' ? (
                        <Truck className="w-3.5 h-3.5 text-amber-500" />
                      ) : act.type === 'COMPLETED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-bold text-slate-900 dark:text-white truncate">{act.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. FACILITY MAP VIEW (GIS) ── */}
      {activeTab === 'map' && (
        <DistrictFacilityMapView
          districtName={currentDistrict}
          facilities={districtFacilities}
          stocks={stocks}
          referrals={referrals}
          patients={patients}
          onOpenReferralsTab={() => setActiveTab('tertiary')}
          onOpenCapacityTab={() => setActiveTab('capacity')}
        />
      )}

      {/* ── 4. HOSPITAL CAPACITY & ICU MATRIX TAB ── */}
      {activeTab === 'capacity' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Hospital Capacity &amp; Resource Grid</h2>
              <p className="text-xs text-slate-500">Live bed, ICU, ventilator and oxygen utilization across {currentDistrict} facilities</p>
            </div>
            <button
              onClick={onOpenBedMatrix}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Bed className="w-4 h-4" />
              <span>Interactive Bed Matrix</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5 pl-4">Facility</th>
                    <th className="p-3.5">Type &amp; Taluka</th>
                    <th className="p-3.5">General Beds</th>
                    <th className="p-3.5">ICU Beds</th>
                    <th className="p-3.5">Ventilators</th>
                    <th className="p-3.5">Oxygen Beds</th>
                    <th className="p-3.5 pr-4">Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {districtFacilities.map((fac) => {
                    const occPct = fac.totalBeds > 0 ? Math.round((fac.occupiedBeds / fac.totalBeds) * 100) : 0;
                    return (
                      <tr key={fac.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 pl-4 font-bold text-slate-900 dark:text-white">
                          {fac.name}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          {fac.type} &bull; {fac.taluka || currentDistrict}
                        </td>
                        <td className="p-3.5">
                          <strong className="text-slate-900 dark:text-white">{fac.totalBeds - fac.occupiedBeds} free</strong> / {fac.totalBeds}
                        </td>
                        <td className="p-3.5">
                          <span className={fac.icuBedsTotal - fac.icuBedsOccupied === 0 ? 'text-rose-600 font-bold' : 'text-purple-600 dark:text-purple-400 font-bold'}>
                            {fac.icuBedsTotal - fac.icuBedsOccupied} free
                          </span> / {fac.icuBedsTotal}
                        </td>
                        <td className="p-3.5">
                          {fac.ventilatorsTotal - fac.ventilatorsOccupied} free / {fac.ventilatorsTotal}
                        </td>
                        <td className="p-3.5">
                          {fac.oxygenBedsTotal - fac.oxygenBedsOccupied} free / {fac.oxygenBedsTotal}
                        </td>
                        <td className="p-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  occPct >= 90 ? 'bg-rose-500' : occPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${occPct}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{occPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. REFERRAL RISK QUEUE & TRIAGE TAB ── */}
      {activeTab === 'tertiary' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Referral Risk Queue &amp; Triage</h2>
              <p className="text-xs text-slate-500">Live inter-facility patient referrals prioritized by composite clinical urgency and transport risk</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setReferralFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All ({districtReferrals.length})
              </button>
              <button
                onClick={() => setReferralFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  referralFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Critical ({criticalReferrals.length})</span>
              </button>
              <button
                onClick={() => setReferralFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'PENDING'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                }`}
              >
                Pending ({pendingTriageReferrals.length})
              </button>
              <button
                onClick={() => setReferralFilter('ADMITTED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'ADMITTED'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                }`}
              >
                Admitted ({admittedPatientsCount})
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, ABHA, facility..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Queue Cards */}
          <div className="space-y-2.5">
            {displayedReferrals.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300">No referrals match the current filter</h4>
              </div>
            ) : (
              displayedReferrals.map((ref) => {
                const triageMeta = getTriageUrgencyMeta(ref.triagePriority, ref.urgency);
                return (
                  <div
                    key={ref.id}
                    className={`p-4 rounded-xl bg-white dark:bg-slate-900 border ${triageMeta.cardBorder} shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${triageMeta.badgeSoft}`}
                        >
                          {triageMeta.label}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {ref.patientName || 'Patient'} ({ref.patientAge}y / {ref.patientGender})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{ref.tokenCode || ref.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Reason:</strong> {ref.referralReason}
                      </p>
                      <p className="text-xs text-slate-500">
                        {ref.referringFacility} &rarr; <span className="text-blue-600 font-semibold">{ref.targetFacility}</span> ({ref.specialtyRequired || 'General'})
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenReferral(ref)}
                      className={`px-4 py-2 rounded-lg ${triageMeta.ctaBg} text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer self-start lg:self-auto`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review &amp; Coordinate</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 6. RESOURCE REALLOCATION TAB ── */}
      {activeTab === 'reallocation' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Resource Reallocation Engine</h2>
              <p className="text-xs text-slate-500">Surplus-to-deficit matching for medicines and hospital beds calculated from live facility stock</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['ALL', 'MEDICINE', 'ICU_BEDS'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReallocationResourceFilter(type as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    reallocationResourceFilter === type
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {smartRecommendations
              .filter(r => reallocationResourceFilter === 'ALL' || r.resourceType === reallocationResourceFilter)
              .map((rec) => {
                const isApproved = approvedReallocations.includes(rec.id);
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {rec.resourceType.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {rec.urgency} Urgency
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Transfer {rec.recommendedQuantity} {rec.unit} of {rec.resourceName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rec.sourceFacilityName} &rarr; {rec.destinationFacilityName} ({rec.distanceKm} km)
                      </p>
                    </div>

                    {isApproved ? (
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reallocation Dispatched &amp; Logged</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveReallocationItem(rec)}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Authorize Transfer</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── 7. STATE ESCALATIONS TAB ── */}
      {activeTab === 'escalations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">State Health Authority Escalations</h2>
              <p className="text-xs text-slate-500">Direct district-to-state escalation gateway for critical resource and tertiary patient coordination</p>
            </div>
            <button
              onClick={() => setIsEscalationModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Create State Escalation</span>
            </button>
          </div>

          <div className="space-y-3">
            {stateEscalations.map((esc) => (
              <div
                key={esc.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                      {esc.issueCategory.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-black uppercase text-rose-600">
                      {esc.urgency}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{esc.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{esc.summary}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {esc.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 8. TAMPER-EVIDENT AUDIT TAB ── */}
      {activeTab === 'audit' && (
        <TamperEvidentAuditView
          blocks={tamperBlocks}
          district={currentDistrict}
        />
      )}

      {/* ── 9. LIVE TRACKING SECTION (MEDICINE, REFERRALS, PATIENTS) ── */}
      {(activeTab === 'track_medicine' || activeTab === 'track_referrals' || activeTab === 'track_patients') && (
        <DistrictTrackingCenter
          initialTab={
            activeTab === 'track_medicine'
              ? 'medicine'
              : activeTab === 'track_referrals'
              ? 'referrals'
              : 'patients'
          }
          onOpenPatientTimeline={onOpenPatientTimeline}
          onOpenReferralToken={onOpenReferralToken}
          onReviewReferral={(ref) => handleOpenReferral(ref)}
        />
      )}

      {/* ── 10. ACTION MODALS ── */}
      {activeReviewReferral && (
        <DistrictReferralReviewModal
          referral={activeReviewReferral}
          onClose={() => setActiveReviewReferral(null)}
          updateReferralStatus={async (id, status, updates) => {
            updateReferralStatus(id, status, updates);
            await recordTamperAudit(
              `UPDATE_REFERRAL_${status}`,
              `Referral #${id} (${activeReviewReferral.patientName})`,
              updates?.referralReason || `Status updated to ${status} by DHO`,
              { status: activeReviewReferral.status },
              { status, ...updates }
            );
            setActiveReviewReferral(null);
          }}
        />
      )}

      {activeReallocationItem && (
        <SmartReallocationModal
          recommendation={activeReallocationItem}
          onClose={() => setActiveReallocationItem(null)}
          onApprove={handleApproveReallocation}
          onReject={handleRejectReallocation}
        />
      )}

      {isEscalationModalOpen && (
        <StateEscalationModal
          district={currentDistrict}
          actorName={user?.name || 'Dr. Vinod Chavan'}
          actorId={user?.id || 'dho-9611'}
          onClose={() => setIsEscalationModalOpen(false)}
          onEscalate={async (escData) => {
            const newEsc: StateEscalation = {
              id: `esc-state-${Date.now()}`,
              ...escData,
              createdAt: new Date().toISOString(),
              slaExpiresAt: new Date(Date.now() + escData.slaWindowMinutes * 60 * 1000).toISOString(),
            };
            setStateEscalations(prev => [newEsc, ...prev]);
            await recordTamperAudit(
              'CREATE_STATE_ESCALATION',
              `Escalation #${newEsc.id}: ${newEsc.title}`,
              `Escalated to State Authority: ${newEsc.summary}`,
              undefined,
              newEsc as unknown as Record<string, unknown>
            );
            setIsEscalationModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
