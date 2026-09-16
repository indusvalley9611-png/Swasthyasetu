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
} from '@/lib/types';
import { FinalPatientReportModal } from '../ehr/FinalPatientReportModal';
import {
  Pill,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  Eye,
  AlertTriangle,
  Flame,
  Activity,
  UserCheck,
  ChevronRight,
  Sparkles,
  QrCode,
  Layers,
  MapPin,
  Calendar,
  Send,
} from 'lucide-react';

export type TrackingTab = 'medicine' | 'referrals' | 'patients';

interface DistrictTrackingCenterProps {
  initialTab?: TrackingTab;
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
  const {
    stocks,
    medicineRequests,
    stockTransfers,
    referrals,
    patients,
    facilities,
  } = useSync();

  const [activeSubTab, setActiveSubTab] = useState<TrackingTab>(initialTab);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [medicineStatusFilter, setMedicineStatusFilter] = useState<string>('ALL');
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('ALL');
  const [patientStageFilter, setPatientStageFilter] = useState<string>('ALL');

  // Selected patient for Final Report Modal
  const [finalReportPatient, setFinalReportPatient] = useState<Patient | null>(null);

  // Synchronize when initialTab changes
  React.useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  // Available unique facilities for filters
  const districtFacilities = useMemo(() => {
    const list = facilities.map((f) => ({ id: f.id, name: f.name }));
    return list;
  }, [facilities]);

  // ─────────────────────────────────────────────────────────────
  // 1. MEDICINE TRACKING DATA & STATS
  // ─────────────────────────────────────────────────────────────
  // Flatten medicine items with parent request context
  const flatMedicineItems = useMemo(() => {
    const items: Array<{
      id: string;
      requestId: string;
      medicineName: string;
      requestedQuantity: number;
      unit: string;
      urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
      status: 'Requested' | 'Approved' | 'Dispatched' | 'Received';
      rawStatus: string;
      originFacility: string;
      originFacilityId: string;
      sourceFacility: string;
      timestamp: string;
      notes?: string;
      consignmentCode?: string;
      transportMode?: string;
    }> = [];

    // From stockTransfers
    (stockTransfers || []).forEach((st) => {
      let mappedStatus: 'Requested' | 'Approved' | 'Dispatched' | 'Received' = 'Requested';
      if (st.status === 'COMPLETED') mappedStatus = 'Received';
      else if (st.status === 'DISPATCHED') mappedStatus = 'Dispatched';
      else if (st.status === 'APPROVED' || st.status === 'PENDING_SOURCE_APPROVAL') mappedStatus = 'Approved';
      else mappedStatus = 'Requested';

      items.push({
        id: st.id,
        requestId: st.requestId || st.id,
        medicineName: st.medicineName,
        requestedQuantity: st.requestedQuantity,
        unit: 'Units',
        urgency: st.urgency || (st.isEmergency ? 'CRITICAL' : 'URGENT'),
        status: mappedStatus,
        rawStatus: st.status,
        originFacility: st.destinationFacilityName,
        originFacilityId: st.destinationFacilityId,
        sourceFacility: st.sourceFacilityName || 'District Medical Store Depot',
        timestamp: st.createdAt,
        notes: st.reason,
        consignmentCode: st.consignmentCode || (st.transportMode ? `MH-LOG-${st.id.slice(-4)}` : undefined),
        transportMode: st.transportMode?.replace(/_/g, ' '),
      });
    });

    // From medicineRequests items not already in stockTransfers
    (medicineRequests || []).forEach((req) => {
      (req.items || []).forEach((item: ReplenishmentRequestItem) => {
        // Only include if not duplicate of a transfer
        if (item.transferId && items.some((it) => it.id === item.transferId)) {
          return;
        }

        let mappedStatus: 'Requested' | 'Approved' | 'Dispatched' | 'Received' = 'Requested';
        if (item.status === 'COMPLETED') mappedStatus = 'Received';
        else if (item.status === 'DISPATCHED') mappedStatus = 'Dispatched';
        else if (item.status === 'APPROVED' || item.status === 'PENDING_SOURCE_APPROVAL') mappedStatus = 'Approved';
        else mappedStatus = 'Requested';

        items.push({
          id: item.id || `${req.id}-${item.medicineName}`,
          requestId: req.id,
          medicineName: item.medicineName,
          requestedQuantity: item.requestedQuantity,
          unit: item.unit || 'Units',
          urgency: item.urgency || req.urgency || 'URGENT',
          status: mappedStatus,
          rawStatus: item.status,
          originFacility: req.destinationFacilityName,
          originFacilityId: req.destinationFacilityId,
          sourceFacility: item.sourceFacilityName || 'District Allocation Queue',
          timestamp: req.createdAt,
          notes: item.reason || req.notes,
        });
      });
    });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stockTransfers, medicineRequests]);

