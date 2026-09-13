'use client';

import React, { useState } from 'react';
import { Role, Patient, Referral } from '@/lib/types';
import { useSync } from '@/context/SyncContext';
import MemberDirectory from './MemberDirectory';
import MemberProfile from './MemberProfile';
import RapidScreeningModal from '@/components/ehr/RapidScreeningModal';

interface WorkerWorkspaceProps {
  role: Role;
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
  // Fallback for custom modals like Rapid Screening if they don't exist in page.tsx yet
  onOpenRapidScreening?: (patient: Patient) => void;
}

export default function WorkerWorkspace({
  role,
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
  onOpenReferralToken,
  onOpenRapidScreening
}: WorkerWorkspaceProps) {
  const { patients, referrals } = useSync();
  const [selectedMember, setSelectedMember] = useState<Patient | null>(null);
  const [isRapidScreeningOpen, setIsRapidScreeningOpen] = useState(false);

  // Derive worker info based on role for the directory header
  const getWorkerInfo = () => {
    switch(role) {
      case 'asha': return { name: 'Priya Sharma', roleName: 'ASHA Worker', location: 'Velhe, Pune' };
      case 'phc_doctor': return { name: 'Dr. Ramesh Kumar', roleName: 'PHC Medical Officer', location: 'Velhe PHC' };
      case 'specialist': return { name: 'Dr. Anjali Desai', roleName: 'Cardiologist', location: 'District Hospital, Pune' };
      default: return { name: 'Healthcare Worker', roleName: 'Worker', location: 'Maharashtra' };
    }
  };

  const workerInfo = getWorkerInfo();

  const handleOpenAction = (action: 'VITALS' | 'REFERRAL' | 'ABHA' | 'TIMELINE' | 'REFERRAL_STATUS') => {
    if (!selectedMember) return;
    
    if (action === 'TIMELINE') {
      onOpenPatientTimeline(selectedMember);
    } else if (action === 'ABHA') {
      onOpenAbhaCard(selectedMember);
    } else if (action === 'REFERRAL') {
      onOpenReferral(selectedMember);
    } else if (action === 'REFERRAL_STATUS') {
      if (onOpenReferralToken && selectedMember.activeReferralId) {
        const activeRef = referrals.find(r => r.id === selectedMember.activeReferralId);
        if (activeRef) onOpenReferralToken(activeRef);
      }
    } else if (action === 'VITALS') {
      setIsRapidScreeningOpen(true);
    }
  };

  return (
    <div className="w-full h-full relative">
      {!selectedMember ? (
        <MemberDirectory 
          patients={patients}
          onSelectMember={setSelectedMember}
          workerName={workerInfo.name}
          workerRoleName={workerInfo.roleName}
          workerLocation={workerInfo.location}
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
  );
}
