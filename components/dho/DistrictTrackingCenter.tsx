'use client';

import React, { useState, useMemo } from 'react';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
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
  Building2,
  Check,
  X,
  Package,
  RotateCcw,
  AlertOctagon,
  Info,
} from 'lucide-react';

export type MedicineKpiTab = 'ALL' | 'NEEDS_ACTION' | 'AWAITING_APPROVAL' | 'IN_TRANSIT' | 'RECEIVED';

interface DistrictTrackingCenterProps {
  initialTab?: string;
  onOpenPatientTimeline?: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
  onReviewReferral?: (referral: Referral) => void;
}

export function DistrictTrackingCenter({
  initialTab = 'medicine',
}: DistrictTrackingCenterProps) {
  const { user } = useAuth();
  const {
    stocks,
    medicineRequests,
    stockTransfers,
    facilities,
    processStockTransfer,
  } = useSync();

  // Active KPI Tab
  const [activeKpiTab, setActiveKpiTab] = useState<MedicineKpiTab>('ALL');

  // Search & Detailed Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'ROUTINE'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [medicineFilter, setMedicineFilter] = useState<string>('ALL');
  const [requestingFacilityFilter, setRequestingFacilityFilter] = useState<string>('ALL');
  const [supplierFacilityFilter, setSupplierFacilityFilter] = useState<string>('ALL');

  // Action Modals State
  const [confirmReceiptTransfer, setConfirmReceiptTransfer] = useState<StockTransfer | null>(null);
  const [rejectingTransfer, setRejectingTransfer] = useState<StockTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // 1. Normalized & Unified Requisition Items (Derived 100% from single source of truth)
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

    // Process from stockTransfers
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

    // Also include medicineRequests items that don't yet have linked transfer records
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
          id: item.id || `${req.id}-${item.medicineName}`,
          requestId: req.id,
          medicineName: item.medicineName,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit || 'Units',
          urgency: item.urgency || req.urgency || 'URGENT',
          rawStatus: item.status as RequestStatus,
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
          createdAt: req.createdAt || new Date().toISOString(),
          reason: item.reason || req.notes,
        });
      });
    });

    // Canonical Sorting: CRITICAL first, then URGENT, then ROUTINE; then newest timestamp
    return list.sort((a, b) => {
      const priorityOrder: Record<string, number> = { CRITICAL: 3, URGENT: 2, ROUTINE: 1 };
      const diffPriority = (priorityOrder[b.urgency] || 1) - (priorityOrder[a.urgency] || 1);
      if (diffPriority !== 0) return diffPriority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [stockTransfers, medicineRequests]);

  // Distinct Lists for Dynamic Dropdowns
  const distinctMedicines = useMemo(() => {
    return Array.from(new Set(normalizedRequisitions.map((r) => r.medicineName))).filter(Boolean).sort();
  }, [normalizedRequisitions]);

  const distinctRequestingFacilities = useMemo(() => {
    return Array.from(new Set(normalizedRequisitions.map((r) => r.requestingFacilityName))).filter(Boolean).sort();
  }, [normalizedRequisitions]);

  const distinctSupplierFacilities = useMemo(() => {
    return Array.from(
      new Set(
        normalizedRequisitions
          .map((r) => r.supplierFacilityName)
          .filter((name) => name && !name.toLowerCase().includes('no eligible'))
      )
    ).sort();
  }, [normalizedRequisitions]);

  // 2. Real Derived KPI Counts
  const kpiCounts = useMemo(() => {
    const total = normalizedRequisitions.length;
    const awaitingApproval = normalizedRequisitions.filter((r) => r.displayStatus === 'REQUESTED').length;
    const inTransit = normalizedRequisitions.filter((r) => r.displayStatus === 'DISPATCHED').length;
    const received = normalizedRequisitions.filter((r) => r.displayStatus === 'RECEIVED').length;
    const needsAction = normalizedRequisitions.filter((r) => r.displayStatus === 'REQUESTED' || r.displayStatus === 'DISPATCHED').length;

    return {
      total,
      needsAction,
      awaitingApproval,
      inTransit,
      received,
    };
  }, [normalizedRequisitions]);

  // 3. Filtered Requisitions based on KPI Tabs & Detailed Filters
  const filteredRequisitions = useMemo(() => {
    return normalizedRequisitions.filter((item) => {
      // KPI Tab filter
      if (activeKpiTab === 'NEEDS_ACTION') {
        if (item.displayStatus !== 'REQUESTED' && item.displayStatus !== 'DISPATCHED') return false;
      } else if (activeKpiTab === 'AWAITING_APPROVAL') {
        if (item.displayStatus !== 'REQUESTED') return false;
      } else if (activeKpiTab === 'IN_TRANSIT') {
        if (item.displayStatus !== 'DISPATCHED') return false;
      } else if (activeKpiTab === 'RECEIVED') {
        if (item.displayStatus !== 'RECEIVED') return false;
      }

      // Search Query filter (ID, medicine, facilities)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = item.id.toLowerCase().includes(q) || item.requestId.toLowerCase().includes(q);
        const matchesDrug = item.medicineName.toLowerCase().includes(q);
        const matchesReqFac = item.requestingFacilityName.toLowerCase().includes(q);
        const matchesSupFac = item.supplierFacilityName.toLowerCase().includes(q);
        if (!matchesId && !matchesDrug && !matchesReqFac && !matchesSupFac) return false;
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && item.urgency !== priorityFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && item.displayStatus !== statusFilter) return false;

      // Medicine filter
      if (medicineFilter !== 'ALL' && item.medicineName !== medicineFilter) return false;

      // Requesting Facility filter
      if (requestingFacilityFilter !== 'ALL' && item.requestingFacilityName !== requestingFacilityFilter) return false;

      // Supplier Facility filter
      if (supplierFacilityFilter !== 'ALL' && item.supplierFacilityName !== supplierFacilityFilter) return false;

      return true;
    });
  }, [
    normalizedRequisitions,
    activeKpiTab,
    searchQuery,
    priorityFilter,
    statusFilter,
    medicineFilter,
    requestingFacilityFilter,
    supplierFacilityFilter,
  ]);

  // Handlers for Supplier Approval, Dispatch, and Requester Receipt
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
      setActionSuccessMsg(
        `Consignment #${confirmReceiptTransfer.id} confirmed received! Stock credited to requesting facility.`
      );
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

  const isFiltersActive =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    medicineFilter !== 'ALL' ||
    requestingFacilityFilter !== 'ALL' ||
    supplierFacilityFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setMedicineFilter('ALL');
    setRequestingFacilityFilter('ALL');
    setSupplierFacilityFilter('ALL');
  };

  return (
    <div className="space-y-4">
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
              <span>{kpiCounts.total} Requisitions Active / Completed</span>
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

      {/* ── 2. KPI TABS (DERIVED FROM REAL REQUISITIONS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {[
          {
            id: 'ALL' as MedicineKpiTab,
            label: 'All Demands',
            count: kpiCounts.total,
            desc: 'Total formulary requisitions',
            activeClass: 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
            badgeClass: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
          },
          {
            id: 'NEEDS_ACTION' as MedicineKpiTab,
            label: 'Needs Action',
            count: kpiCounts.needsAction,
            desc: 'Pending approval or delivery receipt',
            activeClass: 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
            badgeClass: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
            indicator: kpiCounts.needsAction > 0,
          },
          {
            id: 'AWAITING_APPROVAL' as MedicineKpiTab,
            label: 'Awaiting Approval',
            count: kpiCounts.awaitingApproval,
            desc: 'Requested at supplier facility',
            activeClass: 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
            badgeClass: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
          },
          {
            id: 'IN_TRANSIT' as MedicineKpiTab,
            label: 'In Transit',
            count: kpiCounts.inTransit,
            desc: 'Dispatched and en route',
            activeClass: 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
            badgeClass: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
          },
          {
            id: 'RECEIVED' as MedicineKpiTab,
            label: 'Received',
            count: kpiCounts.received,
            desc: 'Delivered & stock credited',
            activeClass: 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
            badgeClass: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
          },
        ].map((tab) => {
          const isActive = activeKpiTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveKpiTab(tab.id)}
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
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Request ID (#TRF-...), Medicine, Requesting Facility, or Supplier Facility..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Quick Clear Filter Button if active */}
          {isFiltersActive && (
            <button
              onClick={handleResetFilters}
              className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {/* Priority */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">🔴 Critical Priority</option>
              <option value="URGENT">🟠 Urgent Priority</option>
              <option value="ROUTINE">🟢 Routine</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Lifecycle Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">1. Requested (Awaiting Approval)</option>
              <option value="APPROVED">2. Approved</option>
              <option value="DISPATCHED">3. Dispatched (In Transit)</option>
              <option value="RECEIVED">4. Received (Stock Credited)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Medicine */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Medicine Formulary
            </label>
            <select
              value={medicineFilter}
              onChange={(e) => setMedicineFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Medicines ({distinctMedicines.length})</option>
              {distinctMedicines.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Requesting Facility */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Requesting Facility
            </label>
            <select
              value={requestingFacilityFilter}
              onChange={(e) => setRequestingFacilityFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Requesters ({distinctRequestingFacilities.length})</option>
              {distinctRequestingFacilities.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Facility */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Supplier Facility
            </label>
            <select
              value={supplierFacilityFilter}
              onChange={(e) => setSupplierFacilityFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Suppliers ({distinctSupplierFacilities.length})</option>
              {distinctSupplierFacilities.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. REQUISITIONS LIST (COMPACT OPERATIONAL LAYOUT) ── */}
      {filteredRequisitions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2.5">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No medicine requisitions match the selected filters
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isFiltersActive
              ? 'Try adjusting your search query or reset dropdown filters to see active consignments.'
              : 'There are currently no active or historical medicine transfers matching this KPI category.'}
          </p>
          {isFiltersActive && (
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequisitions.map((req) => {
            const isCritical = req.urgency === 'CRITICAL';
            const isUrgent = req.urgency === 'URGENT';

            const cardBorder =
              isCritical
                ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                : isUrgent
                ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

            const priorityBadge =
              isCritical
                ? 'bg-rose-500 text-white'
                : isUrgent
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';

            // Lifecycle Steps Mapping
            const stages: Array<'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED'> = [
              'REQUESTED',
              'APPROVED',
              'DISPATCHED',
              'RECEIVED',
            ];
            const currentStageIndex =
              req.displayStatus === 'RECEIVED'
                ? 3
                : req.displayStatus === 'DISPATCHED'
                ? 2
                : req.displayStatus === 'APPROVED'
                ? 1
                : 0;

            const isRejected = req.displayStatus === 'REJECTED';

            return (
              <div
                key={req.id}
                className={`p-4 rounded-2xl border ${cardBorder} shadow-xs space-y-3 hover:border-blue-400 transition-all`}
              >
                {/* 1. Header Line: ID + Priority + Timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      #{req.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${priorityBadge}`}>
                      {req.urgency} PRIORITY
                    </span>
                    {req.supplyTier && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Tier: {req.supplyTier}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(req.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Core Requisition Flow: REQUESTING FACILITY -> SUPPLIER FACILITY -> MEDICINE -> QUANTITY */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Requisition Route (Requester -> Supplier) */}
                  <div className="md:col-span-6 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="p-1 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Requesting Facility
                        </span>
                        <strong className="text-slate-900 dark:text-white truncate block">
                          {req.requestingFacilityName}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2 text-slate-400 text-xs">
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      <div className="truncate">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                          Supplier Facility
                        </span>
                        {req.hasEligibleSupplier ? (
                          <strong className="text-emerald-700 dark:text-emerald-400 truncate block">
                            {req.supplierFacilityName}
                          </strong>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-bold truncate block">
                            No eligible supplier available (Network below buffer)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medicine + Quantity + Supplier Surplus */}
                  <div className="md:col-span-6 space-y-1 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-amber-500 shrink-0" />
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          {req.medicineName}
                        </h4>
                      </div>
                      <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                        {req.requestedQuantity} {req.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      {req.hasEligibleSupplier && req.supplierAvailableSurplus !== undefined ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Supplier Available Surplus: {req.supplierAvailableSurplus} {req.unit}</span>
                        </span>
                      ) : (
                        <span className="text-rose-500 font-semibold">
                          Buffer preserved &bull; Reallocation queue active
                        </span>
                      )}

                      {req.reason && (
                        <span className="truncate max-w-[180px] italic text-slate-400">
                          &ldquo;{req.reason}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Compact Lifecycle Stepper + Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* 4-Step Lifecycle Indicator */}
                  {isRejected ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>Requisition Rejected by Supplier Facility</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-wrap">
                      {stages.map((stageName, sIdx) => {
                        const isDone = sIdx <= currentStageIndex;
                        const isCurrent = sIdx === currentStageIndex;

                        return (
                          <React.Fragment key={stageName}>
                            <div
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase flex items-center gap-1 transition-all ${
                                isCurrent
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : isDone
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                              }`}
                            >
                              {isDone && <Check className="w-2.5 h-2.5" />}
                              <span>{stageName}</span>
                            </div>
                            {sIdx < stages.length - 1 && (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">&rarr;</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Operational Action CTA Buttons */}
                  {req.transferObj && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Step 1: Supplier Approve / Reject */}
                      {req.displayStatus === 'REQUESTED' && (
                        <>
                          <button
                            onClick={() => {
                              setRejectingTransfer(req.transferObj!);
                              setRejectReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-800"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleApprove(req.transferObj!.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve Request</span>
                          </button>
                        </>
                      )}

                      {/* Step 2: Supplier Dispatch */}
                      {req.displayStatus === 'APPROVED' && (
                        <button
                          onClick={() => handleDispatch(req.transferObj!.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch Consignment</span>
                        </button>
                      )}

                      {/* Step 3: Requester Confirm Receipt */}
                      {req.displayStatus === 'DISPATCHED' && (
                        <button
                          onClick={() => setConfirmReceiptTransfer(req.transferObj!)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Receipt &amp; Credit Stock</span>
                        </button>
                      )}

                      {/* Step 4: Received badge */}
                      {req.displayStatus === 'RECEIVED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Stock Credited</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. RECEIPT CONFIRMATION MODAL ── */}
      {confirmReceiptTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Confirm Stock Receipt
                  </h3>
                  <p className="text-[11px] text-slate-400">Requisition #{confirmReceiptTransfer.id}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmReceiptTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Medicine Item:</span>
                <strong className="text-slate-900 dark:text-white">{confirmReceiptTransfer.medicineName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity to Credit:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {confirmReceiptTransfer.requestedQuantity} Units
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Facility:</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{confirmReceiptTransfer.sourceFacilityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Receiving Destination:</span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">{confirmReceiptTransfer.destinationFacilityName}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Confirming receipt will automatically update the canonical inventory ledger: deducting from supplier and crediting to requesting facility.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setConfirmReceiptTransfer(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceive}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm &amp; Receive Stock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. REJECT REQUISITION MODAL ── */}
      {rejectingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Reject Requisition
                  </h3>
                  <p className="text-[11px] text-slate-400">Requisition #{rejectingTransfer.id}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingTransfer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Statutory buffer threshold constraint, upcoming local immunization drive..."
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setRejectingTransfer(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
