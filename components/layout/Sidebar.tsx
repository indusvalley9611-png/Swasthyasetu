'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Role } from '@/lib/types';
import {
  FolderHeart,
  HeartHandshake,
  Baby,
  BedDouble,
  Syringe,
  Tablets,
  ShieldCheck,
  Siren,
  ArrowLeftRight,
  FileClock,
  LayoutDashboard,
  Hospital,
  MapPin,
  Sparkles,
  Radio,
  Pill,
  Sun,
  Moon,
  Languages,
  LogOut,
  X,
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  activeNavItem: string;
  onSelectNavItem: (itemId: string) => void;
  onOpenNewPatient?: () => void;
  onOpenSearch?: () => void;
  onOpenBedMatrix?: () => void;
  onOpenStockLedger?: () => void;
  onOpenAuditLogs?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

interface NavItemDef {
  id: string;
  labelEn: string;
  labelMr: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  isAction?: boolean;
  actionKey?: 'new_patient' | 'search' | 'beds' | 'stock' | 'audit';
  isExternalLink?: boolean;
  href?: string;
}

interface NavGroupDef {
  titleEn: string;
  titleMr: string;
  items: NavItemDef[];
}

const heartbeatKeyframes = `
@keyframes dualSystoleHeartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.15); }
  28% { transform: scale(1.02); }
  42% { transform: scale(1.10); }
  70% { transform: scale(1); }
  100% { transform: scale(1); }
}
@media (prefers-reduced-motion: no-preference) {
  .animate-heartbeat {
    animation: dualSystoleHeartbeat 2.2s ease-in-out infinite;
  }
}
`;

function MedicalHeartbeatIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Heart Contour */}
      <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" opacity="0.35" />
      {/* Active P-Q-R-S-T ECG Live Trace */}
      <path d="M3 12h3.5l1.5-3 2 6 2-7.5 2 9 1.5-4.5h4.5" strokeWidth="2.2" />
    </svg>
  );
}

