'use client';

import React, { useState, useMemo } from 'react';
import { Role, Patient, Referral } from '@/lib/types';
import Link from 'next/link';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { filterPatientsForUser } from '@/lib/patientPrivacyService';
import MemberDirectory from './MemberDirectory';
import MemberProfile from './MemberProfile';
import RapidScreeningModal from '@/components/ehr/RapidScreeningModal';
import { PhcDoctorDashboard } from '@/components/dashboards/PhcDoctorDashboard';
import { AshaDashboard } from '@/components/dashboards/AshaDashboard';
import { NurseDashboard } from '@/components/dashboards/NurseDashboard';
import { PharmacistDashboard } from '@/components/dashboards/PharmacistDashboard';
import { Users, Stethoscope, ClipboardList, ShieldCheck, Flame } from 'lucide-react';

interface WorkerWorkspaceProps {
  role: Role;
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
  onOpenRapidScreening?: (patient: Patient) => void;
  activeSubView?: 'directory' | 'dashboard';
  onSubViewChange?: (view: 'directory' | 'dashboard') => void;
}

export default function WorkerWorkspace({
  role,
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
  onOpenReferralToken,
  onOpenRapidScreening,
  activeSubView: externalSubView,
  onSubViewChange,
}: WorkerWorkspaceProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { patients, referrals } = useSync();

  // Scoped patient collection based on authenticated worker's role and facility
  const scopedDirectoryPatients = useMemo(() => {
    if (!user) return [];
    const filtered = filterPatientsForUser(user, patients, referrals);
    if (user.role === 'asha') {
      return filtered.assignedPatients; // Community catchment patients
    }
    if (user.role === 'phc_doctor' || user.role === 'nurse' || user.role === 'pharmacist') {
      return filtered.facilityPatients;
    }
    if (user.role === 'specialist') {
      return filtered.facilityPatients; // Facility patients + incoming referrals
    }
    if (user.role === 'district_officer') {
      return filtered.facilityPatients; // District patients
    }
    return filtered.facilityPatients;
  }, [user, patients, referrals]);

  const [selectedMember, setSelectedMember] = useState<Patient | null>(null);
  const [isRapidScreeningOpen, setIsRapidScreeningOpen] = useState(false);
  const [internalSubView, setInternalSubView] = useState<'directory' | 'dashboard'>(
    externalSubView || 'directory'
  );

  const activeSubView = externalSubView !== undefined ? externalSubView : internalSubView;
  const setActiveSubView = (v: 'directory' | 'dashboard') => {
    setInternalSubView(v);
    if (onSubViewChange) onSubViewChange(v);
  };

  // Derive worker info from currently authenticated individual account
  const workerInfo = {
    name: user?.name || (role === 'phc_doctor' ? 'Medical Officer' : 'Healthcare Worker'),
    roleName: language === 'mr' ? user?.roleTitleMr || user?.roleTitleEn : user?.roleTitleEn || 'Staff',
    location: user?.facilityName || 'Maharashtra',
  };

  const handleOpenAction = (
    action: 'VITALS' | 'REFERRAL' | 'ABHA' | 'TIMELINE' | 'REFERRAL_STATUS'
  ) => {
    if (!selectedMember) return;

    if (action === 'TIMELINE') {
      onOpenPatientTimeline(selectedMember);
    } else if (action === 'ABHA') {
      onOpenAbhaCard(selectedMember);
    } else if (action === 'REFERRAL') {
      onOpenReferral(selectedMember);
    } else if (action === 'REFERRAL_STATUS') {
      if (onOpenReferralToken && selectedMember.activeReferralId) {
        const activeRef = referrals.find((r) => r.id === selectedMember.activeReferralId);
        if (activeRef) onOpenReferralToken(activeRef);
      }
    } else if (action === 'VITALS') {
      setIsRapidScreeningOpen(true);
    }
  };

  // Check if current role has a dedicated console
  const hasConsoleToggle = role === 'phc_doctor' || role === 'asha' || role === 'nurse' || role === 'pharmacist';

  return (
    <div className="w-full h-full relative space-y-4">

      {/* Patients Directory: Clean Directory List → Full Patient Profile (Image 2) */}
      {activeSubView === 'directory' && (
        <div className="w-full h-full relative">
          {!selectedMember ? (
            <MemberDirectory
              patients={scopedDirectoryPatients}
              onSelectMember={setSelectedMember}
              workerName={workerInfo.name}
              workerRoleName={workerInfo.roleName}
              workerLocation={workerInfo.location}
              onOpenNewPatient={onOpenNewPatient}
            />
          ) : (
            <MemberProfile
              patient={selectedMember}
              role={role}
              onBack={() => setSelectedMember(null)}
              onOpenAction={handleOpenAction}
            />
          )}

          {isRapidScreeningOpen && selectedMember && (
            <RapidScreeningModal
              patient={selectedMember}
              onClose={() => setIsRapidScreeningOpen(false)}
            />
          )}
        </div>
      )}

      {/* Legacy 'dashboard' subview — kept for pharmacist and any future use */}
      {activeSubView === 'dashboard' && !selectedMember && role === 'phc_doctor' && (
        <PhcDoctorDashboard
          onOpenNewPatient={onOpenNewPatient}
          onOpenPatientTimeline={onOpenPatientTimeline}
          onOpenAbhaCard={onOpenAbhaCard}
          onOpenReferral={onOpenReferral}
        />
      )}

      {activeSubView === 'dashboard' && !selectedMember && role === 'asha' && (
        <AshaDashboard
          onOpenNewPatient={onOpenNewPatient}
          onOpenPatientTimeline={onOpenPatientTimeline}
          onOpenAbhaCard={onOpenAbhaCard}
          onOpenReferral={onOpenReferral}
        />
      )}

      {activeSubView === 'dashboard' && !selectedMember && role === 'nurse' && (
        <NurseDashboard
          onOpenNewPatient={onOpenNewPatient}
          onOpenPatientTimeline={onOpenPatientTimeline}
          onOpenAbhaCard={onOpenAbhaCard}
          onOpenReferral={onOpenReferral}
        />
      )}

      {activeSubView === 'dashboard' && !selectedMember && role === 'pharmacist' && (
        <PharmacistDashboard />
      )}

    </div>
  );
}
