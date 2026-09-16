'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { getMedicineStatus } from '@/lib/resourceManagement';
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
  ShieldCheck, Thermometer, UserSquare, ArrowLeft, UserPlus,
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
  const { patients, referrals, addClinicalEncounter, stocks, stockTransfers } = useSync();

  const myFacilityShortages = (stocks || []).filter(
    s => s.facilityId === user?.facilityId && (getMedicineStatus(s) === 'CRITICAL' || getMedicineStatus(s) === 'LIMITED')
  );
  const activeIncomingTransfers = (stockTransfers || []).filter(
    t => t.destinationFacilityId === user?.facilityId && t.status !== 'COMPLETED' && t.status !== 'REJECTED'
  );

  const { assignedPatients, facilityPatients, allPatients } = filterPatientsForUser(user, patients, referrals);

  const [queueScope, setQueueScope] = useState<'ASSIGNED' | 'FACILITY' | 'ALL'>('ASSIGNED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setselectedPatient] = useState<Patient | null>(null);
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
    setselectedPatient(null);
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

  const activeReferral = selectedPatient
    ? referrals.find(
        r => r.patientId === selectedPatient.id && !['COMPLETED', 'CANCELLED'].includes(r.status)
      ) || (selectedPatient.activeReferralId ? referrals.find(r => r.id === selectedPatient.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(r.status)) : null)
    : null;
  const hasActiveReferral = Boolean(activeReferral || (selectedPatient?.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(referrals.find(r => r.id === selectedPatient?.activeReferralId)?.status || '')));

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
            {user?.facilityName || 'Primary Health Centre'} &bull; {language === 'mr' ? 'वैद्यकीय अधिकारी कार्यक्षेत्र' : 'Medical Officer Workspace'}
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

      {/* COMPACT CRITICAL ALERTS — only shown when real issues exist */}
      {(myFacilityShortages.length > 0 || activeIncomingTransfers.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-bold text-amber-800 dark:text-amber-300 shrink-0">Critical Alerts:</span>
          {myFacilityShortages.length > 0 && (
            <span className="text-amber-800 dark:text-amber-200">
              {myFacilityShortages.length} stock {myFacilityShortages.length === 1 ? 'deficit' : 'deficits'} detected
              {' '}({myFacilityShortages.slice(0, 2).map(s => s.drugName).join(', ')}{myFacilityShortages.length > 2 ? ` +${myFacilityShortages.length - 2} more` : ''})
            </span>
          )}
          {myFacilityShortages.length > 0 && activeIncomingTransfers.length > 0 && (
            <span className="text-amber-400 dark:text-amber-600">·</span>
          )}
          {activeIncomingTransfers.length > 0 && (
            <span className="text-amber-800 dark:text-amber-200">
              {activeIncomingTransfers.length} incoming {activeIncomingTransfers.length === 1 ? 'consignment' : 'consignments'} in transit
            </span>
          )}
          <Link
            href="/maha-aushadhi"
            className="ml-auto shrink-0 text-amber-700 dark:text-amber-300 font-bold hover:underline flex items-center gap-1"
          >
            View in MahaAushadhi <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: language === 'mr' ? 'आजचे रुग्ण' : 'Patients Today',
            val: baseQueue.length.toString(),
            sub: `${assignedPatients.length} assigned to me`,
            icon: UserSquare,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            label: language === 'mr' ? 'येणारे संदर्भ' : 'Pending Triage',
            val: facilityPatients.filter(p => !p.encounters || p.encounters.length === 0).length.toString(),
            sub: 'Not yet assessed',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            label: language === 'mr' ? 'उच्च जोखीम' : 'High-Risk',
            val: highRiskPatients.length.toString(),
            sub: 'Pregnancy / Paediatric',
            icon: AlertTriangle,
            color: 'text-rose-600',
            bg: 'bg-rose-50 dark:bg-rose-900/20',
          },
          {
            label: language === 'mr' ? 'पाठपुरावा' : 'Follow-ups',
            val: assignedPatients.filter(p => p.encounters && p.encounters.length > 0).length.toString(),
            sub: 'Prior encounters',
            icon: RefreshCw,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
          },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className={'w-7 h-7 rounded-lg flex items-center justify-center ' + kpi.bg}>
                <kpi.icon className={'w-3.5 h-3.5 ' + kpi.color} />
              </div>
              <span className="text-[10px] text-slate-400 font-medium text-right leading-tight max-w-[80px]">{kpi.sub}</span>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">{kpi.val}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>


      {/* 3. CLEAN PATIENT LIST VIEW (When no patient selected) */}
      {!selectedPatient && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Header & Register Patient Action */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base sm:text-lg">
                <History className="w-5 h-5 text-blue-600" />
                <span>{language === 'mr' ? 'रुग्ण यादी व ट्रायज' : 'Patients Directory & Clinical Queue'}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {filteredPatients.length} {language === 'mr' ? 'रुग्ण' : 'Patients'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'mr' ? 'तपासणी, प्रिस्क्रिप्शन किंवा रेफरलसाठी रुग्ण निवडा' : 'Click any patient to open their full clinical EHR and treatment workspace'}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all self-start sm:self-auto cursor-pointer"
              title="Register Direct Walk-in Patient / ABDM Search"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'mr' ? '+ नवीन रुग्ण नोंदणी' : '+ Register Patient'}</span>
            </button>
          </div>

          {/* Scope Tabs & Search Controls */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Scope Tabs: Assigned vs Facility vs All */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-full md:w-auto">
              <button
                type="button"
                onClick={() => setQueueScope('ASSIGNED')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors text-center ${
                  queueScope === 'ASSIGNED'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {language === 'mr' ? 'माझ्याकडील रुग्ण' : 'Under My Care'} ({assignedPatients.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueScope('FACILITY')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors text-center ${
                  queueScope === 'FACILITY'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {language === 'mr' ? 'केंद्रातील सर्व रुग्ण' : 'Facility Roster'} ({facilityPatients.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueScope('ALL')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors text-center ${
                  queueScope === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {language === 'mr' ? 'सर्व नेटवर्क' : 'All Network'} ({allPatients.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'रुग्णाचे नाव, ABHA किंवा फोन शोधा...' : 'Search by name, ABHA, phone...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Clean Patient List Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredPatients.map(patient => {
              const isHighRisk = patient.isHighRiskPregnancy || patient.age <= 5;
              const isAssignedToMe =
                patient.assignedDoctorId === user.id ||
                (user.assignedPatientIds && user.assignedPatientIds.includes(patient.id));
              const location = patient.village || patient.assignedFacilityName?.split(',')[0] || 'PHC';

              return (
                <div
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="px-4 sm:px-6 py-4 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  {/* Left: Avatar + Identity */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${
                        isHighRisk
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      }`}
                    >
                      {patient.fullName.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                          {patient.fullName}
                        </span>
                        {!isAssignedToMe && (
                          <span title="External / another doctor's patient">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </span>
                        )}
                        {isHighRisk && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            High Risk
                          </span>
                        )}
                        {patient.activeReferralId && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Referral Active
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>{patient.age}y &bull; {patient.gender}</span>
                        <span>&bull;</span>
                        <span>{location}</span>
                        {patient.abhaId && (
                          <>
                            <span className="hidden sm:inline">&bull;</span>
                            <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">{patient.abhaId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Open Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                      {language === 'mr' ? 'उघडा' : 'Open'}
                      <ChevronRight className="w-4 h-4 text-blue-500 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredPatients.length === 0 && (
              <div className="p-12 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No patients match your search or filter.</p>
                <p className="text-xs text-slate-400 mt-1">Try changing the scope tab or search term.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FULL PATIENT DETAILS VIEW (When patient is selected) */}
      {selectedPatient && effectivePatient && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Bar with Back Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setselectedPatient(null)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'mr' ? '← रुग्ण निर्देशिका यादीकडे परत' : '← Back to Patients Directory'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? '+ नवीन रुग्ण' : '+ Register Patient'}</span>
            </button>
          </div>

          {/* Main Clinical Care Workspace Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
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
                    <span>{effectivePatient.assignedFacilityName || 'Primary Health Centre'}</span>
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
                {hasActiveReferral ? (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Referred</span>
                    </span>
                    <button
                      onClick={() => onOpenPatientTimeline(selectedPatient)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Referral</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onOpenReferral(selectedPatient)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Create Referral</span>
                  </button>
                )}
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
                    hasActiveReferral ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-[11px] rounded">
                          Referred
                        </span>
                        <button
                          onClick={() => onOpenPatientTimeline(selectedPatient)}
                          className="text-[11px] font-bold text-amber-900 dark:text-amber-300 hover:underline shrink-0"
                        >
                          View Referral &rarr;
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenReferral(selectedPatient)}
                        className="text-[11px] font-bold text-amber-900 dark:text-amber-300 hover:underline shrink-0"
                      >
                        Refer Patient &rarr;
                      </button>
                    )
                  )}
                </div>

                {/* Workspace Body */}
                <div className="p-5 space-y-5 bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Left: Latest Intake & Vitals */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Thermometer className="w-4 h-4 text-rose-500" />
                          Latest Intake Vitals
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Recorded Today &bull; 09:30 AM</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Blood Pressure</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">145/95</span>
                          <span className="text-[9px] text-rose-500 font-bold block">Stage 1 HTN</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">SpO2</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">98%</span>
                          <span className="text-[9px] text-emerald-500 font-bold block">Optimal</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Heart Rate</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">82 bpm</span>
                          <span className="text-[9px] text-emerald-500 font-bold block">Normal</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] text-slate-400 block font-semibold">Hemoglobin</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">8.6 g/dL</span>
                          <span className="text-[9px] text-rose-500 font-bold block">Severe Anemia</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-200">
                        <strong>Chief Complaint:</strong> Persistent headache, mild pedal edema, generalized fatigue for 4 days.
                      </div>
                    </div>

                    {/* Right: Referral Pipeline Status */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-blue-500" />
                          Referral & Continuity Pipeline
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">District Coordination</span>
                      </div>

                      {hasActiveReferral && activeReferral ? (
                        <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-extrabold text-[10px]">
                                Referred
                              </span>
                              <span className="font-bold text-xs text-amber-900 dark:text-amber-200">Active Casualty Referral</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                              {activeReferral.status || 'EN ROUTE'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Referred to: <strong>{activeReferral.targetFacility}</strong> ({activeReferral.specialtyRequired})
                          </p>
                          <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-amber-900/30">
                            <div className="text-[10px] text-slate-400 font-mono font-bold">
                              Token: {activeReferral.tokenCode || activeReferral.id}
                            </div>
                            <button
                              onClick={() => onOpenPatientTimeline(selectedPatient)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Referral
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg space-y-2">
                          <span className="text-xs text-slate-500 block">No active referral for this patient.</span>
                          <button
                            onClick={() => onOpenReferral(selectedPatient)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Initiate Specialist Referral
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinical Rx Writer & Encounter Form */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                          Clinical Encounter & Prescription Authoring
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">Authenticated as: Dr. Chavan (MO Velhe)</span>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Diagnosis / Clinical Impression</label>
                          <input
                            type="text"
                            defaultValue="Gestational Hypertension with Moderate Anemia (High Risk ANC)"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">ICD-10 Code</label>
                          <input
                            type="text"
                            defaultValue="O13.9 - Gestational [pregnancy-induced] hypertension"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Prescriptions List */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Prescribed Medications</label>
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100">Tab. Labetalol 100mg</span>
                              <span className="text-slate-400 text-[11px] block">1 tablet twice daily after meals &bull; 14 Days</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              In Stock (Velhe PHC)
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100">Tab. Ferrous Ascorbate + Folic Acid</span>
                              <span className="text-slate-400 text-[11px] block">1 tablet once daily at bedtime &bull; 30 Days</span>
                            </div>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              In Stock (Velhe PHC)
                            </span>
                          </div>
                        </div>
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
              </>
            ) : (
              /* RESTRICTED ACCESS: ABDM Privacy Protection Banner & Lock Card */
              <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/30 overflow-y-auto">
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
          </div>
        </div>
      )}

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




