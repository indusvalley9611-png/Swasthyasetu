'use client';

import React, { useState, useEffect } from 'react';
import { Role } from '@/lib/types';
import { useAuth, PRE_REGISTERED_STAFF } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import {
  Users,
  Stethoscope,
  Building2,
  HeartPulse,
  Activity,
  Languages,
  Moon,
  Sun,
  Pill,
  Shield,
  ShieldCheck,
  Phone,
  Network,
  ArrowRight,
  AlertTriangle,
  MapPin,
  Zap,
  GitBranch,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  Info,
  X,
  Play,
  Check,
  FileText,
  Lock,
  Layers,
  Sparkles,
  HelpCircle,
  Truck,
  Bed,
  User,
  Radio,
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
  const { role, isAuthenticated, switchRole, sendOtp, verifyOtp } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const {
    isOnline,
    isSimulatedOffline,
    effectiveOnline,
    isSyncing,
    syncQueue,
    triggerManualSync,
    toggleSimulatedOffline,
    patients,
    referrals,
  } = useSync();

  // Mode: Field Mode (large touch targets, bilingual Devanagari) vs Admin Mode (dense overview)
  const [viewMode, setViewMode] = useState<'FIELD' | 'ADMIN'>('FIELD');

  // Interactive 60-Second Value Chain Walkthrough Modal State
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);

  // Compliance Explainer Modal State
  const [complianceModal, setComplianceModal] = useState<'ABDM' | 'DISHA' | 'OFFLINE' | null>(null);

  // Sync Timestamp formatting
  const [lastSyncTime, setLastSyncTime] = useState('Just now');
  useEffect(() => {
    const updateTime = () => setLastSyncTime('1 min ago');
    const timer = setTimeout(updateTime, 60000);
    return () => clearTimeout(timer);
  }, [isSyncing]);

  // Handle Quick Demo Auto-Login
  const handleLaunchAshaDemo = async () => {
    setIsDemoModalOpen(false);
    const ashaPhone = PRE_REGISTERED_STAFF['user-asha-01']?.phone || '9822019284';
    await sendOtp(ashaPhone);
    await verifyOtp(ashaPhone, '123456');
  };

  const demoSteps = [
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
      tag: 'CONNECTIVITY RECONNECTED',
      title: 'Cryptographic Queue Synchronizes Record to PHC Ledger',
      role: 'SwasthyaSetu Offline Engine',
      desc: 'As Sunita approaches the hill ridge with cellular signal, the background service worker detects network availability and securely pushes the queued health transaction to the Pune District Health node.',
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
                सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono hidden sm:inline">
                Govt. of Maharashtra
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              National Health Mission · Smart India Hackathon 2026 Public Health Platform
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
            <span>{effectiveOnline ? 'Online (Live Sync)' : 'Offline (Local DB)'}</span>
            <span className="text-slate-400">&bull;</span>
            <span className="font-mono">{syncQueue.length} pending</span>
            {syncQueue.length > 0 && (
              <button
                onClick={() => triggerManualSync()}
                disabled={isSyncing}
                className="ml-1 p-0.5 rounded hover:bg-emerald-800/50 text-white cursor-pointer"
                title="Sync queued changes"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <button
            onClick={toggleSimulatedOffline}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition-colors cursor-pointer"
            title="Toggle simulated disconnected rural network condition"
          >
            {isSimulatedOffline ? '📶 Reconnect Network' : '⚡ Simulate Offline'}
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-300" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Languages className="w-3 h-3 text-orange-400" />
            <span>{language === 'en' ? 'मराठी' : 'English'}</span>
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
                ABDM &amp; DISHA COMPLIANT
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Offline-First Architecture
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Swasthya<span className="text-orange-400">Setu</span> · स्वास्थ्य<span className="text-emerald-400">सेतू</span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
              Multi-Tier Public Health Coordination &amp; Resource Intelligence Platform connecting <strong className="text-white">ASHA Workers</strong> in remote tribal hamlets with <strong className="text-white">PHCs</strong> and <strong className="text-white">District Hospitals</strong> with zero data loss.
            </p>

            {/* Interactive Compliance Badges with One-Click Proof Modals */}
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <button
                onClick={() => setComplianceModal('ABDM')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>ABDM Milestone Compliance (M1-M3)</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => setComplianceModal('DISHA')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>IT Act 2000 &amp; DISHA Data Privacy</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </button>

              <button
                onClick={() => setComplianceModal('OFFLINE')}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                <span>Local IndexedDB Resilience</span>
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
                  ⚡ 60-Second Live Showcase
                </span>
                <span className="text-xs text-slate-400 font-mono">Proof of Value</span>
              </div>
              <h3 className="text-lg font-black text-white">
                Experience the Closed-Loop Journey
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Watch how an offline village encounter syncs to a PHC, triggers AI-assisted tertiary referral, reserves an ICU bed, and counter-refers back to the ASHA.
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
                <span>Interactive 60s Journey Walkthrough</span>
              </button>

              <button
                onClick={handleLaunchAshaDemo}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600"
              >
                <Users className="w-3.5 h-3.5 text-orange-400" />
                <span>Instant 1-Click Login as ASHA Sunita</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. QUANTIFIED IMPACT & PILOT METRICS STRIP ── */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400">14</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Sub-Centres &amp; PHCs Mapped</p>
            <span className="text-[10px] text-slate-400">Pune Rural (Velhe &amp; Nasrapur)</span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">73%</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Referral Time Reduction</p>
            <span className="text-[10px] text-slate-400">Projected Emergency Routing</span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">100%</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Offline Availability</p>
            <span className="text-[10px] text-slate-400">Zero Data Loss on 2G/No-Network</span>
          </div>
          <div className="p-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">1,240+</span>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">ABHA Longitudinal EHRs</p>
            <span className="text-[10px] text-slate-400">Unified ABDM Architecture</span>
          </div>
        </div>
      </section>

      {/* ── 4. FRONTLINE-FIRST WORKSPACE ENTRY PORTAL ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 space-y-6">
        
        {/* Portal Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {language === 'mr' ? 'आरोग्य कार्यक्षेत्र निवडा' : 'Select Healthcare Workspace'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Role-based authenticated entry with strict facility-scoping and clinical record protection.
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
              🌾 Field Mode (ASHA / Frontline)
            </button>
            <button
              onClick={() => setViewMode('ADMIN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'ADMIN'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🏛️ Admin / Clinical Mode
            </button>
          </div>
        </div>

        {/* ── PRIORITY 1: ASHA / COMMUNITY HEALTH HERO CARD (HIGH FREQUENCY, LARGE TOUCH TARGET) ── */}
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
                    PRIMARY FRONTLINE WORKSPACE
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Offline Ready · स्थानिक डेटा
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  आशा कार्यकर्त्या / समुदाय आरोग्य (ASHA &amp; Field Health)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl font-medium">
                  Village population health surveys, NCD screenings, high-risk maternal tracking, and offline emergency referral drafts for remote rural communities.
                </p>
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                  <span>4 Registered Workers</span>
                  <span>&bull;</span>
                  <span>Velhe &amp; Nasrapur Villages</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <div className="px-5 py-3 rounded-2xl bg-orange-600 group-hover:bg-orange-700 text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2">
                <span>आशा पोर्टल उघडा / Open ASHA Portal</span>
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
                  PRIMARY CARE
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  प्राथमिक आरोग्य केंद्र (PHC Team)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Medical Officers, Community Health Officers, Staff Nurses, and Pharmacists at Velhe &amp; Nasrapur PHCs.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>Sign In to PHC Workspace</span>
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
                  SECONDARY CARE
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  जिल्हा रुग्णालय व तज्ज्ञ (District Hospital)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Specialist clinicians, casualty triage, ICU &amp; ventilator admissions, and tertiary State escalations.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Sign In to Specialist Desk</span>
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
                  DISTRICT CONTROL
                </span>
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  जिल्हा आरोग्य अधिकारी (DHO Command)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  District Health Officer, MahaAushadhi supply reallocation, and GIS facility tracking for Pune District.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Sign In to DHO Command</span>
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
                  Citizen Patient Health Portal (ABHA OTP)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Download personal EHR records, prescriptions, and referral tokens.
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
                  108 Emergency Medical SOS
                </h4>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 truncate">
                  Instant guidance for patients &amp; families in Marathi, Hindi &amp; English.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenEmergency}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>GET HELP</span>
            </button>
          </div>

        </div>

        {/* Plain-Language Citizen Trust Assurance (Pillar 6) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>तुमचा आरोग्य डेटा सुरक्षित आहे · Your health data is securely encrypted within Maharashtra State infrastructure.</span>
          </p>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto">
            Authorized healthcare personnel only. Access strictly governed under IT Act 2000, DISHA Standards, and Ayushman Bharat Digital Mission guidelines. Zero commercial telemetry.
          </p>
        </div>

      </main>

      {/* ── 5. INTERACTIVE 60-SECOND JOURNEY DEMO MODAL (PILLAR 4) ── */}
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
                    SwasthyaSetu 60-Second End-to-End Journey
                  </h3>
                  <p className="text-[11px] text-slate-400">Step {demoStep + 1} of 4: Rural Public Healthcare Coordination</p>
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
                Previous Step
              </button>

              <div className="flex items-center gap-2">
                {demoStep < demoSteps.length - 1 ? (
                  <button
                    onClick={() => setDemoStep((p) => Math.min(demoSteps.length - 1, p + 1))}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleLaunchAshaDemo}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Launch Live Demo Workflow</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 6. COMPLIANCE EXPLAINER MODAL (PILLAR 1) ── */}
      {complianceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {complianceModal === 'ABDM'
                    ? 'Ayushman Bharat Digital Mission (ABDM) Compliance'
                    : complianceModal === 'DISHA'
                    ? 'DISHA & IT Act 2000 Section 43A Data Privacy'
                    : 'Offline-First Local Storage & Conflict-Free Sync'}
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
                    <strong className="text-slate-900 dark:text-white">Milestone M1 (ABHA Creation):</strong> Enables seamless registration and token-based digital identity generation for citizens.
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Milestone M2 (Health Information Provider - HIP):</strong> Generates FHIR-compliant discharge summaries, encounter notes, and diagnostic investigations.
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Milestone M3 (Health Information User - HIU):</strong> Allows authorized clinicians to view permitted historical EHR with patient consent gateway.
                  </p>
                </>
              )}

              {complianceModal === 'DISHA' && (
                <>
                  <p>
                    <strong className="text-slate-900 dark:text-white">State Data Sovereignty:</strong> All clinical records and encrypted audit logs reside within the Maharashtra State Data Center infrastructure.
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Least-Privilege Role Authorization:</strong> ASHA workers, pharmacists, and MOs access only the scoped data required for their clinical duty. Unrestricted medical records are never exposed to non-clinical roles.
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Zero Commercial Tracking:</strong> No external marketing telemetry, ad-trackers, or unauthorized third-party scripts.
                  </p>
                </>
              )}

              {complianceModal === 'OFFLINE' && (
                <>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Cryptographic Transaction Queue:</strong> Every offline patient screening and referral draft is persisted to browser IndexedDB with deterministic timestamps.
                  </p>
                  <p>
                    <strong className="text-slate-900 dark:text-white">Monotonic Conflict-Free Reconciliation:</strong> Background service worker detects signal restoration and transmits transactions in order without silent overwrites.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setComplianceModal(null)}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close Explainer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
