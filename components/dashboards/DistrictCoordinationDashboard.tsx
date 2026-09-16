'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { getMedicineStatus, getAvailableResource, getFacilityStatus, getDistanceKm } from '@/lib/resourceManagement';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import { Referral, Facility, Patient, StockTransfer } from '@/lib/types';
import { DistrictReferralReviewModal } from './DistrictReferralReviewModal';
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
  | 'tertiary'
  | 'capacity'
  | 'resources'
  | 'audit';

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

  // Active referral review modal
  const [activeReviewReferral, setActiveReviewReferral] = useState<Referral | null>(null);

  // Current district scope
  const currentDistrict = user?.district || 'Pune';

  // Filter facilities scoped strictly to current district
  const districtFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (f.district?.toLowerCase() === currentDistrict.toLowerCase()) return true;
      if (f.name.toLowerCase().includes(currentDistrict.toLowerCase())) return true;
      if (currentDistrict.toLowerCase() === 'pune') {
        const name = f.name.toLowerCase();
        return name.includes('aundh') || name.includes('velhe') || name.includes('nasrapur') || name.includes('bhor') || name.includes('pune');
      }
      return false;
    });
  }, [facilities, currentDistrict]);

  // District facility names for matching referrals
  const districtFacilityNames = useMemo(() => {
    const names = new Set<string>();
    districtFacilities.forEach((f) => {
      names.add(f.name.toLowerCase());
      if (f.id) names.add(f.id.toLowerCase());
    });
    if (currentDistrict.toLowerCase() === 'pune') {
      names.add('district hospital aundh');
      names.add('velhe phc');
      names.add('nasrapur phc');
      names.add('bhor rural hospital');
      names.add('pune district hospital');
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

  // Total "Needs Attention" count: pending triage + critical stocks + capacity strain
  const totalNeedsAttention =
    pendingTriageReferrals.length + criticalStockItems.filter(s => getMedicineStatus(s) === 'CRITICAL').length + (bedStats.icuPct >= 80 ? 1 : 0);

  // Filtered referrals list for Referrals view
  const displayedReferrals = useMemo(() => {
    return districtReferrals.filter((r) => {
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
  }, [districtReferrals, referralFilter, searchQuery]);

  // Dynamic Recent Activity Timeline from real existing data
  const recentActivities = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: string;
      type: 'REFERRAL' | 'ADMISSION' | 'TRANSFER' | 'COMPLETED';
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

    // Sort by timestamp desc and take top 5
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [districtReferrals, stockTransfers]);

  // Helper to open referral review modal
  const handleOpenReferral = (ref: Referral) => {
    setActiveReviewReferral(ref);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* ── 1. DISTRICT HEALTH CONTROL CENTER HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 border border-slate-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              District-wide healthcare coordination
            </p>
          </div>
        </div>

        {/* Single Primary Action */}
        <div className="flex items-center gap-2">
          {activeTab !== 'overview' ? (
            <button
              onClick={() => setActiveTab('overview')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border border-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>District Overview</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('tertiary')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30 hover:scale-[1.02] cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Review Referrals</span>
              {pendingTriageReferrals.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {pendingTriageReferrals.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── 2. 4 SIMPLE COORDINATION KPI CARDS ── */}
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

        {/* Card 3: Medicine Requests */}
        <div
          onClick={() => {}}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 transition-all shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Medicine Requests</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{activeDistrictTransfers.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Transfers</span>
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

      {/* ── 3. DISTRICT OVERVIEW (FIRST PAGE) ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SECTION 1: NEEDS YOUR ATTENTION */}
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

                {/* 2. Medicine Request Requiring Coordination */}
                {criticalStockItems.slice(0, 2).map((item) => (
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

                {/* 3. Facility Capacity Issue */}
                {bedStats.icuPct >= 80 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 border border-purple-200 dark:border-purple-900/50 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                          {currentDistrict} District Network
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white tracking-wider">
                          ICU STRESS
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          ICU Utilization at {bedStats.icuPct}%
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {bedStats.icuAvailable} of {bedStats.icuTotal} ICU beds remaining in district
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('capacity')}
                      className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span>View Capacity</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: FACILITY CAPACITY */}
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
                <span>View Capacity</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Concise Facility Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {districtFacilities.map((fac) => {
                const total = fac.totalBeds || 0;
                const occ = fac.occupiedBeds || 0;
                const available = total - occ;
                const occPct = total > 0 ? Math.round((occ / total) * 100) : 0;
                const icuFree = (fac.icuBedsTotal || 0) - (fac.icuBedsOccupied || 0);
                const ventFree = (fac.ventilatorsTotal || 0) - (fac.ventilatorsOccupied || 0);
                const oxygenFree = (fac.oxygenBedsTotal || 0) - (fac.oxygenBedsOccupied || 0);

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
                      {(fac.ventilatorsTotal > 0 || fac.oxygenBedsTotal > 0) && (
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Vent / O2:</span>
                          <span>{ventFree} vent &bull; {oxygenFree} O2</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: RECENT ACTIVITY */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Recent Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Timeline of referrals, admissions, and medicine movements across {currentDistrict}</p>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
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

      {/* ── 4. REFERRALS VIEW (TERTIARY TAB) ── */}
      {activeTab === 'tertiary' && (
        <div className="space-y-5">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  District Referrals
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Review, coordinate and track patient referrals across the district.
              </p>
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

          {/* Referrals List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {displayedReferrals.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Referrals in Selected Filter</h4>
                <p className="text-xs text-slate-400 mt-1">Try switching filters or resetting the search query.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px]">
                      <th className="p-3.5 pl-5">Patient & ABHA</th>
                      <th className="p-3.5">Referral Path</th>
                      <th className="p-3.5">Clinical Reason</th>
                      <th className="p-3.5">Urgency</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 pr-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedReferrals.map((ref) => {
                      const isCritical = ref.triagePriority === 'red';
                      return (
                        <tr key={ref.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {ref.patientName || 'Emergency Patient'}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono mt-0.5">
                              <span>ABHA: {ref.patientAbha || '91-XXXX-XXXX'}</span>
                              <span>&bull;</span>
                              <span>{ref.tokenCode || ref.id}</span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                              <span>{ref.referringFacility}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-bold text-blue-600 dark:text-blue-400">{ref.targetFacility}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {new Date(ref.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="p-3.5 max-w-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                              {ref.referralReason}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>Specialty: <strong className="text-slate-600 dark:text-slate-300">{ref.specialtyRequired || 'General / Emergency'}</strong></span>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isCritical
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {ref.triagePriority?.toUpperCase() || 'ROUTINE'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ref.status === 'ADMITTED'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                  : ref.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : ref.status === 'CANCELLED'
                                  ? 'bg-slate-500/10 text-slate-400 border border-slate-500/30 line-through'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {ref.status}
                            </span>
                          </td>

                          <td className="p-3.5 pr-5 text-right">
                            <button
                              onClick={() => handleOpenReferral(ref)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review Referral</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. HOSPITAL CAPACITY VIEW (CAPACITY TAB) ── */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
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
                    <th className="p-3.5">Type & Taluka</th>
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

      {/* ── 6. AUDIT TRAIL VIEW (AUDIT TAB) ── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">District Compliance & Audit Trail</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Immutable audit logs of triage, admission, and transfer actions in {currentDistrict}</p>
              </div>
              {onOpenAuditLogs && (
                <button
                  onClick={onOpenAuditLogs}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  Open Full Audit Modal
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Actor & Role</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Resource</th>
                    <th className="p-3.5 pr-5">Compliance Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {getAuditLogs().slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-5 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{log.userName}</div>
                        <span className="text-[10px] text-slate-400">{log.userRole} &bull; {log.userFacility}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">{log.resource}</td>
                      <td className="p-3.5 pr-5 text-slate-500 dark:text-slate-400 text-[11px]">{log.reason || 'Authorized by RBAC policy'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODALS & OVERLAYS ── */}
      {activeReviewReferral && (
        <DistrictReferralReviewModal
          referral={activeReviewReferral}
          onClose={() => setActiveReviewReferral(null)}
          updateReferralStatus={(id, status, updates) => {
            updateReferralStatus(id, status, updates);
            setActiveReviewReferral(null);
          }}
        />
      )}
    </div>
  );
}
