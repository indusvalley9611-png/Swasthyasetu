'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Role, Patient, Referral } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { AppShell } from '@/components/layout/AppShell';
import { AshaDashboard } from '@/components/dashboards/AshaDashboard';
import { PhcDoctorDashboard } from '@/components/dashboards/PhcDoctorDashboard';
import { SpecialistDashboard } from '@/components/dashboards/SpecialistDashboard';
import { DistrictCoordinationDashboard } from '@/components/dashboards/DistrictCoordinationDashboard';
import WorkerWorkspace from '@/components/directory/WorkerWorkspace';
import { NewPatientModal } from '@/components/ehr/NewPatientModal';
import { PatientTimelineModal } from '@/components/ehr/PatientTimelineModal';
import { AbhaCardModal } from '@/components/ehr/AbhaCardModal';
import { SmartReferralModal } from '@/components/referral/SmartReferralModal';
import { ReferralTokenModal } from '@/components/referral/ReferralTokenModal';
import { BedMatrixModal } from '@/components/inventory/BedMatrixModal';
import { DrugStockModal } from '@/components/inventory/DrugStockModal';
import { GlobalPatientSearchModal } from '@/components/ehr/GlobalPatientSearchModal';
import { StaffLoginModal } from '@/components/auth/StaffLoginModal';
import { PatientDownloadModal } from '@/components/auth/PatientDownloadModal';
import { AuditTrailModal } from '@/components/compliance/AuditTrailModal';
import { EmergencyHelpModal } from '@/components/emergency/EmergencyHelpModal';
import {
  Users, User,
  Stethoscope,
  Building2,
  HeartPulse,
  Activity,
  Languages,
  Moon,
  Sun,
  Pill,
  Shield,
  Phone,
  Network,
  ArrowRight,
  AlertTriangle,
  MapPin,
  Zap,
  GitBranch,
  ChevronRight,
} from 'lucide-react';