function NavTooltip({ text }: { text: string }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 -translate-x-1.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center border border-slate-700/50 dark:border-slate-200"
    >
      <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-100" />
      {text}
    </div>
  );
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  activeNavItem,
  onSelectNavItem,
  onOpenNewPatient,
  onOpenSearch,
  onOpenBedMatrix,
  onOpenStockLedger,
  onOpenAuditLogs,
  isDarkMode,
  onToggleDarkMode,
}: SidebarProps) {
  const { role, user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const {
    effectiveOnline,
    isSyncing,
    syncQueue,
    referrals,
    stockTransfers,
  } = useSync();

  // Active emergency count for MahaAushadhi
  const activeEmergencyTransfersCount = (stockTransfers || []).filter(
    (t) => (t.isEmergency || t.urgency === 'CRITICAL') && t.status !== 'COMPLETED' && t.status !== 'REJECTED'
  ).length;

  const pendingSpecialistReferralsCount = (referrals || []).filter((r) => {
    if (r.status !== 'PENDING') return false;
    if (!user?.facilityName || !r.targetFacility) return false;
    const target = r.targetFacility.toLowerCase();
    const fac = user.facilityName.toLowerCase();
    return target.includes(fac) || fac.includes(target) || (target.includes('aundh') && fac.includes('aundh'));
  }).length;

  // Pending incoming medicine requests for this facility (where this facility is the SOURCE being asked to supply)
  const pendingIncomingTransfersCount = (stockTransfers || []).filter((t) => {
    const isSourceThis =
      t.sourceFacilityId === user?.facilityId ||
      (t.sourceFacilityName && user?.facilityName && t.sourceFacilityName.toLowerCase().includes(user.facilityName.toLowerCase()));
    const isPending = t.status === 'PENDING' || t.status === 'PENDING_SOURCE_APPROVAL';
    return isSourceThis && isPending;
  }).length;

  // Level-specific badge styling
  const getRoleTheme = (r?: Role | null) => {
    switch (r) {
      case 'asha':
        return {
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotBg: 'bg-emerald-500',
          levelLabel: 'Field / ASHA',
        };
      case 'phc_doctor':
        return {
          badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dotBg: 'bg-blue-500',
          levelLabel: 'PHC Medical Officer',
        };
      case 'nurse':
        return {
          badgeBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
          dotBg: 'bg-teal-500',
          levelLabel: 'PHC Nursing Staff',
        };
      case 'pharmacist':
        return {
          badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
          dotBg: 'bg-violet-500',
          levelLabel: 'PHC Pharmacy Officer',
        };
      case 'specialist':
        return {
          badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dotBg: 'bg-purple-500',
          levelLabel: 'District Specialist',
        };
      case 'district_officer':
        return {
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotBg: 'bg-amber-500',
          levelLabel: 'District Health Officer',
        };
      default:
        return {
          badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-700',
          dotBg: 'bg-slate-500',
          levelLabel: 'Healthcare Officer',
        };
    }
  };

  const roleTheme = getRoleTheme(role);

  // Generate standardized navigation hierarchy with full feature names and modern healthcare icons
  const getNavGroups = (): NavGroupDef[] => {
    switch (role) {
      case 'asha':
        return [
          {
            titleEn: 'Community Health',
            titleMr: 'समुदाय आरोग्य',
            items: [
              {
                id: 'directory',
                labelEn: 'Community Patients & EHR',
                labelMr: 'गाव समुदाय सदस्य व EHR',
                icon: FolderHeart,
              },
              {
                id: 'dashboard',
                labelEn: 'Maternal Health & Screening',
                labelMr: 'HRP माता आरोग्य तपासणी',
                icon: Baby,
              },
            ],
          },
        ];

      case 'phc_doctor':
        return [
          {
            titleEn: 'Clinical Workspace',
            titleMr: 'क्लिनिकल कार्यक्षेत्र',
            items: [
              {
                id: 'directory',
                labelEn: 'Patients Directory & EHR',
                labelMr: 'रुग्ण निर्देशिका व EHR',
                icon: FolderHeart,
              },
            ],
          },
          {
            titleEn: 'Hospital Resources',
            titleMr: 'रुग्णालय संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity & Beds',
                labelMr: 'रुग्णालय खाटा व ICU क्षमता',
                icon: BedDouble,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi Emergency',
                labelMr: 'महा औषधी आपत्कालीन नेटवर्क',
                icon: Syringe,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
              {
                id: 'medicine_requests',
                labelEn: 'Medicine Requests & Dispatch',
                labelMr: 'औषध मागण्या व पुरवठा',
                icon: Tablets,
                badge: pendingIncomingTransfersCount > 0 ? pendingIncomingTransfersCount : undefined,
                badgeColor: 'bg-purple-600 text-white animate-pulse',
              },
            ],
          },
          {
            titleEn: 'Intelligence & Governance',
            titleMr: 'सुरक्षा व प्रशासन',
            items: [
              {
                id: 'action:audit',
                labelEn: 'Audit Trail & Compliance',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldCheck,
                isAction: true,
                actionKey: 'audit',
              },
            ],
          },
        ];

      case 'nurse':
        return [
          {
            titleEn: 'Clinical Workspace',
            titleMr: 'क्लिनिकल कार्यक्षेत्र',
            items: [
              {
                id: 'directory',
                labelEn: 'Patients Directory & EHR',
                labelMr: 'रुग्ण निर्देशिका व ट्रायज',
                icon: FolderHeart,
              },
            ],
          },
          {
            titleEn: 'Hospital Resources',
            titleMr: 'रुग्णालय संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity & Beds',
                labelMr: 'खाटा व वॉर्ड उपलब्धता',
                icon: BedDouble,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi Emergency',
                labelMr: 'महा औषधी आपत्कालीन',
                icon: Syringe,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white',
              },
              {
                id: 'medicine_requests',
                labelEn: 'Medicine Requests & Dispatch',
                labelMr: 'औषध मागण्या व पुरवठा',
                icon: Tablets,
                badge: pendingIncomingTransfersCount > 0 ? pendingIncomingTransfersCount : undefined,
                badgeColor: 'bg-purple-600 text-white animate-pulse',
              },
            ],
          },
        ];

      case 'pharmacist':
        return [
          {
            titleEn: 'Pharmacy Operations',
            titleMr: 'औषधालय कार्यक्षेत्र',
            items: [
              {
                id: 'dashboard',
                labelEn: 'Pharmacy Console & Dispatches',
                labelMr: 'औषधालय कन्सोल',
                icon: Tablets,
              },
              {
                id: 'medicine_inventory',
                labelEn: 'Medicine Inventory & Buffer',
                labelMr: 'औषध साठा नोंदवही',
                icon: Syringe,
              },
              {
                id: 'medicine_requests',
                labelEn: 'Medicine Requests & Dispatch',
                labelMr: 'औषध मागण्या व वाटप',
                icon: ArrowLeftRight,
                badge: pendingIncomingTransfersCount > 0 ? pendingIncomingTransfersCount : undefined,
                badgeColor: 'bg-purple-600 text-white animate-pulse',
              },
            ],
          },
        ];

      case 'specialist':
        return [
          {
            titleEn: 'Clinical Triage & Care',
            titleMr: 'क्लिनिकल ट्रायज व रुग्णसेवा',
            items: [
              {
                id: 'incoming',
                labelEn: 'Casualty & Inbound Referrals',
                labelMr: 'कॅज्युअल्टी व आगमन संदर्भ',
                icon: Siren,
                badge: pendingSpecialistReferralsCount > 0 ? pendingSpecialistReferralsCount : undefined,
                badgeColor: 'bg-blue-600 text-white',
              },
              {
                id: 'admitted',
                labelEn: 'Inpatient Admissions & Wards',
                labelMr: 'दाखल रुग्ण व वॉर्ड',
                icon: BedDouble,
              },
              {
                id: 'escalated',
                labelEn: 'Tertiary State Escalations',
                labelMr: 'राज्य रुग्णालय संदर्भ',
                icon: ArrowLeftRight,
              },
              {
                id: 'counter_referral',
                labelEn: 'Counter-Referrals & Follow-Up',
                labelMr: 'उलटा संदर्भ व पाठपुरावा',
                icon: HeartHandshake,
              },
              {
                id: 'history',
                labelEn: 'Clinical Records & Case History',
                labelMr: 'संदर्भ व वैद्यकीय इतिहास',
                icon: FileClock,
              },
            ],
          },
          {
            titleEn: 'Hospital Resources',
            titleMr: 'रुग्णालय संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity & Beds',
                labelMr: 'जिल्हा खाटा व ICU',
                icon: Hospital,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'action:stock',
                labelEn: 'Critical Drug Buffer',
                labelMr: 'महत्त्वाचा औषध साठा',
                icon: Tablets,
                isAction: true,
                actionKey: 'stock',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi Emergency',
                labelMr: 'महा औषधी आपत्कालीन',
                icon: Syringe,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
            ],
          },
          {
            titleEn: 'Governance & Security',
            titleMr: 'प्रशासन व सुरक्षा',
            items: [
              {
                id: 'action:audit',
                labelEn: 'Audit Trail & Compliance',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldCheck,
                isAction: true,
                actionKey: 'audit',
              },
            ],
          },
        ];

      case 'district_officer':
        return [
          {
            titleEn: 'District Command',
            titleMr: 'जिल्हा नियंत्रण',
            items: [
              {
                id: 'overview',
                labelEn: 'District Command Center',
                labelMr: 'जिल्हा नियंत्रण कक्ष',
                icon: LayoutDashboard,
              },
              {
                id: 'map',
                labelEn: 'Facility & GIS Map',
                labelMr: 'आरोग्य सुविधा नकाशा (GIS)',
                icon: MapPin,
              },
              {
                id: 'capacity',
                labelEn: 'Hospital Capacity & Beds',
                labelMr: 'खाटा व ICU क्षमता',
                icon: Hospital,
              },
            ],
          },
          {
            titleEn: 'Live Intelligence Tracking',
            titleMr: 'थेट स्थिती ट्रॅकिंग',
            items: [
              {
                id: 'track_referrals',
                labelEn: 'Track Referrals & Triage',
                labelMr: 'रुग्ण संदर्भ ट्रॅकिंग',
                icon: ArrowLeftRight,
              },
              {
                id: 'track_patients',
                labelEn: 'Track Patients & EHR',
                labelMr: 'रुग्ण प्रवास व EHR',
                icon: FolderHeart,
              },
              {
                id: 'track_medicine',
                labelEn: 'Track Medicine & Buffer',
                labelMr: 'औषध साठा ट्रॅकिंग',
                icon: Tablets,
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi Emergency',
                labelMr: 'महा औषधी आपत्कालीन',
                icon: Syringe,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
            ],
          },
          {
            titleEn: 'Operations & Escalations',
            titleMr: 'रुग्ण सेवा व रसद',
            items: [
              {
                id: 'tertiary',
                labelEn: 'Referral Risk Queue',
                labelMr: 'रुग्ण संदर्भ व ट्रायज',
                icon: Siren,
                badge: (referrals || []).filter((r) => r.status === 'PENDING').length > 0 ? (referrals || []).filter((r) => r.status === 'PENDING').length : undefined,
                badgeColor: 'bg-blue-600 text-white',
              },
              {
                id: 'reallocation',
                labelEn: 'Resource Reallocation',
                labelMr: 'संसाधन वाटप',
                icon: Sparkles,
              },
              {
                id: 'escalations',
                labelEn: 'State Escalation Gateway',
                labelMr: 'राज्य संदर्भ गेटवे',
                icon: Radio,
              },
            ],
          },
          {
            titleEn: 'Governance & Security',
            titleMr: 'प्रशासन व सुरक्षा',
            items: [
              {
                id: 'audit',
                labelEn: 'Audit Trail & Compliance',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldCheck,
              },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const navGroups = getNavGroups();

  const handleItemClick = (item: NavItemDef) => {
    if (item.isAction) {
      switch (item.actionKey) {
        case 'new_patient':
          if (onOpenNewPatient) onOpenNewPatient();
          break;
        case 'search':
          if (onOpenSearch) onOpenSearch();
          break;
        case 'beds':
          if (onOpenBedMatrix) onOpenBedMatrix();
          break;
        case 'stock':
          if (onOpenStockLedger) onOpenStockLedger();
          break;
        case 'audit':
          if (onOpenAuditLogs) onOpenAuditLogs();
          break;
      }
    } else if (!item.isExternalLink) {
      onSelectNavItem(item.id);
    }
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Unified Left Sidebar (250px expanded, collapses to 72px) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 shadow-xl transition-all duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-[250px]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[250px]'}`}
      >
        <style dangerouslySetInnerHTML={{ __html: heartbeatKeyframes }} />
        {/* Top Government of Maharashtra Tricolor Accent Line */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 shrink-0" />

        {/* 1. BRAND HEADER (Clickable to Toggle Sidebar) */}
        <div
          onClick={onToggleCollapse}
          className={`h-13 px-3 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } border-b border-slate-200 dark:border-slate-800/80 shrink-0 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors`}
          title={isCollapsed ? 'Expand Sidebar (☰)' : 'Collapse Sidebar'}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/25 shrink-0 animate-heartbeat motion-safe:animate-heartbeat"
              title="SwasthyaSetu — Government of Maharashtra"
            >
              <MedicalHeartbeatIcon className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    Swasthya<span className="text-blue-500">Setu</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    MH
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  Govt. of Maharashtra
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseMobile();
            }}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. DYNAMIC NAVIGATION CATEGORIES */}
        <div className={`flex-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'} ${isCollapsed ? 'px-2' : 'px-2.5'} py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent`}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="flex items-center gap-2 px-2 text-[9px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mb-1.5">
                  <span className="truncate">{language === 'mr' ? group.titleMr : group.titleEn}</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
              ) : (
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2 mx-1.5" />
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNavItem === item.id;

                  if (item.isExternalLink && item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`group relative flex items-center min-h-[38px] ${
                          isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-1.5'
                        } rounded-lg text-xs font-medium transition-all duration-150 hover:scale-[1.01] ${
                          item.id.includes('maha_aushadhi')
                            ? 'text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                        title={language === 'mr' ? item.labelMr : item.labelEn}
                      >
                        <Icon className={`w-4.5 h-4.5 shrink-0 ${item.id.includes('maha_aushadhi') ? 'text-rose-500 animate-pulse' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
                        {!isCollapsed && (
                          <span className="truncate flex-1 font-semibold text-xs">
                            {language === 'mr' ? item.labelMr : item.labelEn}
                          </span>
                        )}
                        {!isCollapsed && item.badge !== undefined && (
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                            {item.badge}
                          </span>
                        )}
                        {isCollapsed && item.badge !== undefined && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                        {isCollapsed && <NavTooltip text={language === 'mr' ? item.labelMr : item.labelEn} />}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full group relative flex items-center min-h-[38px] ${
                        isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-1.5'
                      } rounded-lg text-xs transition-all duration-150 hover:scale-[1.01] text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25 scale-[1.01]'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 font-medium'
                      }`}
                      title={language === 'mr' ? item.labelMr : item.labelEn}
                    >
                      <Icon
                        className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1 text-xs">
                          {language === 'mr' ? item.labelMr : item.labelEn}
                        </span>
                      )}
                      {!isCollapsed && item.badge !== undefined && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                          {item.badge}
                        </span>
                      )}
                      {isCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      {isCollapsed && <NavTooltip text={language === 'mr' ? item.labelMr : item.labelEn} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. BOTTOM CONTROLS & SIGN OUT */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/80 shrink-0 space-y-1.5">
          {/* Controls: Theme & Language */}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'justify-between px-1'}`}>
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
              <button
                onClick={onToggleDarkMode}
                className="group relative p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                {isCollapsed && <NavTooltip text={isDarkMode ? 'Light Mode' : 'Dark Mode'} />}
              </button>

              <button
                onClick={toggleLanguage}
                className="group relative p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title={language === 'mr' ? 'भाषा बदला (EN | मर)' : 'Switch Language (EN | मर)'}
              >
                <Languages className="w-3.5 h-3.5 text-blue-500" />
                {!isCollapsed && (
                  <span className="text-[10px] font-bold tracking-tight">
                    <span className={language === 'en' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}>EN</span>
                    <span className="text-slate-400 mx-0.5">|</span>
                    <span className={language === 'mr' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400'}>मर</span>
                  </span>
                )}
                {isCollapsed && <NavTooltip text={language === 'mr' ? 'भाषा: मराठी' : 'Language: English'} />}
              </button>
            </div>
          </div>

          {/* Sign Out Button Only */}
          {isCollapsed ? (
            <div className="flex justify-center pt-0.5">
              <button
                onClick={logout}
                className="group relative p-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer flex items-center justify-center"
                title={language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}
              >
                <LogOut className="w-4 h-4" />
                <NavTooltip text={language === 'mr' ? 'बाहेर पडा' : 'Sign Out'} />
              </button>
            </div>
          ) : (
            <button
              onClick={logout}
              className="w-full group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
              title={language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
              <span className="truncate">{language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
