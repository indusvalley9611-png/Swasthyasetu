'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Referral, Patient, Facility, DischargeSummary } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import { getAvailableResource, getFacilityStatus } from '@/lib/resourceManagement';
import { calculateReferralRiskScore } from '@/lib/dhoIntelligenceEngine';
import {
  X,
  Building2,
  Users,
  HeartPulse,
  Bed,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Check,
  RotateCcw,
  Activity,
  Truck,
  Stethoscope,
  XCircle,
  FileCheck,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface DistrictReferralReviewModalProps {
  referral: Referral;
  patient?: Patient | null;
  onClose: () => void;
  updateReferralStatus: (id: string, status: Referral['status'], updates?: Partial<Referral>) => void;
}

export function DistrictReferralReviewModal({
  referral,
  patient,
  onClose,
  updateReferralStatus,
}: DistrictReferralReviewModalProps) {
  const { user } = useAuth();
  const { facilities, addFollowUpTask } = useSync();

  // Active view sub-tab
  const [activeTab, setActiveTab] = useState<'triage' | 'admit' | 'reroute'>('triage');

  // Selected Target Facility
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(() => {
    if (referral.targetFacilityId) return referral.targetFacilityId;
    const match = facilities.find(
      (f) => f.name.toLowerCase() === (referral.targetFacility || '').toLowerCase()
    );
    return match ? match.id : facilities[0]?.id || '';
  });

  // Bed Allocation State
  const [bedType, setBedType] = useState<'occupiedBeds' | 'icuBedsOccupied' | 'oxygenBedsOccupied' | 'ventilatorsOccupied'>(
    referral.triagePriority === 'red' ? 'icuBedsOccupied' : 'occupiedBeds'
  );
  const [bedId, setBedId] = useState<string>(
    referral.assignedBed || (referral.triagePriority === 'red' ? 'ICU-BED-04' : 'GEN-WARD-12')
  );
  const [attendingDoctor, setAttendingDoctor] = useState<string>(
    user?.name || 'Dr. Ananya Kulkarni (Chief Specialist)'
  );
  const [admissionNotes, setAdmissionNotes] = useState<string>(
    `Admitted under triage protocol for ${referral.specialtyRequired || 'specialized care'}. Patient vitals verified.`
  );

  // Rejection State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Mandatory Reason
  const [mandatoryReason, setMandatoryReason] = useState(
    'District Officer verified clinical triage & authorized destination capacity alignment'
  );
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const targetFacility = useMemo(() => {
    return facilities.find((f) => f.id === selectedFacilityId) || facilities[0];
  }, [facilities, selectedFacilityId]);

  // Risk Score calculation
  const riskScore = useMemo(() => {
    return calculateReferralRiskScore(referral, patient, facilities);
  }, [referral, patient, facilities]);

  // Log coordination review access
  useEffect(() => {
    if (user && referral) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName || 'District Health Authority',
        administrativeLevel: user.administrativeLevel || 'district',
        patientId: referral.patientId,
        patientName: referral.patientName,
        patientAbha: referral.patientAbha,
        action: 'DISTRICT_REFERRAL_COORDINATION',
        resource: `Referral ${referral.tokenCode || referral.id}`,
        reason: 'District Officer referral review and capacity verification',
        accessGranted: true,
      });
    }
  }, [user?.id, referral.id]);

  const currentStep = useMemo(() => {
    if (referral.status === 'COMPLETED') return 4;
    if (referral.status === 'ADMITTED') return 3;
    if (['ACCEPTED', 'ROUTED_TO_TERTIARY', 'ESCALATED', 'TRANSFER_APPROVED'].includes(referral.status)) return 2;
    return 1;
  }, [referral.status]);

  // 1. ACTION: APPROVE / AUTHORIZE REFERRAL
  const handleAcceptReferral = () => {
    if (!mandatoryReason.trim()) {
      setError('Mandatory decision reasoning is required.');
      return;
    }
    setError('');
    updateReferralStatus(referral.id, 'ACCEPTED', {
      targetFacility: targetFacility?.name || referral.targetFacility,
      targetFacilityId: targetFacility?.id || referral.targetFacilityId,
    });
    setSuccessMessage('Referral authorized and destination capacity confirmed.');
    setTimeout(() => onClose(), 800);
  };

  // 2. ACTION: DIRECT ADMIT TO INPATIENT BED
  const handleDirectAdmit = () => {
    if (!bedId.trim()) {
      setError('Please specify a Bed ID or Ward Slot.');
      return;
    }
    setError('');
    const bedTypeLabel =
      bedType === 'icuBedsOccupied'
        ? 'ICU Bed'
        : bedType === 'oxygenBedsOccupied'
        ? 'Oxygen Bed'
        : bedType === 'ventilatorsOccupied'
        ? 'Ventilator'
        : 'General Ward Bed';

    updateReferralStatus(referral.id, 'ADMITTED', {
      assignedBed: bedId,
      assignedBedType: bedType,
      targetFacility: targetFacility?.name || referral.targetFacility,
      targetFacilityId: targetFacility?.id || referral.targetFacilityId,
      referralReason: `${referral.referralReason} (Admitted to ${bedTypeLabel} #${bedId} under ${attendingDoctor})`,
    });

    setSuccessMessage(`Patient successfully admitted to ${bedTypeLabel} #${bedId}!`);
    setTimeout(() => onClose(), 800);
  };

  // 3. ACTION: COMPLETE & DISCHARGE PATIENT
  const handleDischargePatient = () => {
    const summary: DischargeSummary = {
      finalDiagnosis: referral.specialtyRequired || 'Emergency Care Complete',
      investigations: 'Standard lab & imaging protocol verified',
      treatmentProvided: `Inpatient management under ${attendingDoctor}`,
      medicines: 'Prescription dispensed per discharge protocol',
      patientCondition: 'Stable & Discharged',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      followUpFacility: referral.referringFacility || 'Primary Health Centre',
      instructions: 'Rest and follow up with local PHC ASHA worker',
      warningSigns: 'Fever, severe pain, or shortness of breath',
      communityFollowUpRequirement: 'Yes',
    };

    updateReferralStatus(referral.id, 'COMPLETED', {
      dischargeSummary: summary,
      counterReferredTo: referral.referringFacility,
    });

    if (user) {
      addFollowUpTask({
        id: `flw-task-${referral.id}`,
        patientId: referral.patientId,
        patientName: referral.patientName,
        patientPhone: patient?.phone || '9876543210',
        category: 'Post-Referral Check',
        dueDate: summary.followUpDate,
        status: 'DUE',
        notes: `Post-discharge care follow-up for referral #${referral.tokenCode || referral.id}.`,
        assignedAshaName: 'Assigned Community Health Worker',
        assignedFacilityId: referral.referringFacilityId,
        sourceReferralId: referral.id,
        createdByUserId: user.id,
        createdAt: new Date().toISOString(),
      });
    }

    setSuccessMessage('Patient discharged and counter-referral loop registered with PHC.');
    setTimeout(() => onClose(), 800);
  };

  // 4. ACTION: REJECT / DIVERT
  const handleRejectReferral = () => {
    if (!rejectReason.trim()) {
      setError('Please enter a clinical rejection or diversion reason.');
      return;
    }
    setError('');
    updateReferralStatus(referral.id, 'CANCELLED', {
      cancellationReason: rejectReason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: user?.name || 'District Officer',
      cancelledByRole: user?.role || 'district_officer',
    });
    setSuccessMessage('Referral has been diverted/rejected.');
    setTimeout(() => onClose(), 800);
  };

  // 5. ACTION: RE-ROUTE FACILITY
  const handleCoordinateDestination = (newFacId: string) => {
    setSelectedFacilityId(newFacId);
    const newFac = facilities.find((f) => f.id === newFacId);
    if (newFac) {
      updateReferralStatus(
        referral.id,
        referral.status === 'PENDING' ? 'ACCEPTED' : referral.status,
        {
          targetFacility: newFac.name,
          targetFacilityId: newFac.id,
        }
      );
    }
  };

  const isCritical = referral.triagePriority === 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                DISTRICT REFERRAL REVIEW &amp; ADMISSION
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {referral.tokenCode || referral.id}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  riskScore.riskLevel === 'EXTREME'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : riskScore.riskLevel === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}
              >
                RISK SCORE: {riskScore.compositeScore}/100 ({riskScore.riskLevel})
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  referral.status === 'ADMITTED'
                    ? 'bg-emerald-500 text-white'
                    : referral.status === 'COMPLETED'
                    ? 'bg-teal-500 text-white'
                    : referral.status === 'CANCELLED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                STATUS: {referral.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              {referral.patientName || 'Emergency Patient'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 flex-wrap">
              <span>ABHA: {referral.patientAbha || '91-XXXX-XXXX'}</span>
              <span>&bull;</span>
              <span>
                {referral.patientAge || 35} yrs, {referral.patientGender || 'Female'}
              </span>
              <span>&bull;</span>
              <span>From: <strong>{referral.referringFacility}</strong></span>
              <span>&rarr;</span>
              <span>To: <strong>{referral.targetFacility}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between max-w-lg mx-auto text-xs">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Requested</span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-2 ${
                currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />

            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Approved</span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-2 ${
                currentStep >= 3 ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />

            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Admitted</span>
            </div>

            <div
              className={`flex-1 h-0.5 mx-2 ${
                currentStep >= 4 ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />

            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep >= 4 ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}
              >
                {currentStep >= 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Completed</span>
            </div>
          </div>
        </div>

        {/* Modal Section Tabs */}
        <div className="px-6 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('triage')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'triage'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Clinical Triage &amp; Risk</span>
          </button>

          <button
            onClick={() => setActiveTab('admit')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'admit'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bed className="w-3.5 h-3.5" />
            <span>Bed Allocation &amp; Admission</span>
            {referral.status === 'ADMITTED' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('reroute')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reroute'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Destination Capacity Check</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Admitted Banner */}
          {referral.status === 'ADMITTED' && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    Patient Currently Admitted
                  </div>
                  <div className="text-emerald-700 dark:text-emerald-400 text-xs">
                    Assigned Bed: <strong>#{referral.assignedBed || 'BED-INP-01'}</strong> ({referral.assignedBedType || 'General Ward'})
                  </div>
                </div>
              </div>
              <button
                onClick={handleDischargePatient}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Discharge Patient</span>
              </button>
            </div>
          )}

          {/* ── TAB 1: CLINICAL TRIAGE & RISK SCORE ── */}
          {activeTab === 'triage' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Risk Score Breakdown Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-slate-850 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-indigo-600" />
                    Referral Risk-Score Breakdown ({riskScore.compositeScore}/100 PTS)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    Formula: Clinical (50) + Transport (30) + Capacity (20)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span className="text-slate-500">1. Clinical Severity</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {riskScore.clinicalSeverityScore} / 50
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(riskScore.clinicalSeverityScore / 50) * 100}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 pt-0.5 truncate">
                      {riskScore.breakdownFactors.clinical.join(' • ') || 'Standard vitals'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span className="text-slate-500">2. Transport Urgency</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        {riskScore.transportRiskScore} / 30
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${(riskScore.transportRiskScore / 30) * 100}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 pt-0.5 truncate">
                      {riskScore.breakdownFactors.transport.join(' • ') || 'Standard transit'}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex justify-between font-bold text-[10px]">
                      <span className="text-slate-500">3. Target Capacity</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {riskScore.destinationCapacityScore} / 20
                      </span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${(riskScore.destinationCapacityScore / 20) * 100}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400 pt-0.5 truncate">
                      {riskScore.breakdownFactors.capacity.join(' • ') || 'Verified beds available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinical & Origin Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                    <span>Origin Facility</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">PHC LEVEL</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {referral.referringFacility}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Referring Doctor: <strong>{referral.referringDoctorName || 'Medical Officer'}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Initiated:{' '}
                    {new Date(referral.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                    <span>Clinical Triage</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black ${
                        isCritical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'
                      }`}
                    >
                      {referral.triagePriority?.toUpperCase() || 'ROUTINE'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {referral.specialtyRequired || 'General Emergency Care'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Reason: <em>&ldquo;{referral.referralReason}&rdquo;</em>
                  </div>
                </div>
              </div>

              {/* Patient Vitals Card */}
              {referral.vitalsAtReferral && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    Patient Vitals At Referral
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-slate-800 dark:text-slate-200 font-bold">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Blood Pressure</span>
                      <span>
                        {referral.vitalsAtReferral.systolicBp}/{referral.vitalsAtReferral.diastolicBp} mmHg
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Heart Rate</span>
                      <span>{referral.vitalsAtReferral.heartRate} bpm</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">SpO2</span>
                      <span className={referral.vitalsAtReferral.spO2 < 94 ? 'text-rose-600' : 'text-emerald-600'}>
                        {referral.vitalsAtReferral.spO2}%
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">Temperature</span>
                      <span>{referral.vitalsAtReferral.temperature}&deg;C</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: BED ALLOCATION & INPATIENT ADMISSION ── */}
          {activeTab === 'admit' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Bed className="w-4 h-4 text-emerald-600" />
                    Inpatient Bed Allocation &amp; Ward Entry
                  </h4>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    TARGET: {targetFacility?.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Assign an active inpatient slot at the receiving District Hospital / Tertiary Facility to begin emergency or inpatient treatment.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bed Type / Ward Category *
                    </label>
                    <select
                      value={bedType}
                      onChange={(e: any) => setBedType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="occupiedBeds">General Inpatient Ward Bed (Free: {getAvailableResource(targetFacility, 'GENERAL')})</option>
                      <option value="icuBedsOccupied">ICU / Intensive Care Unit Bed (Free: {targetFacility.icuBedsTotal - targetFacility.icuBedsOccupied})</option>
                      <option value="oxygenBedsOccupied">High-Dependency Oxygen Bed (Free: {targetFacility.oxygenBedsTotal - targetFacility.oxygenBedsOccupied})</option>
                      <option value="ventilatorsOccupied">Ventilator / Critical Life Support (Free: {targetFacility.ventilatorsTotal - targetFacility.ventilatorsOccupied})</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bed Identifier / Room Number *
                    </label>
                    <input
                      type="text"
                      value={bedId}
                      onChange={(e) => setBedId(e.target.value)}
                      placeholder="e.g. BED-GW-104, ICU-02"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Attending Doctor / Specialist
                    </label>
                    <input
                      type="text"
                      value={attendingDoctor}
                      onChange={(e) => setAttendingDoctor(e.target.value)}
                      placeholder="e.g. Dr. Ananya Kulkarni"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Admission Clinical Notes
                    </label>
                    <input
                      type="text"
                      value={admissionNotes}
                      onChange={(e) => setAdmissionNotes(e.target.value)}
                      placeholder="Admission protocol notes..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDirectAdmit}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Bed className="w-4 h-4" />
                    <span>Confirm &amp; Admit Patient to Bed Now</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: DESTINATION CAPACITY CHECK & RE-ROUTING ── */}
          {activeTab === 'reroute' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Target Facility Capacity Check
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Live resource availability at <strong>{targetFacility?.name}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {getFacilityStatus(targetFacility)} CAPACITY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">General Beds</span>
                    <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                      {getAvailableResource(targetFacility, 'GENERAL')} / {targetFacility.totalBeds} free
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">ICU Beds</span>
                    <span className="font-black text-sm text-purple-600 dark:text-purple-400">
                      {targetFacility.icuBedsTotal - targetFacility.icuBedsOccupied} / {targetFacility.icuBedsTotal} free
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Ventilators</span>
                    <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                      {targetFacility.ventilatorsTotal - targetFacility.ventilatorsOccupied} free
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Oxygen Beds</span>
                    <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                      {targetFacility.oxygenBedsTotal - targetFacility.oxygenBedsOccupied} free
                    </span>
                  </div>
                </div>

                {/* Change destination selector */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-indigo-100 dark:border-indigo-900/40">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Re-route / Change Destination Facility:
                  </label>
                  <select
                    value={selectedFacilityId}
                    onChange={(e) => handleCoordinateDestination(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} ({getAvailableResource(fac, 'GENERAL')} general beds free)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Reason Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
              Mandatory DHO Coordination / Review Reason *
            </label>
            <input
              type="text"
              required
              value={mandatoryReason}
              onChange={(e) => setMandatoryReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Rejection Justification Box */}
          {isRejecting && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                <AlertOctagon className="w-4 h-4" />
                <span>Mandatory Clinical Rejection / Diversion Justification</span>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State clinical rationale for turning away or diverting this referral (e.g. Incompatible tertiary care requirement, full ICU capacity, patient diverted to Sassoon Medical College)..."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </p>
          )}
        </div>

        {/* Actionable Footer */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>

            {!isRejecting && referral.status !== 'CANCELLED' && referral.status !== 'COMPLETED' && (
              <button
                onClick={() => setIsRejecting(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
              >
                Reject / Divert
              </button>
            )}

            {isRejecting && (
              <button
                onClick={() => setIsRejecting(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            {isRejecting ? (
              <button
                onClick={handleRejectReferral}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Clinical Rejection</span>
              </button>
            ) : (
              <>
                {/* 1. If not yet admitted, offer Bed Admission */}
                {referral.status !== 'ADMITTED' && referral.status !== 'COMPLETED' && (
                  <button
                    onClick={() => {
                      if (activeTab !== 'admit') {
                        setActiveTab('admit');
                      } else {
                        handleDirectAdmit();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bed className="w-4 h-4" />
                    <span>Direct Admit to Bed &rarr;</span>
                  </button>
                )}

                {/* 2. If status is pending or tertiary, offer Approval */}
                {['PENDING', 'ROUTED_TO_TERTIARY', 'ESCALATED', 'TRANSFER_APPROVED'].includes(referral.status) && (
                  <button
                    onClick={handleAcceptReferral}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Authorize Referral</span>
                  </button>
                )}

                {/* 3. If currently admitted, offer Discharge */}
                {referral.status === 'ADMITTED' && (
                  <button
                    onClick={handleDischargePatient}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Discharge &amp; Counter-Refer &rarr;</span>
                  </button>
                )}

                {/* 4. If already completed */}
                {referral.status === 'COMPLETED' && (
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Patient Discharged &amp; Case Closed</span>
                  </span>
                )}
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
