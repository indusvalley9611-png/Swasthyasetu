'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, PrescriptionItem } from '@/lib/types';
import {
  canAccessPatientReport,
  filterPatientsForUser,
  recordAuditLog,
  maskPatientForUnauthorizedView,
} from '@/lib/patientPrivacyService';
import {
  Stethoscope, Pill, Send, CreditCard, FileText, Search,
  CheckCircle2, AlertTriangle, Clock, Plus, TestTube,
  Activity, History, Building2, ChevronRight,
  ArrowRight, ShieldCheck, Thermometer, UserSquare, ArrowRightCircle,
  Lock, ShieldAlert, Flame, UserCheck, Eye, RefreshCw, X
} from 'lucide-react';

interface PhcDoctorDashboardProps {
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function PhcDoctorDashboard({
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
}: PhcDoctorDashboardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { patients, referrals, addClinicalEncounter } = useSync();

  const { assignedPatients, facilityPatients, allPatients } = filterPatientsForUser(user, patients, referrals);

  const [queueScope, setQueueScope] = useState<'ASSIGNED' | 'FACILITY' | 'ALL'>('ASSIGNED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setselectedPatient] = useState<Patient | null>(() => {
    return assignedPatients[0] || facilityPatients[0] || patients[0] || null;
  });
  const [activeTab, setActiveTab] = useState<'clinical' | 'prescriptions' | 'referral'>('clinical');

  // Emergency Break-Glass state
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [dialogReasonInput, setDialogReasonInput] = useState('');
  const [dialogError, setDialogError] = useState('');

  // Reset selected patient and emergency state when authenticated user switches
  React.useEffect(() => {
    setIsEmergencyActive(false);
    setEmergencyReason('');
    const defaultPat = assignedPatients[0] || facilityPatients[0] || patients[0] || null;
    setselectedPatient(defaultPat);
  }, [user?.id]);

  // Reset emergency state when switching patients
  const handleSelectPatient = (patient: Patient) => {
    if (patient.id !== selectedPatient?.id) {
      setIsEmergencyActive(false);
      setEmergencyReason('');
    }
    setselectedPatient(patient);
  };

  const baseQueue = queueScope === 'ASSIGNED' ? assignedPatients : queueScope === 'FACILITY' ? facilityPatients : allPatients;

