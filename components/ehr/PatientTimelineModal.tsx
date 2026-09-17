'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import {
  canAccessPatientReport,
  maskPatientForUnauthorizedView,
  recordAuditLog,
} from '@/lib/patientPrivacyService';
import {
  X,
  CreditCard,
  Send,
  Calendar,
  Building2,
  Activity,
  Pill,
  TestTube,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Flame,
  UserCheck,
  Database,
  FileLock,
  Stethoscope,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface PatientTimelineModalProps {
  patient: Patient | null;
  onClose: () => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function PatientTimelineModal({
  patient,
  onClose,
  onOpenAbhaCard,
  onOpenReferral,
}: PatientTimelineModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals } = useSync();

  const [activeTab, setActiveTab] = useState<'timeline' | 'vitals' | 'meds' | 'labs'>('timeline');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [dialogReasonInput, setDialogReasonInput] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Keep track of logged audits so we don't spam on repeated renders
  const lastLoggedKeyRef = useRef<string>('');

  if (!patient) return null;

  // Determine access decision
  const decision = canAccessPatientReport(user, patient, {
    referrals,
    isEmergency: isEmergencyActive,
    emergencyReason,
  });

  const effectivePatient = maskPatientForUnauthorizedView(patient, decision);

  const activeReferral = referrals.find(
    r => r.patientId === patient.id && !['COMPLETED', 'CANCELLED'].includes(r.status)
  ) || (patient.activeReferralId ? referrals.find(r => r.id === patient.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(r.status)) : null);
  const hasActiveReferral = Boolean(activeReferral || (patient?.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(referrals.find(r => r.id === patient?.activeReferralId)?.status || '')));

  const hasRoleTimelineAccess =
    decision.allowed ||
    decision.accessLevel === 'MEDICATION_ONLY' ||
    decision.accessLevel === 'CLINICAL_LIMITED';

  // Audit Logging Effect
  useEffect(() => {
    if (!patient || !user) return;
    const auditKey = `${user.id}-${patient.id}-${decision.accessLevel}-${isEmergencyActive ? 'EMERGENCY' : 'NORMAL'}`;
    if (lastLoggedKeyRef.current === auditKey) return;
    lastLoggedKeyRef.current = auditKey;

    if (decision.allowed) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: isEmergencyActive ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT',
        resource: 'Longitudinal EHR Medical Timeline',
        reason: isEmergencyActive ? `Emergency Override: ${emergencyReason}` : decision.reason,
        accessGranted: true,
      });
    } else if (decision.accessLevel === 'MEDICATION_ONLY') {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'DISPENSE_MEDICATION',
        resource: 'Pharmacist Prescription Dispensing View',
        reason: decision.reason,
        accessGranted: true,
      });
    } else if (decision.accessLevel === 'CLINICAL_LIMITED') {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'VIEW_DEMOGRAPHICS',
        resource: 'Nursing & Community Care View',
        reason: decision.reason,
        accessGranted: true,
      });
    } else {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED',
        resource: 'Longitudinal EHR Medical Timeline',
        reason: decision.reason,
        accessGranted: false,
      });
    }
  }, [patient, user, decision.allowed, decision.accessLevel, isEmergencyActive, emergencyReason, decision.reason]);

  const handleTriggerEmergencyBreakGlass = () => {
    setDialogReasonInput('');
    setDialogError('');
    setShowEmergencyDialog(true);
  };

  const handleConfirmEmergency = () => {
    if (!dialogReasonInput.trim() || dialogReasonInput.trim().length < 8) {
      setDialogError('A valid medical justification (minimum 8 characters) is mandatory for emergency break-glass.');
      return;
    }

    setEmergencyReason(dialogReasonInput.trim());
    setIsEmergencyActive(true);
    setShowEmergencyDialog(false);
  };

  const isClinician =
    user?.role === 'phc_doctor' || user?.role === 'specialist' || user?.role === 'nurse';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700/60">
        
        {/* TOP STATUS HEADER */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:flex-wrap sm:justify-between sm:items-start gap-3 sm:gap-4">
          <div className="flex gap-2.5 sm:gap-4 items-start min-w-0">
            <div
              className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-base sm:text-xl shadow-inner border shrink-0 ${
                decision.allowed
                  ? 'bg-gradient-to-br from-indigo-100 to-blue-200 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/30'
                  : hasRoleTimelineAccess
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              }`}
            >
              {hasRoleTimelineAccess ? patient.fullName.charAt(0) : <Lock className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {patient.fullName}
                </h2>
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 tracking-wide uppercase whitespace-nowrap">
                  ABHA Linked
                </span>
                {decision.allowed ? (
                  <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 tracking-wide uppercase flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Authorized
                  </span>
                ) : decision.accessLevel === 'MEDICATION_ONLY' ? (
                  <span className="bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border border-teal-300 dark:border-teal-700 tracking-wide uppercase flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                    <Pill className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Dispensing
                  </span>
                ) : decision.accessLevel === 'CLINICAL_LIMITED' ? (
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border border-blue-300 dark:border-blue-700 tracking-wide uppercase flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                    <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Nursing
                  </span>
                ) : (
                  <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700 tracking-wide uppercase flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Locked
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" /> {patient.abhaId}
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span>
                  {patient.age}y &middot; {patient.gender === 'Female' ? 'F' : 'M'} &middot; {patient.bloodGroup}
                </span>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <span className="truncate max-w-[150px] sm:max-w-none">
                  {patient.village}, {patient.district}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto">
            <button
              onClick={() => onOpenAbhaCard(patient)}
              className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-slate-400 rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500" /> ABHA
            </button>
            {hasActiveReferral ? (
              <span className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg sm:rounded-xl flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" /> Referred
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onOpenReferral(patient);
                }}
                className="px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center gap-1"
              >
                <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Refer
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg sm:rounded-xl transition-all ml-0.5"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* SECURITY & AUTHORIZATION BANNER */}
        {decision.allowed ? (
          <div
            className={`px-3 py-2 sm:px-6 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs font-medium border-b ${
              isEmergencyActive
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2">
              {isEmergencyActive ? (
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              )}
              <span className="leading-snug">
                <strong>{isEmergencyActive ? 'EMERGENCY OVERRIDE:' : 'CARE VERIFIED:'}</strong>{' '}
                <span className="hidden sm:inline">{decision.reason}</span>
                <span className="sm:hidden text-[9px]">{decision.reason.length > 60 ? decision.reason.substring(0, 60) + '…' : decision.reason}</span>
              </span>
            </div>
            <span className="text-[8px] sm:text-[10px] uppercase font-mono tracking-wider opacity-80 self-end sm:self-auto shrink-0">
              ABDM MAHA-HPR
            </span>
          </div>
        ) : decision.accessLevel === 'MEDICATION_ONLY' ? (
          <div className="px-3 py-2 sm:px-6 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs font-medium border-b bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800">
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2">
              <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 sm:mt-0" />
              <span className="leading-snug">
                <strong>DISPENSING ACCESS:</strong>{' '}
                <span className="hidden sm:inline">Authorized for medicine fulfillment. Clinical consultation notes, specialist diagnoses, and diagnostic lab investigations are protected.</span>
                <span className="sm:hidden text-[9px]">Medicine dispensing only. Clinical notes protected.</span>
              </span>
            </div>
            <span className="text-[8px] sm:text-[10px] uppercase font-mono tracking-wider opacity-80 self-end sm:self-auto shrink-0">
              DISPENSING
            </span>
          </div>
        ) : decision.accessLevel === 'CLINICAL_LIMITED' ? (
          <div className="px-3 py-2 sm:px-6 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs font-medium border-b bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800">
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
              <span className="leading-snug">
                <strong>NURSING DUTY:</strong>{' '}
                <span className="hidden sm:inline">Authorized for vitals, screening, and nursing care. Specialist consultation notes and laboratory diagnostic investigations are protected.</span>
                <span className="sm:hidden text-[9px]">Vitals & screening access. Specialist notes protected.</span>
              </span>
            </div>
            <span className="text-[8px] sm:text-[10px] uppercase font-mono tracking-wider opacity-80 self-end sm:self-auto shrink-0">
              CARE DUTY
            </span>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-3 py-2 sm:px-6 sm:py-3 text-[10px] sm:text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-start sm:items-center gap-1.5 sm:gap-2">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold">Privacy Protection Active: </span>
                <span className="leading-snug">{decision.reason}</span>
              </div>
            </div>
            {isClinician && (
              <button
                onClick={handleTriggerEmergencyBreakGlass}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-lg shadow-xs transition-colors flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wide shrink-0 self-end sm:self-auto"
              >
                <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Break-Glass
              </button>
            )}
          </div>
        )}

        {/* CLINICAL ALERTS (Only shown if authorized) */}
        {decision.allowed &&
          (effectivePatient.isHighRiskPregnancy ||
            (effectivePatient.chronicConditions && effectivePatient.chronicConditions.length > 0)) && (
            <div className="bg-rose-50 dark:bg-rose-900/80 border-b border-rose-100 px-3 py-2 sm:px-6 sm:py-2.5 flex items-start sm:items-center gap-2 sm:gap-4">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center min-w-0">
                <span className="text-[9px] sm:text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest mr-1 sm:mr-2">
                  Flags:
                </span>
                {effectivePatient.isHighRiskPregnancy && (
                  <span className="bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 shadow-xs">
                    HRP (Wk {effectivePatient.gestationalWeeks})
                  </span>
                )}
                {effectivePatient.chronicConditions?.map((cond, i) => (
                  <span
                    key={i}
                    className="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 shadow-xs"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* EHR NAVIGATION TABS */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-2 sm:px-6 flex gap-1 sm:gap-6 text-[11px] sm:text-sm font-bold text-slate-500 dark:text-slate-400 overflow-x-auto scrollbar-hide">
          {[
            { id: 'timeline', label: 'Timeline', labelFull: 'Longitudinal Timeline', icon: Clock },
            { id: 'vitals', label: 'Vitals', labelFull: 'Flowsheet & Vitals', icon: Activity },
            { id: 'meds', label: 'Meds', labelFull: 'Medications', icon: Pill },
            { id: 'labs', label: 'Labs', labelFull: 'Diagnostics & Reports', icon: TestTube },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={
                'py-2.5 sm:py-3.5 border-b-2 flex items-center gap-1 sm:gap-2 transition-colors whitespace-nowrap shrink-0 px-1.5 sm:px-0 ' +
                (activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                  : 'border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600')
              }
            >
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.labelFull}</span>
            </button>
          ))}
        </div>

        {/* MAIN SCROLL BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-50 dark:bg-slate-800/50">
          
          {/* CASE 1: AUTHORIZED OR LIMITED ROLE ACCESS (PHARMACIST / NURSE) */}
          {hasRoleTimelineAccess && (
            <>
              {activeTab === 'timeline' && (
                <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-1 sm:py-2">
                  {effectivePatient.encounters.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-slate-400 font-medium text-xs sm:text-sm">
                      No encounters recorded yet on ABDM timeline.
                    </div>
                  ) : (
                    effectivePatient.encounters.map((enc) => (
                      <div
                        key={enc.id}
                        className="relative pl-6 sm:pl-9 before:absolute before:inset-y-0 before:-bottom-6 before:left-[13px] sm:before:left-[17px] before:w-px before:bg-slate-200 dark:bg-slate-700 last:before:hidden"
                      >
                        <div className="absolute left-[6px] sm:left-[8px] top-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white dark:bg-slate-900 border-2 sm:border-[3px] border-blue-500 shadow-xs ring-2 sm:ring-4 ring-slate-50 dark:ring-slate-900 z-10" />

                        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-3 sm:p-5 shadow-xs hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-between gap-1 sm:gap-4 mb-2 sm:mb-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                                {enc.diagnosis}
                              </h3>
                              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {enc.date}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-1 truncate">
                                  <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> <span className="truncate">{enc.facilityName}</span>
                                </span>
                              </div>
                            </div>
                            <div className="text-left sm:text-right text-[10px] sm:text-xs">
                              <div className="font-bold text-slate-700 dark:text-slate-200">{enc.providerName}</div>
                              <div className="text-slate-500 dark:text-slate-400">{enc.providerRole}</div>
                            </div>
                          </div>

                          <div className="space-y-2 sm:space-y-3 pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] sm:text-xs">
                            {/* Chief Complaints */}
                            {enc.chiefComplaints && enc.chiefComplaints.length > 0 && decision.accessLevel !== 'MEDICATION_ONLY' && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Chief Complaints
                                </div>
                                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                  {enc.chiefComplaints.join(', ')}
                                </div>
                              </div>
                            )}

                            {/* Vitals Summary */}
                            {enc.vitals && decision.accessLevel !== 'MEDICATION_ONLY' && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                  Vitals Captured
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    BP: {enc.vitals.systolicBp}/{enc.vitals.diastolicBp} mmHg
                                  </span>
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    HR: {enc.vitals.heartRate} bpm
                                  </span>
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    Temp: {enc.vitals.temperature}°C
                                  </span>
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                    SpO2: {enc.vitals.spO2}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Prescriptions */}
                            {enc.prescriptions && enc.prescriptions.length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <Pill className="w-3 h-3 text-emerald-500" /> Prescriptions Issued
                                </div>
                                <div className="space-y-1.5">
                                  {enc.prescriptions.map((rx, i) => (
                                    <div
                                      key={i}
                                      className="flex flex-wrap items-center justify-between text-xs bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-2 rounded-lg"
                                    >
                                      <div className="font-bold text-emerald-900 dark:text-emerald-200">
                                        {rx.medicineName}{' '}
                                        <span className="font-normal text-emerald-700 dark:text-emerald-400 ml-1">
                                          {rx.dosage}
                                        </span>
                                      </div>
                                      <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                                        {rx.frequency} for {rx.durationDays} days
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Lab Reports */}
                            {enc.labReports && enc.labReports.length > 0 && (
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <TestTube className="w-3 h-3 text-blue-500" /> Diagnostic Investigations
                                </div>
                                <div className="space-y-1.5">
                                  {enc.labReports.map((lab) => (
                                    <div
                                      key={lab.id}
                                      className="flex flex-wrap items-center justify-between text-xs bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 p-2 rounded-lg"
                                    >
                                      <div className="font-bold text-blue-900 dark:text-blue-200">{lab.testName}</div>
                                      <div className="font-mono font-bold text-rose-700 dark:text-rose-400">
                                        {lab.result}{' '}
                                        <span className="text-[10px] text-slate-400 font-normal">
                                          (Normal: {lab.normalRange})
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Clinical Notes */}
                            {enc.notes && (
                              <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-2.5 rounded-xl">
                                <div className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-0.5">
                                  Clinical Notes
                                </div>
                                <div className="text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
                                  {enc.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab !== 'timeline' && (
                <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-xs mb-2 sm:mb-3">
                    <Database className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    Detailed Longitudinal View
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs mt-1 max-w-md">
                    All historical parameters are synchronized directly with Maharashtra ABDM Health Information
                    Exchange.
                  </p>
                </div>
              )}
            </>
          )}

          {/* CASE 2: UNAUTHORIZED — PRIVACY PROTECTION SCREEN (BLOCKED ACCESS) */}
          {!hasRoleTimelineAccess && (
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-2 sm:py-4">
              
              {/* Privacy Lock Banner */}
              <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                    <FileLock className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Medical Record Restricted
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Under ABDM and Maharashtra Patient Data Privacy Regulations, clinical records are protected under least-privilege access rules.
                    </p>
                  </div>
                </div>

                {/* Identity & Care Relationship Details */}
                <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs space-y-1.5 sm:space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-1.5 sm:pb-2 border-b border-slate-200 dark:border-slate-700 gap-0.5">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Staff:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {user?.name} ({user?.roleTitleEn})
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-1.5 sm:pb-2 border-b border-slate-200 dark:border-slate-700 gap-0.5">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Facility:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.facilityName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-1.5 sm:pb-2 border-b border-slate-200 dark:border-slate-700 gap-0.5">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Primary Doctor:</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">
                      {patient.assignedDoctorName || 'Medical Officer'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Authorization:</span>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[9px] sm:text-[10px]">
                      No Active Care Relationship
                    </span>
                  </div>
                </div>
              </div>

              {/* Redacted Data Preview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-xs space-y-2 sm:space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 sm:pb-3 border-b border-slate-100 dark:border-slate-800 gap-1">
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                    Demographic View (Least Privilege)
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                    Demographics Allowed
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-[10px] sm:text-xs">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">ID</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{patient.id}</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Age/Gender</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {patient.age}y &middot; {patient.gender}
                    </div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Blood</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{patient.bloodGroup}</div>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Referral</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {patient.activeReferralId ? 'Active' : 'None'}
                    </div>
                  </div>
                </div>

                {/* Redacted Protected Clinical Records */}
                <div className="pt-1.5 sm:pt-2 space-y-1.5 sm:space-y-2">
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-500">
                    Protected Clinical Elements
                  </div>
                  <div className="p-2 sm:p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg sm:rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-rose-900 dark:text-rose-200 font-semibold">
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 shrink-0" />
                      <span>Diagnoses & Consultation History</span>
                    </div>
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-rose-700 dark:text-rose-400">
                      [RESTRICTED]
                    </span>
                  </div>
                  <div className="p-2 sm:p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-lg sm:rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-rose-900 dark:text-rose-200 font-semibold">
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 shrink-0" />
                      <span>Lab Investigations & Imaging</span>
                    </div>
                    <span className="font-mono text-[9px] sm:text-[10px] font-bold text-rose-700 dark:text-rose-400">
                      [RESTRICTED]
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Choices */}
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-1 sm:pt-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg sm:rounded-xl text-[10px] sm:text-xs transition-colors"
                >
                  Return to Dashboard
                </button>

                {isClinician && (
                  <button
                    onClick={handleTriggerEmergencyBreakGlass}
                    className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-lg sm:rounded-xl shadow-md transition-all flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs"
                  >
                    <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                    <span>Break-Glass Access</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EMERGENCY BREAK-GLASS MODAL DIALOG */}
      {showEmergencyDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border-2 border-rose-500 dark:border-rose-600 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center shrink-0">
                <Flame className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Emergency Break-Glass Access</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ABDM Maharashtra Clinical Override Protocol
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Legal & Compliance Accountability Notice:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Emergency override immediately unlocks the patient&apos;s full clinical records. This event is
                permanently logged with your credentials (<strong>{user?.name}</strong>, Reg:{' '}
                <strong>{user?.registrationNumber}</strong>) and sent directly to the Directorate of Health Services
                (DHS) audit compliance unit.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                Document Medical Emergency Reason *
              </label>
              <textarea
                rows={3}
                required
                value={dialogReasonInput}
                onChange={(e) => {
                  setDialogReasonInput(e.target.value);
                  setDialogError('');
                }}
                placeholder="e.g. Acute trauma / unconscious patient in casualty requiring urgent intervention..."
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden dark:bg-slate-800 dark:text-white"
              />
              {dialogError && <div className="text-xs text-rose-600 font-bold mt-1">{dialogError}</div>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmergencyDialog(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmergency}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                Confirm & Unlock Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
