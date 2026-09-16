'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Role } from '@/lib/types';
import {
  HeartPulse,
  Users,
  Stethoscope,
  Building2,
  BarChart3,
  Activity,
  ClipboardList,
  Search,
  PlusCircle,
  Pill,
  ShieldAlert,
  Flame,
  Globe,
  Compass,
  Clock,
  FolderCheck,
  Share2,
  X,
  LogOut,
  Moon,
  Sun,
  Languages,
  Wifi,
  WifiOff,
  RefreshCw,
  MapPin,
  FileText,
  AlertTriangle,
  Package,
  Award,
  Sparkles,
  Radio,
  Milestone,
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
    isSimulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    syncQueue,
    triggerManualSync,
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

  // Generate standardized, uncluttered navigation hierarchy per role
  const getNavGroups = (): NavGroupDef[] => {
    switch (role) {
      case 'asha':
        return [
          {
            titleEn: 'Workspace',
            titleMr: 'कार्यक्षेत्र',
            items: [
              {
                id: 'directory',
                labelEn: 'Community Patients',
                labelMr: 'गाव समुदाय सदस्य',
                icon: Users,
              },
              {
                id: 'dashboard',
                labelEn: 'High-Risk Mothers',
                labelMr: 'HRP वॉचलिस्ट',
                icon: ClipboardList,
              },
            ],
          },
        ];


      case 'phc_doctor':
        return [
          {
            titleEn: 'Workspace',
            titleMr: 'कार्यक्षेत्र',
            items: [
              {
                id: 'directory',
                labelEn: 'Patients Directory',
                labelMr: 'रुग्ण निर्देशिका',
                icon: Stethoscope,
              },
            ],
          },
          {
            titleEn: 'Resources',
            titleMr: 'संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity',
                labelMr: 'रुग्णालय खाटा क्षमता',
                icon: Building2,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi',
                labelMr: 'महा औषधी',
                icon: Flame,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
            ],
          },
          {
            titleEn: 'Intelligence',
            titleMr: 'माहिती व सुरक्षा',
            items: [
              {
                id: 'action:audit',
                labelEn: 'Audit Trail',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldAlert,
                isAction: true,
                actionKey: 'audit',
              },
            ],
          },
        ];


      case 'nurse':
        return [
          {
            titleEn: 'Workspace',
            titleMr: 'कार्यक्षेत्र',
            items: [
              {
                id: 'directory',
                labelEn: 'Patients Directory',
                labelMr: 'रुग्ण व ट्रायज यादी',
                icon: Stethoscope,
              },
            ],
          },
          {
            titleEn: 'Resources',
            titleMr: 'संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity',
                labelMr: 'खाटा उपलब्धता',
                icon: Building2,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi',
                labelMr: 'महा औषधी',
                icon: Pill,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white',
              },
            ],
          },
        ];


      case 'pharmacist':
        return [
          {
            titleEn: 'Workspace',
            titleMr: 'कार्यक्षेत्र',
            items: [
              {
                id: 'dashboard',
                labelEn: 'Pharmacy Console',
                labelMr: 'औषधालय कन्सोल',
                icon: Pill,
              },
              {
                id: 'action:stock',
                labelEn: 'Medicine Inventory',
                labelMr: 'औषध साठा नोंदवही',
                icon: Package,
                isAction: true,
                actionKey: 'stock',
              },
              {
                id: 'directory',
                labelEn: 'Prescriptions Register',
                labelMr: 'औषध वितरण यादी',
                icon: ClipboardList,
              },
            ],
          },
          {
            titleEn: 'Resources',
            titleMr: 'संसाधने',
            items: [
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi',
                labelMr: 'महा औषधी',
                icon: Flame,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
            ],
          },
        ];

      case 'specialist':
        return [
          {
            titleEn: 'Workspace',
            titleMr: 'कार्यक्षेत्र',
            items: [
              {
                id: 'incoming',
                labelEn: 'Casualty Referrals',
                labelMr: 'आगमन कॅज्युअल्टी संदर्भ',
                icon: Activity,
                badge: pendingSpecialistReferralsCount > 0 ? pendingSpecialistReferralsCount : undefined,
                badgeColor: 'bg-blue-600 text-white',
              },
              {
                id: 'admitted',
                labelEn: 'Inpatient Admissions',
                labelMr: 'दाखल रुग्ण व वॉर्ड',
                icon: Users,
              },
              {
                id: 'escalated',
                labelEn: 'Tertiary Escalations',
                labelMr: 'राज्य रुग्णालय संदर्भ',
                icon: Share2,
              },
              {
                id: 'counter_referral',
                labelEn: 'Counter-Referrals',
                labelMr: 'उलटा संदर्भ व पाठपुरावा',
                icon: FolderCheck,
              },
              {
                id: 'history',
                labelEn: 'Case History Archive',
                labelMr: 'संदर्भ इतिहास',
                icon: Clock,
              },
            ],
          },
          {
            titleEn: 'Resources',
            titleMr: 'संसाधने',
            items: [
              {
                id: 'action:beds',
                labelEn: 'Hospital Capacity',
                labelMr: 'जिल्हा खाटा व ICU',
                icon: Building2,
                isAction: true,
                actionKey: 'beds',
              },
              {
                id: 'action:stock',
                labelEn: 'Critical Drug Buffer',
                labelMr: 'महत्त्वाचा औषध साठा',
                icon: Pill,
                isAction: true,
                actionKey: 'stock',
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi',
                labelMr: 'महा औषधी',
                icon: Flame,
                isExternalLink: true,
                href: '/maha-aushadhi',
                badge: activeEmergencyTransfersCount > 0 ? activeEmergencyTransfersCount : undefined,
                badgeColor: 'bg-rose-600 text-white animate-pulse',
              },
            ],
          },
          {
            titleEn: 'Intelligence',
            titleMr: 'माहिती व सुरक्षा',
            items: [
              {
                id: 'action:audit',
                labelEn: 'Audit Trail',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldAlert,
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
                labelEn: 'Command Center',
                labelMr: 'नियंत्रण कक्ष आढावा',
                icon: BarChart3,
              },
              {
                id: 'map',
                labelEn: 'Facility Map',
                labelMr: 'सुविधा नकाशा (GIS)',
                icon: MapPin,
              },
              {
                id: 'scorecard',
                labelEn: 'Health Scorecards',
                labelMr: 'आरोग्य गुणपत्रिका',
                icon: Award,
              },
            ],
          },
          {
            titleEn: 'Track',
            titleMr: 'थेट स्थिती ट्रॅकिंग',
            items: [
              {
                id: 'track_medicine',
                labelEn: 'Track Medicine',
                labelMr: 'औषध साठा ट्रॅकिंग',
                icon: Pill,
              },
              {
                id: 'track_referrals',
                labelEn: 'Track Referrals',
                labelMr: 'रुग्ण संदर्भ ट्रॅकिंग',
                icon: Users,
              },
              {
                id: 'track_patients',
                labelEn: 'Track Patients',
                labelMr: 'रुग्ण प्रवास व अहवाल',
                icon: Activity,
              },
            ],
          },
          {
            titleEn: 'Clinical & Logistics',
            titleMr: 'रुग्ण सेवा व रसद',
            items: [
              {
                id: 'tertiary',
                labelEn: 'Referral Risk Queue',
                labelMr: 'रुग्ण संदर्भ व ट्रायज',
                icon: Users,
                badge: (referrals || []).filter((r) => r.status === 'PENDING').length > 0 ? (referrals || []).filter((r) => r.status === 'PENDING').length : undefined,
                badgeColor: 'bg-blue-600 text-white',
              },
              {
                id: 'reallocation',
                labelEn: 'Smart Reallocation',
                labelMr: 'संसाधन वाटप',
                icon: Sparkles,
              },
              {
                id: 'capacity',
                labelEn: 'Hospital Capacity',
                labelMr: 'खाटा व ICU क्षमता',
                icon: Building2,
              },
              {
                id: 'link:maha_aushadhi',
                labelEn: 'MahaAushadhi',
                labelMr: 'महा औषधी',
                icon: Flame,
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
                id: 'escalations',
                labelEn: 'State Escalations',
                labelMr: 'राज्य संदर्भ गेटवे',
                icon: Radio,
              },
              {
                id: 'audit',
                labelEn: 'Tamper Audit Trail',
                labelMr: 'सुरक्षा व ऑडिट ट्रेल',
                icon: ShieldAlert,
              },
              {
                id: 'roadmap',
                labelEn: 'Architecture Roadmap',
                labelMr: 'आर्किटेक्चर आराखडा',
                icon: Milestone,
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

      {/* Unified 220–240px Left Sidebar (Collapses to 76px) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-[230px]' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-[230px]'}`}
      >
        {/* Top Government of Maharashtra Tricolor Bar */}
        <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 shrink-0" />

        {/* 1. BRAND HEADER (Desktop collapse is exclusively controlled by top header hamburger) */}
        <div
          className={`h-14 px-3.5 flex items-center ${
            isCollapsed ? 'justify-center' : 'justify-between'
          } border-b border-slate-200 dark:border-slate-800 shrink-0`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20 shrink-0"
              title="SwasthyaSetu — Government of Maharashtra"
            >
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    Swasthya<span className="text-blue-400">Setu</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300">
                    MH
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Govt. of Maharashtra
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button (Visible only on mobile drawer, never on desktop) */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Officer Context Card (Hidden when collapsed) */}
        {user && user.id !== 'guest-unauthenticated' && !isCollapsed && (
          <div className="px-3.5 py-2.5 border-b border-slate-850 bg-slate-900/40 shrink-0">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-slate-400">
              <span>{roleTheme.levelLabel}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${roleTheme.dotBg}`} />
            </div>
            <div className="text-xs font-bold text-white truncate mt-0.5">
              {user.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {role === 'district_officer'
                  ? `${user.district || 'Pune'} District Health Authority`
                  : user.facilityName}
              </span>
            </div>
          </div>
        )}

        {/* 2. DYNAMIC NAVIGATION CATEGORIES */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-2.5'} py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent`}>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-1">
                  {language === 'mr' ? group.titleMr : group.titleEn}
                </div>
              ) : (
                <div className="h-px bg-slate-850 my-2 mx-1" />
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
                        className={`group relative flex items-center ${
                          isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
                        } rounded-xl text-xs font-medium transition-colors ${
                          item.id.includes('maha_aushadhi')
                            ? 'text-rose-300 hover:text-white hover:bg-rose-50 dark:hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                        title={language === 'mr' ? item.labelMr : item.labelEn}
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${item.id.includes('maha_aushadhi') ? 'text-rose-400 animate-pulse' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`} />
                        {!isCollapsed && (
                          <span className="truncate flex-1">
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
                        {/* Tooltip on collapsed desktop */}
                        {isCollapsed && (
                          <div className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            {language === 'mr' ? item.labelMr : item.labelEn}
                          </div>
                        )}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`w-full group relative flex items-center ${
                        isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
                      } rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                      title={language === 'mr' ? item.labelMr : item.labelEn}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1">
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
                      {/* Tooltip on collapsed desktop */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {language === 'mr' ? item.labelMr : item.labelEn}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. BOTTOM CONTROLS & STATUS */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 shrink-0 space-y-2">
          {/* Online status indicator */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <div className="flex items-center gap-1.5">
                {effectiveOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px] animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Offline</span>
                  </span>
                )}
                {syncQueue.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({syncQueue.length} queued)
                  </span>
                )}
              </div>

              <button
                onClick={toggleSimulatedOffline}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline"
                title="Toggle simulated offline mode for field testing"
              >
                {isSimulatedOffline ? 'Sim: OFF' : 'Simulate'}
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <span className={`w-2 h-2 rounded-full ${effectiveOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
          )}

          {/* Theme, Language & Sign Out Actions */}
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 pt-1' : 'justify-between pt-1'}`}>
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1.5' : 'gap-1'}`}>
              <button
                onClick={onToggleDarkMode}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleLanguage}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
                title="Toggle Marathi / English"
              >
                <Languages className="w-4 h-4 text-blue-400" />
                {!isCollapsed && <span className="text-[11px] font-bold">{language === 'en' ? 'मराठी' : 'EN'}</span>}
              </button>
            </div>

            <button
              onClick={logout}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-[11px] font-bold transition-colors cursor-pointer ${
                isCollapsed ? 'p-2 justify-center' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span>{language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
