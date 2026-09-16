'use client';
import React, { useState } from 'react';
import { Patient, Referral } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import {
  X, Send, Activity, AlertTriangle, CheckCircle2, ChevronRight, 
  Stethoscope, Clock, ShieldCheck
} from 'lucide-react';

interface SmartReferralModalProps {
  patient: Patient;
  onClose: () => void;
  onReferralCreated: (referral: Referral) => void;
}

export function SmartReferralModal({
  patient,
  onClose,
  onReferralCreated,
}: SmartReferralModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { createReferral } = useSync();

  const [step, setStep] = useState<1 | 2>(1);

  const [selectedSpecialty, setSelectedSpecialty] = useState(patient.gender === 'Female' && patient.isHighRiskPregnancy ? 'Obstetrics & Gynecology' : 'General Medicine');
  const [selectedFacility, setSelectedFacility] = useState('District Hospital Aundh, Pune');
  const [priority, setPriority] = useState<'routine' | 'high'>(patient.isHighRiskPregnancy ? 'high' : 'routine');
  const [reason, setReason] = useState(patient.isHighRiskPregnancy ? 'High risk pregnancy with severe anemia. Needs immediate secondary care observation.' : '');

  const handleSubmit = () => {
    const newRef: Referral = {
      id: 'REF-' + Date.now().toString().slice(-6),
      tokenCode: 'MH-REF-' + Date.now().toString().slice(-4),
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      patientAge: patient.age,
      patientGender: patient.gender,
      referringFacility: user.facilityName,
      referringFacilityId: user.facilityId,
      referringDoctorName: user.name,
      referringUserId: user.id,
      targetFacility: selectedFacility,
      targetFacilityId: selectedFacility.includes('Sassoon') ? 'fac-sassoon-pune' : selectedFacility.includes('Aundh') ? 'fac-dh-pune' : selectedFacility.includes('Bhor') ? 'fac-rh-bhor' : selectedFacility.includes('Nashik') ? 'fac-dh-nashik' : 'fac-dh-pune',
      specialtyRequired: selectedSpecialty,
      triagePriority: (priority === 'high' ? 'red' : 'green') as 'red' | 'yellow' | 'green',
      triageScore: priority === 'high' ? 8 : 2,
      triageReasons: [],
      vitalsAtReferral: patient.encounters[0]?.vitals || { systolicBp: 120, diastolicBp: 80, heartRate: 75, spO2: 98, respiratoryRate: 16, temperature: 37.0, consciousLevel: 'alert', recordedAt: new Date().toISOString() },
      qrPayload: 'https://swasthyasetu.gov.in/verify/MH-REF-' + Date.now().toString().slice(-4),
      referralReason: reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    createReferral(newRef);

    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      action: 'CREATE_REFERRAL',
      resource: `Referral Token ${newRef.tokenCode} to ${selectedFacility}`,
      accessGranted: true,
      reason: `Clinical Referral Created: ${selectedSpecialty} - ${reason || 'Specialist Evaluation'}`,
    });

    onReferralCreated(newRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Create Referral</h2>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Patient: <span className="text-slate-800 dark:text-slate-100">{patient.fullName}</span> (ABHA: {patient.abhaId})</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-center items-center relative bg-white dark:bg-slate-900">
          <div className="absolute top-1/2 left-20 right-20 h-0.5 bg-slate-100 dark:bg-slate-950 -translate-y-1/2 z-0"></div>
          
          <div className="w-full max-w-sm flex justify-between">
            {[
              { num: 1, label: 'Clinical Details' },
              { num: 2, label: 'Confirm' }
            ].map(s => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-2">
                  <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all " + 
                    (isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' : 
                     isPast ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400')}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <div className={"text-[10px] font-bold uppercase tracking-widest " + (isActive || isPast ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-400')}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800/50">
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">
              
              {patient.isHighRiskPregnancy && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 rounded-xl p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-rose-900 dark:text-rose-200">High Risk Pregnancy Flagged</div>
                    <div className="text-xs text-rose-700 dark:text-rose-400 font-medium mt-1">Gestational Week {patient.gestationalWeeks}. Patient requires priority escalation.</div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-slate-400" /> Referral Routing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Destination Facility</label>
                    <select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                      <option>District Hospital Aundh, Pune</option>
                      <option>Sassoon General Hospital, Pune</option>
                      <option>Rural Hospital Bhor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Target Specialty</label>
                    <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50">
                      <option>Obstetrics & Gynecology</option>
                      <option>Cardiology</option>
                      <option>General Medicine</option>
                      <option>Pediatrics</option>
                    </select>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Clinical Urgency</label>
                  <div className="flex gap-3">
                    <button onClick={() => setPriority('high')} className={"flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all " + (priority === 'high' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                      <AlertTriangle className="w-4 h-4" /> Critical / Immediate
                    </button>
                    <button onClick={() => setPriority('routine')} className={"flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all " + (priority === 'routine' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}>
                      <Clock className="w-4 h-4" /> Routine
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Clinical Referral Notes</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the clinical reason for this referral..." rows={3} className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:bg-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800/50"></textarea>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex justify-center items-center gap-2">
                  Proceed to Final Confirmation <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Confirmation */}
          {step === 2 && (
            <div className="max-w-xl mx-auto space-y-6 text-center animate-in slide-in-from-right-8 duration-300 py-6">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Confirm Referral Details</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">A secure referral token will be generated on the ABDM network and routed to the destination triage queue.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl text-left mt-6 space-y-3 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Patient</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{patient.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Destination</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedFacility}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Specialty</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedSpecialty}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Priority</span>
                  <span className={"text-xs font-bold px-2 py-1 rounded " + (priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400')}>
                    {priority === 'high' ? 'CRITICAL' : 'ROUTINE'}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button onClick={() => setStep(1)} className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">Back</button>
                <button onClick={handleSubmit} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex justify-center items-center gap-2">
                  <Send className="w-4 h-4" /> Generate Secure Referral
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