  const filteredPatients = baseQueue.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.includes(q) ||
      p.phone.includes(q)
    );
  });

  const highRiskPatients = baseQueue.filter(p => p.isHighRiskPregnancy || p.age <= 5);

  // Evaluate access authorization for selected patient
  const accessDecision = selectedPatient
    ? canAccessPatientReport(user, selectedPatient, {
        referrals,
        isEmergency: isEmergencyActive,
        emergencyReason,
      })
    : null;

  const effectivePatient = selectedPatient && accessDecision
    ? maskPatientForUnauthorizedView(selectedPatient, accessDecision)
    : selectedPatient;

  // Audit logging for access attempts
  const lastLoggedRef = React.useRef<string>('');
  React.useEffect(() => {
    if (!selectedPatient || !accessDecision || !user) return;
    const logKey = `${user.id}-${selectedPatient.id}-${accessDecision.accessLevel}-${accessDecision.allowed}-${isEmergencyActive}`;
    if (lastLoggedRef.current === logKey) return;
    lastLoggedRef.current = logKey;

    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel,
      patientId: selectedPatient.id,
      patientName: selectedPatient.fullName,
      patientAbha: selectedPatient.abhaId,
      action: accessDecision.allowed
        ? isEmergencyActive
          ? 'EMERGENCY_ACCESS'
          : 'VIEW_PATIENT_REPORT'
        : 'ACCESS_DENIED',
      resource: `PHC Doctor Clinical Console (ABHA: ${selectedPatient.abhaId})`,
      accessGranted: accessDecision.allowed,
      reason: isEmergencyActive
        ? `Emergency Break-Glass Override: ${emergencyReason}`
        : accessDecision.reason,
    });
  }, [selectedPatient?.id, accessDecision?.accessLevel, accessDecision?.allowed, isEmergencyActive, user?.id, emergencyReason]);

  const handleAuthorizeEmergency = () => {
    if (!dialogReasonInput.trim() || dialogReasonInput.trim().length < 8) {
      setDialogError('Emergency justification must be at least 8 characters explaining the acute medical emergency.');
      return;
    }
    setEmergencyReason(dialogReasonInput.trim());
    setIsEmergencyActive(true);
    setShowEmergencyDialog(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      
      {/* 1. PAGE HEADER: Title + Context + Single Authorized Contextual Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'mr' ? 'क्लिनिकल OPD' : 'Clinical OPD'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {user?.facilityName || 'Velhe Primary Health Centre'} &bull; {language === 'mr' ? 'वैद्यकीय अधिकारी कार्यक्षेत्र' : 'Medical Officer Workspace'}
          </p>
        </div>

        <Link
          href="/maha-aushadhi"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all self-start sm:self-auto"
        >
          <Flame className="w-4 h-4 text-white animate-pulse" />
          <span>{language === 'mr' ? 'आपत्कालीन औषध SOS' : 'Emergency Drug SOS'}</span>
        </Link>
      </div>

      {/* 2. COMPACT 4-CARD CLINICAL KPI ROW (District Beds removed) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: language === 'mr' ? 'आजचे रुग्ण' : 'Patients Today', val: '42', sub: '+8 completed', icon: UserSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: language === 'mr' ? 'येणारे संदर्भ' : 'Incoming Referrals', val: '8', sub: '3 pending triage', icon: ArrowRightCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: language === 'mr' ? 'उच्च जोखीम' : 'High-Risk Cases', val: highRiskPatients.length.toString(), sub: 'ASHA Flagged', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: language === 'mr' ? 'पाठपुरावा' : 'Follow-ups', val: '14', sub: 'Post-discharge', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1">
              <div className={"w-7 h-7 rounded-lg flex items-center justify-center " + kpi.bg}>
                <kpi.icon className={"w-3.5 h-3.5 " + kpi.color} />
              </div>
              <span className="text-[10px] text-slate-400 font-medium">{kpi.sub}</span>
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{kpi.val}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        
        {/* LEFT: INCOMING QUEUE (ASHA Referrals + OPD) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden h-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs flex-1 flex flex-col overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-xs">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'mr' ? 'क्लिनिकल रांग' : 'Clinical Queue'}</span>
                </h3>
                <button
                  type="button"
                  onClick={onOpenNewPatient}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors shadow-2xs cursor-pointer"
                  title="Register Direct Walk-in Patient / ABDM Search"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === 'mr' ? '+ रुग्ण नोंदणी' : '+ Register Walk-in'}</span>
                </button>
              </div>
              
              {/* Scope Tabs: Assigned vs Facility vs All */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold mt-2">
                <button
                  type="button"
                  onClick={() => setQueueScope('ASSIGNED')}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    queueScope === 'ASSIGNED'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                  title="Patients directly assigned to your primary care"
                >
                  My Care ({assignedPatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueScope('FACILITY')}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    queueScope === 'FACILITY'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                  title="Patients registered at your facility"
                >
                  Facility ({facilityPatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueScope('ALL')}
                  className={`flex-1 py-1 rounded-md transition-colors text-center ${
                    queueScope === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                  }`}
                  title="All district directory patients"
                >
                  All ({allPatients.length})
                </button>
              </div>

              <div className="relative mt-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'रांगेत शोधा...' : 'Search queue...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredPatients.map(patient => {
                const isSelected = selectedPatient?.id === patient.id;
                const isHighRisk = patient.isHighRiskPregnancy || patient.age <= 5;
                const isAssignedToMe =
                  patient.assignedDoctorId === user.id ||
                  (user.assignedPatientIds && user.assignedPatientIds.includes(patient.id));

                return (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className={"w-full text-left p-2.5 rounded-lg transition-all border flex gap-2.5 " + (isSelected ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40')}
                  >
                    <div className={"w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 " + (isHighRisk ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
                      {patient.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{patient.fullName}</span>
                        {!isAssignedToMe && (
                          <span title="External PHC / Doctor" className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{patient.age}y &bull; {patient.gender} &bull; {patient.assignedFacilityName?.split(' ')[0] || 'PHC'}</div>
                      {isHighRisk && (
                        <div className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> High Risk
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredPatients.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">
                  No patients found in this queue.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: CLINICAL CARE WORKSPACE */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
          {selectedPatient && effectivePatient ? (
            <>
              {/* Emergency Banner if break-glass active */}
              {isEmergencyActive && (
                <div className="bg-rose-600 text-white px-5 py-2 flex items-center justify-between text-xs font-bold shadow-2xs animate-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 animate-pulse" />
                    <span>EMERGENCY BREAK-GLASS ACTIVE &bull; Access logged to state audit trail. Reason: &ldquo;{emergencyReason}&rdquo;</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsEmergencyActive(false);
                      setEmergencyReason('');
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded text-[11px] transition-colors"
                  >
                    Exit Override
                  </button>
                </div>
              )}

              {/* Patient Header with exactly 2 Primary Actions */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-black text-lg shrink-0 border border-blue-200 dark:border-blue-800">
                    {effectivePatient.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{effectivePatient.fullName}</h2>
                      {accessDecision?.allowed ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Authorized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <Lock className="w-3 h-3 text-amber-600" />
                          Restricted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono">ABHA: {effectivePatient.abhaId}</span>
                      <span>&bull;</span>
                      <span>{effectivePatient.age}y</span>
                      <span>&bull;</span>
                      <span>{effectivePatient.gender}</span>
                      <span>&bull;</span>
                      <span>{effectivePatient.assignedFacilityName || 'Velhe PHC'}</span>
                    </div>
                  </div>
                </div>

                {/* Exactly 2 Primary Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenPatientTimeline(selectedPatient)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>EHR Timeline</span>
                  </button>
                  <button
                    onClick={() => onOpenReferral(selectedPatient)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Create Referral</span>
                  </button>
                </div>
              </div>

              {/* PRIVACY RESTRICTION CHECK: Render Clinical Workspace ONLY if authorized */}
              {accessDecision?.allowed ? (
                <>
                  {/* Clinical Advisory Ribbon */}
                  <div className="bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-sm shrink-0">⚠️</span>
                      <p className="text-xs text-amber-900 dark:text-amber-200 truncate">
                        <strong>Clinical Advisory:</strong>{' '}
                        {effectivePatient.isHighRiskPregnancy
                          ? 'Patient screening indicates elevated risk (Severe Anemia). Secondary evaluation recommended.'
                          : 'Vitals within normal parameters. Routine primary care pathway recommended.'}
                      </p>
                    </div>
                    {effectivePatient.isHighRiskPregnancy && (
                      <button
                        onClick={() => onOpenReferral(selectedPatient)}
                        className="text-[11px] font-bold text-amber-900 dark:text-amber-300 hover:underline shrink-0"
                      >
                        Refer Patient &rarr;
                      </button>
                    )}
                  </div>

                  {/* Workspace Body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      
                      {/* Left: Vitals & Pipeline */}
                      <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-3 flex items-center gap-2">
                            <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                            <span>Latest Vitals (ASHA Sync)</span>
                          </h3>
                          {effectivePatient.encounters[0]?.vitals ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">BP</div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{effectivePatient.encounters[0].vitals.systolicBp}/{effectivePatient.encounters[0].vitals.diastolicBp} <span className="text-[10px] text-slate-400 font-normal">mmHg</span></div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Heart Rate</div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{effectivePatient.encounters[0].vitals.heartRate} <span className="text-[10px] text-slate-400 font-normal">bpm</span></div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">SpO2</div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{effectivePatient.encounters[0].vitals.spO2}%</div>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 border border-slate-100 dark:border-slate-800">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Temp</div>
                                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{effectivePatient.encounters[0].vitals.temperature}°C</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic py-2">No recent vitals synchronized.</div>
                          )}
                        </div>
                        
                        {/* Visual Referral Pipeline */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-indigo-500" /> Active Referral Pipeline</h3>
                          
                          <div className="relative pl-6 space-y-4 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-100 dark:bg-slate-950">
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Referred by ASHA</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">2 hours ago &middot; Pending MO Review</div>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50 animate-pulse"></div>
                              <div className="text-xs font-bold text-blue-700 dark:text-blue-400">Triaged at PHC</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Currently Active Stage</div>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white"></div>
                              <div className="text-xs font-bold text-slate-400">Specialist Appointment</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Awaiting escalation decision</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Clinical Rx Writer */}
                      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-0 shadow-sm flex flex-col">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2"><Pill className="w-4 h-4 text-emerald-500" /> Clinical Rx Writer</h3>
                        </div>
                        <div className="p-5 flex-1 space-y-5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Clinical Diagnosis (ICD-10)</label>
                            <input type="text" placeholder="e.g. Acute Pharyngitis (J02.9)" className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:bg-slate-800 dark:text-white" />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Prescription Items</label>
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-3">
                              <div className="grid grid-cols-12 gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                                <div className="col-span-5">Medicine</div>
                                <div className="col-span-3">Dosage</div>
                                <div className="col-span-4">Freq/Days</div>
                              </div>
                              {/* Demo Rx Row */}
                              <div className="grid grid-cols-12 gap-3 text-sm items-center py-1">
                                <div className="col-span-5 font-bold text-slate-800 dark:text-slate-100">Paracetamol</div>
                                <div className="col-span-3 text-slate-600 dark:text-slate-300">650mg</div>
                                <div className="col-span-4 text-slate-600 dark:text-slate-300 flex justify-between">
                                  <span>1-0-1 <span className="text-slate-400 mx-1">|</span> 5 days</span>
                                </div>
                              </div>
                            </div>
                            
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
                              <Plus className="w-4 h-4" /> Add Medication (State EDL)
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Lab Orders</label>
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1">
                              <Plus className="w-4 h-4" /> Add Diagnostic Test
                            </button>
                          </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                          <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Save Clinical Encounter
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              ) : (
                /* RESTRICTED ACCESS: ABDM Privacy Protection Banner & Lock Card */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Protected Health Record &bull; ABDM Least-Privilege
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white max-w-lg mb-2">
                    Protected Clinical Record &bull; Care Relationship Required
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
                    {accessDecision?.reason}
                  </p>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-md w-full text-left text-xs mb-6 shadow-sm space-y-2.5">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 font-medium">Patient ABHA:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPatient.abhaId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 font-medium">Assigned Facility:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.assignedFacilityName || 'Another Facility'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-slate-500 font-medium">Attending Doctor:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.assignedDoctorName || 'Another Medical Officer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Current MO Session:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{user.name} ({user.facilityName})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={() => {
                        setDialogReasonInput('');
                        setDialogError('');
                        setShowEmergencyDialog(true);
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Emergency Break-Glass Override</span>
                    </button>
                    {assignedPatients.length > 0 && (
                      <button
                        onClick={() => {
                          setQueueScope('ASSIGNED');
                          setselectedPatient(assignedPatients[0]);
                        }}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-colors"
                      >
                        Return to My Assigned Patients ({assignedPatients.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-sm mt-4">
                    Access attempt logged under Section 8 of the Digital Personal Data Protection Act 2023 and Ayushman Bharat Digital Mission (ABDM) Milestone 3 standards.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50 dark:bg-slate-800/50">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">No Patient Selected</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Select a patient from the clinical queue on the left to review vitals, EHR records, and author prescriptions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Break-Glass Confirmation Modal */}
      {showEmergencyDialog && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-200 dark:border-rose-900/50">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-200" />
                <h3 className="font-bold text-base">Emergency Break-Glass Authorization</h3>
              </div>
              <button
                onClick={() => setShowEmergencyDialog(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-3.5 rounded-xl space-y-2 text-rose-900 dark:text-rose-200">
                <div className="font-bold text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Permanent Legal Audit Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  You are overriding clinical access controls for <strong>{selectedPatient.fullName}</strong> (ABHA: {selectedPatient.abhaId}). This emergency override is permanently logged to the State Health Authority audit trail under your MMC Registration ({user.registrationNumber || 'HPR-VERIFIED'}).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Mandatory Clinical Emergency Justification:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Acute trauma / unconscious presentation requiring urgent medical history..."
                  value={dialogReasonInput}
                  onChange={(e) => setDialogReasonInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden dark:bg-slate-800 dark:text-white"
                />
              </div>

              {dialogError && (
                <div className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                  {dialogError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyDialog(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAuthorizeEmergency}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow transition-colors text-xs flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Authorize Emergency Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