export default function Home() {
  const { role, isAuthenticated, switchRole } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { referrals } = useSync();

  const [mounted, setMounted] = useState(false);

  // Modal states
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isBedMatrixOpen, setIsBedMatrixOpen] = useState(false);
  const [isDrugStockOpen, setIsDrugStockOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only use dark mode if user explicitly saved it
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'))) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  const [selectedLoginRole, setSelectedLoginRole] = useState<Role | 'patient' | undefined>(undefined);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);
  const [abhaCardPatient, setAbhaCardPatient] = useState<Patient | null>(null);
  const [referralPatient, setReferralPatient] = useState<Patient | null>(null);
  const [referralToken, setReferralToken] = useState<Referral | null>(null);

  // Active navigation view managed across left sidebar and main content
  const getDefaultNavItem = (r?: Role) => {
    if (r === 'district_officer') return 'overview';
    if (r === 'specialist') return 'incoming';
    if (r === 'phc_doctor') return 'directory';
    if (r === 'nurse') return 'directory';
    if (r === 'pharmacist') return 'dashboard';
    if (r === 'asha') return 'directory';
    return 'directory';
  };

  const [activeNavItem, setActiveNavItem] = useState<string>('directory');

  useEffect(() => {
    if (role) {
      setActiveNavItem(getDefaultNavItem(role));
    }
  }, [role]);

  // Workspace cards for the redesigned landing screen
  const workspaceCards = [
    {
      id: 'asha' as Role,
      label: 'FIELD & SUB-CENTRE',
      role: 'ASHA / Field Worker',
      icon: Users,
      color: 'teal',
    },
    {
      id: 'phc_doctor' as Role,
      label: 'PRIMARY CARE',
      role: 'PHC Medical Officer & Staff',
      icon: Stethoscope,
      color: 'blue',
    },
    {
      id: 'district_officer' as Role,
      label: 'DISTRICT HEALTH',
      role: 'DHO / District Coordinators',
      icon: Building2,
      color: 'indigo',
    },
    {
      id: 'specialist' as Role,
      label: 'DISTRICT HOSPITAL',
      role: 'Specialists / Casualty',
      icon: HeartPulse,
      color: 'violet',
    },
  ];

  const networkTiers = [
    { label: 'SUB-CENTRE', sub: 'Community Health' },
    { label: 'PHC', sub: 'Primary Care' },
    { label: 'DISTRICT HOSPITAL', sub: 'Specialist Care' },
    { label: 'DISTRICT HEALTH SYSTEM', sub: 'Coordination' },
  ];

  const capabilities = [
    { icon: Network, label: 'Connected Care' },
    { icon: GitBranch, label: 'Smart Referrals' },
    { icon: Shield, label: 'Resource Coordination' },
    { icon: Zap, label: 'Emergency Access' },
  ];

  if (!mounted) {
    return null;
  }

  if (!isAuthenticated || !role) {
    return (
      <div suppressHydrationWarning className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-950 font-sans">

        {/* ── LEFT SIDE ─ Product Introduction (Desktop Only) ── */}
        <div suppressHydrationWarning className="hidden lg:flex lg:w-[38%] shrink-0 text-white flex-col justify-between p-8 lg:py-10 lg:px-10 relative overflow-hidden bg-slate-900">
          {/* Subtle background texture */}
          <div className="absolute inset-0 z-0 opacity-[0.06]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950"></div>

          <div className="relative z-10 flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Swasthya<span className="text-teal-400">Setu</span>
              </h1>
            </div>

            {/* Tagline */}
            <div className="mb-8">
              <h2 className="text-2xl lg:text-[1.7rem] font-bold leading-snug mb-2 text-white/95">
                Connected Public Healthcare<br />for Rural Communities
              </h2>
              <p className="text-sm text-slate-400 font-medium">
                Government of Maharashtra · ABDM Compliant
              </p>
            </div>

            {/* Network Visualization */}
            <div className="mb-8">
              <div className="space-y-0">
                {networkTiers.map((tier, i) => (
                  <div key={tier.label}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        i === 0 ? 'bg-teal-400' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-indigo-400' : 'bg-violet-400'
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-white/90 tracking-wide">{tier.label}</p>
                        <p className="text-xs text-slate-500">{tier.sub}</p>
                      </div>
                    </div>
                    {i < networkTiers.length - 1 && (
                      <div className="ml-[4.5px] h-3 border-l-2 border-dashed border-slate-700" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="grid grid-cols-2 gap-2 mb-8">
              {capabilities.map((cap) => {
                const CIcon = cap.icon;
                return (
                  <div key={cap.label} className="flex items-center gap-2 py-1.5">
                    <CIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-300">{cap.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Bottom bar */}
            <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium">v2.4 · Offline Ready</span>
              </div>
              <span className="font-medium">SIH 2026</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE ─ Sign In + Emergency ── */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col relative transition-colors duration-300">

          {/* Mobile Native App Top Bar (Mobile Only) */}
          <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                <HeartPulse className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-black tracking-tight leading-none text-white">
                    Swasthya<span className="text-teal-400">Setu</span>
                  </h1>
                  <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-bold">
                    v2.4
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                  Govt. of Maharashtra · ABDM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <Languages className="w-3 h-3 text-teal-400" />
                <span>{language === 'en' ? 'मराठी' : 'EN'}</span>
              </button>
            </div>
          </div>

          {/* Desktop Language & Theme Switcher (Desktop Only) */}
          <div className="hidden lg:flex absolute top-5 right-5 sm:top-6 sm:right-8 gap-2 z-50">
            <button
              onClick={toggleDarkMode}
              className="inline-flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
            >
              <Languages className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{language === 'en' ? 'मराठी' : 'English'}</span>
            </button>
          </div>

          {/* Main content area — full width of right panel */}
          <div className="flex-1 flex flex-col px-4 sm:px-8 lg:px-12 xl:px-16 pt-4 lg:pt-16 pb-8">

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {language === 'mr' ? 'पोर्टलमध्ये साइन इन करा' : 'Sign in to Portal'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {language === 'mr' ? 'तुमचे आरोग्य कार्यक्षेत्र निवडा' : 'Select your healthcare workspace to continue'}
              </p>
            </div>

            {/* Workspace Cards — Clean 2×2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              {workspaceCards.map((card) => {
                const WIcon = card.icon;
                const colorMap: Record<string, { bg: string; border: string; iconBg: string; hoverBorder: string; labelColor: string }> = {
                  teal:   { bg: 'bg-teal-50 dark:bg-teal-950/30',   border: 'border-teal-100 dark:border-teal-900/50',   iconBg: 'bg-teal-500',   hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-500',   labelColor: 'text-teal-700 dark:text-teal-300' },
                  blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-100 dark:border-blue-900/50',   iconBg: 'bg-blue-600',   hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-500',   labelColor: 'text-blue-700 dark:text-blue-300' },
                  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-100 dark:border-indigo-900/50', iconBg: 'bg-indigo-600', hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-500', labelColor: 'text-indigo-700 dark:text-indigo-300' },
                  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-100 dark:border-violet-900/50', iconBg: 'bg-violet-600', hoverBorder: 'hover:border-violet-400 dark:hover:border-violet-500', labelColor: 'text-violet-700 dark:text-violet-300' },
                };
                const c = colorMap[card.color];
                return (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedLoginRole(card.id);
                      setIsLoginModalOpen(true);
                    }}
                    className={`${c.bg} border ${c.border} ${c.hoverBorder} rounded-xl p-5 text-left transition-all duration-200 hover:shadow-md group flex flex-col justify-between h-full min-h-[140px]`}
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div className={`${c.iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                        <WIcon className="w-5 h-5 text-white" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors mt-1 shrink-0" />
                    </div>
                    <div>
                      <p className={`text-[11px] font-bold tracking-widest uppercase mb-1 ${c.labelColor}`}>
                        {card.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                        {card.role}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      Sign in <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom row: Citizen Access + Emergency side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">

              {/* Citizen Access */}
              <button
                onClick={() => {
                  setSelectedLoginRole('patient' as any);
                  setIsLoginModalOpen(true);
                }}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Citizen Patient Access</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Download EHR record via ABHA OTP</p>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>

              {/* Emergency Help */}
              <div className="rounded-xl border-2 border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 px-4 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-0.5">🚨 EMERGENCY HELP</p>
                  <p className="text-[11px] text-red-700/70 dark:text-red-400/70 leading-snug">
                    Patients &amp; families · Hindi, Marathi or English
                  </p>
                </div>
                <button
                  onClick={() => setIsEmergencyOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Phone className="w-3 h-3" />
                  GET HELP
                </button>
              </div>
            </div>

            {/* Legal notice */}
            <p className="mt-5 text-[11px] text-slate-400 dark:text-slate-600">
              Authorized personnel only. All access is logged and audited per IT Act 2000 &amp; DISHA guidelines.
            </p>
          </div>
        </div>

        {/* Auth Modals — unchanged logic */}
        {isLoginModalOpen && selectedLoginRole !== 'patient' && (
          <StaffLoginModal 
            onClose={() => {
              setIsLoginModalOpen(false);
              setSelectedLoginRole(undefined);
            }}
            initialRole={selectedLoginRole}
          />
        )}
        {isLoginModalOpen && selectedLoginRole === 'patient' && (
          <PatientDownloadModal onClose={() => setIsLoginModalOpen(false)} />
        )}
        {isEmergencyOpen && (
          <EmergencyHelpModal onClose={() => setIsEmergencyOpen(false)} />
        )}
      </div>
    );
  }

  // Dashboard View for Logged-In Users
  return (
    <AppShell
      activeNavItem={activeNavItem}
      onSelectNavItem={(item) => {
        setActiveNavItem(item);
        if (item === 'audit') {
          setIsAuditTrailOpen(true);
        }
      }}
      onOpenNewPatient={() => setIsNewPatientOpen(true)}
      onOpenSearch={() => setIsGlobalSearchOpen(true)}
      onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
      onOpenStockLedger={() => setIsDrugStockOpen(true)}
      onOpenAuditLogs={() => setIsAuditTrailOpen(true)}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
    >
      {role === 'district_officer' && (
        <DistrictCoordinationDashboard
          onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
          onOpenStockLedger={() => setIsDrugStockOpen(true)}
          onOpenAuditLogs={() => setIsAuditTrailOpen(true)}
          onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
          onOpenReferralToken={(ref) => setReferralToken(ref)}
          activeTab={activeNavItem as any}
          onTabChange={(tab) => setActiveNavItem(tab)}
        />
      )}

      {role === 'specialist' && (
        <SpecialistDashboard
          onOpenReferralToken={(ref) => setReferralToken(ref)}
          onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
          onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
          onOpenNewPatient={() => setIsNewPatientOpen(true)}
          activeTab={activeNavItem as any}
          onTabChange={(tab) => setActiveNavItem(tab)}
        />
      )}

      {(role === 'asha' || role === 'phc_doctor' || role === 'nurse' || role === 'pharmacist') && (
        <WorkerWorkspace
          role={role as any}
          activeSubView={activeNavItem === 'dashboard' ? 'dashboard' : 'directory'}
          onSubViewChange={(subView) => setActiveNavItem(subView)}
          onOpenNewPatient={() => setIsNewPatientOpen(true)}
          onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
          onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
          onOpenReferral={(patient) => setReferralPatient(patient)}
          onOpenReferralToken={(ref) => setReferralToken(ref)}
        />
      )}

      {/* Shared Dashboard Modals */}
      {isNewPatientOpen && (
        <NewPatientModal
          onClose={() => setIsNewPatientOpen(false)}
          onSuccess={(newPatient) => {
            setTimelinePatient(newPatient);
          }}
        />
      )}

      {isGlobalSearchOpen && (
        <GlobalPatientSearchModal
          onClose={() => setIsGlobalSearchOpen(false)}
          onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
          onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
          onOpenReferral={(patient) => setReferralPatient(patient)}
        />
      )}

      {timelinePatient && (
        <PatientTimelineModal
          patient={timelinePatient}
          onClose={() => setTimelinePatient(null)}
          onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
          onOpenReferral={(patient) => setReferralPatient(patient)}
        />
      )}

      {abhaCardPatient && (
        <AbhaCardModal
          patient={abhaCardPatient}
          onClose={() => setAbhaCardPatient(null)}
        />
      )}

      {referralPatient && (
        <SmartReferralModal
          patient={referralPatient}
          onClose={() => setReferralPatient(null)}
          onReferralCreated={(newRef) => {
            setReferralPatient(null);
            setReferralToken(newRef);
          }}
        />
      )}

      {referralToken && (
        <ReferralTokenModal
          referral={referralToken}
          onClose={() => setReferralToken(null)}
        />
      )}

      {isBedMatrixOpen && (
        <BedMatrixModal onClose={() => setIsBedMatrixOpen(false)} />
      )}

      {isDrugStockOpen && (
        <DrugStockModal onClose={() => setIsDrugStockOpen(false)} />
      )}

      {isAuditTrailOpen && (
        <AuditTrailModal onClose={() => setIsAuditTrailOpen(false)} />
      )}
    </AppShell>
  );
}
