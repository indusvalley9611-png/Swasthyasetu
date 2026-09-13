'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Role, Patient, Referral } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AshaDashboard } from '@/components/dashboards/AshaDashboard';
import { PhcDoctorDashboard } from '@/components/dashboards/PhcDoctorDashboard';
import { SpecialistDashboard } from '@/components/dashboards/SpecialistDashboard';
import { StateAdminDashboard } from '@/components/dashboards/StateAdminDashboard';
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
import {
  Users, User,
  Stethoscope,
  Building2,
  BarChart3,
  HeartPulse,
  Activity,
  Languages,
    Moon,
    Sun,
} from 'lucide-react';

export default function Home() {
  const { role, setRole } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { referrals } = useSync();

  // Modal states
  const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isBedMatrixOpen, setIsBedMatrixOpen] = useState(false);
  const [isDrugStockOpen, setIsDrugStockOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
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

  const rolesNavigation = [
    {
      id: 'asha' as Role,
      titleEn: '1. ASHA / Sub-Centre',
      titleMr: '१. आशा सेविका / उपकेंद्र',
      icon: Users,
      descEn: 'Mobile Vitals, Screening & HRP Flags',
      descMr: 'जलद शारीरिक तपासणी व HRP माता निरीक्षण',
    },
    {
      id: 'phc_doctor' as Role,
      titleEn: '2. PHC Medical Officer',
      titleMr: '२. वैद्यकीय अधिकारी (PHC)',
      icon: Stethoscope,
      descEn: 'EHR, Rx Writer & Smart Referral Generator',
      descMr: 'रुग्ण इतिहास, औषध योजना व स्मार्ट रेफरल',
    },
    {
      id: 'specialist' as Role,
      titleEn: '3. District Specialist',
      titleMr: '३. जिल्हा रुग्णालय तज्ज्ञ',
      icon: Building2,
      descEn: 'Triage Queue, QR Intake & Bed Allocation',
      descMr: 'कॅज्युअल्टी ट्रायज, QR टोकन व खाटा वाटप',
    },
    {
      id: 'state_admin' as Role,
      titleEn: '4. State Administrator',
      titleMr: '४. राज्य आरोग्य संचालक',
      icon: BarChart3,
      descEn: 'Outbreak Maps, Bottlenecks & Emergency Stock',
      descMr: 'रोग प्रादुर्भाव नकाशे, अडथळे व औषध साठा',
    },
    {
      id: 'patient' as any,
      titleEn: 'Patient Access',
      titleMr: 'रुग्ण प्रवेश',
      icon: User,
      descEn: 'Download your official EHR record via ABHA.',
      descMr: 'आभा द्वारे तुमचा अधिकृत आरोग्य अहवाल डाउनलोड करा.',
    },
  ];

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-slate-900 font-sans">
        {/* Left Side - Branding & Beautiful Background */}
        <div className="lg:w-5/12 text-white flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden bg-slate-900">
          {/* Stunning Background Image with Overlay */}
          <div 
            className="absolute inset-0 z-0 opacity-40 bg-cover bg-center mix-blend-luminosity"
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?q=80&w=2070&auto=format&fit=crop")' }}
          ></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-blue-900/40"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                <HeartPulse className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                Swasthya<span className="text-teal-400">Setu</span>
              </h1>
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6 drop-shadow-md">
              {language === 'mr' ? 'सार्वजनिक आरोग्य सेवा महाराष्ट्र शासन' : 'Public Healthcare Network of Maharashtra'}
            </h2>
            <p className="text-slate-200 text-lg sm:text-xl font-medium mb-10 max-w-md drop-shadow">
              {language === 'mr' ? 'ABDM-प्रमाणित एकात्मिक इलेक्ट्रॉनिक आरोग्य रेकॉर्ड (EHR) आणि संदर्भ व्यवस्थापन प्रणाली.' : 'ABDM-compliant Integrated Electronic Health Records (EHR) & Smart Referral Management System.'}
            </p>
          </div>

          <div className="relative z-10 mt-8 flex items-center justify-between text-sm font-semibold text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              v2.4.0 (Offline Ready)
            </div>
            <div>Government of Maharashtra</div>
          </div>
        </div>

        {/* Right Side - Role Selection */}
        <div className="lg:w-7/12 bg-slate-50 dark:bg-slate-900 flex flex-col justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative transition-colors duration-300">
          
          {/* Language & Theme Switcher at Top Right */}
            <div className="absolute top-6 right-6 sm:top-8 sm:right-8 flex gap-3 z-50">
              <button
                onClick={toggleDarkMode}
                className="inline-flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
              </button>
              <button
                onClick={toggleLanguage}
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              >
                <Languages className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>{language === 'en' ? 'मराठी' : 'English'}</span>
              </button>
            </div>

          <div className="max-w-2xl w-full mx-auto mt-12 sm:mt-0">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                {language === 'mr' ? 'प्रणालीमध्ये प्रवेश करा' : 'Sign in to Portal'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                {language === 'mr' ? 'कृपया सुरू ठेवण्यासाठी तुमची भूमिका निवडा:' : 'Select your authorized healthcare tier to continue:'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
              {rolesNavigation.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedLoginRole(r.id);
                      setIsLoginModalOpen(true);
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-400 rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col gap-4 group"
                  >
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl group-hover:bg-blue-600 dark:group-hover:bg-blue-600 transition-colors w-fit border border-slate-100 dark:border-slate-800 group-hover:border-blue-500">
                      <Icon className="w-7 h-7 text-blue-900 dark:text-blue-200 dark:text-blue-400 group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-900 dark:hover:text-blue-200 dark:group-hover:text-white transition-colors">
                        {language === 'mr' ? r.titleMr : r.titleEn}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {language === 'mr' ? r.descMr : r.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-12 text-center lg:text-left">
              <p className="text-xs text-slate-400">
                Unauthorized access is strictly prohibited. Activity is logged and monitored.
              </p>
            </div>
          </div>
        </div>

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
      </div>
    );
  }

  // Dashboard View for Logged-In Users
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950">
      <Header
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
        onOpenStockLedger={() => setIsDrugStockOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 w-full mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
        {role === 'state_admin' && (
          <StateAdminDashboard
            onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
            onOpenStockLedger={() => setIsDrugStockOpen(true)}
          />
        )}

        {role === 'specialist' && (
          <SpecialistDashboard
            onOpenReferralToken={(ref) => setReferralToken(ref)}
            onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
            onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
          />
        )}

        {(role === 'asha' || role === 'phc_doctor') && (
          <WorkerWorkspace
            role={role as any}
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
            onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
            onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
            onOpenReferral={(patient) => setReferralPatient(patient)}
            onOpenReferralToken={(ref) => setReferralToken(ref)}
          />
        )}
      </main>

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

      {isLoginModalOpen && (
        <StaffLoginModal 
          onClose={() => {
            setIsLoginModalOpen(false);
            setSelectedLoginRole(undefined);
          }}
        />
      )}

      <Footer />
    </div>
  );
}