  const filteredMedicines = useMemo(() => {
    return flatMedicineItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.medicineName.toLowerCase().includes(q);
        const matchesOrigin = item.originFacility.toLowerCase().includes(q);
        const matchesSource = item.sourceFacility.toLowerCase().includes(q);
        const matchesReq = item.requestId.toLowerCase().includes(q);
        if (!matchesName && !matchesOrigin && !matchesSource && !matchesReq) return false;
      }

      // Facility filter
      if (facilityFilter !== 'ALL') {
        const matches =
          item.originFacilityId === facilityFilter ||
          item.originFacility.toLowerCase().includes(facilityFilter.toLowerCase()) ||
          item.sourceFacility.toLowerCase().includes(facilityFilter.toLowerCase());
        if (!matches) return false;
      }

      // Status filter
      if (medicineStatusFilter !== 'ALL' && item.status !== medicineStatusFilter) {
        return false;
      }

      return true;
    });
  }, [flatMedicineItems, searchQuery, facilityFilter, medicineStatusFilter]);

  // ─────────────────────────────────────────────────────────────
  // 2. REFERRAL TRACKING DATA & STATS
  // ─────────────────────────────────────────────────────────────
  const flatReferrals = useMemo(() => {
    return (referrals || []).map((ref) => {
      let stage: 'Raised' | 'Under Review' | 'Accepted' | 'Admitted' | 'Discharged' = 'Raised';
      if (['COMPLETED', 'DISCHARGED'].includes(ref.status)) {
        stage = 'Discharged';
      } else if (ref.status === 'ADMITTED') {
        stage = 'Admitted';
      } else if (ref.status === 'ACCEPTED' || ref.status === 'TRANSFER_APPROVED') {
        stage = 'Accepted';
      } else if (ref.status === 'ESCALATED' || ref.status === 'ROUTED_TO_TERTIARY') {
        stage = 'Under Review';
      } else {
        stage = 'Raised';
      }

      return {
        ...ref,
        stage,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [referrals]);

  const filteredReferrals = useMemo(() => {
    return flatReferrals.filter((ref) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ref.patientName.toLowerCase().includes(q);
        const matchesToken = ref.tokenCode.toLowerCase().includes(q);
        const matchesAbha = (ref.patientAbha || '').toLowerCase().includes(q);
        const matchesReason = (ref.referralReason || '').toLowerCase().includes(q);
        const matchesOrig = ref.referringFacility.toLowerCase().includes(q);
        const matchesDest = ref.targetFacility.toLowerCase().includes(q);
        if (!matchesName && !matchesToken && !matchesAbha && !matchesReason && !matchesOrig && !matchesDest) {
          return false;
        }
      }

      if (facilityFilter !== 'ALL') {
        const matches =
          ref.referringFacilityId === facilityFilter ||
          ref.targetFacilityId === facilityFilter ||
          ref.referringFacility.toLowerCase().includes(facilityFilter.toLowerCase()) ||
          ref.targetFacility.toLowerCase().includes(facilityFilter.toLowerCase());
        if (!matches) return false;
      }

      if (referralStatusFilter !== 'ALL' && ref.stage !== referralStatusFilter) {
        return false;
      }

      return true;
    });
  }, [flatReferrals, searchQuery, facilityFilter, referralStatusFilter]);

  // ─────────────────────────────────────────────────────────────
  // 3. PATIENT TRACKING DATA & STATS
  // ─────────────────────────────────────────────────────────────
  const flatPatients = useMemo(() => {
    return (patients || []).map((pat) => {
      const activeRef = referrals.find(
        (r) => r.patientId === pat.id && !['COMPLETED', 'CANCELLED'].includes(r.status)
      ) || (pat.activeReferralId ? referrals.find((r) => r.id === pat.activeReferralId) : null);

      let stage: 'Registered' | 'Referred' | 'Admitted' | 'Discharged' = 'Registered';
      if (activeRef) {
        if (['COMPLETED', 'DISCHARGED'].includes(activeRef.status)) {
          stage = 'Discharged';
        } else if (activeRef.status === 'ADMITTED') {
          stage = 'Admitted';
        } else if (['PENDING', 'ACCEPTED', 'ESCALATED', 'TRANSFER_APPROVED', 'ROUTED_TO_TERTIARY'].includes(activeRef.status)) {
          stage = 'Referred';
        }
      } else if (pat.encounters && pat.encounters.length > 0) {
        const hasCompletedRef = referrals.some((r) => r.patientId === pat.id && ['COMPLETED', 'DISCHARGED'].includes(r.status));
        if (hasCompletedRef) stage = 'Discharged';
      }

      const currentLocation = pat.assignedFacilityName || activeRef?.targetFacility || pat.registrationFacilityName || 'PHC Velhe';
      const assignedDoctor = pat.assignedDoctorName || activeRef?.referringDoctorName || 'Dr. Sneha Joshi (MO)';

      return {
        ...pat,
        stage,
        currentLocation,
        assignedDoctor,
        activeRef,
      };
    });
  }, [patients, referrals]);

  const filteredPatients = useMemo(() => {
    return flatPatients.filter((pat) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = pat.fullName.toLowerCase().includes(q);
        const matchesAbha = (pat.abhaId || '').toLowerCase().includes(q);
        const matchesPhone = pat.phone.includes(q);
        const matchesVillage = (pat.village || '').toLowerCase().includes(q);
        const matchesDoctor = pat.assignedDoctor.toLowerCase().includes(q);
        if (!matchesName && !matchesAbha && !matchesPhone && !matchesVillage && !matchesDoctor) {
          return false;
        }
      }

      if (facilityFilter !== 'ALL') {
        const matches =
          pat.assignedFacilityId === facilityFilter ||
          pat.registrationFacilityId === facilityFilter ||
          pat.currentLocation.toLowerCase().includes(facilityFilter.toLowerCase());
        if (!matches) return false;
      }

      if (patientStageFilter !== 'ALL' && pat.stage !== patientStageFilter) {
        return false;
      }

      return true;
    });
  }, [flatPatients, searchQuery, facilityFilter, patientStageFilter]);

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & TAB SELECTOR ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-slate-800 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              DISTRICT INTEGRATED TRACKING HUB
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Live Lifecycle Tracking
          </h2>
          <p className="text-xs text-slate-300">
            Real-time status progression for MahaAushadhi medicine consignments, secondary referral triage, and citizen care journeys.
          </p>
        </div>

        {/* 3 Main Sub-tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner self-start md:self-auto">
          <button
            onClick={() => {
              setActiveSubTab('medicine');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'medicine'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 scale-102'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Track Medicine</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {flatMedicineItems.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('referrals');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'referrals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 scale-102'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Track Referrals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {flatReferrals.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('patients');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'patients'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 scale-102'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Track Patients</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
              {flatPatients.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'medicine'
                ? 'Search medicine name, origin PHC, or consignment ID...'
                : activeSubTab === 'referrals'
                ? 'Search patient name, token code, or hospital...'
                : 'Search patient name, ABHA number, phone, or village...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Facility Filter */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">All Facilities</option>
              {districtFacilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-tab specific status filter */}
          {activeSubTab === 'medicine' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={medicineStatusFilter}
                onChange={(e) => setMedicineStatusFilter(e.target.value)}
                className="py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Medicine Stages</option>
                <option value="Requested">1. Requested</option>
                <option value="Approved">2. Approved</option>
                <option value="Dispatched">3. Dispatched</option>
                <option value="Received">4. Received</option>
              </select>
            </div>
          )}

          {activeSubTab === 'referrals' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={referralStatusFilter}
                onChange={(e) => setReferralStatusFilter(e.target.value)}
                className="py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Referral Stages</option>
                <option value="Raised">1. Raised</option>
                <option value="Under Review">2. Under Review</option>
                <option value="Accepted">3. Accepted</option>
                <option value="Admitted">4. Admitted</option>
                <option value="Discharged">5. Discharged</option>
              </select>
            </div>
          )}

          {activeSubTab === 'patients' && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={patientStageFilter}
                onChange={(e) => setPatientStageFilter(e.target.value)}
                className="py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Patient Stages</option>
                <option value="Registered">Registered (Primary Care)</option>
                <option value="Referred">Referred (In Transit)</option>
                <option value="Admitted">Admitted (Inpatient)</option>
                <option value="Discharged">Discharged (Completed)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. VIEW: TRACK MEDICINE                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'medicine' && (
        <div className="space-y-4">
          {/* Summary Progress Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Requested', count: flatMedicineItems.filter(m => m.status === 'Requested').length, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20', step: 'Step 1' },
              { label: 'Approved', count: flatMedicineItems.filter(m => m.status === 'Approved').length, color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20', step: 'Step 2' },
              { label: 'Dispatched', count: flatMedicineItems.filter(m => m.status === 'Dispatched').length, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20', step: 'Step 3' },
              { label: 'Received', count: flatMedicineItems.filter(m => m.status === 'Received').length, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', step: 'Step 4' },
            ].map((st, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${st.bg} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">{st.step}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{st.label}</span>
                </div>
                <div className={`text-2xl font-black ${st.color}`}>{st.count}</div>
                <span className="text-[10px] text-slate-400 block">Consignments in stage</span>
              </div>
            ))}
          </div>

          {/* Medicine List */}
          {filteredMedicines.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Pill className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No medicine consignments match criteria</h4>
              <p className="text-xs text-slate-400">Try adjusting your search query or facility filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMedicines.map((item) => {
                const stages: Array<'Requested' | 'Approved' | 'Dispatched' | 'Received'> = [
                  'Requested',
                  'Approved',
                  'Dispatched',
                  'Received',
                ];
                const currentIndex = stages.indexOf(item.status);

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-400 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {item.medicineName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs font-mono">
                            {item.requestedQuantity} {item.unit}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.urgency === 'CRITICAL'
                                ? 'bg-rose-500 text-white animate-pulse'
                                : item.urgency === 'URGENT'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.urgency}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span>
                            <strong>Origin:</strong> {item.originFacility}
                          </span>
                          <span>&bull;</span>
                          <span>
                            <strong>Source:</strong> {item.sourceFacility}
                          </span>
                          <span>&bull;</span>
                          <span className="font-mono">
                            ID: #{item.requestId}
                          </span>
                        </div>
                      </div>

                      {/* Right side consignment code & transport */}
                      <div className="text-left lg:text-right space-y-0.5 text-xs shrink-0">
                        {item.transportMode && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
                            <Truck className="w-3 h-3" />
                            {item.transportMode}
                          </span>
                        )}
                        <span className="text-slate-400 font-mono text-[11px] block">
                          Initiated: {new Date(item.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* 4-Stage Stepper Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-4 gap-2">
                        {stages.map((stName, idx) => {
                          const isDone = idx <= currentIndex;
                          const isCurrent = idx === currentIndex;

                          return (
                            <div key={stName} className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isDone
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  } ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                                >
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span
                                  className={`text-xs font-bold hidden sm:inline ${
                                    isDone
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {stName}
                                </span>
                              </div>
                              <div
                                className={`h-1.5 rounded-full ${
                                  isDone
                                    ? 'bg-blue-600'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. VIEW: TRACK REFERRALS                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'referrals' && (
        <div className="space-y-4">
          {/* Summary Progress Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { label: 'Raised', count: flatReferrals.filter(r => r.stage === 'Raised').length, color: 'text-blue-600', bg: 'bg-blue-500/10' },
              { label: 'Under Review', count: flatReferrals.filter(r => r.stage === 'Under Review').length, color: 'text-amber-600', bg: 'bg-amber-500/10' },
              { label: 'Accepted', count: flatReferrals.filter(r => r.stage === 'Accepted').length, color: 'text-purple-600', bg: 'bg-purple-500/10' },
              { label: 'Admitted', count: flatReferrals.filter(r => r.stage === 'Admitted').length, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
              { label: 'Discharged', count: flatReferrals.filter(r => r.stage === 'Discharged').length, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            ].map((st, i) => (
              <div key={i} className={`p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 ${st.bg} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">Step {i + 1}</span>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{st.label}</span>
                </div>
                <div className={`text-2xl font-black ${st.color}`}>{st.count}</div>
              </div>
            ))}
          </div>

          {/* Referrals List */}
          {filteredReferrals.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No referrals found matching criteria</h4>
              <p className="text-xs text-slate-400">Try changing search query or facility filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReferrals.map((ref) => {
                const stages: Array<'Raised' | 'Under Review' | 'Accepted' | 'Admitted' | 'Discharged'> = [
                  'Raised',
                  'Under Review',
                  'Accepted',
                  'Admitted',
                  'Discharged',
                ];
                const currentIndex = stages.indexOf(ref.stage);

                return (
                  <div
                    key={ref.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-400 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-black text-slate-900 dark:text-white">
                            {ref.patientName}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            ({ref.patientAge} Yrs, {ref.patientGender})
                          </span>
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                            {ref.tokenCode}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              ref.triagePriority === 'red'
                                ? 'bg-rose-500 text-white'
                                : ref.triagePriority === 'yellow'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-emerald-500 text-white'
                            }`}
                          >
                            Priority {ref.triagePriority} &bull; Score: {ref.triageScore}/100
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                          <span>
                            <strong>From:</strong> {ref.referringFacility} (Dr. {ref.referringDoctorName})
                          </span>
                          <span>&rarr;</span>
                          <span>
                            <strong>To:</strong> {ref.targetFacility} ({ref.specialtyRequired})
                          </span>
                        </div>

                        {ref.referralReason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                            &ldquo;{ref.referralReason}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Right actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {onOpenReferralToken && (
                          <button
                            onClick={() => onOpenReferralToken(ref)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Token</span>
                          </button>
                        )}
                        {onReviewReferral && (
                          <button
                            onClick={() => onReviewReferral(ref)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 5-Stage Stepper Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-5 gap-1.5">
                        {stages.map((stName, idx) => {
                          const isDone = idx <= currentIndex;
                          const isCurrent = idx === currentIndex;

                          return (
                            <div key={stName} className="space-y-1">
                              <div className="flex items-center gap-1">
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                    isDone
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  } ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                                >
                                  {isDone ? '✓' : idx + 1}
                                </div>
                                <span
                                  className={`text-[11px] font-bold truncate hidden sm:inline ${
                                    isDone
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {stName}
                                </span>
                              </div>
                              <div
                                className={`h-1.5 rounded-full ${
                                  isDone
                                    ? 'bg-blue-600'
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VIEW: TRACK PATIENTS & JOURNEY                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'patients' && (
        <div className="space-y-4">
          {/* Summary Progress Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Registered', count: flatPatients.filter(p => p.stage === 'Registered').length, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20', desc: 'Active primary care' },
              { label: 'Referred', count: flatPatients.filter(p => p.stage === 'Referred').length, color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'In triage / transit' },
              { label: 'Admitted', count: flatPatients.filter(p => p.stage === 'Admitted').length, color: 'text-purple-600', bg: 'bg-purple-500/10 border-purple-500/20', desc: 'District Hospital bed' },
              { label: 'Discharged', count: flatPatients.filter(p => p.stage === 'Discharged').length, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Episode completed' },
            ].map((st, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${st.bg} space-y-1`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Stage</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{st.label}</span>
                </div>
                <div className={`text-2xl font-black ${st.color}`}>{st.count}</div>
                <span className="text-[10px] text-slate-400 block">{st.desc}</span>
              </div>
            ))}
          </div>

          {/* Patients Directory */}
          {filteredPatients.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Activity className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No patients match your search</h4>
              <p className="text-xs text-slate-400">Try changing the search query or stage filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatients.map((pat) => {
                return (
                  <div
                    key={pat.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-slate-900 dark:text-white">
                              {pat.fullName}
                            </h4>
                            <span className="text-xs text-slate-400 font-semibold">
                              {pat.age}Y &bull; {pat.gender}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            ABHA: {pat.abhaId || 'N/A'}
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            pat.stage === 'Discharged'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                              : pat.stage === 'Admitted'
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/30'
                              : pat.stage === 'Referred'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/30'
                          }`}
                        >
                          {pat.stage}
                        </span>
                      </div>

                      {/* Location & Doctor info */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Current Facility:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{pat.currentLocation}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Assigned Doctor:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{pat.assignedDoctor}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Taluka / Village:</span>
                          <span className="text-slate-600 dark:text-slate-400">{pat.village || 'Velhe'}, {pat.taluka || 'Velhe'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Clinical Encounters:</span>
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{pat.encounters?.length || 0} visits</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {onOpenPatientTimeline && (
                        <button
                          onClick={() => onOpenPatientTimeline(pat)}
                          className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Journey</span>
                        </button>
                      )}

                      <button
                        onClick={() => setFinalReportPatient(pat)}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/20"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Final Report</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FINAL CLINICAL DISCHARGE / SUMMARY REPORT MODAL ── */}
      {finalReportPatient && (
        <FinalPatientReportModal
          patient={finalReportPatient}
          onClose={() => setFinalReportPatient(null)}
          onOpenReferralToken={onOpenReferralToken}
        />
      )}
    </div>
  );
}
