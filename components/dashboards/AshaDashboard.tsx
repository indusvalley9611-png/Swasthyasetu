'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, Vitals, FollowUpTask } from '@/lib/types';
import { INITIAL_FOLLOWUPS } from '@/lib/mockData';
import {
  HeartPulse,
  Baby,
  Activity,
  AlertTriangle,
  UserPlus,
  Send,
  CheckCircle2,
  FileCheck,
  Search,
  WifiOff,
  Stethoscope,
  Mic,
  Clock,
  CreditCard,
  CalendarCheck,
  BellRing,
  Phone,
  Flame,
  Siren,
} from 'lucide-react';
import Link from 'next/link';

interface AshaDashboardProps {
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function AshaDashboard({
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
}: AshaDashboardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { patients, addClinicalEncounter, isSimulatedOffline, syncQueue } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientForScreening, setSelectedPatientForScreening] = useState<Patient | null>(null);
  const [currentTab, setCurrentTab] = useState<'pending' | 'referrals' | 'sync'>('pending');
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'WATCHLIST' | 'FOLLOWUPS'>('WATCHLIST');
  const [followups, setFollowups] = useState<FollowUpTask[]>(INITIAL_FOLLOWUPS);
  const [dictationLang, setDictationLang] = useState<'mr-IN' | 'en-IN' | 'hi-IN'>('mr-IN');

