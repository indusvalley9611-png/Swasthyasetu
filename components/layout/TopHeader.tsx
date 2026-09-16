'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import {
  Menu,
  Search,
  Building2,
  MapPin,
  LogOut,
  ChevronRight,
  Bell,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';

export interface TopHeaderProps {
  onToggleSidebar: () => void;
  breadcrumbs: { label: string; href?: string }[];
  onOpenSearch: () => void;
}


function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TopHeader({
  onToggleSidebar,
  breadcrumbs,
  onOpenSearch,
}: TopHeaderProps) {
    const { user, role, logout } = useAuth();
  const { language } = useLanguage();
  const {
    effectiveOnline,
    isSyncing,
    syncQueue,
    triggerManualSync,
  } = useSync();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 h-13 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="h-full px-3.5 sm:px-5 flex items-center justify-between gap-3">
        
        {/* Left: Hamburger & Dynamic Context Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle sidebar navigation"
            aria-label="Toggle sidebar navigation"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Breadcrumbs Navigation */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />}
                <span
                  className={`truncate ${
                    idx === breadcrumbs.length - 1
                      ? 'font-bold text-slate-900 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-800/70 px-2 py-0.5 rounded-md text-[11px]'
                      : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors'
                  }`}
                >
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Mobile View Title */}
          <div className="sm:hidden font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.label || 'SwasthyaSetu'}
          </div>
        </div>

        {/* Center: Compact Global Search (ABHA / National EHR) */}
        <div className="hidden md:flex flex-1 max-w-xs mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-2.5 py-1 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Search ABHA / Patient ID...</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Online Status, Notifications, User Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
          
          {/* Mobile search icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Search ABHA"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Online status indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            {effectiveOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Offline</span>
              </span>
            )}

            {syncQueue.length > 0 && (
              <button
                onClick={() => triggerManualSync()}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 cursor-pointer"
                title="Sync queued changes"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncQueue.length}</span>
              </button>
            )}
          </div>

          {/* Notifications Bell */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
              title="System Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            </button>

            {notificationOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in"
                onClick={() => setNotificationOpen(false)}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notifications</div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30">
                    <p className="font-bold text-slate-800 dark:text-slate-200">ABDM Registry Synced</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">All local patient vitals synchronized with HPR gateway.</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-800 dark:text-slate-200">MahaAushadhi Active</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Emergency drug grid monitoring cold-chain anti-venom supply.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compact Top-Right Doctor Profile Menu (No Sign Out) */}
          {user && (
            <div ref={profileMenuRef} className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Doctor / Healthcare Officer Profile"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10.5px] font-bold uppercase shadow-2xs">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight max-w-[170px]">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {role === 'district_officer'
                      ? `${user.roleTitleEn || 'District Officer'} • ${user.district || 'Pune'}`
                      : `${user.roleTitleEn || 'Medical Officer'} • ${user.facilityName || 'PHC'}`}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
              </button>

              {/* Profile Dropdown (Avatar, Name, Role, Facility, Jurisdiction, HFR Code - No Sign Out) */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-3 px-3.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {getInitials(user.name)}
                    </div>
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                        {user.roleTitleEn || user.role}
                      </div>
                    </div>
                  </div>

                  <div className="py-2.5 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div className="truncate flex-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                          Facility / Hospital
                        </span>
                        <span className="font-medium truncate block text-slate-800 dark:text-slate-200">
                          {role === 'district_officer'
                            ? `${user.district || 'Pune'} District Health Department`
                            : (user.facilityName || 'Government Health Facility')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="truncate flex-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                          District Jurisdiction
                        </span>
                        <span className="font-medium truncate block text-slate-800 dark:text-slate-200">
                          {user.district ? `${user.district} District, Maharashtra` : 'Maharashtra State Public Health'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <div className="truncate flex-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                          ABDM Healthcare Facility ID
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {role === 'district_officer'
                            ? 'HFR-MH-PUN-DHO-01'
                            : `HFR-MH-${(user.district || 'PUN').slice(0,3).toUpperCase()}-2026-${(user.facilityName || 'PHC').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
