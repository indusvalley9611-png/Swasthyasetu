'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AppShell } from '@/components/layout/AppShell';
import { AshaMahaAushadhiView } from '@/components/maha-aushadhi/AshaMahaAushadhiView';
import { PhcDoctorMahaAushadhiView } from '@/components/maha-aushadhi/PhcDoctorMahaAushadhiView';
import { PharmacistMahaAushadhiView } from '@/components/maha-aushadhi/PharmacistMahaAushadhiView';
import { DistrictMahaAushadhiView } from '@/components/maha-aushadhi/DistrictMahaAushadhiView';
import { StateMahaAushadhiView } from '@/components/maha-aushadhi/StateMahaAushadhiView';
import { NationalMahaAushadhiView } from '@/components/maha-aushadhi/NationalMahaAushadhiView';
import { BedMatrixModal } from '@/components/inventory/BedMatrixModal';
import { DrugStockModal } from '@/components/inventory/DrugStockModal';
import { AuditTrailModal } from '@/components/compliance/AuditTrailModal';
import { GlobalPatientSearchModal } from '@/components/ehr/GlobalPatientSearchModal';
import { PatientTimelineModal } from '@/components/ehr/PatientTimelineModal';
import { Patient } from '@/lib/types';
import { Flame, ShieldAlert, ArrowLeft, Lock } from 'lucide-react';

export default function MahaAushadhiPage() {
  const router = useRouter();
  const { user, role } = useAuth();
  const { language } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modal states for AppShell actions
  const [isBedMatrixOpen, setIsBedMatrixOpen] = useState(false);
  const [isDrugStockOpen, setIsDrugStockOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);

  useEffect(() => {
    setMounted(true);
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

  const handleSelectNavItem = (itemId: string) => {
    if (itemId === 'link:maha_aushadhi') return;
    // Route back to main application
    router.push('/');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
          <span className="text-sm font-semibold tracking-wider text-slate-300">
            Initializing MahaAushadhi Emergency Grid...
          </span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, prompt sign-in
  if (!role || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-900/40">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">MahaAushadhi</h1>
            <p className="text-xs text-slate-400 mt-1">
              State Emergency Drug Response & Rapid Redistribution Network
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex items-center gap-2 text-left">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Authentication Required: Please sign in with your official healthcare worker account to access the emergency medicine network.
            </span>
          </div>
          <Link
            href="/"
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Portal Sign-In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      activeNavItem="link:maha_aushadhi"
      onSelectNavItem={handleSelectNavItem}
      onOpenSearch={() => setIsGlobalSearchOpen(true)}
      onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
      onOpenStockLedger={() => setIsDrugStockOpen(true)}
      onOpenAuditLogs={() => setIsAuditTrailOpen(true)}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
    >
      {/* Dynamic Role-Adaptive Operational Workspaces */}
      {role === 'asha' && <AshaMahaAushadhiView />}
      {role === 'phc_doctor' && <PhcDoctorMahaAushadhiView />}
      {role === 'nurse' && <PhcDoctorMahaAushadhiView isNurse />}
      {role === 'pharmacist' && <PharmacistMahaAushadhiView />}
      {role === 'specialist' && <DistrictMahaAushadhiView isSpecialist />}
      {role === 'district_officer' && <DistrictMahaAushadhiView />}
      {role === 'state_admin' && <StateMahaAushadhiView />}
      {role === 'national_admin' && <NationalMahaAushadhiView />}

      {/* Global Shared Modals Accessible from AppShell */}
      {isBedMatrixOpen && (
        <BedMatrixModal onClose={() => setIsBedMatrixOpen(false)} />
      )}

      {isDrugStockOpen && (
        <DrugStockModal onClose={() => setIsDrugStockOpen(false)} />
      )}

      {isAuditTrailOpen && (
        <AuditTrailModal onClose={() => setIsAuditTrailOpen(false)} />
      )}

      {isGlobalSearchOpen && (
        <GlobalPatientSearchModal
          onClose={() => setIsGlobalSearchOpen(false)}
          onOpenPatientTimeline={(pat) => setTimelinePatient(pat)}
          onOpenAbhaCard={() => {}}
          onOpenReferral={() => {}}
        />
      )}

      {timelinePatient && (
        <PatientTimelineModal
          patient={timelinePatient}
          onClose={() => setTimelinePatient(null)}
          onOpenAbhaCard={() => {}}
          onOpenReferral={() => {}}
        />
      )}
    </AppShell>
  );
}