  // Quick screening vitals state
  const [systolicBp, setSystolicBp] = useState<number>(120);
  const [diastolicBp, setDiastolicBp] = useState<number>(80);
  const [spO2, setSpO2] = useState<number>(98);
  const [heartRate, setHeartRate] = useState<number>(76);
  const [bloodGlucose, setBloodGlucose] = useState<number>(100);
  const [hemoglobin, setHemoglobin] = useState<number>(11.5);
  const [chiefComplaints, setChiefComplaints] = useState<string>('');

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.includes(q) ||
      p.phone.includes(q) ||
      p.village.toLowerCase().includes(q)
    );
  });

  // High risk patients subset
  const highRiskPatients = patients.filter(
    (p) => p.isHighRiskPregnancy || p.age <= 5 || (p.chronicConditions && p.chronicConditions.length > 0)
  );

  const handleSaveScreening = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForScreening) return;

    const newVitals: Vitals = {
      systolicBp,
      diastolicBp,
      heartRate,
      spO2,
      respiratoryRate: 18,
      temperature: 37.0,
      bloodGlucose,
      hemoglobin,
      consciousLevel: 'alert',
      recordedAt: new Date().toISOString(),
    };

    const isHrpAlert = systolicBp >= 140 || hemoglobin < 9 || (selectedPatientForScreening.isPregnant && systolicBp >= 135);

    const encounter = {
      id: 'enc-' + Date.now(),
      patientId: selectedPatientForScreening.id,
      date: new Date().toISOString().split('T')[0],
      facilityName: user.facilityName,
      facilityType: 'Sub-Centre',
      providerName: user.name,
      providerRole: 'ASHA Facilitator',
      chiefComplaints: [chiefComplaints],
      diagnosis: isHrpAlert
        ? 'High Risk Assessment Flagged (Hypertension / Anemia risk)'
        : 'Routine Community Health Screening',
      vitals: newVitals,
      notes: `Screening completed by ASHA at village sub-centre. ${isHrpAlert ? 'URGENT: Escalated to Medical Officer Velhe PHC.' : 'Vitals stable.'}`,
    };

    addClinicalEncounter(selectedPatientForScreening.id, encounter);
    setSelectedPatientForScreening(null);
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(language === 'mr' ? 'तुमचा ब्राउझर व्हॉइस टायपिंगला सपोर्ट करत नाही.' : 'Your browser does not support voice typing.');
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Use the explicitly selected dictation language
    recognition.lang = dictationLang;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setIsRecording(true);
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChiefComplaints((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognition.start();
  };

  return (
    <div className="space-y-6">
      {/* ASHA Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-blue-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              <span>{language === 'mr' ? 'उपकेंद्र व आरोग्यवर्धिनी केंद्र पोर्टल' : 'Sub-Centre & Ayushman Arogya Mandir'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1">
              {language === 'mr' ? `नमस्ते, ${user.name}` : `Welcome, ${user.name}`}
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
              {user.facilityName} • {user.taluka}, {user.district} ({user.registrationNumber})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 dark:text-slate-100 font-bold px-4 py-2.5 rounded-xl shadow transition-colors text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'mr' ? '+ नवीन रुग्ण नोंदणी' : '+ Register Patient'}</span>
            </button>
          </div>
        </div>

        {/* Offline indicator message */}
        {isSimulatedOffline && (
          <div className="mt-4 bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-200">
            <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              {language === 'mr'
                ? `ऑफलाइन मोड सक्रिय: तुम्ही नोंदवलेली सर्व माहिती स्थानिक फोन मेमरीत सुरक्षित राहील. (साठवलेल्या नोंदी: ${syncQueue.length})`
                : `Offline Mode Active: All screenings and registrations are stored locally in IndexedDB outbox. (${syncQueue.length} queued)`}
            </span>
          </div>
        )}
      </div>

      {/* Urgent Medicine Support Banner (Direct from User's Design Mockup) */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 dark:from-rose-950/40 dark:via-red-950/30 dark:to-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0">
            <Flame className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {language === 'mr' ? 'तातडीने औषध पुरवठा हवा आहे का?' : 'Need Urgent Medicine Support?'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {language === 'mr'
                ? 'तुमच्या गावातून किंवा उपकेंद्रातून औषधांचा तुटवडा नोंदवा.'
                : 'Report medicine shortage or emergency need from your village.'}
            </p>
          </div>
        </div>
        <Link
          href="/maha-aushadhi"
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <Siren className="w-4 h-4" />
          <span>{language === 'mr' ? 'आपत्कालीन औषध मागणी' : 'Request Emergency Medicine'}</span>
        </Link>
      </div>

      {/* Quick Action Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
            {language === 'mr' ? 'एकूण नोंदणीकृत रुग्ण' : 'Total Patients Registered'}
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{patients.length}</span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">ABHA Integrated</span>
        </div>

        <div className="bg-rose-50/70 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm">
          <span className="text-[11px] text-rose-800 dark:text-rose-300 block font-medium">
            {language === 'mr' ? 'अतिधोकादायक गरोदर माता (HRP)' : 'High Risk Pregnancies'}
          </span>
          <span className="text-2xl font-bold text-rose-900 dark:text-rose-200">
            {patients.filter((p) => p.isHighRiskPregnancy).length}
          </span>
          <span className="text-[10px] text-rose-700 dark:text-rose-400 block mt-0.5">Priority Monitoring</span>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
          <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-medium">
            {language === 'mr' ? 'सक्रिय रेफरल पाठवले' : 'Active Referrals Sent'}
          </span>
          <span className="text-2xl font-bold text-amber-900 dark:text-amber-200">
            {patients.filter((p) => p.activeReferralId).length}
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-0.5">En route to PHC/RH</span>
        </div>

        <div className="bg-blue-50/70 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
          <span className="text-[11px] text-blue-800 dark:text-blue-300 block font-medium">
            {language === 'mr' ? 'ऑफलाइन रांगेत नोंदी' : 'Offline Sync Outbox'}
          </span>
          <span className="text-2xl font-bold text-blue-950 dark:text-blue-100 dark:text-blue-100">{syncQueue.length}</span>
          <span className="text-[10px] text-blue-700 dark:text-blue-400 block mt-0.5">Auto-sync on reconnect</span>
        </div>
      </div>

      {/* Main ASHA Layout: High-Risk Action Cards + Quick Screening Modal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: High-Risk Pregnant Women & Children Action Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>
                    {language === 'mr' ? 'प्राधान्य तपासणी यादी (High-Risk Watchlist)' : 'High-Risk Priority Action List'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'mr'
                    ? 'गरोदर माता, बालके व तीव्र लक्षणे असलेल्या रुग्णांवर त्वरित लक्ष द्या'
                    : 'Pregnant mothers, infants, and high-risk chronic patients requiring rapid evaluation'}
                </p>
              </div>

              {/* Patient Quick Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'नाव किंवा आभा आयडी शोधा...' : 'Search name or ABHA...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('WATCHLIST')}
                className={`pb-2 px-3 border-b-2 transition-colors ${
                  activeTab === 'WATCHLIST'
                    ? 'border-teal-600 text-teal-900 dark:text-teal-200 font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {language === 'mr' ? 'प्राधान्य रुग्ण यादी' : 'Priority Patient Watchlist'} ({filteredPatients.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('FOLLOWUPS')}
                className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'FOLLOWUPS'
                    ? 'border-rose-600 text-rose-900 dark:text-rose-200 font-bold'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                }`}
              >
                <BellRing className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'mr' ? 'फॉलो-अप व लसीकरण स्मरणपत्रे' : 'Follow-up & Continuity Alerts'}</span>
                <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {followups.filter((f) => f.status === 'OVERDUE').length} Overdue
                </span>
              </button>
            </div>

            {/* Content for Follow-ups Tab */}
            {activeTab === 'FOLLOWUPS' ? (
              <div className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs text-amber-950 dark:text-amber-100 dark:text-amber-100 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Continuity of Care Engine:</strong> Automated SMS reminders sent to registered mobile numbers. Flagged for village doorstep visit.
                  </span>
                </div>

                {followups.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border flex flex-wrap justify-between items-center gap-2 ${
                      task.status === 'OVERDUE'
                        ? 'bg-rose-50/70 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
                        : task.status === 'COMPLETED'
                        ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{task.patientName}</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            task.status === 'OVERDUE'
                              ? 'bg-rose-600 dark:bg-rose-500/20 text-white dark:text-rose-300 animate-pulse'
                              : task.status === 'COMPLETED'
                              ? 'bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-300'
                              : 'bg-amber-500 dark:bg-amber-500/20 text-slate-950 dark:text-amber-300'
                          }`}
                        >
                          {task.status}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200 font-medium">
                          {task.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">{task.notes}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Due: {task.dueDate} &bull; Phone: {task.patientPhone} &bull; Assigned: {task.assignedAshaName}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {task.status !== 'COMPLETED' ? (
                        <button
                          type="button"
                          onClick={() =>
                            setFollowups(
                              followups.map((f) => (f.id === task.id ? { ...f, status: 'COMPLETED' } : f))
                            )
                          }
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Visited</span>
                        </button>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Done</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List of Patients */
              <div className="space-y-3">
              {filteredPatients.map((pat) => {
                const isHrp = pat.isHighRiskPregnancy;
                const hasReferral = pat.activeReferralId;

                return (
                  <div
                    key={pat.id}
                    onClick={() => onOpenPatientTimeline(pat)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                      isHrp
                        ? 'bg-rose-50/50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 hover:border-rose-400'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700'
                    }`}
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm hover:text-teal-700 dark:hover:text-teal-400 transition-colors">{pat.fullName}</h4>
                          {isHrp && (
                            <span className="text-[10px] font-bold bg-rose-600 dark:bg-rose-500/20 text-white dark:text-rose-300 px-2 py-0.5 rounded-full uppercase">
                              HRP Risk
                            </span>
                          )}
                          {hasReferral && (
                            <span className="text-[10px] font-bold bg-amber-500 dark:bg-amber-500/20 text-slate-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                              Referral Active
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          {pat.gender} • {pat.age} Yrs • Blood: <span className="font-semibold">{pat.bloodGroup}</span>
                          {pat.isPregnant && (
                            <span className="ml-2 font-bold text-rose-800 dark:text-rose-300">
                              (Week {pat.gestationalWeeks} Pregnant)
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-blue-900 dark:text-blue-200">
                          ABHA: {pat.abhaId} • Phone: {pat.phone} • {pat.village}
                        </div>
                      </div>

                      {/* Action buttons for ASHA */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPatientForScreening(pat); }}
                          className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-lg shadow transition-colors flex items-center gap-1"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'तपासणी नोंदवा' : 'Screen Vitals'}</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenReferral(pat); }}
                          className="px-3 py-1.5 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow transition-colors flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'रेफर करा' : 'Refer'}</span>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenPatientTimeline(pat); }}
                          className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
                        >
                          {language === 'mr' ? 'इतिहास' : 'EHR'}
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenAbhaCard(pat); }}
                          className="p-1.5 text-xs bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-blue-800 dark:text-blue-300 rounded-lg border border-slate-300 dark:border-slate-600"
                          title="View ABHA Card"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Right Column: Rapid Screening Form / ASHA Field Protocol */}
        <div className="space-y-4">
          {selectedPatientForScreening ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border-2 border-teal-600 shadow-md p-5 space-y-4 animate-in fade-in">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase">
                    {language === 'mr' ? 'उपकेंद्र जलद तपासणी फॉर्म' : 'Rapid Screening Form'}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedPatientForScreening.fullName}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    ABHA: {selectedPatientForScreening.abhaId}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatientForScreening(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveScreening} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('systolicBp')} (mmHg)
                    </label>
                    <input
                      type="number"
                      value={systolicBp}
                      onChange={(e) => setSystolicBp(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold font-mono ${
                        systolicBp >= 140 ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('diastolicBp')} (mmHg)
                    </label>
                    <input
                      type="number"
                      value={diastolicBp}
                      onChange={(e) => setDiastolicBp(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('spO2')} (%)
                    </label>
                    <input
                      type="number"
                      value={spO2}
                      onChange={(e) => setSpO2(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold font-mono ${
                        spO2 < 94 ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('heartRate')} (bpm)
                    </label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('hemoglobin')} (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={hemoglobin}
                      onChange={(e) => setHemoglobin(parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold font-mono ${
                        hemoglobin < 9.0 ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      {t('bloodGlucose')} (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={bloodGlucose}
                      onChange={(e) => setBloodGlucose(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-200">
                      {language === 'mr' ? 'लक्षणे व तक्रारी' : 'Chief Symptoms'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select 
                        value={dictationLang}
                        onChange={(e) => setDictationLang(e.target.value as any)}
                        className="text-[10px] border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500"
                        title="Select Dictation Language"
                      >
                        <option value="mr-IN">Marathi</option>
                        <option value="hi-IN">Hindi</option>
                        <option value="en-IN">English</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={startDictation}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          isRecording 
                            ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 animate-pulse' 
                            : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700'
                        }`}
                        title={language === 'mr' ? 'बोलून टाईप करा' : 'Voice Typing'}
                      >
                        <Mic className={`w-3 h-3 ${isRecording ? 'text-rose-600' : ''}`} />
                        <span>{isRecording ? (language === 'mr' ? 'ऐकत आहे...' : 'Listening...') : (language === 'mr' ? 'व्हॉइस टायपिंग' : 'Voice Type')}</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder={language === 'mr' ? 'रुग्णाची लक्षणे टाईप करा किंवा बोला...' : 'Type or speak symptoms...'}
                    className={`w-full px-3 py-1.5 border rounded-lg text-xs transition-colors ${
                      isRecording ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white'
                    }`}
                  />
                </div>

                {/* Automatic Risk Warning */}
                {(systolicBp >= 140 || hemoglobin < 9.0 || spO2 < 94) && (
                  <div className="bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 p-2.5 rounded-lg text-[11px] font-medium border border-rose-300 dark:border-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>{language === 'mr' ? 'धोकादायक निर्देशक आढळला:' : 'High-Risk Indicator Detected:'}</strong>{' '}
                      {systolicBp >= 140 && 'High Blood Pressure. '}
                      {hemoglobin < 9.0 && 'Severe Anemia risk. '}
                      {spO2 < 94 && 'Low Oxygen Saturation. '}
                      {language === 'mr' ? 'रेफरल त्वरित तयार करा.' : 'Recommend Immediate Referral to PHC.'}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{t('saveOffline')}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center space-y-3">
              <Stethoscope className="w-8 h-8 text-teal-600 mx-auto" />
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                {language === 'mr' ? 'रुग्ण शारीरिक तपासणी (Screening)' : 'Start Patient Screening'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'mr'
                  ? 'डाव्या बाजूच्या यादीतून कोणत्याही रुग्णास निवडून "तपासणी नोंदवा" बटनावर क्लिक करा.'
                  : 'Select any patient from the list on the left and click "Screen Vitals" to record real-time observations.'}
              </p>
            </div>
          )}

          {/* Rural Field Protocol Guidelines */}
          <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-blue-950 dark:text-blue-100 dark:text-blue-100 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>{language === 'mr' ? 'आशा सेविका मार्गदर्शक तत्त्वे' : 'ASHA Protocol Guidelines'}</span>
            </h4>
            <ul className="text-slate-600 dark:text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
              <li>• <strong>गरोदर माता (ANC)</strong>: प्रत्येक भेटीत रक्तदाब (BP) आणि हिमोग्लोबिन मोजा.</li>
              <li>• <strong>BP &gt; १४०/९०</strong> असल्यास त्वरित प्राथमिक आरोग्य केंद्रात (PHC) वैद्यकीय अधिकाऱ्यांकडे रेफर करा.</li>
              <li>• <strong>अतिसार व डिहायड्रेशन</strong>: बालकास त्वरित ओआरएस (ORS) व झिंक सिरप सुरू करा.</li>
              <li>• <strong>१०८ रुग्णवाहिका</strong>: अतिदक्षता स्थितीत तातडीने १०८ कॉल करून डिजिटल टोकन दाखवा.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}



