'use client';
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, PrescriptionItem } from '@/lib/types';
import {
  Stethoscope, Pill, Send, CreditCard, FileText, Search,
  CheckCircle2, AlertTriangle, Clock, Plus, TestTube,
  Activity, History, Building2, ChevronRight,
  ArrowRight, ShieldCheck, Thermometer, UserSquare, ArrowRightCircle
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setselectedPatient] = useState<Patient | null>(patients[0] || null);
  const [activeTab, setActiveTab] = useState<'clinical' | 'prescriptions' | 'referral'>('clinical');

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.includes(q) ||
      p.phone.includes(q)
    );
  });

  const highRiskPatients = patients.filter(p => p.isHighRiskPregnancy || p.age <= 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. TOP KPI DASHBOARD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: language === 'mr' ? '???? ?????' : 'Patients Today', val: '42', icon: UserSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100' },
          { label: language === 'mr' ? '???????? ???????' : 'Incoming Referrals', val: '8', icon: ArrowRightCircle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100' },
          { label: language === 'mr' ? '???????????' : 'High-Risk Cases', val: highRiskPatients.length.toString(), icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100' },
          { label: language === 'mr' ? '???? ????-??' : 'Follow-ups', val: '14', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100' },
          { label: language === 'mr' ? '?????? ????' : 'District Beds', val: '32 / 50', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100' },
        ].map((kpi, idx) => (
          <div key={idx} className={"bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow " + kpi.border}>
            <div className="flex justify-between items-start mb-2">
              <div className={"w-8 h-8 rounded-full flex items-center justify-center " + kpi.bg}>
                <kpi.icon className={"w-4 h-4 " + kpi.color} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{kpi.val}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. MAIN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px]">
        
        {/* LEFT: INCOMING QUEUE (ASHA Referrals + OPD) */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-hidden h-full">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                {language === 'mr' ? '????? ????' : 'Clinical Queue'}
              </h3>
              <div className="relative mt-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'mr' ? '????? ????...' : 'Search queue...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all shadow-sm dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredPatients.map(patient => {
                const isSelected = selectedPatient?.id === patient.id;
                const isHighRisk = patient.isHighRiskPregnancy || patient.age <= 5;
                return (
                  <button
                    key={patient.id}
                    onClick={() => setselectedPatient(patient)}
                    className={"w-full text-left p-3 rounded-xl transition-all border flex gap-3 " + (isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm' : 'bg-white dark:bg-slate-900 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700')}
                  >
                    <div className={"w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 " + (isHighRisk ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300')}>
                      {patient.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{patient.fullName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{patient.age}y &middot; {patient.gender === 'Female' ? 'Female' : 'Male'}</div>
                      {isHighRisk && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded mt-1">
                          <AlertTriangle className="w-3 h-3" /> ASHA Flagged
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER & RIGHT: CLINICAL COMMAND CENTER */}
        <div className="lg:col-span-9 flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          {selectedPatient ? (
            <>
              {/* Context Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-start gap-4 bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-xl shadow-inner border border-blue-300 dark:border-blue-700/30">
                    {selectedPatient.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedPatient.fullName}</h2>
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> ABHA: {selectedPatient.abhaId}</span>
                      <span className="text-slate-300">|</span>
                      <span>{selectedPatient.age} years</span>
                      <span className="text-slate-300">|</span>
                      <span>{selectedPatient.gender === 'Female' ? 'Female' : 'Male'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onOpenPatientTimeline(selectedPatient)} className="px-4 py-2 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-2">
                    <Activity className="w-4 h-4" /> EHR Timeline
                  </button>
                  <button onClick={() => onOpenReferral(selectedPatient)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                    <Send className="w-4 h-4" /> Create Referral
                  </button>
                </div>
              </div>

              {/* Clinical Advisory Ribbon */}
              <div className="bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 via-purple-50 dark:via-purple-900/20 to-blue-50 dark:to-blue-900/20 px-6 py-4 border-b border-indigo-100/50 flex gap-4">
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-indigo-100 h-fit">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest mb-1 flex items-center gap-2">
                    Clinical Advisory <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm">ACTIVE</span>
                  </h4>
                  {selectedPatient.isHighRiskPregnancy ? (
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                      Patient screening indicates elevated risk (Severe Anemia). Clinical protocol suggests <strong className="text-rose-600">Immediate Secondary Care</strong>.
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => onOpenReferral(selectedPatient)} className="text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 transition-colors">
                          Refer to District Hospital
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium">Final decision remains with the authorized MO.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Vitals within normal parameters. Routine primary care pathway recommended. No immediate systemic risks detected.
                    </div>
                  )}
                </div>
              </div>

              {/* Workspace Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800/30">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* Left: Vitals & History */}
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-4 flex items-center gap-2"><Thermometer className="w-4 h-4 text-blue-500" /> Latest Vitals (ASHA Sync)</h3>
                      {selectedPatient.encounters[0]?.vitals ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Blood Pressure</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPatient.encounters[0].vitals.systolicBp}/{selectedPatient.encounters[0].vitals.diastolicBp} <span className="text-xs text-slate-400 font-medium">mmHg</span></div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Heart Rate</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPatient.encounters[0].vitals.heartRate} <span className="text-xs text-slate-400 font-medium">bpm</span></div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">SpO2</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPatient.encounters[0].vitals.spO2}%</div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Temperature</div>
                            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPatient.encounters[0].vitals.temperature}°C</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400 italic py-4">No recent vitals synchronized.</div>
                      )}
                    </div>
                    
                    {/* Visual Referral Pipeline (Empty/Active state depending on patient) */}
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50 dark:bg-slate-800/50">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">No Patient Selected</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Select a patient from the incoming queue on the left to review vitals, AI intelligence, and write prescriptions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




