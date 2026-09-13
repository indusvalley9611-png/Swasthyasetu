'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { canRegisterPatient } from '@/lib/patientPrivacyService';
import { useSync } from '@/context/SyncContext';
import { Role } from '@/lib/types';
import Link from 'next/link';
import {
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  Languages,
  UserCheck,
  Building2,
  Search,
  PlusCircle,
  Activity,
  HeartPulse,
  MapPin,
  LogOut,
  Flame,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewPatient: () => void;
  onOpenSearch: () => void;
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
  onOpenAuditLogs?: () => void;
}

export function Header({
  onOpenNewPatient,
  onOpenSearch,
  onOpenBedMatrix,
  onOpenStockLedger,
  onOpenAuditLogs,
}: HeaderProps) {
  const { role, user, setRole, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const {
    effectiveOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    syncQueue,
    triggerManualSync,
    toastMessage,
    clearToast,
    stockTransfers,
  } = useSync();

  const activeEmergencyTransfersCount = (stockTransfers || []).filter(
    (t) => (t.isEmergency || t.urgency === 'CRITICAL') && t.status !== 'COMPLETED' && t.status !== 'REJECTED'
  ).length;

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const rolesList: { id: Role; labelEn: string; labelMr: string; badgeColor: string }[] = [
    {
      id: 'asha',
      labelEn: 'ASHA Worker / Sub-Centre',
      labelMr: 'आशा सेविका / उपकेंद्र',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    },
    {
      id: 'phc_doctor',
      labelEn: 'PHC Medical Officer',
      labelMr: 'वैद्यकीय अधिकारी (प्रा.आ.के.)',
      badgeColor: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    },
    {
      id: 'specialist',
      labelEn: 'District Specialist / Casualty',
      labelMr: 'जिल्हा रुग्णालय तज्ज्ञ',
      badgeColor: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    },
    {
      id: 'state_admin',
      labelEn: 'State Health Administrator',
      labelMr: 'राज्य आरोग्य संचालक',
      badgeColor: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    },
  ];

  const getAdminLevelLabel = (level?: string, r?: string) => {
    if (level === 'national') return 'National Level';
    if (level === 'state') return 'State Level';
    if (level === 'district') return 'District Level';
    if (level === 'field' || r === 'asha') return 'ASHA / Field Level';
    return 'PHC Level';
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Top Maha Govt Tricolor Band */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600" />

      {/* Official Government Header Banner */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400 tracking-wider">
            {language === 'mr' ? 'सार्वजनिक आरोग्य विभाग' : 'DEPARTMENT OF PUBLIC HEALTH'}
          </span>
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300 tracking-wider font-semibold">
            {t('abdmConform')}
          </span>
        </div>

        {/* Sync Status & Offline Simulation Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {effectiveOnline ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 text-[11px] uppercase tracking-wide">
                <Wifi className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'ऑनलाइन' : 'Online'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30 text-[11px] uppercase tracking-wide animate-pulse">
                <WifiOff className="w-3.5 h-3.5" />
                <span>
                  {language === 'mr' ? 'ऑफलाइन (स्थानिक)' : 'Offline Mode - Data saved locally'}
                </span>
              </span>
            )}

            {syncQueue.length > 0 && (
              <span className="bg-amber-500 dark:bg-amber-500/20 text-slate-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                {syncQueue.length} {t('pendingSync')}
              </span>
            )}
          </div>

          <button
            onClick={toggleSimulatedOffline}
            title="Toggle simulated offline mode to test offline form caching and local outbox queue"
            className={`px-2 py-0.5 text-[11px] rounded font-medium border transition-colors ${
              isSimulatedOffline
                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {isSimulatedOffline ? t('simulateOnline') : t('simulateOffline')}
          </button>

          {syncQueue.length > 0 && (
            <button
              onClick={() => triggerManualSync()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 bg-teal-700 hover:bg-teal-600 text-white text-[11px] px-2 py-0.5 rounded font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {t('syncNow')}
            </button>
          )}

        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700 flex items-center justify-center text-white shadow-md">
            <HeartPulse className="w-6 h-6 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{language === 'mr' ? 'स्वास्थ्यसेतू' : 'SwasthyaSetu'}</span>
                <span className="text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  MahaArogya
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'mr'
                ? 'उपकेंद्र - प्रा.आ.के. - ग्रामीण व जिल्हा रुग्णालय एकात्मिक नेटवर्क'
                : 'Sub-Centre • PHC • Rural & District Referral Network'}
            </p>
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">{language === 'mr' ? 'आभा / रुग्ण शोधा' : 'Search ABHA'}</span>
          </button>

          <button
            onClick={onOpenBedMatrix}
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="hidden md:inline">{t('bedMatrix')}</span>
            <span className="md:hidden">Beds</span>
          </button>

          <button
            onClick={onOpenStockLedger}
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
          >
            <Activity className="w-4 h-4 text-rose-600" />
            <span className="hidden md:inline">{t('emergencyStock')}</span>
            <span className="md:hidden">Stock</span>
          </button>

          <Link
            href="/maha-aushadhi"
            className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-extrabold px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors"
            title="MahaAushadhi — Emergency Drug Response Network"
          >
            <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
            <span className="hidden md:inline">MahaAushadhi</span>
            <span className="md:hidden">SOS</span>
            {activeEmergencyTransfersCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black">
                {activeEmergencyTransfersCount}
              </span>
            )}
          </Link>

          {onOpenAuditLogs && (
            <button
              onClick={onOpenAuditLogs}
              className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
              title="ABDM Data Privacy & Security Audit Trail"
            >
              <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Audit Logs</span>
              <span className="md:hidden">Audit</span>
            </button>
          )}

          {canRegisterPatient(user) && (
            <button
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t('newPatient')}</span>
              <span className="sm:hidden">New</span>
            </button>
          )}

          {/* Active User Account Badge with Role, Facility, and Administrative Level */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-950 text-white text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg shadow transition-colors border border-blue-800"
              title="Individual Authenticated Staff Profile"
            >
              <UserCheck className="w-4 h-4 text-teal-300 shrink-0" />
              <div className="text-left leading-tight hidden lg:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate max-w-[150px]">{user?.name}</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-blue-800/80 text-blue-200 border border-blue-700">
                    {getAdminLevelLabel(user?.administrativeLevel, user?.role)}
                  </span>
                </div>
                <div className="text-[10px] text-teal-200 font-medium truncate max-w-[230px]">
                  {language === 'mr' ? user?.roleTitleMr : user?.roleTitleEn} &bull; {user?.facilityName}
                </div>
              </div>
              <span className="lg:hidden font-bold">{user?.name?.split(' ')[0] || 'Account'}</span>
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                onClick={() => setRoleDropdownOpen(false)}
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Authenticated Staff Account</span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {getAdminLevelLabel(user?.administrativeLevel, user?.role)}
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {user?.name}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 font-bold">
                    {language === 'mr' ? user?.roleTitleMr : user?.roleTitleEn}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate font-semibold">{user?.facilityName}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {user?.village ? `${user.village}, ` : ''}
                      {user?.taluka ? `${user.taluka} Taluka, ` : ''}
                      {user?.district ? `${user.district} District, ` : ''}
                      {user?.state || 'Maharashtra'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    HFR: {user?.hfrCode} &bull; Reg: {user?.registrationNumber}
                  </div>
                </div>

                <div className="p-2 space-y-1">
                  {onOpenAuditLogs && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRoleDropdownOpen(false);
                        onOpenAuditLogs();
                      }}
                      className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-2"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Security & Audit Trail</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRoleDropdownOpen(false);
                      logout();
                    }}
                    className="w-full py-2 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'बाहेर पडा (Sign Out)' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active User Healthcare Hierarchy Context Banner */}
      {user && user.id !== 'guest-unauthenticated' && (
        <div className="bg-slate-100 dark:bg-slate-800/90 border-t border-b border-slate-200 dark:border-slate-700/80 px-4 py-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                <UserCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span>{user.name}</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {language === 'mr' ? user.roleTitleMr : user.roleTitleEn}
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{user.facilityName}</span>
              </span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {user.district ? `${user.district} District, ` : ''}
                  {user.state || 'Maharashtra'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700">
                {getAdminLevelLabel(user.administrativeLevel, user.role)}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Sign out of current session"
              >
                <LogOut className="w-3 h-3" />
                <span>{language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast / Notification Bar */}
      {toastMessage && (
        <div className="bg-slate-900 text-white px-4 py-2 text-xs flex justify-between items-center border-t border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={clearToast}
            className="text-slate-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}
    </header>
  );
}
