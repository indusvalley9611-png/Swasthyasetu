'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import {
  getMedicineStatus,
  getAvailableResource,
  getFacilityStatus,
  getDistanceKm,
} from '@/lib/resourceManagement';
import {
  generateSmartReallocationRecommendations,
  calculateReferralRiskScore,
  createTamperEvidentBlock,
  computePredictiveCapacityAlerts,
  computeDistrictHealthScorecards,
  computeDistrictSlaMetrics,
  detectEpidemicClusters,
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
  FacilityHealthScorecard,
  PredictiveCapacityAlert,
  EpidemicCluster,
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
import { DistrictScorecardModal } from '../dho/DistrictScorecardModal';
import { DistrictKpiCharts } from '../dho/DistrictKpiCharts';
import { DhoNotificationDrawer } from '../dho/DhoNotificationDrawer';
import { DhoRoadmapView } from '../dho/DhoRoadmapView';
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
  Share2,
  TrendingUp,
  TrendingDown,
  Lock,
  Compass,
  Zap,
  Activity,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Send,
  Bell,
  RefreshCw,
  Award,
  Radio,
  FileCheck,
  Milestone,
  Check,
  X,
  MapPin,
  Pill,
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
  | 'tertiary'
  | 'reallocation'
  | 'scorecard'
  | 'escalations'
  | 'capacity'
  | 'audit'
  | 'roadmap'
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
  const [activeScorecardFacility, setActiveScorecardFacility] = useState<FacilityHealthScorecard | null>(null);

  // State-level & Reallocation data stored in state
  const [stateEscalations, setStateEscalations] = useState<StateEscalation[]>(INITIAL_STATE_ESCALATIONS);
  const [tamperBlocks, setTamperBlocks] = useState<TamperEvidentAuditBlock[]>(INITIAL_TAMPER_AUDIT_BLOCKS);
  const [notifications, setNotifications] = useState<DhoNotification[]>(INITIAL_DHO_NOTIFICATIONS);
  const [reallocationResourceFilter, setReallocationResourceFilter] = useState<'ALL' | 'MEDICINE' | 'ICU_BEDS' | 'AMBULANCE' | 'BLOOD_UNITS'>('ALL');
  const [dispatchedRrtClusterIds, setDispatchedRrtClusterIds] = useState<string[]>([]);
  const [approvedReallocations, setApprovedReallocations] = useState<string[]>([]);

  // Current district scope
  const currentDistrict = user?.district || 'Nashik';

  // Filter facilities scoped strictly to current district
  const districtFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (f.district?.toLowerCase() === currentDistrict.toLowerCase()) return true;
      if (f.name.toLowerCase().includes(currentDistrict.toLowerCase())) return true;
      if (currentDistrict.toLowerCase() === 'nashik') {
        const name = f.name.toLowerCase();
        return name.includes('nashik') || name.includes('malegaon') || name.includes('sinnar') || name.includes('niphad') || name.includes('trimbakeshwar') || name.includes('chandwad') || name.includes('yeola') || name.includes('igatpuri');
      }
      if (currentDistrict.toLowerCase() === 'pune') {
        const name = f.name.toLowerCase();
        return name.includes('aundh') || name.includes('velhe') || name.includes('nasrapur') || name.includes('bhor') || name.includes('pune');
      }
      return true; // Default fallback to all if district filter is broad
    });
  }, [facilities, currentDistrict]);

  // District facility names for matching referrals
  const districtFacilityNames = useMemo(() => {
    const names = new Set<string>();
    districtFacilities.forEach((f) => {
      names.add(f.name.toLowerCase());
      if (f.id) names.add(f.id.toLowerCase());
    });
    if (currentDistrict.toLowerCase() === 'nashik') {
      names.add('nashik civil hospital');
      names.add('malegaon sub-district hospital');
      names.add('sinnar rural hospital');
      names.add('niphad phc');
      names.add('trimbakeshwar rural hospital');
      names.add('chandwad phc');
      names.add('yeola rural hospital');
      names.add('igatpuri phc');
    }
    return names;
  }, [districtFacilities, currentDistrict]);

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

  // Dynamic DHO Intelligence Calculations
  const smartRecommendations = useMemo(() => {
    return generateSmartReallocationRecommendations(districtFacilities, districtStocks);
  }, [districtFacilities, districtStocks]);

  const predictiveAlerts = useMemo(() => {
    return computePredictiveCapacityAlerts(districtFacilities, districtStocks);
  }, [districtFacilities, districtStocks]);

  const healthScorecards = useMemo(() => {
    return computeDistrictHealthScorecards(districtFacilities, districtStocks, districtReferrals);
  }, [districtFacilities, districtStocks, districtReferrals]);

  const slaMetrics = useMemo(() => {
    return computeDistrictSlaMetrics(districtReferrals, stockTransfers || [], tamperBlocks);
  }, [districtReferrals, stockTransfers, tamperBlocks]);

  const epidemicClusters = useMemo(() => {
    return detectEpidemicClusters(patients || [], districtFacilities);
  }, [patients, districtFacilities]);

  // Critical referrals in district
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

  // Drug shortages in district
  const criticalStockItems = useMemo(() => {
    return districtStocks.filter((item) => {
      const status = getMedicineStatus(item);
      return status === 'CRITICAL' || status === 'LIMITED';
    });
  }, [districtStocks]);

  // Active stock transfers / medicine requests in district
  const activeDistrictTransfers = useMemo(() => {
    return (stockTransfers || []).filter((t) => t.status === 'PENDING' || t.status === 'DISPATCHED');
  }, [stockTransfers]);

  // Total bed calculations
  const bedStats = useMemo(() => {
    let total = 0;
    let occupied = 0;
    let icuTotal = 0;
    let icuOccupied = 0;
    let ventTotal = 0;
    let ventOccupied = 0;

    districtFacilities.forEach((f) => {
      total += f.totalBeds || 0;
      occupied += f.occupiedBeds || 0;
      icuTotal += f.icuBedsTotal || 0;
      icuOccupied += f.icuBedsOccupied || 0;
      ventTotal += f.ventilatorsTotal || 0;
      ventOccupied += f.ventilatorsOccupied || 0;
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
    };
  }, [districtFacilities]);

  // Resource alerts count (critical stocks + facilities under heavy load)
  const resourceAlertsCount = useMemo(() => {
    const heavyLoadCount = districtFacilities.filter(f => f.totalBeds > 0 && (f.occupiedBeds / f.totalBeds) >= 0.8).length;
    return criticalStockItems.length + heavyLoadCount;
  }, [criticalStockItems, districtFacilities]);

  // Total "Needs Attention" count
  const totalNeedsAttention =
    pendingTriageReferrals.length +
    criticalStockItems.filter(s => getMedicineStatus(s) === 'CRITICAL').length +
    (bedStats.icuPct >= 80 ? 1 : 0) +
    epidemicClusters.length +
    smartRecommendations.filter(r => r.urgency === 'CRITICAL' && !approvedReallocations.includes(r.id)).length;

  // Filtered referrals list for Referrals view sorted by composite risk score
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

    // Derive from existing referrals
    districtReferrals.forEach((r) => {
      if (r.status === 'COMPLETED') {
        events.push({
          id: `act-comp-${r.id}`,
          title: 'Referral Completed',
          description: `${r.patientName || 'Patient'} care cycle resolved via ${r.targetFacility || 'District Facility'}`,
          timestamp: r.createdAt || '2026-09-12T16:30:00Z',
          type: 'COMPLETED',
        });
      } else if (r.status === 'ADMITTED') {
        events.push({
          id: `act-adm-${r.id}`,
          title: 'Patient Admitted',
          description: `${r.patientName || 'Patient'} admitted to ${r.targetFacility || 'District Hospital'} (${r.specialtyRequired || 'General'})`,
          timestamp: r.createdAt || '2026-09-13T10:30:00Z',
          type: 'ADMISSION',
        });
      } else if (r.status === 'ACCEPTED') {
        events.push({
          id: `act-acc-${r.id}`,
          title: 'Referral Accepted',
          description: `${r.patientName || 'Patient'} from ${r.referringFacility} accepted at ${r.targetFacility}`,
          timestamp: r.createdAt || '2026-09-13T09:00:00Z',
          type: 'REFERRAL',
        });
      }
    });

    // Derive from existing stock transfers
    (stockTransfers || []).forEach((t) => {
      if (t.status === 'DISPATCHED' || t.status === 'COMPLETED') {
        events.push({
          id: `act-trf-${t.id}`,
          title: 'Medicine Transfer Dispatched',
          description: `${t.requestedQuantity || 10} units of ${t.medicineName} dispatched from ${t.sourceFacilityName || 'Source'} to ${t.destinationFacilityName || 'Destination'}`,
          timestamp: t.createdAt || '2026-09-13T11:00:00Z',
          type: 'TRANSFER',
        });
      }
    });

    // Derive from recent audit blocks
    tamperBlocks.slice(0, 3).forEach((b) => {
      events.push({
        id: `act-aud-${b.index}`,
        title: `Tamper Audit: ${b.action}`,
        description: `${b.actorName} (${b.actorRole}): ${b.reason}`,
        timestamp: b.timestamp,
        type: 'AUDIT',
      });
    });

    // Sort by timestamp desc and take top 6
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

  // Rapid Response Team Dispatch
  const handleDispatchRRT = (cluster: EpidemicCluster) => {
    if (dispatchedRrtClusterIds.includes(cluster.id)) return;
    setDispatchedRrtClusterIds(prev => [...prev, cluster.id]);
    recordTamperAudit(
      'EPIDEMIC_RRT_DISPATCH',
      `Cluster ${cluster.id} (${cluster.syndromeName}) across ${cluster.affectedFacilities.join(', ')}`,
      `Rapid Response Team mobilized for ${cluster.syndromeName} outbreak control with emergency supplies and diagnostic kits.`,
      { rrtStatus: 'PENDING_DEPLOYMENT', caseCount: cluster.caseCount },
      { rrtStatus: 'DISPATCHED_IN_FIELD', dispatchedAt: new Date().toISOString(), alertLevel: 'HIGH_ALERT' }
    );
  };

  // Helper to open referral review modal
  const handleOpenReferral = (ref: Referral) => {
    setActiveReviewReferral(ref);
  };

  // Grade helper
  const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* ── 1. DISTRICT HEALTH CONTROL CENTER HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 border border-slate-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-blue-400/30">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                DISTRICT HEALTH CONTROL CENTER
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DEMO-SIMULATED NETWORK
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <span>{currentDistrict} District</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {user?.name || 'Dr. Vinod Chavan'} ({user?.roleTitleEn || 'District Health Officer / Civil Surgeon'})
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Nashik District Command &amp; Enterprise Coordination Suite &bull; Maharashtra SIH26133
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Notification Bell with Drawer (Feature 10) */}
          <DhoNotificationDrawer
            notifications={notifications}
            onSelectNotification={(notif) => {
              if (notif.targetTab) setActiveTab(notif.targetTab as DistrictTab);
            }}
            onMarkAllAsRead={() => {
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
          />

          {/* Quick Escalate to State Button (Feature 3) */}
          <button
            onClick={() => setIsEscalationModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-900/30 hover:scale-[1.02] cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Escalate to State</span>
          </button>

          {/* Smart Reallocations Quick Link (Feature 1) */}
          <button
            onClick={() => setActiveTab('reallocation')}
            className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-blue-900/30 hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Reallocate</span>
          </button>
        </div>
      </div>

      {/* ── SUBVIEW TOP BREADCRUMB & BACK BUTTON (WHEN NOT ON OVERVIEW) ── */}
      {activeTab !== 'overview' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('overview')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Command Center</span>
            </button>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white capitalize">
                {activeTab === 'map'
                  ? 'District Facility Map (GIS)'
                  : activeTab === 'track_medicine'
                  ? 'Track Medicine Requests & Transfers'
                  : activeTab === 'track_referrals'
                  ? 'Track Referral Risk Queue'
                  : activeTab === 'track_patients'
                  ? 'Track Patient Care Journeys & Discharge'
                  : activeTab === 'tertiary'
                  ? 'Referral Risk Queue & Triage'
                  : activeTab === 'reallocation'
                  ? 'Smart Resource Reallocation Engine'
                  : activeTab === 'scorecard'
                  ? 'Facility Health Scorecards & Rankings'
                  : activeTab === 'escalations'
                  ? 'State Health Authority Escalation Gateway'
                  : activeTab === 'capacity'
                  ? 'Predictive Bed & Capacity Alerts'
                  : activeTab === 'audit'
                  ? 'Cryptographic Tamper-Evident Audit Trail'
                  : 'Architecture Roadmap 2026-27'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">District:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800">
              {currentDistrict}
            </span>
          </div>
        </div>
      )}

      {/* ── 4. DISTRICT OVERVIEW (TAB 1) ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 TOP COORDINATION KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Needs Attention */}
            <div
              onClick={() => setActiveTab('overview')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Needs Attention</span>
                <div className={`w-2.5 h-2.5 rounded-full ${totalNeedsAttention > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalNeedsAttention}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Action Items</span>
              </div>
            </div>

            {/* Card 2: Active Referrals */}
            <div
              onClick={() => setActiveTab('tertiary')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Referrals</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{activeReferralsCount}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">In Pipeline</span>
              </div>
            </div>

            {/* Card 3: Smart Reallocations */}
            <div
              onClick={() => setActiveTab('reallocation')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Smart Reallocations</span>
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{smartRecommendations.length}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Ranked Matches</span>
              </div>
            </div>

            {/* Card 4: Resource Alerts */}
            <div
              onClick={() => setActiveTab('capacity')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resource Alerts</span>
                <Bed className="w-4 h-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{resourceAlertsCount}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Critical / Low</span>
              </div>
            </div>
          </div>
          {/* FEATURE 11: EPIDEMIC CLUSTER DETECTION BANNER */}
          {epidemicClusters.length > 0 && (
            <div className="space-y-3">
              {epidemicClusters.map((cluster) => {
                const isDispatched = dispatchedRrtClusterIds.includes(cluster.id);
                return (
                  <div
                    key={cluster.id}
                    className="p-4 rounded-3xl bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 border border-rose-600/50 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg mt-0.5 animate-pulse">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/40">
                            EPIDEMIC CLUSTER DETECTED (72H SYMPTOM SURGE)
                          </span>
                          <span className="text-[10px] font-mono text-amber-300">
                            {cluster.caseCount} Matching Cases across {cluster.affectedFacilities.length} Facilities
                          </span>
                        </div>
                        <h4 className="text-base font-black text-white">
                          {cluster.syndromeName} Outbreak Cluster ({cluster.taluka} Taluka)
                        </h4>
                        <p className="text-xs text-rose-200/90 leading-relaxed max-w-2xl">
                          {cluster.recommendedIntervention}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isDispatched ? (
                        <span className="px-4 py-2 rounded-xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-black flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          RRT Dispatched &amp; En Route
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDispatchRRT(cluster)}
                          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-rose-900/50 cursor-pointer hover:scale-105"
                        >
                          <Send className="w-4 h-4" />
                          <span>Dispatch Rapid Response Team</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FEATURE 8: DISTRICT SLA / RESPONSE-TIME TRACKING */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">District SLA &amp; Response Times</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Raise-time to action-time benchmarks across emergency categories</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Target: &lt; 30m Critical Triage
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* SLA Category 1: Referrals */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Referral Triage SLA</span>
                  <Users className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{slaMetrics.categories.referrals.avgMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Average Response</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{slaMetrics.categories.referrals.worstMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Worst Case</span>
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>Logged Decisions</span>
                  <span>{slaMetrics.categories.referrals.count} referrals</span>
                </div>
              </div>

              {/* SLA Category 2: Stock Transfers */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Stock Transfer Dispatch SLA</span>
                  <Package className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{slaMetrics.categories.stock.avgMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Average Response</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{slaMetrics.categories.stock.worstMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Worst Case</span>
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>Logged Transfers</span>
                  <span>{slaMetrics.categories.stock.count} requests</span>
                </div>
              </div>

              {/* SLA Category 3: ICU Placement */}
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">ICU Bed Placement SLA</span>
                  <Bed className="w-4 h-4 text-purple-500" />
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{slaMetrics.categories.icu.avgMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Average Response</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{slaMetrics.categories.icu.worstMinutes}m</div>
                    <span className="text-[10px] text-slate-400">Worst Case</span>
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span>Critical Placements</span>
                  <span>{slaMetrics.categories.icu.count} placements</span>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 9: DISTRICT-WIDE KPI TREND CHARTS & ANOMALY DETECTION */}
          <DistrictKpiCharts />

          {/* SECTION: NEEDS YOUR ATTENTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Needs Your Attention</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prioritized operational items requiring District Officer action</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {totalNeedsAttention} items
              </span>
            </div>

            {totalNeedsAttention === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">District Operations Stable</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No critical bottlenecks across {currentDistrict} facilities.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* 1. Critical Referral Awaiting Review */}
                {criticalReferrals.slice(0, 2).map((ref) => (
                  <div
                    key={ref.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/20 dark:to-slate-900 border border-rose-200 dark:border-rose-900/50 flex flex-col justify-between gap-3 shadow-sm hover:border-rose-400 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                          {ref.referringFacility}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white tracking-wider">
                          CRITICAL REFERRAL
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {ref.patientName || 'Emergency Patient'}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {ref.referralReason || 'Critical care triage required'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenReferral(ref)}
                      className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Review Referral</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* 2. Top Ranked Smart Reallocation */}
                {smartRecommendations.filter(r => !approvedReallocations.includes(r.id)).slice(0, 1).map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/50 flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-400 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                          Smart Reallocation
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white tracking-wider">
                          {rec.urgency} &bull; {rec.distanceKm} KM
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {rec.resourceName} ({rec.recommendedQuantity} {rec.unit})
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                          {rec.sourceFacilityName} &rarr; {rec.destinationFacilityName}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveReallocationItem(rec)}
                      className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>Review &amp; Authorize Transfer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* 3. Medicine Shortage Warning */}
                {criticalStockItems.slice(0, 1).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/20 dark:to-slate-900 border border-amber-200 dark:border-amber-900/50 flex flex-col justify-between gap-3 shadow-sm hover:border-amber-400 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                          {item.facilityName}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 tracking-wider">
                          STOCK BUFFER
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {item.drugName}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Stock: <strong className="text-rose-600 dark:text-rose-400">{item.currentStock} {item.unit}</strong> (Buffer: {item.bufferStock})
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/maha-aushadhi"
                      className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>Coordinate Medicine</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: FACILITY CAPACITY OVERVIEW */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Facility Capacity</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bed, ICU and ventilator availability across district facilities</p>
              </div>
              <button
                onClick={() => setActiveTab('capacity')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <span>View Full Capacity</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
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
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : statusLabel === 'Limited'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';

                return (
                  <div
                    key={fac.id}
                    onClick={() => setActiveTab('capacity')}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{fac.type}</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{fac.name}</h4>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusBadgeStyle}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Available Beds:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{available} / {total} free</strong>
                      </div>
                      {fac.icuBedsTotal > 0 && (
                        <div className="flex justify-between">
                          <span>ICU Availability:</span>
                          <strong className={icuFree === 0 ? 'text-rose-600' : 'text-purple-600 dark:text-purple-400'}>
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

          {/* SECTION: RECENT ACTIVITY */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Recent Activity &amp; Audit Highlights</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live stream of referrals, admissions, medicine transfers and cryptographic logs</p>
              </div>
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Tamper Audit</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800/80 text-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      {act.type === 'ADMISSION' ? (
                        <Bed className="w-4 h-4 text-purple-500" />
                      ) : act.type === 'TRANSFER' ? (
                        <Truck className="w-4 h-4 text-amber-500" />
                      ) : act.type === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : act.type === 'AUDIT' ? (
                        <FileCheck className="w-4 h-4 text-indigo-500" />
                      ) : (
                        <Users className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-900 dark:text-slate-100">{act.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{act.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FACILITY MAP VIEW (LEAFLET OSM & SCORECARD STATUS) ── */}
      {activeTab === 'map' && (
        <DistrictFacilityMapView
          districtName={currentDistrict}
          facilities={districtFacilities}
          stocks={stocks}
          referrals={referrals}
          patients={patients}
          onOpenScorecard={(facId) => {
            const sc = healthScorecards.find((s) => s.facilityId === facId);
            if (sc) setActiveScorecardFacility(sc);
          }}
          onOpenReferralsTab={() => setActiveTab('tertiary')}
          onOpenCapacityTab={() => setActiveTab('capacity')}
        />
      )}

      {/* ── 5. FEATURE 2: REFERRAL RISK-SCORING QUEUE (TERTIARY TAB) ── */}
      {activeTab === 'tertiary' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Referral Risk-Scoring Queue
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-factor composite scoring: <strong>Clinical (0-50)</strong> + <strong>Transport (0-30)</strong> + <strong>Capacity (0-20)</strong> = <strong>Total (0-100)</strong>
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overview')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          </div>

          {/* Controls: Filter ribbon & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setReferralFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All ({districtReferrals.length})
              </button>
              <button
                onClick={() => setReferralFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  referralFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Critical ({criticalReferrals.length})</span>
              </button>
              <button
                onClick={() => setReferralFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'PENDING'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                Pending ({pendingTriageReferrals.length})
              </button>
              <button
                onClick={() => setReferralFilter('ACCEPTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'ACCEPTED'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100'
                }`}
              >
                Accepted ({districtReferrals.filter(r => r.status === 'ACCEPTED').length})
              </button>
              <button
                onClick={() => setReferralFilter('ADMITTED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'ADMITTED'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100'
                }`}
              >
                Admitted ({admittedPatientsCount})
              </button>
              <button
                onClick={() => setReferralFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  referralFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                }`}
              >
                Completed ({districtReferrals.filter(r => r.status === 'COMPLETED').length})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, ABHA, token..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Referrals Queue Cards */}
          <div className="space-y-3">
            {displayedReferrals.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Referrals in Selected Filter</h4>
                <p className="text-xs text-slate-400 mt-1">Try switching filters or resetting the search query.</p>
              </div>
            ) : (
              displayedReferrals.map((ref) => {
                const risk = calculateReferralRiskScore(ref, null, districtFacilities);
                const isCritical = ref.triagePriority === 'red';

                return (
                  <div
                    key={ref.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Patient & Clinical Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {ref.triagePriority?.toUpperCase() || 'ROUTINE'}
                        </span>
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {ref.patientName || 'Emergency Patient'} ({ref.patientAge || '42'}y / {ref.patientGender || 'M'})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ABHA: {ref.patientAbha || '91-XXXX-XXXX'} &bull; #{ref.tokenCode || ref.id}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <strong>Reason:</strong> {ref.referralReason}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{ref.referringFacility}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">{ref.targetFacility}</span>
                        <span>&bull;</span>
                        <span>Specialty: <strong className="text-slate-600 dark:text-slate-300">{ref.specialtyRequired || 'General / Emergency'}</strong></span>
                      </div>
                    </div>

                    {/* Risk Score Breakdown Visualizer (Feature 2) */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 min-w-[260px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Composite Risk</span>
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-full ${
                            risk.riskLevel === 'EXTREME'
                              ? 'bg-rose-500 text-white'
                              : risk.riskLevel === 'HIGH'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {risk.compositeScore} / 100 ({risk.riskLevel})
                        </span>
                      </div>

                      {/* 3-tier subscores */}
                      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          <div className="font-black text-xs">{risk.clinicalSeverityScore}/50</div>
                          <span className="text-[9px] uppercase font-bold">Clinical</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          <div className="font-black text-xs">{risk.transportRiskScore}/30</div>
                          <span className="text-[9px] uppercase font-bold">Transport</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          <div className="font-black text-xs">{risk.destinationCapacityScore}/20</div>
                          <span className="text-[9px] uppercase font-bold">Capacity</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReferral(ref)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review &amp; Coordinate</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 6. FEATURE 1: SMART RESOURCE REALLOCATION ENGINE (REALLOCATION TAB) ── */}
      {activeTab === 'reallocation' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-800/50 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  AUTOMATED REALLOCATION ENGINE
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mt-1">
                Smart Facility-to-Facility Reallocation
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Surplus/deficit matching for medicines, ICU beds, ambulances, and blood units by urgency &amp; road distance.
              </p>
            </div>

            {/* Filter by resource type */}
            <div className="flex items-center gap-1 bg-emerald-900/40 p-1.5 rounded-2xl border border-emerald-700/40 overflow-x-auto">
              {(['ALL', 'MEDICINE', 'ICU_BEDS', 'AMBULANCE', 'BLOOD_UNITS'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReallocationResourceFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    reallocationResourceFilter === type
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-emerald-200 hover:bg-emerald-800/50'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {smartRecommendations
              .filter(r => reallocationResourceFilter === 'ALL' || r.resourceType === reallocationResourceFilter)
              .map((rec, index) => {
                const isApproved = approvedReallocations.includes(rec.id);

                return (
                  <div
                    key={rec.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 shadow-sm ${
                      isApproved
                        ? 'bg-slate-50 dark:bg-slate-900/60 border-emerald-500/40 opacity-80'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top ribbon */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                            Rank #{index + 1} Match
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {rec.resourceType.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {rec.urgency} Urgency
                        </span>
                      </div>

                      {/* Transfer Overview */}
                      <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                          Transfer {rec.recommendedQuantity} {rec.unit} of {rec.resourceName}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Emergency buffer rebalancing to mitigate deficit at {rec.destinationFacilityName}
                        </p>
                      </div>

                      {/* Source & Destination Route */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">SURPLUS SOURCE</span>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{rec.sourceFacilityName}</div>
                            <span className="text-[10px] text-slate-400">Surplus: +{rec.sourceAvailableSurplus} {rec.unit}</span>
                          </div>
                          <div className="text-center px-2">
                            <ArrowRight className="w-5 h-5 text-slate-400 mx-auto" />
                            <span className="text-[10px] font-mono text-slate-500">{rec.distanceKm} km</span>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">DEFICIT TARGET</span>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{rec.destinationFacilityName}</div>
                            <span className="text-[10px] text-rose-500">Deficit: -{rec.destinationDeficit} {rec.unit}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      {isApproved ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Action Processed &amp; Tamper-Logged</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveReallocationItem(rec)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Authorize / Reject Reallocation</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── 7. FEATURE 7: DISTRICT HEALTH SCORECARD (SCORECARD TAB) ── */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Facility Health Scorecards
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Composite rating (0-100) based on stock availability (30%), bed safety (30%), triage response SLA (25%), and referral speed (15%).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthScorecards.map((scorecard) => {
              const grade = getGrade(scorecard.compositeScore);

              return (
                <div
                  key={scorecard.facilityId}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{scorecard.facilityType}</span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{scorecard.facilityName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Taluka: {scorecard.taluka}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-lg font-black px-2.5 py-1 rounded-2xl border ${
                            grade === 'A'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : grade === 'B'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                              : grade === 'C'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                          }`}
                        >
                          Grade {grade}
                        </span>
                      </div>
                    </div>

                    {/* Composite Score & Trend */}
                    <div className="flex items-baseline justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{scorecard.compositeScore} <span className="text-xs text-slate-400">/ 100</span></div>
                        <span className="text-[10px] text-slate-400">Composite Health Index</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {scorecard.trend === 'IMPROVING' ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                            <TrendingUp className="w-3.5 h-3.5" /> +{scorecard.changePercent7Days}% 7d
                          </span>
                        ) : scorecard.trend === 'DECLINING' ? (
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                            <TrendingDown className="w-3.5 h-3.5" /> {scorecard.changePercent7Days}% 7d
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Stable 7d</span>
                        )}
                      </div>
                    </div>

                    {/* Subscore bars */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Stock Adequacy:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{scorecard.metrics.stockAdequacyScore}/100</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Bed Safety:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{scorecard.metrics.bedSafetyScore}/100</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Referral Speed:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{scorecard.metrics.referralSpeedScore}/100</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveScorecardFacility(scorecard)}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Diagnose Root Cause &amp; Action</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 8. FEATURE 3: ESCALATION TO STATE HEALTH AUTHORITY (ESCALATIONS TAB) ── */}
      {activeTab === 'escalations' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-400/30 flex items-center gap-1">
                  <Radio className="w-3 h-3 text-purple-500" />
                  STATE &amp; NATIONAL APEX ESCALATIONS
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                State Health Authority Command Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                District-to-State emergency escalations with live SLA countdowns and auto-escalation to National Apex.
              </p>
            </div>

            <button
              onClick={() => setIsEscalationModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Radio className="w-4 h-4" />
              <span>Create New State Escalation</span>
            </button>
          </div>

          <div className="space-y-3">
            {stateEscalations.map((esc) => (
              <div
                key={esc.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                      {esc.issueCategory.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esc.urgency === 'CRITICAL'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {esc.urgency} URGENCY
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: #{esc.id} &bull; Target: State Health Authority (Mumbai HQ)
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">{esc.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">{esc.summary}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block">SLA Target</span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {new Date(esc.slaExpiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      esc.status === 'PENDING'
                        ? 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                        : esc.status === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                        : esc.status === 'AUTO_ESCALATED_NATIONAL'
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                    }`}
                  >
                    {esc.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 9. FEATURE 6: PREDICTIVE CAPACITY & BED NETWORK (CAPACITY TAB) ── */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
          {/* FEATURE 6: LINEAR REGRESSION PREDICTIVE CAPACITY ALERTS */}
          {predictiveAlerts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  PREDICTIVE CAPACITY INTELLIGENCE (24H - 48H LINEAR REGRESSION)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {predictiveAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">
                        {alert.facilityName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                        {alert.hoursUntilCritical}H FORECAST
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {alert.formattedAlert}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>Trend Rate:</strong> {alert.trendRatePerHour > 0 ? `+${alert.trendRatePerHour}` : alert.trendRatePerHour} / hour &bull; Projected saturation by {new Date(alert.projectedSaturationTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hospital Bed Matrix Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Hospital Capacity Network</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Where can referred patients receive care across {currentDistrict} facilities?</p>
              </div>
              <button
                onClick={onOpenBedMatrix}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Bed className="w-4 h-4" />
                <span>Open Interactive Matrix</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Facility</th>
                    <th className="p-3.5">Type &amp; Taluka</th>
                    <th className="p-3.5">Total Beds</th>
                    <th className="p-3.5">ICU Beds</th>
                    <th className="p-3.5">Ventilators</th>
                    <th className="p-3.5">Oxygen Beds</th>
                    <th className="p-3.5 pr-5">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {districtFacilities.map((fac) => {
                    const occPct = fac.totalBeds > 0 ? Math.round((fac.occupiedBeds / fac.totalBeds) * 100) : 0;
                    return (
                      <tr key={fac.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{fac.name}</div>
                          <span className="text-[10px] font-mono text-slate-400">#{fac.id}</span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">
                          <div>{fac.type}</div>
                          <span className="text-[10px] text-slate-400">{fac.taluka || currentDistrict}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{fac.occupiedBeds} / {fac.totalBeds}</div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{fac.totalBeds - fac.occupiedBeds} available</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{fac.icuBedsOccupied} / {fac.icuBedsTotal}</div>
                          <span className={`text-[10px] font-semibold ${fac.icuBedsTotal - fac.icuBedsOccupied === 0 ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400'}`}>
                            {fac.icuBedsTotal - fac.icuBedsOccupied} free
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{fac.ventilatorsOccupied} / {fac.ventilatorsTotal}</div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{fac.ventilatorsTotal - fac.ventilatorsOccupied} free</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{fac.oxygenBedsOccupied} / {fac.oxygenBedsTotal}</div>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400">{fac.oxygenBedsTotal - fac.oxygenBedsOccupied} free</span>
                        </td>
                        <td className="p-3.5 pr-5">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
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

      {/* ── 10. FEATURE 4: TAMPER-EVIDENT AUDIT TRAIL (AUDIT TAB) ── */}
      {activeTab === 'audit' && (
        <TamperEvidentAuditView
          blocks={tamperBlocks}
          district={currentDistrict}
        />
      )}

      {/* ── 11. POST-11: 2026-27 ARCHITECTURE ROADMAP TAB ── */}
      {activeTab === 'roadmap' && <DhoRoadmapView />}

      {/* ── 12. TRACK SECTION (MEDICINE, REFERRALS, PATIENTS) ── */}
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

      {/* ── 13. OVERLAY MODALS & DRAWERS ── */}

      {/* Referral Review Modal (Feature 2 & 5) */}
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

      {/* Smart Reallocation Approval Modal (Feature 1 & 5) */}
      {activeReallocationItem && (
        <SmartReallocationModal
          recommendation={activeReallocationItem}
          onClose={() => setActiveReallocationItem(null)}
          onApprove={handleApproveReallocation}
          onReject={handleRejectReallocation}
        />
      )}

      {/* State Escalation Modal (Feature 3 & 5) */}
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

      {/* Scorecard Diagnosis Modal (Feature 7) */}
      {activeScorecardFacility && (
        <DistrictScorecardModal
          scorecard={activeScorecardFacility}
          onClose={() => setActiveScorecardFacility(null)}
          onExecuteCorrectiveAction={async (sc) => {
            await recordTamperAudit(
              'FACILITY_CORRECTIVE_ACTION',
              `Facility #${sc.facilityId} (${sc.facilityName})`,
              sc.suggestedCorrectiveAction,
              { compositeScore: sc.compositeScore, rank: sc.rank },
              { actionTriggered: true, executedAt: new Date().toISOString() }
            );
            setActiveScorecardFacility(null);
          }}
        />
      )}
    </div>
  );
}
