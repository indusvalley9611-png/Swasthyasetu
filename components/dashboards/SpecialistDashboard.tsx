'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import {
  Patient,
  Referral,
  SpecialistOnDuty,
  HospitalBedSlot,
  EmergencyWalkIn,
  FacilityDischargeRecord,
  HospitalBloodStock,
  TamperEvidentAuditBlock,
  HospitalDepartment,
} from '@/lib/types';
import {
  INITIAL_SPECIALISTS_ON_DUTY,
  INITIAL_HOSPITAL_BED_SLOTS,
  INITIAL_EMERGENCY_WALKINS,
  INITIAL_HOSPITAL_BLOOD_STOCK,
  INITIAL_FACILITY_DISCHARGE_RECORDS,
} from '@/lib/specialistData';
import { INITIAL_TAMPER_AUDIT_BLOCKS } from '@/lib/mockData';
import { createTamperEvidentBlock, GENESIS_HASH } from '@/lib/dhoIntelligenceEngine';
import { CasualtyIntakeQueue } from '../specialist/CasualtyIntakeQueue';
import { SpecialistReferralReviewModal } from '../specialist/SpecialistReferralReviewModal';
import { DepartmentBedMatrixView } from '../specialist/DepartmentBedMatrixView';
import { SpecialistRosterView } from '../specialist/SpecialistRosterView';
import { PatientAdmissionModal } from '../specialist/PatientAdmissionModal';
import { PatientDischargeModal } from '../specialist/PatientDischargeModal';
import { FacilityTamperAuditView } from '../specialist/FacilityTamperAuditView';
import { FacilityBloodDrugWidget } from '../specialist/FacilityBloodDrugWidget';
import { DistrictQRScannerModal } from '../specialist/DistrictQRScannerModal';
import {
  Users,
  Stethoscope,
  Search,
  Clock,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Flame,
  UserPlus,
  Bed,
  FileCheck,
  Droplet,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Radio,
  FileText,
  QrCode,
  ArrowRight,
  PhoneCall,
  BedDouble,
  Siren,
  Hospital,
} from 'lucide-react';

export interface SpecialistDashboardProps {
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenReferralToken: (referral: Referral) => void;
  onOpenBedMatrix: () => void;
  onOpenNewPatient?: () => void;
  activeTab?: SpecialistTab;
  onTabChange?: (tab: SpecialistTab) => void;
}

export type SpecialistTab =
  | 'intake'
  | 'referrals'
  | 'incoming'
  | 'beds'
  | 'roster'
  | 'admitted'
  | 'discharges'
  | 'audit'
  | 'inventory_sla';

