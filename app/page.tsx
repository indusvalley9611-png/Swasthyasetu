'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Role, Patient, Referral } from '@/lib/types';
import { AppShell } from '@/components/layout/AppShell';
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
import { LandingPitchPage } from '@/components/landing/LandingPitchPage';
import { SignInPortalPage } from '@/components/auth/SignInPortalPage';

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

  // Split Page 1 (Pitch / Landing) vs Page 2 (Sign In)
  const [unauthView, setUnauthView] = useState<'pitch' | 'signin'>('pitch');

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

  if (!mounted) {
    return null;
  }

  // ── UNAUTHENTICATED STATE: SPLIT BETWEEN PAGE 1 (PITCH) & PAGE 2 (SIGN IN) ──
  if (!isAuthenticated || !role) {
    if (unauthView === 'pitch') {
      return (
        <LandingPitchPage
          onNavigateToSignIn={() => setUnauthView('signin')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      );
    }

    return (
      <>
        <SignInPortalPage
          onSelectRole={(r) => {
            setSelectedLoginRole(r as Role | 'patient');
            setIsLoginModalOpen(true);
          }}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onNavigateToPitch={() => setUnauthView('pitch')}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />

        {/* Auth Modals */}
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
      </>
    );
  }

  // ── DASHBOARD VIEW FOR LOGGED-IN USERS ──
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
          activeSubView={
            activeNavItem === 'dashboard'
              ? 'dashboard'
              : activeNavItem === 'medicine_requests'
              ? 'medicine_requests'
              : activeNavItem === 'medicine_inventory'
              ? 'medicine_inventory'
              : 'directory'
          }
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
