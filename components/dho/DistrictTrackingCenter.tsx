'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  Patient,
  Referral,
  StockTransfer,
  MedicineRequest,
  ReplenishmentRequestItem,
  RequestStatus,
} from '@/lib/types';
import { resolveCanonicalFacilityName } from '@/lib/mockData';
import {
  Pill,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  ArrowLeftRight,
  Building2,
  Check,
  X,
  Package,
  RotateCcw,
  AlertOctagon,
  Info,
  FolderHeart,
  Siren,
  Activity,
  HeartPulse,
  UserCheck,
  Baby,
  Eye,
  FileText,
  Filter,
  ShieldCheck,
  ChevronRight,
  MapPin,
  Sparkles,
  Phone,
  AlertTriangle,
} from 'lucide-react';

export type MedicineKpiTab = 'ALL' | 'NEEDS_ACTION' | 'AWAITING_APPROVAL' | 'IN_TRANSIT' | 'RECEIVED';
export type ReferralKpiTab = 'ALL' | 'CRITICAL' | 'PENDING' | 'ACCEPTED' | 'ADMITTED' | 'DISCHARGED';
export type PatientKpiTab = 'ALL' | 'HIGH_RISK' | 'INPATIENTS' | 'FOLLOW_UP' | 'STABLE';

interface DistrictTrackingCenterProps {
  initialTab?: 'medicine' | 'referrals' | 'patients' | string;
  onOpenPatientTimeline?: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
  onReviewReferral?: (referral: Referral) => void;
}

