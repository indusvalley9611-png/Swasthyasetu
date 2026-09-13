'use client';
import React, { useState } from 'react';
import { Patient, ClinicalEncounter } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { X, CreditCard, Send, Calendar, Building2, User, Heart, Activity, FileText, Pill, TestTube, AlertTriangle, Clock, ShieldCheck, Link2, Download, Database } from 'lucide-react';

interface PatientTimelineModalProps {
  patient: Patient | null;
  onClose: () => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

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
  const [activeTab, setActiveTab] = useState<'timeline' | 'vitals' | 'meds' | 'labs'>('timeline');

  if (!patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700/60">
        
        {/* PREMIUM HEADER */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-5 flex flex-wrap justify-between items-start gap-6">
          <div className="flex gap-5 items-start">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-2xl shadow-inner border border-blue-300 dark:border-blue-700/30">
              {patient.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{patient.fullName}</h2>
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 tracking-wide uppercase">ABHA Linked</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">
                <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-slate-400" /> {patient.abhaId}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.age}y &middot; {patient.gender === 'Female' ? 'Female' : 'Male'} &middot; Blood: {patient.bloodGroup}</span>
                <span className="text-slate-300">|</span>
                <span>{patient.village}, {patient.district}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => onOpenAbhaCard(patient)} className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-slate-400 rounded-xl shadow-sm transition-all flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" /> ABHA Profile
            </button>
            <button onClick={() => { onClose(); onOpenReferral(patient); }} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all flex items-center gap-2">
              <Send className="w-4 h-4" /> Create Smart Referral
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 rounded-xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CLINICAL ALERTS */}
        {(patient.isHighRiskPregnancy || (patient.chronicConditions && patient.chronicConditions.length > 0)) && (
          <div className="bg-rose-50 dark:bg-rose-900/80 border-b border-rose-100 px-6 py-3 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-widest mr-2">Clinical Flags:</span>
              {patient.isHighRiskPregnancy && (
                <span className="bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 text-xs font-bold px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-800 shadow-sm">High Risk Pregnancy (Week {patient.gestationalWeeks})</span>
              )}
              {patient.chronicConditions?.map((cond, i) => (
                <span key={i} className="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">{cond}</span>
              ))}
            </div>
          </div>
        )}

        {/* EHR NAVIGATION */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 flex gap-6 text-sm font-bold text-slate-500 dark:text-slate-400">
          {[
            { id: 'timeline', label: 'Longitudinal Timeline', icon: Clock },
            { id: 'vitals', label: 'Flowsheet & Vitals', icon: Activity },
            { id: 'meds', label: 'Medications', icon: Pill },
            { id: 'labs', label: 'Diagnostics', icon: TestTube }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={"py-4 border-b-2 flex items-center gap-2 transition-colors " + (activeTab === tab.id ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600')}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800/50">
          
          {activeTab === 'timeline' && (
            <div className="max-w-3xl mx-auto space-y-8 py-4">
              {patient.encounters.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">No encounters recorded yet.</div>
              ) : (
                patient.encounters.map((enc, idx) => (
                  <div key={enc.id} className="relative pl-10 before:absolute before:inset-y-0 before:-bottom-8 before:left-[19px] before:w-px before:bg-slate-200 dark:bg-slate-700 last:before:hidden">
                    {/* Timeline Node */}
                    <div className="absolute left-[9px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-[3px] border-blue-500 shadow-sm ring-4 ring-slate-50 z-10" />
                    
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base">{enc.diagnosis}</h3>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {enc.date}</span>
                            <span className="text-slate-300">|</span>
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {enc.facilityName} ({enc.facilityType})</span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-bold text-slate-700 dark:text-slate-200">{enc.providerName}</div>
                          <div className="text-slate-500 dark:text-slate-400">{enc.providerRole}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Chief Complaints */}
                        {enc.chiefComplaints && enc.chiefComplaints.length > 0 && (
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Chief Complaints</div>
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{enc.chiefComplaints.join(', ')}</div>
                          </div>
                        )}

                        {/* Vitals Summary */}
                        {enc.vitals && (
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vitals Captured</div>
                            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                              <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded">BP: {enc.vitals.systolicBp}/{enc.vitals.diastolicBp}</span>
                              <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded">HR: {enc.vitals.heartRate}</span>
                              <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded">Temp: {enc.vitals.temperature}°C</span>
                              <span className="bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded">SpO2: {enc.vitals.spO2}%</span>
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        {enc.prescriptions && enc.prescriptions.length > 0 && (
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Pill className="w-3 h-3 text-emerald-500" /> Prescriptions Issued</div>
                            <div className="space-y-2">
                              {enc.prescriptions.map((rx, i) => (
                                <div key={i} className="flex flex-wrap items-center justify-between text-xs bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 p-2.5 rounded-lg">
                                  <div className="font-bold text-emerald-900 dark:text-emerald-200">{rx.medicineName} <span className="font-normal text-emerald-700 dark:text-emerald-400 ml-1">{rx.dosage}</span></div>
                                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">{rx.frequency} for {rx.durationDays} days</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {enc.notes && (
                          <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-100 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-1">Clinical Notes</div>
                            <div className="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">{enc.notes}</div>
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4">
                <Database className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Detailed View Available in ABDM Network</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">The full flowsheet data can be retrieved from the central HIE (Health Information Exchange) when needed.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}