export function SpecialistDashboard({
  onOpenPatientTimeline,
  onOpenReferralToken,
  onOpenBedMatrix,
  onOpenNewPatient,
  activeTab: externalTab,
  onTabChange,
}: SpecialistDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals, patients, stocks, updateReferralStatus } = useSync();

  // Active navigation tab
  const [internalTab, setInternalTab] = useState<SpecialistTab>(externalTab || 'intake');
  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (tab: SpecialistTab) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Hospital Identity Scoping (Strict Single-Facility Enforcement)
  const currentHospitalName = user?.facilityName || 'District Hospital Aundh, Pune';
  const currentHospitalId = user?.facilityId || 'fac-dh-pune';

  // State Management for Hospital-Level Resources
  const [bedSlots, setBedSlots] = useState<HospitalBedSlot[]>(INITIAL_HOSPITAL_BED_SLOTS);
  const [specialistsOnDuty, setSpecialistsOnDuty] = useState<SpecialistOnDuty[]>(INITIAL_SPECIALISTS_ON_DUTY);
  const [walkIns, setWalkIns] = useState<EmergencyWalkIn[]>(INITIAL_EMERGENCY_WALKINS);
  const [dischargeRecords, setDischargeRecords] = useState<FacilityDischargeRecord[]>(INITIAL_FACILITY_DISCHARGE_RECORDS);
  const [bloodStock, setBloodStock] = useState<HospitalBloodStock[]>(INITIAL_HOSPITAL_BLOOD_STOCK);
  const [tamperBlocks, setTamperBlocks] = useState<TamperEvidentAuditBlock[]>(() => {
    return INITIAL_TAMPER_AUDIT_BLOCKS.filter(
      (b) => b.actorRole === 'specialist' || b.resource.toLowerCase().includes('district') || b.resource.toLowerCase().includes('bed') || b.resource.toLowerCase().includes('aundh')
    );
  });

  // Active Modals
  const [reviewReferral, setReviewReferral] = useState<Referral | null>(null);
  const [admissionTarget, setAdmissionTarget] = useState<{
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientAbha?: string;
    triagePriority: 'red' | 'yellow' | 'green';
    chiefComplaint: string;
    specialtyRequired?: string;
    referralId?: string;
    walkInId?: string;
  } | null>(null);
  const [dischargeTargetBed, setDischargeTargetBed] = useState<HospitalBedSlot | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // STRICT SINGLE-FACILITY DATA SCOPING (No district-wide leaks)
  const myHospitalReferrals = useMemo(() => {
    return (referrals || []).filter((r) => {
      if (!r.targetFacility) return false;
      const target = r.targetFacility.toLowerCase();
      const fac = currentHospitalName.toLowerCase();
      return (
        target.includes(fac) ||
        fac.includes(target) ||
        (target.includes('aundh') && fac.includes('aundh')) ||
        (target.includes('pune') && fac.includes('pune') && target.includes('district') && fac.includes('district')) ||
        (target.includes('nashik') && fac.includes('nashik') && target.includes('civil') && fac.includes('civil'))
      );
    });
  }, [referrals, currentHospitalName]);

  // Prioritize Critical/Emergency referrals first, then Urgent, then Routine
  const pendingIncomingReferrals = useMemo(() => {
    const list = myHospitalReferrals.filter((r) => r.status === 'PENDING');
    const priorityWeight: Record<string, number> = { red: 3, yellow: 2, green: 1 };
    return list.sort((a, b) => {
      const weightA = priorityWeight[a.triagePriority] || 1;
      const weightB = priorityWeight[b.triagePriority] || 1;
      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [myHospitalReferrals]);

  // Critical Action items requiring immediate specialist review
  const criticalActionItems = useMemo(() => {
    const criticalRefs = pendingIncomingReferrals.filter((r) => r.triagePriority === 'red');
    const criticalWalkIns = walkIns.filter((w) => w.triagePriority === 'red' && w.status !== 'ADMITTED');
    return {
      referrals: criticalRefs,
      walkIns: criticalWalkIns,
      totalCount: criticalRefs.length + criticalWalkIns.length,
    };
  }, [pendingIncomingReferrals, walkIns]);

  const admittedReferrals = useMemo(() => {
    return myHospitalReferrals.filter((r) => r.status === 'ADMITTED');
  }, [myHospitalReferrals]);

  const myHospitalDrugStocks = useMemo(() => {
    return (stocks || []).filter((s) => {
      const fac = (s.facilityName || '').toLowerCase();
      return fac.includes('aundh') || fac.includes('district hospital') || fac.includes(currentHospitalName.toLowerCase());
    });
  }, [stocks, currentHospitalName]);

  // Cryptographic SHA-256 Audit Logger for this facility
  const recordHospitalTamperAudit = async (
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
      actorId: user?.id || 'user-spec-01',
      actorName: user?.name || 'Dr. Ananya Kulkarni',
      actorRole: 'specialist',
      action,
      resource,
      reason,
      beforeState: beforeState || {},
      afterState: afterState || {},
    });

    setTamperBlocks((prev) => [...prev, newBlock]);
  };

  // HANDLER: Accept Incoming Referral (Proceeds to Bed Assignment)
  const handleAcceptReferral = (ref: Referral, overrideReason?: string) => {
    setReviewReferral(null);
    // Open Bed Assignment Modal
    setAdmissionTarget({
      patientName: ref.patientName,
      patientAge: ref.patientAge,
      patientGender: ref.patientGender,
      patientAbha: ref.patientAbha,
      triagePriority: ref.triagePriority,
      chiefComplaint: ref.referralReason,
      specialtyRequired: ref.specialtyRequired,
      referralId: ref.id,
    });

    if (overrideReason) {
      recordHospitalTamperAudit(
        'SPECIALIST_OVERRIDE_ACCEPT',
        `Referral #${ref.id} (${ref.patientName})`,
        `Specialist Absent Override: ${overrideReason}`,
        { status: 'PENDING', specialtyRequired: ref.specialtyRequired },
        { status: 'ACCEPTED_UNDER_OVERRIDE', overrideReason }
      );
    }
  };

  // HANDLER: Reject Incoming Referral
  const handleRejectReferral = (ref: Referral, reason: string) => {
    updateReferralStatus(ref.id, 'CANCELLED', {
      cancellationReason: reason,
      cancelledBy: user?.name || 'Casualty Specialist',
      cancelledByRole: 'specialist',
    });

    recordHospitalTamperAudit(
      'REJECT_INCOMING_REFERRAL',
      `Referral #${ref.id} (${ref.patientName})`,
      reason,
      { status: ref.status },
      { status: 'CANCELLED', rejectionReason: reason, rejectedBy: user?.name }
    );

    setReviewReferral(null);
  };

  // HANDLER: Confirm Admission & Bed Assignment
  const handleConfirmAdmission = ({
    bedId,
    department,
    attendingDoctor,
    admissionNotes,
  }: {
    bedId: string;
    department: HospitalDepartment;
    attendingDoctor: string;
    admissionNotes: string;
  }) => {
    if (!admissionTarget) return;

    // 1. Update Bed Slot in Real Time
    setBedSlots((prev) =>
      prev.map((b) =>
        b.bedId === bedId
          ? {
              ...b,
              status: 'OCCUPIED',
              patientName: admissionTarget.patientName,
              patientAbha: admissionTarget.patientAbha,
              triagePriority: admissionTarget.triagePriority,
              assignedAt: new Date().toISOString(),
              attendingSpecialist: attendingDoctor,
              specialtyRequired: admissionTarget.specialtyRequired,
              referralId: admissionTarget.referralId,
            }
          : b
      )
    );

    // 2. If Referral, update status to ADMITTED
    if (admissionTarget.referralId) {
      updateReferralStatus(admissionTarget.referralId, 'ADMITTED', {
        assignedBed: bedId,
        assignedBedType: department === 'ICU' ? 'icuBedsOccupied' : 'occupiedBeds',
      });
    }

    // 3. If Walk-In, update walk-in status
    if (admissionTarget.walkInId) {
      setWalkIns((prev) =>
        prev.map((w) =>
          w.id === admissionTarget.walkInId
            ? { ...w, status: 'ADMITTED', assignedDoctorName: attendingDoctor, assignedBedId: bedId }
            : w
        )
      );
    }

    // 4. Log to Cryptographic SHA-256 Audit Chain
    recordHospitalTamperAudit(
      'INPATIENT_BED_ASSIGNMENT',
      `Bed #${bedId} (${department}) -> Patient ${admissionTarget.patientName}`,
      admissionNotes,
      { bedStatus: 'AVAILABLE' },
      {
        bedStatus: 'OCCUPIED',
        assignedPatient: admissionTarget.patientName,
        assignedBedId: bedId,
        department,
        attendingDoctor,
        admittedAt: new Date().toISOString(),
      }
    );

    setAdmissionTarget(null);
  };

  // HANDLER: Confirm Discharge with Refer-Back-to-PHC
  const handleConfirmDischarge = (
    dischargeData: Omit<FacilityDischargeRecord, 'id' | 'dischargedAt'>
  ) => {
    if (!dischargeTargetBed) return;

    const newRecord: FacilityDischargeRecord = {
      id: `dis-${Date.now()}`,
      ...dischargeData,
      dischargedAt: new Date().toISOString(),
    };

    // 1. Append Discharge Record (Care Continuity)
    setDischargeRecords((prev) => [newRecord, ...prev]);

    // 2. Free up the Bed Slot in Real Time
    setBedSlots((prev) =>
      prev.map((b) =>
        b.bedId === dischargeTargetBed.bedId
          ? {
              ...b,
              status: 'AVAILABLE',
              patientId: undefined,
              patientName: undefined,
              patientAbha: undefined,
              triagePriority: undefined,
              assignedAt: undefined,
              attendingSpecialist: undefined,
              specialtyRequired: undefined,
              referralId: undefined,
            }
          : b
      )
    );

    // 3. Update Referral Status to COMPLETED / COUNTER_REFERRED
    if (dischargeTargetBed.referralId) {
      updateReferralStatus(dischargeTargetBed.referralId, 'COMPLETED', {
        counterReferredTo: dischargeData.referBackFacilityName,
      });
    }

    // 4. Log to Cryptographic SHA-256 Audit Chain
    recordHospitalTamperAudit(
      'PATIENT_DISCHARGE_REFER_BACK',
      `Patient ${dischargeTargetBed.patientName} from Bed ${dischargeTargetBed.bedNumber}`,
      `Discharged: ${dischargeData.dischargeDiagnosis}. Referred back to ${dischargeData.referBackFacilityName} (ASHA: ${dischargeData.ashaWorkerName})`,
      { bedStatus: 'OCCUPIED', patient: dischargeTargetBed.patientName },
      {
        bedStatus: 'AVAILABLE',
        freedBed: dischargeTargetBed.bedNumber,
        referBackFacility: dischargeData.referBackFacilityName,
        followUpDate: dischargeData.followUpDate,
      }
    );

    setDischargeTargetBed(null);
  };

  // Operational metrics from existing real data
  const totalAvailableBeds = bedSlots.filter((b) => b.status === 'AVAILABLE').length;
  const icuAvailableBeds = bedSlots.filter((b) => b.status === 'AVAILABLE' && b.department === 'ICU').length;
  const occupiedBedsCount = bedSlots.filter((b) => b.status === 'OCCUPIED').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* ── 1. COMPACT ACTION-FIRST HOSPITAL COMMAND HEADER (Reduced by ~25-30%) ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600/90 flex items-center justify-center shrink-0 shadow-sm border border-blue-400/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <Hospital className="w-3 h-3" />
                DISTRICT CASUALTY &amp; REFERRAL OPERATIONS
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Facility-Scoped Session
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate mt-0.5">
              {currentHospitalName}
              <span className="text-xs font-normal text-slate-300 ml-2">
                &bull; {user?.name || 'Dr. Ananya Kulkarni'} ({user?.roleTitleEn || 'Chief Casualty Specialist'})
              </span>
            </h2>
          </div>
        </div>

        {/* Quick Operational Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Scan Referral QR Pass"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-200" />
            <span>Scan QR Pass</span>
          </button>

          {onOpenNewPatient && (
            <button
              onClick={onOpenNewPatient}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Direct Casualty Registration"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Register Walk-In</span>
            </button>
          )}

          <Link
            href="/maha-aushadhi"
            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Open MahaAushadhi Emergency Drug Network"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Drug Grid &rarr;</span>
          </Link>
        </div>
      </div>

      {/* ── 2. 5 ACTIONABLE CLINICAL METRIC CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Metric 1: Critical Cases */}
        <div
          onClick={() => setActiveTab('intake')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Critical Cases
            </span>
            <Siren className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">
              {criticalActionItems.totalCount}
            </span>
            <span className="text-[11px] text-slate-500">Red Triage</span>
          </div>
        </div>

        {/* Metric 2: Awaiting Acceptance */}
        <div
          onClick={() => setActiveTab('referrals')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'referrals'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Awaiting Acceptance
            </span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {pendingIncomingReferrals.length}
            </span>
            <span className="text-[11px] text-slate-500">Inbound PHCs</span>
          </div>
        </div>

        {/* Metric 3: Available Beds */}
        <div
          onClick={() => setActiveTab('beds')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'beds'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Available Beds
            </span>
            <BedDouble className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {totalAvailableBeds}
            </span>
            <span className="text-[11px] text-slate-500">({icuAvailableBeds} ICU Free)</span>
          </div>
        </div>

        {/* Metric 4: Active Inpatients */}
        <div
          onClick={() => setActiveTab('admitted')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'admitted'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Inpatients
            </span>
            <Activity className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">
              {occupiedBedsCount}
            </span>
            <span className="text-[11px] text-slate-500">Under Care</span>
          </div>
        </div>

        {/* Metric 5: Discharged & Refer-Back */}
        <div
          onClick={() => setActiveTab('discharges')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'discharges'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-400 ring-2 ring-teal-500/20 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Care Continuity Loop
            </span>
            <FileCheck className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl font-black text-teal-600 dark:text-teal-400">
              {dischargeRecords.length}
            </span>
            <span className="text-[11px] text-slate-500">Referred to PHCs</span>
          </div>
        </div>
      </div>

      {/* ── 3. COMPACT "NEEDS IMMEDIATE ATTENTION" CALLOUT (If Critical Cases Exist) ── */}
      {criticalActionItems.totalCount > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-600 border-y border-r border-rose-200 dark:border-rose-900/60 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <Siren className="w-4 h-4 text-rose-600" />
                Immediate Action Required &bull; {criticalActionItems.totalCount} Critical Triage Case(s)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Review and allocate ICU/Emergency beds immediately
            </span>
          </div>

          <div className="space-y-2">
            {criticalActionItems.referrals.slice(0, 2).map((ref) => (
              <div
                key={ref.id}
                className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-black text-[9px] uppercase">
                      CRITICAL RED
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {ref.patientName} ({ref.patientAge}y &bull; {ref.patientGender})
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      #{ref.tokenCode || ref.id}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 truncate">
                    <strong>Complaint:</strong> {ref.referralReason} &bull; From: <strong>{ref.referringFacility}</strong> ({ref.specialtyRequired})
                  </p>
                </div>

                <button
                  onClick={() => setReviewReferral(ref)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review &amp; Accept</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. CONSOLIDATED HORIZONTAL CLINICAL WORKSPACE NAVIGATION ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('intake')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Casualty Intake Queue</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'intake' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>
            {pendingIncomingReferrals.length + walkIns.filter((w) => w.status !== 'ADMITTED').length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'referrals' || activeTab === 'incoming'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Incoming Referrals</span>
          {pendingIncomingReferrals.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'referrals' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
              {pendingIncomingReferrals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('beds')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'beds'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BedDouble className="w-3.5 h-3.5" />
          <span>Department Bed Matrix</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'beds' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}`}>
            {totalAvailableBeds} Free
          </span>
        </button>

        <button
          onClick={() => setActiveTab('admitted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'admitted'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Active Inpatients</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'admitted' ? 'bg-white text-purple-600' : 'bg-purple-500 text-white'}`}>
            {occupiedBedsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('discharges')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'discharges'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Care Continuity Loop</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'discharges' ? 'bg-white text-teal-600' : 'bg-teal-500 text-white'}`}>
            {dischargeRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>On-Call Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Facility Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory_sla')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory_sla'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>Blood &amp; Drug Buffer</span>
        </button>
      </div>

      {/* ── 5. TAB VIEW 1: CASUALTY / ER INTAKE QUEUE ── */}
      {activeTab === 'intake' && (
        <CasualtyIntakeQueue
          hospitalName={currentHospitalName}
          incomingReferrals={pendingIncomingReferrals}
          walkIns={walkIns.filter((w) => w.status !== 'ADMITTED')}
          patients={patients}
          onReviewReferral={(ref) => setReviewReferral(ref)}
          onAdmitWalkIn={(walkIn) => {
            setAdmissionTarget({
              patientName: walkIn.fullName,
              patientAge: walkIn.age,
              patientGender: walkIn.gender,
              patientAbha: walkIn.abhaId,
              triagePriority: walkIn.triagePriority,
              chiefComplaint: walkIn.chiefComplaint,
              walkInId: walkIn.id,
            });
          }}
          onRegisterWalkIn={onOpenNewPatient}
        />
      )}

      {/* ── 6. TAB VIEW 2: INCOMING REFERRALS REVIEW ── */}
      {(activeTab === 'referrals' || activeTab === 'incoming') && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Incoming PHC &amp; Sub-Centre Referrals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sorted by clinical triage priority (Red &rarr; Yellow &rarr; Routine) destined for <strong>{currentHospitalName}</strong>.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {pendingIncomingReferrals.length} Pending Cases
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingIncomingReferrals.length === 0 ? (
              <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Pending Inbound Referrals</h4>
                <p className="text-xs text-slate-400 mt-0.5">All incoming cases for this hospital have been accepted or triaged.</p>
              </div>
            ) : (
              pendingIncomingReferrals.map((ref) => {
                const patient = patients.find((p) => p.id === ref.patientId);
                const isRed = ref.triagePriority === 'red';

                return (
                  <div
                    key={ref.id}
                    className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${
                      isRed ? 'border-rose-300 dark:border-rose-900/60 shadow-xs' : 'border-slate-200 dark:border-slate-800'
                    } hover:border-blue-400 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3`}
                  >
                    {/* Information Hierarchy: Triage -> Patient -> Complaint -> Facility -> Specialty -> Action */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isRed
                              ? 'bg-rose-600 text-white animate-pulse'
                              : ref.triagePriority === 'yellow'
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-emerald-600 text-white font-bold'
                          }`}
                        >
                          {ref.triagePriority.toUpperCase()} TRIAGE
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {ref.patientName} ({ref.patientAge}y &bull; {ref.patientGender})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{ref.tokenCode || ref.id}
                        </span>
                        {patient?.abhaId && (
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                            ABHA: {patient.abhaId}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                        <strong>Reason:</strong> {ref.referralReason}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          From: <strong className="text-slate-700 dark:text-slate-300">{ref.referringFacility}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Required Specialty: <strong className="text-blue-600 dark:text-blue-400">{ref.specialtyRequired}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="font-mono">
                          Referred: {new Date(ref.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Contextual Action Buttons */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setReviewReferral(ref)}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review &amp; Accept / Reject</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 7. TAB VIEW 3: DEPARTMENT BED MATRIX ── */}
      {activeTab === 'beds' && (
        <DepartmentBedMatrixView
          hospitalName={currentHospitalName}
          bedSlots={bedSlots}
          onSelectBed={(bed) => {
            // Open direct admission modal with empty patient template
            setAdmissionTarget({
              patientName: 'Emergency Inpatient Intake',
              triagePriority: 'yellow',
              chiefComplaint: `Bed allocation under ${bed.department}`,
            });
          }}
          onInitiateDischarge={(bed) => setDischargeTargetBed(bed)}
        />
      )}

      {/* ── 8. TAB VIEW 4: SPECIALIST ON-CALL ROSTER ── */}
      {activeTab === 'roster' && (
        <SpecialistRosterView
          hospitalName={currentHospitalName}
          specialists={specialistsOnDuty}
        />
      )}

      {/* ── 9. TAB VIEW 5: ACTIVE ADMISSIONS & INPATIENT MANAGEMENT ── */}
      {activeTab === 'admitted' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Active Inpatients Under Care
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Currently occupied beds across ICU, General Wards, Maternity &amp; Casualty Bays.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {occupiedBedsCount} Inpatients
            </span>
          </div>

          <div className="space-y-2.5">
            {bedSlots
              .filter((b) => b.status === 'OCCUPIED' && b.patientName)
              .map((bed) => (
                <div
                  key={bed.bedId}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-400 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                        {bed.bedNumber} ({bed.department})
                      </span>
                      {bed.triagePriority && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            bed.triagePriority === 'red' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {bed.triagePriority}
                        </span>
                      )}
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {bed.patientName}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        ABHA: {bed.patientAbha || 'ABDM-VERIFIED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
                      <span>Ward: <strong>{bed.wardName}</strong></span>
                      <span>&bull;</span>
                      <span>Attending: <strong className="text-indigo-600 dark:text-indigo-400">{bed.attendingSpecialist || 'Dr. Ananya Kulkarni'}</strong></span>
                      {bed.assignedAt && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono text-[10px]">
                            Admitted: {new Date(bed.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setDischargeTargetBed(bed)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Discharge &amp; Refer Back</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 10. TAB VIEW 6: DISCHARGE & REFER-BACK CARE-CONTINUITY LOOP ── */}
      {activeTab === 'discharges' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-900/40 rounded-2xl p-4 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-teal-400" />
                  POST-DISCHARGE CARE CONTINUITY LOOP
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white mt-1">
                Completed Discharges &amp; PHC Counter-Referrals
              </h3>
              <p className="text-xs text-teal-200/80 mt-0.5">
                Clinical discharge summaries routed back down to originating PHCs and community ASHA workers.
              </p>
            </div>
            <span className="text-xs font-bold text-teal-300">
              {dischargeRecords.length} Completed
            </span>
          </div>

          <div className="space-y-2.5">
            {dischargeRecords.map((dis) => (
              <div
                key={dis.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[9px] font-black uppercase">
                        DISCHARGE #{dis.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {dis.patientName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ABHA: {dis.patientAbha || 'ABDM-VERIFIED'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold mt-1">
                      <strong>Diagnosis:</strong> {dis.dischargeDiagnosis}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    Discharged: {new Date(dis.dischargedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Refer-Back Routing Box */}
                <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 font-bold flex-wrap gap-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      Routed Back To: {dis.referBackFacilityName}
                    </span>
                    <span>Follow-Up Due: {dis.followUpDate}</span>
                  </div>
                  {dis.ashaWorkerName && (
                    <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Community ASHA: <strong>{dis.ashaWorkerName}</strong> ({dis.ashaWorkerPhone || 'Assigned'}) &bull; Action: {dis.followUpInstructions}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 11. TAB VIEW 7: FACILITY TAMPER-EVIDENT AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <FacilityTamperAuditView
          hospitalName={currentHospitalName}
          blocks={tamperBlocks}
        />
      )}

      {/* ── 12. TAB VIEW 8: BLOOD BANK, DRUGS & SLA ── */}
      {activeTab === 'inventory_sla' && (
        <FacilityBloodDrugWidget
          hospitalName={currentHospitalName}
          bloodStock={bloodStock}
          drugStocks={myHospitalDrugStocks}
          referrals={myHospitalReferrals}
        />
      )}

      {/* ── 13. OVERLAY MODALS ── */}

      {/* Referral Review Modal */}
      {reviewReferral && (
        <SpecialistReferralReviewModal
          referral={reviewReferral}
          patient={patients.find((p) => p.id === reviewReferral.patientId)}
          specialistsOnDuty={specialistsOnDuty}
          bloodStock={bloodStock}
          onClose={() => setReviewReferral(null)}
          onAccept={handleAcceptReferral}
          onReject={handleRejectReferral}
        />
      )}

      {/* Patient Admission & Bed Assignment Modal */}
      {admissionTarget && (
        <PatientAdmissionModal
          patientName={admissionTarget.patientName}
          patientAge={admissionTarget.patientAge}
          patientGender={admissionTarget.patientGender}
          patientAbha={admissionTarget.patientAbha}
          triagePriority={admissionTarget.triagePriority}
          chiefComplaint={admissionTarget.chiefComplaint}
          specialtyRequired={admissionTarget.specialtyRequired}
          referralId={admissionTarget.referralId}
          walkInId={admissionTarget.walkInId}
          bedSlots={bedSlots}
          attendingSpecialistName={user?.name || 'Dr. Ananya Kulkarni'}
          onClose={() => setAdmissionTarget(null)}
          onConfirmAdmission={handleConfirmAdmission}
        />
      )}

      {/* Patient Discharge & Refer-Back Modal */}
      {dischargeTargetBed && (
        <PatientDischargeModal
          bedSlot={dischargeTargetBed}
          dischargingDoctorName={user?.name || 'Dr. Ananya Kulkarni'}
          dischargingDoctorId={user?.id || 'user-spec-01'}
          onClose={() => setDischargeTargetBed(null)}
          onConfirmDischarge={handleConfirmDischarge}
        />
      )}

      {/* District QR Pass Scanner Modal */}
      {isScanModalOpen && (
        <DistrictQRScannerModal
          hospitalName={currentHospitalName}
          referrals={myHospitalReferrals}
          patients={patients}
          onClose={() => setIsScanModalOpen(false)}
          onSelectReferral={(ref) => {
            setIsScanModalOpen(false);
            setReviewReferral(ref);
          }}
        />
      )}
    </div>
  );
}
