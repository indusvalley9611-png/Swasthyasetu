'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/lib/types';
import { SignInPortalPage } from '@/components/auth/SignInPortalPage';
import { StaffLoginModal } from '@/components/auth/StaffLoginModal';
import { PatientDownloadModal } from '@/components/auth/PatientDownloadModal';
import { EmergencyHelpModal } from '@/components/emergency/EmergencyHelpModal';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, role } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedLoginRole, setSelectedLoginRole] = useState<Role | 'patient' | undefined>(undefined);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated && role) {
      router.push('/');
    }
  }, [isAuthenticated, role, router]);

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

  if (!mounted) return null;

  return (
    <>
      <SignInPortalPage
        onSelectRole={(r) => {
          setSelectedLoginRole(r);
          setIsLoginModalOpen(true);
        }}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onNavigateToPitch={() => router.push('/')}
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
