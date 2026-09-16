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

  const pendingIncomingReferrals = useMemo(() => {
    return myHospitalReferrals.filter((r) => r.status === 'PENDING');
  }, [myHospitalReferrals]);

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

  // HANDLER: Confirm Admission & Bed Assignment (Feature 5)
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

  // HANDLER: Confirm Discharge with Refer-Back-to-PHC (Feature 6)
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

  // Quick stats
  const criticalIntakeCount =
    pendingIncomingReferrals.filter((r) => r.triagePriority === 'red').length +
    walkIns.filter((w) => w.triagePriority === 'red' && w.status !== 'ADMITTED').length;

  const totalAvailableBeds = bedSlots.filter((b) => b.status === 'AVAILABLE').length;
  const occupiedBedsCount = bedSlots.filter((b) => b.status === 'OCCUPIED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* ── 1. HOSPITAL COMMAND HEADER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg border border-indigo-400/30">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                DISTRICT HOSPITAL SPECIALIST &amp; CASUALTY DESK
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                FACILITY-SCOPED SESSION
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
              <span>{currentHospitalName}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                {user?.name || 'Dr. Ananya Kulkarni'} ({user?.roleTitleEn || 'Chief Casualty & Triage Specialist'})
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Trauma triage, inpatient bed assignments, on-call roster cross-checks &amp; refer-back care loop
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenNewPatient && (
            <button
              onClick={onOpenNewPatient}
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-950/40 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register Patient</span>
            </button>
          )}

          <Link
            href="/maha-aushadhi"
            className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Emergency Drug Grid &rarr;</span>
          </Link>
        </div>
      </div>

      {/* ── 2. HOSPITAL NAVIGATION TABS ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('intake')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Casualty Intake Queue</span>
          {criticalIntakeCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'intake' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'}`}>
              {criticalIntakeCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'referrals'
              ? 'bg-blue-600 text-white shadow-sm'
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
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'beds'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bed className="w-3.5 h-3.5" />
          <span>Department Bed Matrix</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'beds' ? 'bg-white text-indigo-600' : 'bg-emerald-500 text-white'}`}>
            {totalAvailableBeds} Free
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Specialist On-Call Roster</span>
        </button>

        <button
          onClick={() => setActiveTab('admitted')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'admitted'
              ? 'bg-purple-600 text-white shadow-sm'
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
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'discharges'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Refer-Back Loop</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'discharges' ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white'}`}>
            {dischargeRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Facility Tamper Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory_sla')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'inventory_sla'
              ? 'bg-rose-700 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Droplet className="w-3.5 h-3.5" />
          <span>Blood, Drugs &amp; SLA</span>
        </button>
      </div>

      {/* ── 3. 4 TOP CLINICAL SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical Emergency Cases */}
        <div
          onClick={() => setActiveTab('intake')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'intake'
              ? 'bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Emergency Intake
            </span>
            <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {pendingIncomingReferrals.length + walkIns.filter((w) => w.status !== 'ADMITTED').length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Arriving / Triaged</span>
          </div>
        </div>

        {/* Card 2: Active Inpatients */}
        <div
          onClick={() => setActiveTab('admitted')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Inpatients
            </span>
            <Activity className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {occupiedBedsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Under Care</span>
          </div>
        </div>

        {/* Card 3: Free Inpatient Beds */}
        <div
          onClick={() => setActiveTab('beds')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Available Beds
            </span>
            <Bed className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalAvailableBeds}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">of {bedSlots.length} Slots</span>
          </div>
        </div>

        {/* Card 4: Discharged & Counter-Referred */}
        <div
          onClick={() => setActiveTab('discharges')}
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-800 transition-all cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Refer-Back Care Loop
            </span>
            <FileCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
              {dischargeRecords.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Referred to PHCs</span>
          </div>
        </div>
      </div>

      {/* ── 4. FEATURE 1: CASUALTY / ER INTAKE QUEUE ── */}
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

      {/* ── 5. FEATURE 2 & 4: INCOMING REFERRALS REVIEW ── */}
      {(activeTab === 'referrals' || activeTab === 'incoming') && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Incoming PHC &amp; CHC Referrals
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient cases referred specifically to <strong>{currentHospitalName}</strong> awaiting clinical acceptance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {pendingIncomingReferrals.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Pending Referrals</h4>
                <p className="text-xs text-slate-400 mt-1">All incoming cases for this hospital have been accepted or triaged.</p>
              </div>
            ) : (
              pendingIncomingReferrals.map((ref) => {
                const patient = patients.find((p) => p.id === ref.patientId);

                return (
                  <div
                    key={ref.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-400 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            ref.triagePriority === 'red'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {ref.triagePriority.toUpperCase()} TRIAGE
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {ref.patientName} ({ref.patientAge}y &bull; {ref.patientGender})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          #{ref.tokenCode || ref.id}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <strong>Reason:</strong> {ref.referralReason}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>From: <strong className="text-slate-700 dark:text-slate-300">{ref.referringFacility}</strong></span>
                        <span>&bull;</span>
                        <span>Specialty: <strong className="text-blue-600 dark:text-blue-400">{ref.specialtyRequired}</strong></span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => setReviewReferral(ref)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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

      {/* ── 6. FEATURE 3: DEPARTMENT BED MATRIX ── */}
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

      {/* ── 7. FEATURE 4: SPECIALIST ON-CALL ROSTER ── */}
      {activeTab === 'roster' && (
        <SpecialistRosterView
          hospitalName={currentHospitalName}
          specialists={specialistsOnDuty}
        />
      )}

      {/* ── 8. ACTIVE ADMISSIONS & INPATIENT MANAGEMENT ── */}
      {activeTab === 'admitted' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Active Inpatients Under Care
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Currently admitted patients in ICU, General Wards, Maternity &amp; Casualty Bays.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {bedSlots
              .filter((b) => b.status === 'OCCUPIED' && b.patientName)
              .map((bed) => (
                <div
                  key={bed.bedId}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-400 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                        {bed.bedNumber} ({bed.department})
                      </span>
                      {bed.triagePriority && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            bed.triagePriority === 'red' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {bed.triagePriority}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {bed.patientName}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400">
                        ABHA: {bed.patientAbha || 'ABDM-VERIFIED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                      <span>Ward: <strong>{bed.wardName}</strong></span>
                      <span>&bull;</span>
                      <span>Attending: <strong className="text-indigo-600 dark:text-indigo-400">{bed.attendingSpecialist || 'Dr. Ananya Kulkarni'}</strong></span>
                      {bed.assignedAt && (
                        <>
                          <span>&bull;</span>
                          <span className="font-mono text-[11px]">
                            Admitted: {new Date(bed.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => setDischargeTargetBed(bed)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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

      {/* ── 9. FEATURE 6: DISCHARGE & REFER-BACK CARE-CONTINUITY LOOP ── */}
      {activeTab === 'discharges' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-emerald-400" />
                  POST-DISCHARGE CARE-CONTINUITY LOOP
                </span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white mt-1">
                Completed Discharges &amp; PHC Counter-Referrals
              </h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Structured clinical discharge summaries routed back down to originating PHCs and community ASHA workers.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {dischargeRecords.map((dis) => (
              <div
                key={dis.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                        DISCHARGE #{dis.id}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
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

      {/* ── 10. FEATURE 7: FACILITY TAMPER-EVIDENT AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <FacilityTamperAuditView
          hospitalName={currentHospitalName}
          blocks={tamperBlocks}
        />
      )}

      {/* ── 11. FEATURES 8 & 9: BLOOD BANK, DRUGS & SLA ── */}
      {activeTab === 'inventory_sla' && (
        <FacilityBloodDrugWidget
          hospitalName={currentHospitalName}
          bloodStock={bloodStock}
          drugStocks={myHospitalDrugStocks}
          referrals={myHospitalReferrals}
        />
      )}

      {/* ── 12. OVERLAY MODALS ── */}

      {/* Referral Review Modal (Feature 2 & 4) */}
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

      {/* Patient Admission & Bed Assignment Modal (Feature 5) */}
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

      {/* Patient Discharge & Refer-Back Modal (Feature 6) */}
      {dischargeTargetBed && (
        <PatientDischargeModal
          bedSlot={dischargeTargetBed}
          dischargingDoctorName={user?.name || 'Dr. Ananya Kulkarni'}
          dischargingDoctorId={user?.id || 'user-spec-01'}
          onClose={() => setDischargeTargetBed(null)}
          onConfirmDischarge={handleConfirmDischarge}
        />
      )}
    </div>
  );
}
