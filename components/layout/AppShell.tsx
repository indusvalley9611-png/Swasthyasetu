'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { canRegisterPatient } from '@/lib/patientPrivacyService';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

export interface AppShellProps {
  children: React.ReactNode;
  activeNavItem: string;
  onSelectNavItem: (itemId: string) => void;
  onOpenNewPatient?: () => void;
  onOpenSearch: () => void;
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
  onOpenAuditLogs: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function AppShell({
  children,
  activeNavItem,
  onSelectNavItem,
  onOpenNewPatient,
  onOpenSearch,
  onOpenBedMatrix,
  onOpenStockLedger,
  onOpenAuditLogs,
  isDarkMode,
  onToggleDarkMode,
}: AppShellProps) {
  const { user, role } = useAuth();
  const { language } = useLanguage();

  // Responsive sidebar states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Restore collapsed preference on desktop if saved
  useEffect(() => {
    const savedCollapse = localStorage.getItem('sidebar_collapsed');
    if (savedCollapse === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    localStorage.setItem('sidebar_collapsed', String(nextVal));
  };

  // Determine user capabilities for quick buttons
  const canCreatePatient = canRegisterPatient(user);

  const canViewAuditLogs =
    role === 'state_admin' ||
    role === 'national_admin' ||
    role === 'district_officer' ||
    role === 'specialist' ||
    role === 'phc_doctor';

  // Compute dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const crumbs: { label: string; href?: string }[] = [
      {
        label:
          role === 'national_admin'
            ? 'National Health Authority'
            : role === 'state_admin'
            ? 'Directorate of Health Services, Maharashtra'
            : user?.district
            ? `${user.district} District`
            : 'Public Health Department',
      },
    ];

    if (user?.facilityName) {
      crumbs.push({ label: user.facilityName });
    }

    const getItemName = (id: string) => {
      switch (id) {
        case 'directory':
          return role === 'asha'
            ? language === 'mr'
              ? 'गाव समुदाय सदस्य यादी'
              : 'Community Directory'
            : language === 'mr'
            ? 'रुग्ण निर्देशिका व केअर रेकॉर्ड्स'
            : 'Patient Directory & Care';
        case 'dashboard':
          return role === 'phc_doctor'
            ? language === 'mr'
              ? 'OPD क्लिनिकल कन्सोल व औषध योजना'
              : 'OPD Clinical Console & Rx Writer'
            : language === 'mr'
            ? 'HRP वॉचलिस्ट व तपासणी'
            : 'High-Risk Watchlist & Screening';
        case 'incoming':
          return language === 'mr' ? 'कॅज्युअल्टी ट्रायज' : 'Casualty Triage Inbox';
        case 'admitted':
          return language === 'mr' ? 'दाखल रुग्ण व वॉर्ड' : 'Active Inpatient Admissions';
        case 'escalated':
          return language === 'mr' ? 'राज्य रुग्णालय संदर्भ' : 'Tertiary Escalations';
        case 'counter_referral':
          return language === 'mr' ? 'उलटा संदर्भ व पाठपुरावा' : 'Counter-Referrals';
        case 'history':
          return language === 'mr' ? 'संदर्भ इतिहास' : 'Referral History Archive';
        case 'overview':
          return role === 'national_admin'
            ? 'National Mission Control'
            : role === 'state_admin'
            ? 'Apex State Command Center'
            : 'District Health Operations';
        case 'tertiary':
          return 'Tertiary Escalation Flow';
        case 'capacity':
          return 'Hospital Bed & ICU Grid';
        case 'resources':
          return 'Drug Buffer & Redistribution';
        case 'surveillance':
          return 'Epidemic Surveillance & RRT';
        case 'gis_map':
          return 'GIS Healthcare Map';
        case 'audit':
          return 'Cryptographic Audit Trail';
        case 'link:maha_aushadhi':
          return language === 'mr' ? 'महा औषधी आपत्कालीन नेटवर्क' : 'MahaAushadhi Emergency Network';
        default:
          return 'Dashboard';
      }
    };

    crumbs.push({ label: getItemName(activeNavItem) });
    return crumbs;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Permanent / Collapsible Left Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileDrawerOpen}
        onCloseMobile={() => setIsMobileDrawerOpen(false)}
        activeNavItem={activeNavItem}
        onSelectNavItem={onSelectNavItem}
        onOpenNewPatient={onOpenNewPatient}
        onOpenSearch={onOpenSearch}
        onOpenBedMatrix={onOpenBedMatrix}
        onOpenStockLedger={onOpenStockLedger}
        onOpenAuditLogs={onOpenAuditLogs}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
      />

      {/* Main Workspace Wrapper (Adjusts margin based on sidebar state) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[230px]'
        }`}
      >
        {/* Sleek Compact Top Header */}
        <TopHeader
          onToggleSidebar={() => {
            if (window.innerWidth < 1024) {
              setIsMobileDrawerOpen(true);
            } else {
              handleToggleCollapse();
            }
          }}
          breadcrumbs={getBreadcrumbs()}
          onOpenSearch={onOpenSearch}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 w-full p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
