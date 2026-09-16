'use client';

import React, { useState } from 'react';
import { Role } from '@/lib/types';
import { useAuth, PRE_REGISTERED_STAFF } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import {
  Users,
  Stethoscope,
  Building2,
  HeartPulse,
  Languages,
  Moon,
  Sun,
  Shield,
  ShieldCheck,
  Phone,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  Play,
  Check,
  Lock,
  HelpCircle,
  User,
  ChevronRight,
} from 'lucide-react';

interface LandingPortalProps {
  onSelectRole: (role: Role | 'patient') => void;
  onOpenEmergency: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function LandingPortal({
  onSelectRole,
  onOpenEmergency,
  isDarkMode,
  onToggleDarkMode,
}: LandingPortalProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const {
    effectiveOnline,
    isSimulatedOffline,
    isSyncing,
    syncQueue,
    triggerManualSync,
    toggleSimulatedOffline,
  } = useSync();

  // Mode: Field Mode (large touch targets for frontline workers) vs Admin Mode (dense overview)
  const [viewMode, setViewMode] = useState<'FIELD' | 'ADMIN'>('FIELD');

  // Interactive 60-Second Value Chain Walkthrough Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);

  // Compliance Explainer Modal State
  const [complianceModal, setComplianceModal] = useState<'ABDM' | 'DISHA' | 'OFFLINE' | null>(null);

  // Handle Quick Demo Auto-Login
  const handleLaunchAshaDemo = async () => {
    setIsDemoModalOpen(false);
    const ashaPhone = PRE_REGISTERED_STAFF['user-asha-01']?.phone || '9822019284';
    await sendOtp(ashaPhone);
    await verifyOtp(ashaPhone, '123456');
  };

  const isMr = language === 'mr';

  // 60-Second Closed-Loop Demo Steps (Strictly Single Language)
  const demoSteps = isMr
    ? [
        {
          step: 1,
          tag: 'उपकेंद्र गाव पातळी · ऑफलाईन',
          title: 'दुर्गम वस्तीत आशा कार्यकर्त्याकडून गरोदर मातेची तपासणी',
          role: 'सुनिता गायकवाड (आशा कार्यकर्त्या - वेल्हे तालुका)',
          desc: 'सुनिता यांनी मोबाईल नेटवर्क नसतानाही प्रिया कांबळे यांचा उच्च रक्तदाब (१५०/९५ mmHg) नोंदवला. ही नोंद स्थानिक पातळीवर सुरक्षितपणे एनक्रिप्ट करून साठवली गेली.',
          badge: 'स्थानिक IndexedDB मध्ये सुरक्षित',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          icon: Users,
        },
        {
          step: 2,
          tag: 'नेटवर्क पूर्ववत',
          title: 'केंद्राच्या मुख्य सर्व्हरशी सुरक्षित डेटा समक्रमण',
          role: 'स्वास्थ्यसेतू ऑफलाईन इंजिन',
          desc: 'सुनिता नेटवर्क क्षेत्रात येताच, पार्श्वभूमीतील सिंक यंत्रणेने सर्व प्रलंबित नोंदी आपोआप पुणे जिल्हा आरोग्य केंद्राकडे पाठवल्या.',
          badge: 'शून्य डेटा हानी · समक्रमित',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          icon: RefreshCw,
        },
        {
          step: 3,
          tag: 'प्राथमिक आरोग्य केंद्र',
          title: 'वैद्यकीय अधिकाऱ्यांकडून EHR तपासणी व AI-आधारित ट्रायज',
          role: 'डॉ. स्नेहा जोशी (वैद्यकीय अधिकारी - वेल्हे प्रा.आ.के.)',
          desc: 'डॉ. जोशी यांनी नोंदी तपासल्या. प्रणालीने प्री-एक्लॅम्पसियाचा धोका (धोका गुण: ८८/१००, लाल प्राधान्य) ओळखून जिल्हा रुग्णालयाच्या अतिदक्षता विभागात पाठवण्याची शिफारस केली.',
          badge: 'ABDM आभा संलग्न रेफरल',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
          icon: Stethoscope,
        },
        {
          step: 4,
          tag: 'जिल्हा रुग्णालय नियंत्रण केंद्र',
          title: 'कॅज्युअल्टी स्वीकार, ICU खाट आरक्षण व उपचार पूर्ण',
          role: 'डॉ. विनोद चव्हाण (जिल्हा शल्यचिकित्सक - औंध जिल्हा रुग्णालय)',
          desc: 'रुग्णवाहिका पोहोचण्यापूर्वीच जिल्हा रुग्णालयाने रेफरल स्वीकारून ICU खाट #०४ आरक्षित केली, आणि डिस्चार्ज नंतर पुढील देखभालीसाठी आशा कार्यकर्त्यांना सूचना दिल्या.',
          badge: 'अखंड उपचार चक्र पूर्ण',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: HeartPulse,
        },
      ]
    : [
        {
          step: 1,
          tag: 'VILLAGE SUB-CENTRE · OFFLINE',
          title: 'ASHA Logs High-Risk Maternal Visit in Disconnected Hamlet',
          role: 'Sunita Gaikwad (ASHA Worker - Velhe Taluka)',
          desc: 'Sunita records high BP (150/95 mmHg) and severe edema for Priya Kamble with zero mobile connectivity. The encounter is securely hashed and stored locally in encrypted browser IndexedDB.',
          badge: 'Local IndexedDB Enqueued',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
          icon: Users,
        },
        {
          step: 2,
          tag: 'CONNECTIVITY RESTORED',
          title: 'Cryptographic Queue Synchronizes Record to PHC Ledger',
          role: 'SwasthyaSetu Offline Engine',
          desc: 'As Sunita enters cellular coverage, the background service worker detects network availability and securely pushes the queued health transaction to the Pune District Health node.',
          badge: 'Zero Data Loss · Synchronized',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
          icon: RefreshCw,
        },
        {
          step: 3,
          tag: 'PRIMARY HEALTH CENTRE',
          title: 'PHC Medical Officer Reviews EHR & AI-Assisted Risk Triage',
          role: 'Dr. Sneha Joshi (Medical Officer - Velhe PHC)',
          desc: 'Dr. Joshi reviews the synchronized vitals. SwasthyaSetu clinical risk engine flags pre-eclampsia (Risk Score: 88/100, Priority RED) and recommends escalation to District Hospital Aundh Obstetrics & ICU.',
          badge: 'ABDM ABHA Linked Referral',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
          icon: Stethoscope,
        },
        {
          step: 4,
          tag: 'DISTRICT HOSPITAL COMMAND',
          title: 'Casualty Accepts Emergency, Reserves ICU Bed & Completes Care Cycle',
          role: 'Dr. Vinod Chavan (Civil Surgeon - District Hospital Aundh)',
          desc: 'District Hospital receives the live referral before ambulance arrival, reserves ICU Bed #04, admits patient, and post-discharge generates counter-referral instructions back to ASHA Sunita for follow-up.',
          badge: 'Closed-Loop Care Complete',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
          icon: HeartPulse,
        },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* ── 1. GOVERNMENT OF MAHARASHTRA TOP IDENTITY BAR ── */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs border border-orange-400/40">
            MH
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white uppercase">
                {isMr
                  ? 'सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन'
                  : 'Public Health Department, Government of Maharashtra'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {isMr
                ? 'राष्ट्रीय आरोग्य अभियान · स्मार्ट इंडिया हॅकेथॉन २०२६ सार्वजनिक आरोग्य व्यासपीठ'
                : 'National Health Mission · Smart India Hackathon 2026 Public Health Platform'}
            </p>
          </div>
        </div>

        {/* Live Connectivity & Sync Queue Chip */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${
            effectiveOnline
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
          }`}>
            {effectiveOnline ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
            <span>
              {effectiveOnline
                ? (isMr ? 'ऑनलाईन (थेट सिंक)' : 'Online (Live Sync)')
                : (isMr ? 'ऑफलाईन (स्थानिक डेटाबेस)' : 'Offline (Local DB)')}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-mono">
              {isMr ? `${syncQueue.length} प्रलंबित` : `${syncQueue.length} pending`}
            </span>
            {syncQueue.length > 0 && (
              <button
                onClick={() => triggerManualSync()}
                disabled={isSyncing}
                className="ml-1 p-0.5 rounded hover:bg-emerald-800/50 text-white cursor-pointer"
                title={isMr ? 'प्रलंबित नोंदी सिंक करा' : 'Sync queued changes'}
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <button
            onClick={toggleSimulatedOffline}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer"
            title={isMr ? 'ग्रामीण नेटवर्क स्थिती चाचणी' : 'Toggle simulated rural network condition'}
          >
            {isSimulatedOffline
              ? (isMr ? '📶 नेटवर्क पुन्हा जोडा' : '📶 Reconnect Network')
              : (isMr ? '⚡ ऑफलाईन चाचणी' : '⚡ Simulate Offline')}
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
          </button>

          {/* Neutral Language Switcher: 'EN | मर' */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch Language / भाषा बदला"
          >
            <Languages className="w-3.5 h-3.5 text-orange-400" />
            <span className="tracking-wide">
              <span className={!isMr ? 'text-white font-black' : 'text-slate-400 font-medium'}>EN</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className={isMr ? 'text-white font-black' : 'text-slate-400 font-medium'}>मर</span>
            </span>
          </button>
        </div>
      </header>

      {/* ── 2. HERO & VALUE PROPOSITION BANNER ── */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-b border-slate-800 px-4 sm:px-8 py-8 sm:py-10 relative overflow-hidden">
        {/* Subtle Rural Map Texture */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                {isMr ? 'ABDM व DISHA सुसंगत' : 'ABDM & DISHA COMPLIANT'}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                {isMr ? 'ऑफलाईन-सक्षम रचना' : 'Offline-First Architecture'}
              </span>
            </div>

            {/* Fixed Identity Wordmark (Permanently Bilingual Lockup as required) */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Swasthya<span className="text-orange-400">Setu</span> / स्वास्थ्य<span className="text-emerald-400">सेतू</span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              {isMr ? (
                <>
                  दुर्गम ग्रामीण व आदिवासी भागातील <strong className="text-white">आशा कार्यकर्त्यांना</strong>{' '}
                  <strong className="text-white">प्राथमिक आरोग्य केंद्रे</strong> आणि{' '}
                  <strong className="text-white">जिल्हा रुग्णालयांशी</strong> जोडणारे बहुस्तरीय सार्वजनिक आरोग्य व संसाधन समन्वय व्यासपीठ.
                </>
              ) : (
                <>
                  Multi-Tier Public Health Coordination &amp; Resource Intelligence Platform connecting{' '}
                  <strong className="text-white">ASHA Workers</strong> in remote rural hamlets with{' '}
                  <strong className="text-white">PHCs</strong> and <strong className="text-white">District Hospitals</strong> with zero data loss.
                </>
              )}
            </p>

            {/* Interactive Compliance Badges with One-Click Proof Modals */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={() => setComplianceModal('ABDM')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>{isMr ? 'ABDM टप्पे सुसंगतता (M1-M3)' : 'ABDM Milestone Compliance (M1-M3)'}</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => setComplianceModal('DISHA')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isMr ? 'माहिती तंत्रज्ञान कायदा व DISHA गोपनीयता' : 'IT Act 2000 & DISHA Data Privacy'}</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => setComplianceModal('OFFLINE')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                <span>{isMr ? 'स्थानिक IndexedDB सुरक्षितता' : 'Local IndexedDB Resilience'}</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Quick 60-Second Value Chain Demo Card */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 lg:max-w-md w-full shadow-2xl flex flex-col justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2.5 py-0.5 rounded-md border border-orange-500/30">
                  {isMr ? '⚡ ६०-सेकंद थेट प्रात्यक्षिक' : '⚡ 60-Second Live Showcase'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {isMr ? 'मूल्य प्रात्यक्षिक' : 'Proof of Value'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">
                {isMr ? 'बंद-लूप आरोग्य प्रवास अनुभवा' : 'Experience the Closed-Loop Journey'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isMr
                  ? 'ऑफलाईन नोंदणी, प्राथमिक केंद्र सिंक, AI-रेफरल आणि आयसीयू खाट आरक्षणाचा थेट प्रवास पहा.'
                  : 'Watch how an offline village encounter syncs to a PHC, triggers AI-assisted tertiary referral, reserves an ICU bed, and counter-refers back to the ASHA.'}
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setDemoStep(0);
                  setIsDemoModalOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer scale-100 hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isMr ? 'संवादी ६०-सेकंद प्रवास प्रात्यक्षिक' : 'Interactive 60s Journey Walkthrough'}</span>
              </button>

              <button
                onClick={handleLaunchAshaDemo}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600"
              >
                <Users className="w-3.5 h-3.5 text-orange-400" />
                <span>{isMr ? 'आशा सेविका म्हणून १-क्लिक लॉगिन' : 'Instant 1-Click Login as ASHA Sunita'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. QUANTIFIED IMPACT & PILOT METRICS STRIP ── */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">
              {isMr ? '१४' : '14'}
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              {isMr ? 'उपकेंद्रे व प्राथमिक केंद्रे जोडली' : 'Sub-Centres & PHCs Mapped'}
            </p>
            <span className="text-[10px] text-slate-400">
              {isMr ? 'पुणे ग्रामीण (वेल्हे व नसरापूर)' : 'Pune Rural (Velhe & Nasrapur)'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {isMr ? '७३%' : '73%'}
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              {isMr ? 'रेफरल वेळेत बचत' : 'Referral Time Reduction'}
            </p>
            <span className="text-[10px] text-slate-400">
              {isMr ? 'तातडीचे मार्ग नियोजन' : 'Projected Emergency Routing'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {isMr ? '१००%' : '100%'}
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              {isMr ? 'ऑफलाईन उपलब्धता' : 'Offline Availability'}
            </p>
            <span className="text-[10px] text-slate-400">
              {isMr ? 'नेटवर्क नसताना शून्य डेटा हानी' : 'Zero Data Loss on 2G/No-Network'}
            </span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              {isMr ? '१,२४०+' : '1,240+'}
            </span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
              {isMr ? 'आभा आरोग्य नोंदी' : 'ABHA Longitudinal EHRs'}
            </p>
            <span className="text-[10px] text-slate-400">
              {isMr ? 'एकात्मिक ABDM रचना' : 'Unified ABDM Architecture'}
            </span>
          </div>
        </div>
      </section>

      {/* ── 4. FRONTLINE-FIRST WORKSPACE ENTRY PORTAL ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
        
        {/* Portal Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isMr ? 'आरोग्य कार्यक्षेत्र निवडा' : 'Select Healthcare Workspace'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isMr
                ? 'सुरक्षित लॉगिन व संस्था-स्तरीय रुग्ण डेटा संरक्षण.'
                : 'Role-based authenticated entry with strict facility-scoping and clinical record protection.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setViewMode('FIELD')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'FIELD'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {isMr ? '🌾 फील्ड मोड (आशा / आघाडीचे कार्यकर्ते)' : '🌾 Field Mode (ASHA / Frontline)'}
            </button>
            <button
              onClick={() => setViewMode('ADMIN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'ADMIN'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {isMr ? '🏛️ प्रशासकीय / क्लिनिकल मोड' : '🏛️ Admin / Clinical Mode'}
            </button>
          </div>
        </div>

        {/* ── PRIORITY 1: ASHA / COMMUNITY HEALTH HERO CARD ── */}
        <div className="relative group">
          <button
            onClick={() => onSelectRole('asha')}
            className="w-full text-left p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border-2 border-orange-400/80 dark:border-orange-500/60 hover:border-orange-500 hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30">
                <Users className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-orange-600 text-white">
                    {isMr ? 'प्राथमिक फील्ड कार्यक्षेत्र' : 'PRIMARY FRONTLINE WORKSPACE'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {isMr ? 'ऑफलाईन सक्षम' : 'Offline Ready'}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {isMr ? 'आशा सेविका व समुदाय आरोग्य कार्यक्षेत्र' : 'ASHA & Community Health Workspace'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl font-medium">
                  {isMr
                    ? 'गाव पातळीवरील आरोग्य सर्वेक्षण, असंसर्गजन्य रोग तपासणी, गरोदर माता ट्रॅकिंग आणि दुर्गम भागांसाठी ऑफलाईन संदर्भ सेवा.'
                    : 'Village population health surveys, NCD screenings, high-risk maternal tracking, and offline emergency referral drafts for remote rural communities.'}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                  <span>{isMr ? '४ नोंदणीकृत कार्यकर्त्या' : '4 Registered Workers'}</span>
                  <span>&bull;</span>
                  <span>{isMr ? 'वेल्हे व नसरापूर गावे' : 'Velhe & Nasrapur Villages'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <div className="px-5 py-3 rounded-2xl bg-orange-600 group-hover:bg-orange-700 text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2">
                <span>{isMr ? 'आशा पोर्टल उघडा' : 'Open ASHA Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </button>
        </div>

        {/* ── PRIORITY 2: CLINICAL, DISTRICT & SPECIALIST TIERS (3 CARDS) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* PHC Medical Officer & Staff */}
          <button
            onClick={() => onSelectRole('phc_doctor')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left flex flex-col justify-between gap-4 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {isMr ? 'प्राथमिक आरोग्य' : 'PRIMARY CARE'}
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'प्राथमिक आरोग्य केंद्र (PHC)' : 'Primary Health Centre (PHC Team)'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'वेल्हे आणि नसरापूर केंद्रांचे वैद्यकीय अधिकारी, आरोग्य अधिकारी, परिचारिका आणि औषधनिर्माते.'
                    : 'Medical Officers, Community Health Officers, Staff Nurses, and Pharmacists at Velhe & Nasrapur PHCs.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>{isMr ? 'PHC कार्यक्षेत्रात प्रवेश करा' : 'Sign In to PHC Workspace'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* District Hospital & Specialists / Casualty */}
          <button
            onClick={() => onSelectRole('specialist')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg transition-all text-left flex flex-col justify-between gap-4 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  {isMr ? 'द्वितीयक आरोग्य सेवा' : 'SECONDARY CARE'}
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'जिल्हा रुग्णालय व तज्ज्ञ विभाग' : 'District Hospital & Specialists'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'तज्ज्ञ डॉक्टर, अपघात विभाग ट्रायज, अतिदक्षता (ICU) व व्हेंटिलेटर प्रवेश, आणि राज्यस्तरीय संदर्भ सेवा.'
                    : 'Specialist clinicians, casualty triage, ICU & ventilator admissions, and tertiary State escalations.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>{isMr ? 'तज्ज्ञ विभागात प्रवेश करा' : 'Sign In to Specialist Desk'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* DHO / District Coordination Control Center */}
          <button
            onClick={() => onSelectRole('district_officer')}
            className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all text-left flex flex-col justify-between gap-4 cursor-pointer group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  {isMr ? 'जिल्हा नियंत्रण केंद्र' : 'DISTRICT CONTROL'}
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'जिल्हा आरोग्य अधिकारी (DHO)' : 'District Health Officer (DHO Command)'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'जिल्हा आरोग्य अधिकारी, महाऔषधी साठा पुनर्वितरण आणि पुणे जिल्ह्यासाठी जीआयएस सुविधा ट्रॅकिंग.'
                    : 'District Health Officer, MahaAushadhi supply reallocation, and GIS facility tracking for Pune District.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>{isMr ? 'DHO नियंत्रण कक्षात प्रवेश करा' : 'Sign In to DHO Command'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* ── CITIZEN & EMERGENCY HOTLINE BOTTOM STRIP ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Citizen ABHA OTP Access */}
          <button
            onClick={() => onSelectRole('patient')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {isMr ? 'नागरिक रुग्ण आरोग्य पोर्टल (आभा OTP)' : 'Citizen Patient Health Portal (ABHA OTP)'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMr
                    ? 'वैयक्तिक आरोग्य नोंदी, औषधोपचार चिठ्ठी आणि संदर्भ टोकन डाउनलोड करा.'
                    : 'Download personal EHR records, prescriptions, and referral tokens.'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* 108 Emergency Medical Assistance */}
          <div className="p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200 truncate">
                  {isMr ? '१०८ तातडीची वैद्यकीय मदत' : '108 Emergency Medical SOS'}
                </h4>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 truncate">
                  {isMr
                    ? 'रुग्ण व कुटुंबियांसाठी तात्काळ आपत्कालीन मार्गदर्शन.'
                    : 'Instant guidance for patients & families in emergency.'}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenEmergency}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isMr ? 'मदत मिळवा' : 'GET HELP'}</span>
            </button>
          </div>

        </div>

        {/* Plain-Language Citizen Trust Assurance */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {isMr
                ? 'तुमचा आरोग्य डेटा सुरक्षित आहे · महाराष्ट्र शासनाच्या सुरक्षित डेटा केंद्रात कूटबद्ध.'
                : 'Your health data is securely encrypted within Maharashtra State infrastructure.'}
            </span>
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
            {isMr
              ? 'केवळ अधिकृत आरोग्य कर्मचाऱ्यांनाच प्रवेश. माहिती तंत्रज्ञान कायदा २००० आणि ABDM मार्गदर्शक तत्त्वांचे काटेकोर पालन. व्यावसायिक ट्रॅकिंग नाही.'
              : 'Authorized healthcare personnel only. Access strictly governed under IT Act 2000, DISHA Standards, and Ayushman Bharat Digital Mission guidelines. Zero commercial telemetry.'}
          </p>
        </div>

      </main>

      {/* ── 5. INTERACTIVE 60-SECOND JOURNEY DEMO MODAL ── */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
                  <Play className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isMr ? 'स्वास्थ्यसेतू ६०-सेकंद अखंड आरोग्य प्रवास' : 'SwasthyaSetu 60-Second End-to-End Journey'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isMr
                      ? `टप्पा ${demoStep + 1}/४: ग्रामीण सार्वजनिक आरोग्य समन्वय`
                      : `Step ${demoStep + 1} of 4: Rural Public Healthcare Coordination`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-4 gap-2">
              {demoSteps.map((st, i) => (
                <button
                  key={st.step}
                  onClick={() => setDemoStep(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === demoStep
                      ? 'bg-orange-500 ring-2 ring-orange-400/40'
                      : i < demoStep
                      ? 'bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Active Step Content */}
            {(() => {
              const cur = demoSteps[demoStep];
              const StepIcon = cur.icon;
              return (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {cur.tag}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded ${cur.badgeColor}`}>
                      {cur.badge}
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 dark:text-white">
                        {cur.title}
                      </h4>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-0.5">
                        {cur.role}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                    {cur.desc}
                  </p>
                </div>
              );
            })()}

            {/* Modal Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                disabled={demoStep === 0}
                onClick={() => setDemoStep((p) => Math.max(0, p - 1))}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 disabled:opacity-40 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {isMr ? 'मागील टप्पा' : 'Previous Step'}
              </button>

              <div className="flex items-center gap-2">
                {demoStep < demoSteps.length - 1 ? (
                  <button
                    onClick={() => setDemoStep((p) => Math.min(demoSteps.length - 1, p + 1))}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isMr ? 'पुढील टप्पा' : 'Next Step'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleLaunchAshaDemo}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isMr ? 'थेट प्रात्यक्षिक सुरू करा' : 'Launch Live Demo Workflow'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. COMPLIANCE EXPLAINER MODAL ── */}
      {complianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {complianceModal === 'ABDM'
                    ? (isMr ? 'आयुष्मान भारत डिजिटल मिशन (ABDM) सुसंगतता' : 'Ayushman Bharat Digital Mission (ABDM) Compliance')
                    : complianceModal === 'DISHA'
                    ? (isMr ? 'DISHA व माहिती तंत्रज्ञान कायदा २००० कलम ४३A डेटा गोपनीयता' : 'DISHA & IT Act 2000 Section 43A Data Privacy')
                    : (isMr ? 'स्थानिक IndexedDB ऑफलाईन साठवणूक व सिंक' : 'Offline-First Local Storage & Conflict-Free Sync')}
                </h3>
              </div>
              <button
                onClick={() => setComplianceModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {complianceModal === 'ABDM' && (
                <>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'टप्पा १ (आभा निर्मिती):' : 'Milestone M1 (ABHA Creation):'}
                    </strong>{' '}
                    {isMr
                      ? 'नागरिकांसाठी सुलभ डिजिटल ओळख व आभा कार्ड निर्मिती सक्षम करते.'
                      : 'Enables seamless registration and token-based digital identity generation for citizens.'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'टप्पा २ (आरोग्य माहिती प्रदाता - HIP):' : 'Milestone M2 (Health Information Provider - HIP):'}
                    </strong>{' '}
                    {isMr
                      ? 'FHIR-सुसंगत डिस्चार्ज सारांश, तपासणी अहवाल आणि वैद्यकीय नोंदी तयार करते.'
                      : 'Generates FHIR-compliant discharge summaries, encounter notes, and diagnostic investigations.'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'टप्पा ३ (आरोग्य माहिती वापरकर्ता - HIU):' : 'Milestone M3 (Health Information User - HIU):'}
                    </strong>{' '}
                    {isMr
                      ? 'रुग्णाच्या संमतीने अधिकृत डॉक्टरांना मागील वैद्यकीय इतिहास पाहण्याची परवानगी देते.'
                      : 'Allows authorized clinicians to view permitted historical EHR with patient consent gateway.'}
                  </p>
                </>
              )}

              {complianceModal === 'DISHA' && (
                <>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'राज्य डेटा सार्वभौमत्व:' : 'State Data Sovereignty:'}
                    </strong>{' '}
                    {isMr
                      ? 'सर्व क्लिनिकल नोंदी आणि एनक्रिप्टेड ऑडिट ट्रेल महाराष्ट्र राज्य डेटा केंद्रात सुरक्षित राहतात.'
                      : 'All clinical records and encrypted audit logs reside within the Maharashtra State Data Center infrastructure.'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'कनिष्ठ-अधिकार प्रवेश नियंत्रण:' : 'Least-Privilege Role Authorization:'}
                    </strong>{' '}
                    {isMr
                      ? 'आशा कार्यकर्त्या आणि इतर कर्मचाऱ्यांना केवळ त्यांच्या कर्तव्याशी संबंधित माहितीच उपलब्ध होते. अनधिकृत व्यक्तींना रुग्णांचा वैद्यकीय अहवाल दिसत नाही.'
                      : 'ASHA workers, pharmacists, and MOs access only the scoped data required for their clinical duty. Unrestricted medical records are never exposed to non-clinical roles.'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'शून्य व्यावसायिक ट्रॅकिंग:' : 'Zero Commercial Tracking:'}
                    </strong>{' '}
                    {isMr
                      ? 'कोणतेही बाह्य व्यावसायिक ट्रॅकिंग किंवा जाहिरात स्क्रिप्ट नाही.'
                      : 'No external marketing telemetry, ad-trackers, or unauthorized third-party scripts.'}
                  </p>
                </>
              )}

              {complianceModal === 'OFFLINE' && (
                <>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'क्रिप्टोग्राफिक ट्रान्झॅक्शन रांग:' : 'Cryptographic Transaction Queue:'}
                    </strong>{' '}
                    {isMr
                      ? 'प्रत्येक ऑफलाईन नोंदणी ब्राऊझरच्या IndexedDB मध्ये अचूक वेळेसह सुरक्षित ठेवली जाते.'
                      : 'Every offline patient screening and referral draft is persisted to browser IndexedDB with deterministic timestamps.'}
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">
                      {isMr ? 'तक्रारमुक्त डेटा समक्रमण:' : 'Monotonic Conflict-Free Reconciliation:'}
                    </strong>{' '}
                    {isMr
                      ? 'इंटरनेट पूर्ववत होताच बॅकग्राउंड सर्व्हिस वर्कर सर्व नोंदी योग्य क्रमाने सर्व्हरवर पाठवते.'
                      : 'Background service worker detects signal restoration and transmits transactions in order without silent overwrites.'}
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setComplianceModal(null)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {isMr ? 'माहिती खिडकी बंद करा' : 'Close Explainer'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