export function DistrictTrackingCenter({
  initialTab = 'medicine',
  onOpenPatientTimeline,
  onOpenReferralToken,
  onReviewReferral,
}: DistrictTrackingCenterProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const {
    stocks,
    medicineRequests,
    stockTransfers,
    facilities,
    referrals,
    patients,
    processStockTransfer,
  } = useSync();

  const isMr = language === 'mr';

  // Active Main View Tab ('medicine' | 'referrals' | 'patients')
  const [activeViewTab, setActiveViewTab] = useState<'medicine' | 'referrals' | 'patients'>(
    initialTab === 'referrals' ? 'referrals' : initialTab === 'patients' ? 'patients' : 'medicine'
  );

  // Sync when initialTab prop updates from sidebar
  useEffect(() => {
    if (initialTab === 'referrals' || initialTab === 'patients' || initialTab === 'medicine') {
      setActiveViewTab(initialTab);
    }
  }, [initialTab]);

  // Current district name
  const currentDistrict = user?.district || 'Pune';

  // =========================================================================
  // 1. MEDICINE REQUISITIONS & TRANSFER TRACKING STATE & LOGIC
  // =========================================================================
  const [medicineKpiTab, setMedicineKpiTab] = useState<MedicineKpiTab>('ALL');
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'ROUTINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [medicineFilter, setMedicineFilter] = useState<string>('ALL');
  const [requestingFacilityFilter, setRequestingFacilityFilter] = useState<string>('ALL');
  const [supplierFacilityFilter, setSupplierFacilityFilter] = useState<string>('ALL');

  const [confirmReceiptTransfer, setConfirmReceiptTransfer] = useState<StockTransfer | null>(null);
  const [rejectingTransfer, setRejectingTransfer] = useState<StockTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const normalizedRequisitions = useMemo(() => {
    const list: Array<{
      id: string;
      requestId: string;
      medicineName: string;
      requestedQuantity: number;
      unit: string;
      urgency: 'CRITICAL' | 'URGENT' | 'ROUTINE';
      rawStatus: RequestStatus;
      displayStatus: 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED';
      requestingFacilityId: string;
      requestingFacilityName: string;
      supplierFacilityId?: string;
      supplierFacilityName: string;
      supplierAvailableSurplus?: number;
      hasEligibleSupplier: boolean;
      supplyTier?: string;
      createdAt: string;
      reason?: string;
      transferObj?: StockTransfer;
    }> = [];

    (stockTransfers || []).forEach((st) => {
      let displayStatus: 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED' = 'REQUESTED';
      if (st.status === 'COMPLETED') displayStatus = 'RECEIVED';
      else if (st.status === 'DISPATCHED') displayStatus = 'DISPATCHED';
      else if (st.status === 'APPROVED') displayStatus = 'APPROVED';
      else if (st.status === 'REJECTED') displayStatus = 'REJECTED';
      else displayStatus = 'REQUESTED';

      const hasSupplier = Boolean(
        st.sourceFacilityId &&
        st.sourceFacilityName &&
        !st.sourceFacilityName.toLowerCase().includes('no eligible') &&
        !st.sourceFacilityName.toLowerCase().includes('unallocated')
      );

      list.push({
        id: st.id,
        requestId: st.requestId || st.id,
        medicineName: st.medicineName,
        requestedQuantity: st.requestedQuantity || 10,
        unit: 'Units',
        urgency: st.urgency || (st.isEmergency ? 'CRITICAL' : 'URGENT'),
        rawStatus: st.status,
        displayStatus,
        requestingFacilityId: st.destinationFacilityId,
        requestingFacilityName: st.destinationFacilityName || resolveCanonicalFacilityName(st.destinationFacilityId),
        supplierFacilityId: st.sourceFacilityId,
        supplierFacilityName: hasSupplier
          ? (st.sourceFacilityName || resolveCanonicalFacilityName(st.sourceFacilityId))
          : 'No eligible supplier available',
        supplierAvailableSurplus: st.supplierAvailableSurplus,
        hasEligibleSupplier: hasSupplier,
        supplyTier: st.supplyTier,
        createdAt: st.createdAt || new Date().toISOString(),
        reason: st.reason,
        transferObj: st,
      });
    });

    (medicineRequests || []).forEach((req) => {
      (req.items || []).forEach((item: ReplenishmentRequestItem) => {
        if (item.transferId && list.some((it) => it.id === item.transferId)) {
          return;
        }

        let displayStatus: 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED' = 'REQUESTED';
        if (item.status === 'COMPLETED') displayStatus = 'RECEIVED';
        else if (item.status === 'DISPATCHED') displayStatus = 'DISPATCHED';
        else if (item.status === 'APPROVED') displayStatus = 'APPROVED';
        else if (item.status === 'REJECTED') displayStatus = 'REJECTED';
        else displayStatus = 'REQUESTED';

        const hasSupplier = Boolean(
          item.sourceFacilityId &&
          item.sourceFacilityName &&
          !item.sourceFacilityName.toLowerCase().includes('no eligible') &&
          !item.sourceFacilityName.toLowerCase().includes('unallocated')
        );

        list.push({
          id: item.id,
          requestId: req.id,
          medicineName: item.medicineName,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit || 'Units',
          urgency: item.urgency,
          rawStatus: item.status,
          displayStatus,
          requestingFacilityId: req.destinationFacilityId,
          requestingFacilityName: req.destinationFacilityName || resolveCanonicalFacilityName(req.destinationFacilityId),
          supplierFacilityId: item.sourceFacilityId,
          supplierFacilityName: hasSupplier
            ? (item.sourceFacilityName || resolveCanonicalFacilityName(item.sourceFacilityId))
            : 'No eligible supplier available',
          supplierAvailableSurplus: item.supplierAvailableSurplus,
          hasEligibleSupplier: hasSupplier,
          supplyTier: item.supplyTier,
          createdAt: req.createdAt,
          reason: item.reason || "",
        });
      });
    });

    return list;
  }, [stockTransfers, medicineRequests]);

  const medicineKpiCounts = useMemo(() => {
    const total = normalizedRequisitions.length;
    const needsAction = normalizedRequisitions.filter(
      (r) => r.displayStatus === 'REQUESTED' || r.displayStatus === 'DISPATCHED'
    ).length;
    const awaitingApproval = normalizedRequisitions.filter((r) => r.displayStatus === 'REQUESTED').length;
    const inTransit = normalizedRequisitions.filter((r) => r.displayStatus === 'DISPATCHED').length;
    const received = normalizedRequisitions.filter((r) => r.displayStatus === 'RECEIVED').length;
    return { total, needsAction, awaitingApproval, inTransit, received };
  }, [normalizedRequisitions]);

  const filteredRequisitions = useMemo(() => {
    return normalizedRequisitions.filter((item) => {
      if (medicineKpiTab === 'NEEDS_ACTION' && !(item.displayStatus === 'REQUESTED' || item.displayStatus === 'DISPATCHED')) return false;
      if (medicineKpiTab === 'AWAITING_APPROVAL' && item.displayStatus !== 'REQUESTED') return false;
      if (medicineKpiTab === 'IN_TRANSIT' && item.displayStatus !== 'DISPATCHED') return false;
      if (medicineKpiTab === 'RECEIVED' && item.displayStatus !== 'RECEIVED') return false;

      if (medSearchQuery.trim()) {
        const q = medSearchQuery.toLowerCase();
        const matchesMed = item.medicineName.toLowerCase().includes(q);
        const matchesReq = item.requestingFacilityName.toLowerCase().includes(q);
        const matchesSup = item.supplierFacilityName.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q) || item.requestId.toLowerCase().includes(q);
        if (!matchesMed && !matchesReq && !matchesSup && !matchesId) return false;
      }

      if (priorityFilter !== 'ALL' && item.urgency !== priorityFilter) return false;
      if (statusFilter !== 'ALL' && item.displayStatus !== statusFilter) return false;
      if (medicineFilter !== 'ALL' && item.medicineName !== medicineFilter) return false;
      if (requestingFacilityFilter !== 'ALL' && item.requestingFacilityName !== requestingFacilityFilter) return false;
      if (supplierFacilityFilter !== 'ALL' && item.supplierFacilityName !== supplierFacilityFilter) return false;

      return true;
    });
  }, [normalizedRequisitions, medicineKpiTab, medSearchQuery, priorityFilter, statusFilter, medicineFilter, requestingFacilityFilter, supplierFacilityFilter]);

  const handleApprove = async (transferId: string) => {
    const success = await processStockTransfer(transferId, 'APPROVE');
    if (success) {
      setActionSuccessMsg(`Consignment #${transferId} approved by supplier facility.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleDispatch = async (transferId: string) => {
    const success = await processStockTransfer(transferId, 'DISPATCH');
    if (success) {
      setActionSuccessMsg(`Consignment #${transferId} dispatched in transit.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleConfirmReceive = async () => {
    if (!confirmReceiptTransfer) return;
    const success = await processStockTransfer(confirmReceiptTransfer.id, 'RECEIVE');
    if (success) {
      setActionSuccessMsg(`Consignment #${confirmReceiptTransfer.id} confirmed received! Stock credited to facility.`);
      setConfirmReceiptTransfer(null);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleReject = async () => {
    if (!rejectingTransfer) return;
    const success = await processStockTransfer(rejectingTransfer.id, 'REJECT', rejectReason || 'Insufficient buffer at supplier');
    if (success) {
      setActionSuccessMsg(`Consignment #${rejectingTransfer.id} rejected.`);
      setRejectingTransfer(null);
      setRejectReason('');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  // =========================================================================
  // 2. REFERRALS & TRIAGE TRACKING STATE & LOGIC
  // =========================================================================
  const [refKpiTab, setRefKpiTab] = useState<ReferralKpiTab>('ALL');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [refUrgencyFilter, setRefUrgencyFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');
  const [refSpecialtyFilter, setRefSpecialtyFilter] = useState<string>('ALL');

  const referralKpiCounts = useMemo(() => {
    const total = (referrals || []).length;
    const critical = (referrals || []).filter((r) => r.triagePriority === 'red' || r.triageScore >= 7).length;
    const pending = (referrals || []).filter((r) => r.status === 'PENDING').length;
    const accepted = (referrals || []).filter((r) => r.status === 'ACCEPTED').length;
    const admitted = (referrals || []).filter((r) => r.status === 'ADMITTED').length;
    const discharged = (referrals || []).filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED').length;
    return { total, critical, pending, accepted, admitted, discharged };
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    return (referrals || []).filter((r) => {
      if (refKpiTab === 'CRITICAL' && !(r.triagePriority === 'red' || r.triageScore >= 7)) return false;
      if (refKpiTab === 'PENDING' && r.status !== 'PENDING') return false;
      if (refKpiTab === 'ACCEPTED' && r.status !== 'ACCEPTED') return false;
      if (refKpiTab === 'ADMITTED' && !(r.status === 'ADMITTED')) return false;
      if (refKpiTab === 'DISCHARGED' && !(r.status === 'COMPLETED' || r.status === 'CANCELLED')) return false;

      if (refSearchQuery.trim()) {
        const q = refSearchQuery.toLowerCase();
        const matchesName = (r.patientName || '').toLowerCase().includes(q);
        const matchesAbha = (r.patientAbha || '').toLowerCase().includes(q);
        const matchesToken = (r.tokenCode || r.id).toLowerCase().includes(q);
        const matchesFrom = (r.referringFacility || '').toLowerCase().includes(q);
        const matchesTo = (r.targetFacility || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAbha && !matchesToken && !matchesFrom && !matchesTo) return false;
      }

      if (refUrgencyFilter === 'RED' && r.triagePriority !== 'red') return false;
      if (refUrgencyFilter === 'YELLOW' && r.triagePriority !== 'yellow') return false;
      if (refUrgencyFilter === 'GREEN' && r.triagePriority !== 'green') return false;

      if (refSpecialtyFilter !== 'ALL' && r.specialtyRequired !== refSpecialtyFilter) return false;

      return true;
    });
  }, [referrals, refKpiTab, refSearchQuery, refUrgencyFilter, refSpecialtyFilter]);

  // =========================================================================
  // 3. PATIENTS & EHR DIRECTORY STATE & LOGIC
  // =========================================================================
  const [patKpiTab, setPatKpiTab] = useState<PatientKpiTab>('ALL');
  const [patSearchQuery, setPatSearchQuery] = useState('');
  const [patTalukaFilter, setPatTalukaFilter] = useState<string>('ALL');
  const [patRiskFilter, setPatRiskFilter] = useState<'ALL' | 'HRP' | 'CHRONIC' | 'NORMAL'>('ALL');

  const patientKpiCounts = useMemo(() => {
    const total = (patients || []).length;
    const highRisk = (patients || []).filter((p) => p.isHighRiskPregnancy || (p.chronicConditions && p.chronicConditions.length > 0)).length;
    const inpatients = (patients || []).filter((p) => p.activeCareOwner && p.activeCareOwner.toLowerCase().includes('hospital')).length;
    const followUp = (patients || []).filter((p) => p.isPregnant || (p.encounters && p.encounters.length > 1)).length;
    const stable = total - highRisk;
    return { total, highRisk, inpatients, followUp, stable: Math.max(0, stable) };
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return (patients || []).filter((p) => {
      if (patKpiTab === 'HIGH_RISK' && !p.isHighRiskPregnancy && (!p.chronicConditions || p.chronicConditions.length === 0)) return false;
      if (patKpiTab === 'INPATIENTS' && (!p.activeCareOwner || !p.activeCareOwner.toLowerCase().includes('hospital'))) return false;
      if (patKpiTab === 'FOLLOW_UP' && !p.isPregnant && (!p.encounters || p.encounters.length <= 1)) return false;
      if (patKpiTab === 'STABLE' && (p.isHighRiskPregnancy || (p.chronicConditions && p.chronicConditions.length > 0))) return false;

      if (patSearchQuery.trim()) {
        const q = patSearchQuery.toLowerCase();
        const matchesName = (p.fullName || '').toLowerCase().includes(q);
        const matchesAbha = (p.abhaId || '').toLowerCase().includes(q);
        const matchesVillage = (p.village || '').toLowerCase().includes(q);
        const matchesPhone = (p.phone || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAbha && !matchesVillage && !matchesPhone) return false;
      }

      if (patTalukaFilter !== 'ALL' && p.taluka !== patTalukaFilter) return false;
      if (patRiskFilter === 'HRP' && !p.isHighRiskPregnancy) return false;
      if (patRiskFilter === 'CHRONIC' && (!p.chronicConditions || p.chronicConditions.length === 0)) return false;
      if (patRiskFilter === 'NORMAL' && (p.isHighRiskPregnancy || (p.chronicConditions && p.chronicConditions.length > 0))) return false;

      return true;
    });
  }, [patients, patKpiTab, patSearchQuery, patTalukaFilter, patRiskFilter]);

  return (
    <div className="space-y-4">
      {/* ── TOP MULTI-VIEW NAVIGATION SWITCHER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs flex items-center gap-2 overflow-x-auto">
        {[
          {
            id: 'referrals' as const,
            labelEn: 'Track Referrals & Triage',
            labelMr: 'रुग्ण संदर्भ व ट्रायज ट्रॅकिंग',
            icon: ArrowLeftRight,
            count: referralKpiCounts.total,
            badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300',
          },
          {
            id: 'patients' as const,
            labelEn: 'Track Patients & EHR',
            labelMr: 'रुग्ण प्रवास व EHR ट्रॅकिंग',
            icon: FolderHeart,
            count: patientKpiCounts.total,
            badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300',
          },
          {
            id: 'medicine' as const,
            labelEn: 'Track Medicine & Buffer',
            labelMr: 'औषध साठा व रसद ट्रॅकिंग',
            icon: Pill,
            count: medicineKpiCounts.total,
            badgeClass: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300',
          },
        ].map((tab) => {
          const isActive = activeViewTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveViewTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isMr ? tab.labelMr : tab.labelEn}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab.badgeClass}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: TRACK REFERRALS & TRIAGE                                          */}
      {/* ========================================================================= */}
      {activeViewTab === 'referrals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    DISTRICT REFERRAL OPERATIONS
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    LIVE TRIAGE QUEUE
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white mt-1">
                  Track Referrals &amp; Emergency Triage
                </h1>
                <p className="text-xs text-slate-400">
                  Inter-facility patient transfers, priority triage scoring, bed admissions, and closed-loop counter-referrals.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  District Scope
                </span>
                <div className="text-xs font-bold text-slate-200">
                  {currentDistrict} Health Network
                </div>
              </div>
            </div>
          </div>

          {/* Referral KPI Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { id: 'ALL' as ReferralKpiTab, label: 'All Referrals', count: referralKpiCounts.total, desc: 'Total inter-tier tokens', activeClass: 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
              { id: 'CRITICAL' as ReferralKpiTab, label: 'Critical / Red', count: referralKpiCounts.critical, desc: 'High triage urgency', activeClass: 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300', indicator: referralKpiCounts.critical > 0 },
              { id: 'PENDING' as ReferralKpiTab, label: 'Pending Intake', count: referralKpiCounts.pending, desc: 'Awaiting triage intake', activeClass: 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
              { id: 'ACCEPTED' as ReferralKpiTab, label: 'Accepted', count: referralKpiCounts.accepted, desc: 'En route / Accepted', activeClass: 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
              { id: 'ADMITTED' as ReferralKpiTab, label: 'Inpatient Care', count: referralKpiCounts.admitted, desc: 'Bed allocated & active', activeClass: 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
              { id: 'DISCHARGED' as ReferralKpiTab, label: 'Completed', count: referralKpiCounts.discharged, desc: 'Counter-referred/Done', activeClass: 'border-slate-500 bg-slate-50/60 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300' },
            ].map((tab) => {
              const isActive = refKpiTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRefKpiTab(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                    isActive
                      ? `${tab.activeClass} ring-2 ring-blue-500/20 font-bold`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                    {tab.indicator && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black">{tab.count}</span>
                    <span className="text-[10px] text-slate-400 truncate">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by patient name, ABHA ID, token, referring facility, or hospital..."
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={refUrgencyFilter}
                  onChange={(e) => setRefUrgencyFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Triage Urgencies</option>
                  <option value="RED">🔴 Red / Critical Priority</option>
                  <option value="YELLOW">🟡 Yellow / Urgent</option>
                  <option value="GREEN">🟢 Green / Routine</option>
                </select>

                <select
                  value={refSpecialtyFilter}
                  onChange={(e) => setRefSpecialtyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Specialties</option>
                  <option value="Obstetrics & Gynaecology">Obstetrics &amp; Gynaecology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Trauma & Emergency Care">Trauma &amp; Emergency</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="General Surgery">General Surgery</option>
                </select>
              </div>
            </div>
          </div>

          {/* Referrals Cards Grid */}
          <div className="space-y-3">
            {filteredReferrals.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <ArrowLeftRight className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No referral records match your filters</h4>
                <p className="text-xs text-slate-400 mt-1">Try resetting search filters or changing the urgency status tab.</p>
              </div>
            ) : (
              filteredReferrals.map((ref) => {
                const isCritical = ref.triagePriority === 'red' || ref.triageScore >= 7;
                return (
                  <div
                    key={ref.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {ref.tokenCode || ref.id}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                          isCritical
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        }`}>
                          {ref.triagePriority === 'red' ? '🔴 RED PRIORITY' : '🟢 ROUTINE PRIORITY'}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {ref.specialtyRequired}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto lg:ml-0 font-mono">
                          {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {ref.patientName}
                        </h3>
                        <span className="text-xs text-slate-500 font-mono">
                          ABHA: {ref.patientAbha}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({ref.patientAge}y, {ref.patientGender})
                        </span>
                      </div>

                      {/* Facility Transfer Route */}
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-blue-500" />
                          {ref.referringFacility}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-teal-500" />
                          {ref.targetFacility}
                        </span>
                      </div>

                      {ref.referralReason && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                          &ldquo;{ref.referralReason}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Right Action Column */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl border ${
                        ref.status === 'PENDING'
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                          : ref.status === 'ACCEPTED'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300'
                          : ref.status === 'ADMITTED'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                      }`}>
                        {ref.status}
                      </span>

                      {onReviewReferral && (
                        <button
                          onClick={() => onReviewReferral(ref)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review &amp; Triage</span>
                        </button>
                      )}

                      {onOpenReferralToken && (
                        <button
                          onClick={() => onOpenReferralToken(ref)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Token &amp; QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TRACK PATIENTS & LONGITUDINAL EHR                                */}
      {/* ========================================================================= */}
      {activeViewTab === 'patients' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FolderHeart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    DISTRICT POPULATION HEALTH
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    ABDM COMPLIANT EHR
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white mt-1">
                  Track Patients &amp; Longitudinal EHR Registry
                </h1>
                <p className="text-xs text-slate-400">
                  District-level citizen health records, maternal high-risk tracking, continuous vitals, and care ownership.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Registered Population
                </span>
                <div className="text-xs font-bold text-slate-200">
                  {patientKpiCounts.total} Tracked Citizen Records
                </div>
              </div>
            </div>
          </div>

          {/* Patient KPI Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { id: 'ALL' as PatientKpiTab, label: 'All Patients', count: patientKpiCounts.total, desc: 'District population', activeClass: 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
              { id: 'HIGH_RISK' as PatientKpiTab, label: 'High Risk / HRP', count: patientKpiCounts.highRisk, desc: 'Maternal & chronic alerts', activeClass: 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300', indicator: patientKpiCounts.highRisk > 0 },
              { id: 'INPATIENTS' as PatientKpiTab, label: 'Active Inpatients', count: patientKpiCounts.inpatients, desc: 'Currently admitted', activeClass: 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' },
              { id: 'FOLLOW_UP' as PatientKpiTab, label: 'Follow-up Active', count: patientKpiCounts.followUp, desc: 'ASHA community tracking', activeClass: 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
              { id: 'STABLE' as PatientKpiTab, label: 'Stable Population', count: patientKpiCounts.stable, desc: 'Routine primary monitoring', activeClass: 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
            ].map((tab) => {
              const isActive = patKpiTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPatKpiTab(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                    isActive
                      ? `${tab.activeClass} ring-2 ring-emerald-500/20 font-bold`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                    {tab.indicator && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black">{tab.count}</span>
                    <span className="text-[10px] text-slate-400 truncate">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by patient name, ABHA ID, village, or phone number..."
                  value={patSearchQuery}
                  onChange={(e) => setPatSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={patRiskFilter}
                  onChange={(e) => setPatRiskFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Clinical Categories</option>
                  <option value="HRP">High-Risk Pregnancy (HRP)</option>
                  <option value="CHRONIC">Chronic Conditions</option>
                  <option value="NORMAL">Normal / Stable</option>
                </select>

                <select
                  value={patTalukaFilter}
                  onChange={(e) => setPatTalukaFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Talukas</option>
                  <option value="Velhe">Velhe</option>
                  <option value="Bhor">Bhor</option>
                  <option value="Haveli">Haveli</option>
                  <option value="Pune City">Pune City</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patients List Cards */}
          <div className="space-y-3">
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <FolderHeart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No patient records found</h4>
                <p className="text-xs text-slate-400 mt-1">Check search parameters or select a different category filter.</p>
              </div>
            ) : (
              filteredPatients.map((p) => {
                const latestEnc = p.encounters && p.encounters.length > 0 ? p.encounters[p.encounters.length - 1] : null;
                const vitals = latestEnc?.vitals;
                return (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {p.fullName}
                        </span>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          ABHA: {p.abhaId}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({p.age}y, {p.gender} • {p.bloodGroup || 'B+'})
                        </span>
                        {p.isHighRiskPregnancy && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300">
                            HRP (Week {p.gestationalWeeks})
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200">
                          Care Owner: {p.activeCareOwner || 'PHC Primary Care'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {p.village}, {p.taluka} Taluka ({p.district || currentDistrict})
                        </span>
                        {p.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            +91 {p.phone}
                          </span>
                        )}
                      </div>

                      {/* Vitals summary strip */}
                      {vitals && (
                        <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex-wrap">
                          <span className="text-slate-500 font-bold">Latest Vitals:</span>
                          <span className="text-slate-800 dark:text-slate-200">BP: {vitals.systolicBp}/{vitals.diastolicBp} mmHg</span>
                          <span>•</span>
                          <span className="text-slate-800 dark:text-slate-200">SpO2: {vitals.spO2}%</span>
                          <span>•</span>
                          <span className="text-slate-800 dark:text-slate-200">HR: {vitals.heartRate} bpm</span>
                          <span>•</span>
                          <span className="text-slate-800 dark:text-slate-200">Temp: {vitals.temperature}°C</span>
                        </div>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {onOpenPatientTimeline && (
                        <button
                          onClick={() => onOpenPatientTimeline(p)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" />
                          <span>View EHR Timeline</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: TRACK MEDICINE & BUFFER                                           */}
      {/* ========================================================================= */}
      {activeViewTab === 'medicine' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* ── 1. HEADER ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    DISTRICT MEDICINE OPERATIONS
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MAHAAUSHADHI NETWORK
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
                  <span>Medicine Requisition &amp; Transfer Tracking</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Inter-facility supply allocations, supplier approvals, dispatch transit, and verified receipt acknowledgments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-left md:text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                  Live Network State
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{medicineKpiCounts.total} Requisitions Active / Completed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {actionSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {/* ── 2. KPI TABS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              {
                id: 'ALL' as MedicineKpiTab,
                label: 'All Demands',
                count: medicineKpiCounts.total,
                desc: 'Total formulary requisitions',
                activeClass: 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
                badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
              },
              {
                id: 'NEEDS_ACTION' as MedicineKpiTab,
                label: 'Needs Action',
                count: medicineKpiCounts.needsAction,
                desc: 'Pending approval or delivery receipt',
                activeClass: 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
                badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
                indicator: medicineKpiCounts.needsAction > 0,
              },
              {
                id: 'AWAITING_APPROVAL' as MedicineKpiTab,
                label: 'Awaiting Approval',
                count: medicineKpiCounts.awaitingApproval,
                desc: 'Requested at supplier facility',
                activeClass: 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
                badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
              },
              {
                id: 'IN_TRANSIT' as MedicineKpiTab,
                label: 'In Transit',
                count: medicineKpiCounts.inTransit,
                desc: 'Dispatched and en route',
                activeClass: 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
                badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
              },
              {
                id: 'RECEIVED' as MedicineKpiTab,
                label: 'Received',
                count: medicineKpiCounts.received,
                desc: 'Delivered & stock credited',
                activeClass: 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
                badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
              },
            ].map((tab) => {
              const isActive = medicineKpiTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMedicineKpiTab(tab.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                    isActive
                      ? `${tab.activeClass} ring-2 ring-blue-500/20 font-bold`
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
                    {tab.indicator && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black">{tab.count}</span>
                    <span className="text-[10px] text-slate-400 truncate">{tab.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── 3. OPERATIONAL TOOLBAR & FILTERS ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search medicine, requesting PHC/Hospital, supplier facility, ID..."
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="CRITICAL">🔴 Critical</option>
                  <option value="URGENT">🟡 Urgent</option>
                  <option value="ROUTINE">🟢 Routine</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 4. REQUISITIONS LIST ── */}
          <div className="space-y-3">
            {filteredRequisitions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No medicine requisitions found</h4>
                <p className="text-xs text-slate-400 mt-1">Try resetting search filters.</p>
              </div>
            ) : (
              filteredRequisitions.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {item.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        item.urgency === 'CRITICAL'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                          : item.urgency === 'URGENT'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                      }`}>
                        {item.urgency}
                      </span>
                      {item.supplyTier && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.supplyTier} Tier
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {item.medicineName}
                      </h3>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        ({item.requestedQuantity} {item.unit})
                      </span>
                    </div>

                    {/* Route: Requesting Facility -> Supplier Facility */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        {item.requestingFacilityName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className={`flex items-center gap-1 font-bold ${
                        item.hasEligibleSupplier ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}>
                        <Building2 className="w-3.5 h-3.5" />
                        {item.supplierFacilityName}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-xl border ${
                      item.displayStatus === 'REQUESTED'
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300'
                        : item.displayStatus === 'APPROVED'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300'
                        : item.displayStatus === 'DISPATCHED'
                        ? 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                        : item.displayStatus === 'RECEIVED'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                    }`}>
                      {item.displayStatus}
                    </span>

                    {item.transferObj && item.displayStatus === 'REQUESTED' && (
                      <button
                        onClick={() => handleApprove(item.transferObj!.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Approve Allocation
                      </button>
                    )}

                    {item.transferObj && item.displayStatus === 'APPROVED' && (
                      <button
                        onClick={() => handleDispatch(item.transferObj!.id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Dispatch En Route
                      </button>
                    )}

                    {item.transferObj && item.displayStatus === 'DISPATCHED' && (
                      <button
                        onClick={() => setConfirmReceiptTransfer(item.transferObj!)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Confirm Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM RECEIPT ── */}
      {confirmReceiptTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Confirm Medicine Receipt
                </h3>
                <p className="text-xs text-slate-500">
                  Consignment #{confirmReceiptTransfer.id}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Medicine:</span>
                <span className="font-bold text-slate-900 dark:text-white">{confirmReceiptTransfer.medicineName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Quantity:</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{confirmReceiptTransfer.requestedQuantity} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Supplier:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmReceiptTransfer.sourceFacilityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recipient Facility:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{confirmReceiptTransfer.destinationFacilityName}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Confirming receipt will debit the source inventory and credit the destination facility in real time.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReceiptTransfer(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceive}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                Confirm &amp; Credit Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
