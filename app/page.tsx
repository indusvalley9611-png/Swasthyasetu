'use client';

import React, { useState } from 'react';
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
import { NewPatientModal } from '@/components/ehr/NewPatientModal';
import { PatientTimelineModal } from '@/components/ehr/PatientTimelineModal';
import { AbhaCardModal } from '@/components/ehr/AbhaCardModal';
import { SmartReferralModal } from '@/components/referral/SmartReferralModal';
import { ReferralTokenModal } from '@/components/referral/ReferralTokenModal';
import { BedMatrixModal } from '@/components/inventory/BedMatrixModal';
import { DrugStockModal } from '@/components/inventory/DrugStockModal';
import { GlobalPatientSearchModal } from '@/components/ehr/GlobalPatientSearchModal';
import { StaffLoginModal } from '@/components/auth/StaffLoginModal';
import {
  Users,
  Stethoscope,
  Building2,
  BarChart3,
  HeartPulse,
  Activity,
  Languages,
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
  const [selectedLoginRole, setSelectedLoginRole] = useState<Role | undefined>(undefined);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);
  const [abhaCardPatient, setAbhaCardPatient] = useState<Patient | null>(null);
  const [referralPatient, setReferralPatient] = useState<Patient | null>(null);
  const [referralToken, setReferralToken] = useState<Referral | null>(null);

  const rolesNavigation: { id: Role; titleEn: string; titleMr: string; icon: any; descEn: string; descMr: string }[] = [
    {
      id: 'asha',
      titleEn: '1. ASHA / Sub-Centre',
      titleMr: '१. आशा सेविका / उपकेंद्र',
      icon: Users,
      descEn: 'Mobile Vitals, Screening & HRP Flags',
      descMr: 'जलद शारीरिक तपासणी व HRP माता निरीक्षण',
    },
    {
      id: 'phc_doctor',
      titleEn: '2. PHC Medical Officer',
      titleMr: '२. वैद्यकीय अधिकारी (PHC)',
      icon: Stethoscope,
      descEn: 'EHR, Rx Writer & Smart Referral Generator',
      descMr: 'रुग्ण इतिहास, औषध योजना व स्मार्ट रेफरल',
    },
    {
      id: 'specialist',
      titleEn: '3. District Specialist',
      titleMr: '३. जिल्हा रुग्णालय तज्ज्ञ',
      icon: Building2,
      descEn: 'Triage Queue, QR Intake & Bed Allocation',
      descMr: 'कॅज्युअल्टी ट्रायज, QR टोकन व खाटा वाटप',
    },
    {
      id: 'state_admin',
      titleEn: '4. State Administrator',
      titleMr: '४. राज्य आरोग्य संचालक',
      icon: BarChart3,
      descEn: 'Outbreak Maps, Bottlenecks & Emergency Stock',
      descMr: 'रोग प्रादुर्भाव नकाशे, अडथळे व औषध साठा',
    },
  ];

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
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

          <div className="relative z-10 flex-1 flex flex-col items-start justify-center py-8">
            {/* Visual Healthcare Network Nodes using CSS/Icons */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Statewide Coverage</h4>
                  <p className="text-xs text-slate-300">Active real-time monitoring</p>
                </div>
              </div>
              <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-5 before:w-0.5 before:bg-white/20">
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-600 shadow-lg">
                    <span className="w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]"></span>
                  </div>
                  <span className="text-sm font-semibold text-slate-200">10,000+ Sub-Centres (ASHA)</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-600 shadow-lg">
                    <span className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"></span>
                  </div>
                  <span className="text-sm font-semibold text-slate-200">1,900+ Primary Health Centres</span>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-600 shadow-lg">
                    <span className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]"></span>
                  </div>
                  <span className="text-sm font-semibold text-slate-200">District & Rural Hospitals</span>
                </div>
              </div>
            </div>
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
        <div className="lg:w-7/12 bg-slate-50 flex flex-col justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative">
          
          {/* Language Switcher at Top Right */}
          <div className="absolute top-6 right-6 sm:top-8 sm:right-8">
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-full text-sm font-semibold border border-slate-200 shadow-sm transition-all"
            >
              <Languages className="w-4 h-4 text-teal-600" />
              <span>{language === 'en' ? 'मराठी' : 'English'}</span>
            </button>
          </div>

          <div className="max-w-2xl w-full mx-auto mt-12 sm:mt-0">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                {language === 'mr' ? 'प्रणालीमध्ये प्रवेश करा' : 'Sign in to Portal'}
              </h2>
              <p className="text-slate-500 text-lg">
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
                    className="bg-white border border-slate-200 hover:border-blue-600 rounded-2xl p-5 sm:p-6 text-left transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col gap-4 group"
                  >
                    <div className="bg-slate-50 p-3 rounded-xl group-hover:bg-blue-600 transition-colors w-fit border border-slate-100 group-hover:border-blue-500">
                      <Icon className="w-7 h-7 text-blue-900 group-hover:text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-900 transition-colors">
                        {language === 'mr' ? r.titleMr : r.titleEn}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
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

        {isLoginModalOpen && (
          <StaffLoginModal 
            onClose={() => {
              setIsLoginModalOpen(false);
              setSelectedLoginRole(undefined);
            }}
            initialRole={selectedLoginRole}
          />
        )}
      </div>
    );
  }

  // Dashboard View for Logged-In Users
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header
        onOpenNewPatient={() => setIsNewPatientOpen(true)}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
        onOpenStockLedger={() => setIsDrugStockOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      <main className="flex-1 w-full mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 py-4 sm:py-6">
        {role === 'asha' && (
          <AshaDashboard
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
            onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
            onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
            onOpenReferral={(patient) => setReferralPatient(patient)}
          />
        )}

        {role === 'phc_doctor' && (
          <PhcDoctorDashboard
            onOpenNewPatient={() => setIsNewPatientOpen(true)}
            onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
            onOpenAbhaCard={(patient) => setAbhaCardPatient(patient)}
            onOpenReferral={(patient) => setReferralPatient(patient)}
          />
        )}

        {role === 'specialist' && (
          <SpecialistDashboard
            onOpenReferralToken={(ref) => setReferralToken(ref)}
            onOpenPatientTimeline={(patient) => setTimelinePatient(patient)}
            onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
          />
        )}

        {role === 'state_admin' && (
          <StateAdminDashboard
            onOpenBedMatrix={() => setIsBedMatrixOpen(true)}
            onOpenStockLedger={() => setIsDrugStockOpen(true)}
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
