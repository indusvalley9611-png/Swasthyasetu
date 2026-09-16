'use client';

import React, { useState, useMemo } from 'react';
import { Referral, EmergencyWalkIn, Patient, TriagePriority } from '@/lib/types';
import { calculateReferralRiskScore } from '@/lib/dhoIntelligenceEngine';
import {
  Users,
  AlertTriangle,
  Clock,
  HeartPulse,
  Bed,
  Search,
  CheckCircle2,
  ArrowRight,
  Flame,
  Activity,
  Plus,
  Stethoscope,
  ShieldCheck,
  Building2,
  MapPin,
  Eye,
  QrCode,
  Siren,
  PhoneCall,
} from 'lucide-react';
import { DistrictQRScannerModal } from './DistrictQRScannerModal';

interface CasualtyIntakeQueueProps {
  hospitalName: string;
  incomingReferrals: Referral[];
  walkIns: EmergencyWalkIn[];
  patients: Patient[];
  onReviewReferral: (referral: Referral) => void;
  onAdmitWalkIn: (walkIn: EmergencyWalkIn) => void;
  onRegisterWalkIn?: () => void;
}

export function CasualtyIntakeQueue({
  hospitalName,
  incomingReferrals,
  walkIns,
  patients,
  onReviewReferral,
  onAdmitWalkIn,
  onRegisterWalkIn,
}: CasualtyIntakeQueueProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'URGENT' | 'ROUTINE' | 'WALK_INS' | 'REFERRALS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Unified intake queue combining walk-ins and incoming referrals
  const intakeItems = useMemo(() => {
    const items: Array<{
      id: string;
      source: 'WALK_IN' | 'REFERRAL';
      tokenCode: string;
      patientName: string;
      age: number;
      gender: string;
      abhaId?: string;
      chiefComplaint: string;
      triagePriority: TriagePriority;
      arrivalTime: string;
      referringFacility?: string;
      specialtyRequired?: string;
      riskScore: number;
      riskLevel: string;
      rawReferral?: Referral;
      rawWalkIn?: EmergencyWalkIn;
    }> = [];

    // 1. Process Incoming Referrals
    incomingReferrals.forEach((ref) => {
      const patient = patients.find((p) => p.id === ref.patientId);
      const risk = calculateReferralRiskScore(ref, patient || null);

      items.push({
        id: `ref-${ref.id}`,
        source: 'REFERRAL',
        tokenCode: ref.tokenCode || ref.id,
        patientName: ref.patientName || patient?.fullName || 'Emergency Patient',
        age: ref.patientAge || patient?.age || 35,
        gender: ref.patientGender || patient?.gender || 'Unknown',
        abhaId: ref.patientAbha || patient?.abhaId,
        chiefComplaint: ref.referralReason,
        triagePriority: ref.triagePriority,
        arrivalTime: ref.createdAt,
        referringFacility: ref.referringFacility,
        specialtyRequired: ref.specialtyRequired,
        riskScore: risk.compositeScore,
        riskLevel: risk.riskLevel,
        rawReferral: ref,
      });
    });

    // 2. Process Emergency Walk-ins
    walkIns.forEach((w) => {
      let riskScore = 30;
      let riskLevel = 'LOW';
      if (w.triagePriority === 'red') {
        riskScore = 85;
        riskLevel = 'EXTREME';
      } else if (w.triagePriority === 'yellow') {
        riskScore = 55;
        riskLevel = 'HIGH';
      }

      items.push({
        id: `walkin-${w.id}`,
        source: 'WALK_IN',
        tokenCode: w.tokenCode,
        patientName: w.fullName,
        age: w.age,
        gender: w.gender,
        abhaId: w.abhaId,
        chiefComplaint: w.chiefComplaint,
        triagePriority: w.triagePriority,
        arrivalTime: w.arrivalTime,
        riskScore,
        riskLevel,
        rawWalkIn: w,
      });
    });

    // Sort strictly: Red (Critical) -> Yellow (Urgent) -> Green (Routine), then riskScore descending
    const priorityWeight: Record<string, number> = { red: 3, yellow: 2, green: 1 };
    return items.sort((a, b) => {
      const weightA = priorityWeight[a.triagePriority] || 1;
      const weightB = priorityWeight[b.triagePriority] || 1;
      if (weightB !== weightA) return weightB - weightA;
      return b.riskScore - a.riskScore;
    });
  }, [incomingReferrals, walkIns, patients]);

  // Filtered queue
  const displayedItems = useMemo(() => {
    return intakeItems.filter((item) => {
      if (filterType === 'CRITICAL' && item.triagePriority !== 'red') return false;
      if (filterType === 'URGENT' && item.triagePriority !== 'yellow') return false;
      if (filterType === 'ROUTINE' && item.triagePriority === 'red') return false;
      if (filterType === 'WALK_INS' && item.source !== 'WALK_IN') return false;
      if (filterType === 'REFERRALS' && item.source !== 'REFERRAL') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.patientName.toLowerCase().includes(q) ||
          item.tokenCode.toLowerCase().includes(q) ||
          (item.abhaId && item.abhaId.toLowerCase().includes(q)) ||
          item.chiefComplaint.toLowerCase().includes(q) ||
          (item.referringFacility && item.referringFacility.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [intakeItems, filterType, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Intake ({intakeItems.length})
          </button>
          <button
            onClick={() => setFilterType('CRITICAL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              filterType === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <Siren className="w-3.5 h-3.5" />
            <span>Red Critical ({intakeItems.filter(i => i.triagePriority === 'red').length})</span>
          </button>
          <button
            onClick={() => setFilterType('URGENT')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'URGENT'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            Yellow Urgent ({intakeItems.filter(i => i.triagePriority === 'yellow').length})
          </button>
          <button
            onClick={() => setFilterType('WALK_INS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'WALK_INS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
            }`}
          >
            Walk-Ins ({walkIns.length})
          </button>
          <button
            onClick={() => setFilterType('REFERRALS')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'REFERRALS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            PHC Referrals ({incomingReferrals.length})
          </button>
        </div>

        <div className="relative w-full md:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, token, ABHA..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Queue List Cards */}
      <div className="space-y-2.5">
        {displayedItems.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Intake Queue Clear</h4>
            <p className="text-xs text-slate-400 mt-0.5">No pending arrivals matching current criteria.</p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isRed = item.triagePriority === 'red';

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border ${
                  isRed
                    ? 'border-rose-300 dark:border-rose-900/60 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800'
                } hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3`}
              >
                {/* Left: Triage Level -> Patient -> Reason -> Referring Facility -> Required Specialty */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isRed
                          ? 'bg-rose-600 text-white animate-pulse'
                          : item.triagePriority === 'yellow'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-emerald-600 text-white font-bold'
                      }`}
                    >
                      {item.triagePriority.toUpperCase()} TRIAGE
                    </span>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        item.source === 'WALK_IN'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {item.source === 'WALK_IN' ? 'Direct ER Walk-In' : 'PHC Inbound'}
                    </span>

                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.patientName} ({item.age}y &bull; {item.gender})
                    </span>

                    <span className="text-[10px] font-mono text-slate-400">
                      #{item.tokenCode}
                    </span>

                    {item.abhaId && (
                      <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                        ABHA: {item.abhaId}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                    <strong>Chief Complaint:</strong> {item.chiefComplaint}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {item.referringFacility && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        From: <strong className="text-slate-700 dark:text-slate-300">{item.referringFacility}</strong>
                      </span>
                    )}
                    {item.specialtyRequired && (
                      <span>
                        Specialty: <strong className="text-blue-600 dark:text-blue-400">{item.specialtyRequired}</strong>
                      </span>
                    )}
                    <span className="font-mono">
                      Arrival: {new Date(item.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Center: Clinical Risk */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center min-w-[110px] shrink-0">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                    CLINICAL RISK
                  </span>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 leading-none">
                    {item.riskScore} <span className="text-[10px] text-slate-400">/ 100</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 block mt-0.5">
                    {item.riskLevel} PRIORITY
                  </span>
                </div>

                {/* Right: Primary Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {item.source === 'REFERRAL' && item.rawReferral ? (
                    <button
                      onClick={() => onReviewReferral(item.rawReferral!)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review &amp; Accept</span>
                    </button>
                  ) : item.rawWalkIn ? (
                    <button
                      onClick={() => onAdmitWalkIn(item.rawWalkIn!)}
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bed className="w-3.5 h-3.5" />
                      <span>Admit to Bed</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QR Scanner & Verification Modal */}
      {isScannerOpen && (
        <DistrictQRScannerModal
          hospitalName={hospitalName}
          referrals={incomingReferrals}
          patients={patients}
          onClose={() => setIsScannerOpen(false)}
          onSelectReferral={(ref) => {
            setIsScannerOpen(false);
            onReviewReferral(ref);
          }}
        />
      )}
    </div>
  );
}
