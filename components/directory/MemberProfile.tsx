'use client';

import React from 'react';
import { Patient, Role } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { canAccessPatientReport, maskPatientForUnauthorizedView } from '@/lib/patientPrivacyService';
import { 
  ArrowLeft, HeartPulse, Activity, BrainCircuit, ActivitySquare, AlertTriangle, 
  MapPin, Phone, History, FileText, ClipboardList, User, ShieldCheck, Lock, UserCheck, Building2, Send
} from 'lucide-react';

interface MemberProfileProps {
  patient: Patient;
  role: Role;
  onBack: () => void;
  onOpenAction: (action: 'VITALS' | 'REFERRAL' | 'ABHA' | 'TIMELINE' | 'REFERRAL_STATUS') => void;
}

export default function MemberProfile({ patient, role, onBack, onOpenAction }: MemberProfileProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals, updateReferralStatus } = useSync();
  const [isCancelModalOpen, setIsCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  
  const activeReferral = referrals.find(
    r => r.patientId === patient.id && !['COMPLETED', 'CANCELLED'].includes(r.status)
  ) || (patient.activeReferralId ? referrals.find(r => r.id === patient.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(r.status)) : null);
  const isAdmitted = activeReferral?.status === 'ADMITTED';
  const isLocked = !!activeReferral && (role === 'asha' || role === 'phc_doctor'); // Strict RBAC lock: referring workers cannot edit if referral is actively in flight

  const decision = canAccessPatientReport(user, patient, { referrals });
  const isAuthorized = decision.allowed;
  const maskedPatient = maskPatientForUnauthorizedView(patient, decision);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 pb-24">
      
      {/* 1. Header & Core Identity (Matching Image 2) */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-xs cursor-pointer"
          title="Back to Patients Directory"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            {patient.fullName}
            {patient.isHighRiskPregnancy && (
              <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50">
                HIGH RISK
              </span>
            )}
          </h2>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>{patient.gender}</span> &bull; <span>{patient.age} years</span> &bull; <span className="font-mono text-slate-700 dark:text-slate-300">{patient.abhaId}</span>
          </div>
        </div>
      </div>

      
      {activeReferral && (
        <div className="mb-6 bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-2xl p-5 shadow-md flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/50">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-black text-slate-900 dark:text-white text-lg">REFERRAL ACTIVE</h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700`}>
                  {activeReferral.status}
                </span>
                {activeReferral.triagePriority && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeReferral.triagePriority === 'red'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      : activeReferral.triagePriority === 'yellow'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  }`}>
                    {activeReferral.triagePriority}
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                From: <strong className="text-slate-900 dark:text-white">{activeReferral.referringFacility}</strong> ({activeReferral.referringDoctorName || 'Referring Staff'}) &rarr; Target: <strong className="text-slate-900 dark:text-white">{activeReferral.targetFacility}</strong>
              </div>
              {activeReferral.referralReason && (
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Reason: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeReferral.referralReason}</span> ({activeReferral.specialtyRequired || 'General Medicine'})
                </div>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Token: <span className="font-mono font-bold">#{activeReferral.tokenCode || activeReferral.id}</span> &bull; {new Date(activeReferral.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* If user is at destination facility and status is PENDING or ACCEPTED, show Accept & Admit */}
            {['PENDING', 'ACCEPTED'].includes(activeReferral.status) &&
             ((activeReferral.targetFacilityId && user?.facilityId && activeReferral.targetFacilityId === user.facilityId) ||
              (activeReferral.targetFacility && user?.facilityName && activeReferral.targetFacility.toLowerCase().includes(user.facilityName.toLowerCase()))) && (
              <button 
                onClick={() => {
                  updateReferralStatus(activeReferral.id, 'ADMITTED', {
                    admittedAt: new Date().toISOString(),
                    admittedByDoctorName: user?.name,
                  });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-2xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Accept &amp; Admit Patient</span>
              </button>
            )}
            <button 
              onClick={() => onOpenAction('REFERRAL_STATUS')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700 whitespace-nowrap cursor-pointer text-center"
            >
              View Referral Timeline
            </button>
            {['PENDING', 'ACCEPTED', 'ESCALATED'].includes(activeReferral.status) && (
              <button 
                onClick={() => setIsCancelModalOpen(true)}
                className="px-4 py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 text-sm font-bold rounded-xl transition-colors border border-rose-200 dark:border-rose-800/30 whitespace-nowrap cursor-pointer text-center"
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rule-based Health Assistant Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-4 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-inner">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-1 flex items-center gap-2">
            Rule-based Care Insight
          </h4>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
            Patient exhibits consistently elevated blood pressure across the last 3 visits. Recommend scheduling an immediate follow-up evaluation and recording current vitals.
          </p>
          <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-2 font-medium">
            Rule-based insights are generated based on historical data. Verify clinically before action.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personal & Vitals */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Contact</div>
                <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" /> {maskedPatient.phone}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Address</div>
                <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" /> {patient.village}, {patient.district} District
                </div>
              </div>
            </div>
          </div>

          {/* Care Assignment & Privacy Protection Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> Care Assignment & Privacy
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Primary Attending Doctor</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{patient.assignedDoctorName || 'Dr. Rajesh Deshmukh'}</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Registered Facility</div>
                <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{patient.assignedFacilityName || 'Primary Health Centre'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Your Access Status</div>
                {isAuthorized ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-[11px]">Authorized Care Relationship</div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Full clinical report access verified</div>
                    </div>
                  </div>
                ) : decision.accessLevel === 'MEDICATION_ONLY' ? (
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 text-teal-800 dark:text-teal-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Pharmacist Dispensing View</span>
                    </div>
                    <p className="text-[10px] leading-tight text-teal-700 dark:text-teal-400">
                      Prescriptions accessible for medicine dispensing. Clinical notes and diagnoses restricted.
                    </p>
                  </div>
                ) : decision.accessLevel === 'CLINICAL_LIMITED' ? (
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Nursing & Triage View</span>
                    </div>
                    <p className="text-[10px] leading-tight text-blue-700 dark:text-blue-400">
                      Vitals and basic care accessible. Diagnostic lab reports restricted.
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[11px]">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Protected Medical Record</span>
                    </div>
                    <p className="text-[10px] leading-tight text-amber-700 dark:text-amber-400">
                      Under ABDM least-privilege policy, clinical encounter notes and lab reports are restricted to the attending doctor.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" /> Latest Vitals
            </h3>
            {isAuthorized || decision.accessLevel === 'CLINICAL_LIMITED' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Blood Pressure</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {patient.encounters[0]?.vitals
                        ? `${patient.encounters[0].vitals.systolicBp}/${patient.encounters[0].vitals.diastolicBp}`
                        : '120/80'}{' '}
                      <span className="text-xs font-medium text-slate-400">mmHg</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Heart Rate</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {patient.encounters[0]?.vitals?.heartRate || 74}{' '}
                      <span className="text-xs font-medium text-slate-400">bpm</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">SpO2</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {patient.encounters[0]?.vitals?.spO2 || 98}{' '}
                      <span className="text-xs font-medium text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Temp / Resp</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {patient.encounters[0]?.vitals?.temperature || 37.0}°C
                    </div>
                  </div>
                </div>
                {isLocked ? (
                  <div className="w-full mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-bold leading-tight">Record Locked<br/>Managed by {activeReferral?.targetFacility}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => onOpenAction('VITALS')}
                    className="w-full mt-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-lg transition-colors border border-blue-100 dark:border-blue-800/30"
                  >
                    + Update Vitals
                  </button>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Lock className="w-5 h-5 text-amber-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Clinical Vitals Protected</div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Hemodynamic vitals are restricted to authorized clinicians under ABDM Least-Privilege Policy.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Health Overview & History */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ActivitySquare className="w-4 h-4" /> Health Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">Known Conditions</div>
                <div className="flex flex-wrap gap-2">
                  {maskedPatient.chronicConditions && maskedPatient.chronicConditions.length > 0 ? (
                    maskedPatient.chronicConditions.map((cond, i) => (
                      <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700">
                        {cond}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No chronic conditions listed</span>
                  )}
                  {patient.isHighRiskPregnancy && (isAuthorized || decision.accessLevel === 'CLINICAL_LIMITED') && (
                    <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-md text-xs font-medium border border-rose-200 dark:border-rose-800">
                      Pregnancy (Week {patient.gestationalWeeks})
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold mb-2">Current Medications</div>
                <div className="flex flex-wrap gap-2">
                  {isAuthorized || decision.accessLevel === 'MEDICATION_ONLY' ? (
                    patient.encounters.flatMap(e => e.prescriptions || []).length > 0 ? (
                      patient.encounters.flatMap(e => e.prescriptions || []).map((rx, idx) => (
                        <span key={idx} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md text-xs font-medium border border-indigo-100 dark:border-indigo-800/50">
                          {rx.medicineName} ({rx.dosage})
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No active prescriptions</span>
                    )
                  ) : (
                    <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-md text-xs font-medium border border-amber-200 dark:border-amber-800">
                      [RESTRICTED - AUTHORIZED ONLY]
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Interactions
            </h3>
            
            {isAuthorized ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                {patient.encounters.map((enc, i) => (
                  <div key={enc.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{enc.diagnosis}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{enc.date}</span>
                      </div>
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-1">
                        {enc.facilityName} &bull; {enc.providerName}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{enc.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Lock className="w-6 h-6 text-amber-500 mx-auto" />
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clinical Encounters & Consultation Notes Restricted
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Under ABDM least-privilege standards, individual clinical notes, laboratory investigations, and treatment records are protected.
                </p>
              </div>
            )}

            <button 
              onClick={() => onOpenAction('TIMELINE')}
              className={`w-full mt-6 py-2.5 font-bold text-xs rounded-xl transition-all border flex items-center justify-center gap-2 ${
                isAuthorized
                  ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              {isAuthorized ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>View Full Medical Timeline</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>View Medical Timeline (Protected &bull; Break-Glass Override)</span>
                </>
              )}
            </button>
          </div>
          
        </div>
      </div>

      {/* Action Bar (Fixed at bottom for easy access) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-end gap-3 px-2 sm:px-6 lg:px-8">
          <button 
            onClick={() => onOpenAction('ABHA')}
            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> View ABHA Card
          </button>
          
          {activeReferral ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Referred
              </span>
              <button 
                onClick={() => onOpenAction('REFERRAL_STATUS')}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-2"
              >
                <Activity className="w-4 h-4 text-blue-600" /> View Referral
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onOpenAction('REFERRAL')}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer hover:scale-102"
            >
              <Send className="w-4 h-4" /> Refer to District Hospital
            </button>
          )}
          
          {isLocked ? (
            <div className="px-8 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-not-allowed">
              <AlertTriangle className="w-4 h-4" /> 🔒 Medical Record Locked
            </div>
          ) : (
            <button 
              onClick={() => onOpenAction('VITALS')}
              className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
            >
              <HeartPulse className="w-4 h-4" /> Record Vitals
            </button>
          )}
        </div>
      </div>

      {isCancelModalOpen && activeReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Cancel this referral?</h3>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mb-4">
              <div className="text-xs text-slate-500 uppercase font-bold">Patient</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{patient.fullName}</div>
              
              <div className="text-xs text-slate-500 uppercase font-bold mt-2">Referral</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{activeReferral.id}</div>
            </div>

            <div className="mb-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-rose-700 dark:text-rose-400 text-sm font-medium">
              Warning: This will withdraw the referral from the receiving facility. The receiving facility will no longer be able to admit the patient under this referral.
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                Cancellation Reason
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is this referral being cancelled?"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex gap-3 mt-auto">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition"
              >
                Keep Referral
              </button>
              <button 
                onClick={() => {
                  updateReferralStatus(activeReferral.id, 'CANCELLED', { 
                    cancellationReason: cancelReason || 'Cancelled by PHC', 
                    cancelledBy: 'PHC User', 
                    cancelledByRole: role 
                  });
                  setIsCancelModalOpen(false);
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition"
              >
                Cancel Referral
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
