'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

export interface TopHeaderProps {
  onToggleSidebar: () => void;
  breadcrumbs: { label: string; href?: string }[];
  onOpenSearch: () => void;
}

export function TopHeader({
  onToggleSidebar,
  breadcrumbs,
  onOpenSearch,
}: TopHeaderProps) {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const {
    effectiveOnline,
    isSyncing,
    syncQueue,
    triggerManualSync,
  } = useSync();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        
        {/* Left: Hamburger & Dynamic Context Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle sidebar navigation"
            aria-label="Toggle sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs Navigation */}
          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                <span
                  className={`truncate ${
                    idx === breadcrumbs.length - 1
                      ? 'font-bold text-slate-900 dark:text-slate-100'
                      : 'font-medium text-slate-500 dark:text-slate-400'
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
            className="w-full flex items-center justify-between px-2.5 py-1 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">Search ABHA...</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Online Status, Notifications, User Pill */}
        <div className="flex items-center gap-3 shrink-0 text-xs">
          
          {/* Mobile search icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Search ABHA"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Online status indicator */}
          <div className="flex items-center gap-1.5">
            {effectiveOnline ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200"
                title="Sync queued changes"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{syncQueue.length}</span>
              </button>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
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

          {/* User Profile Pill & Dropdown */}
          {user && (
            <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Account details"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {user.name.slice(0, 2)}
                </div>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-200 truncate max-w-[120px] hidden sm:inline">
                  {user.name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2.5 px-3.5 z-50 animate-in fade-in"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 space-y-0.5">
                    <div className="text-[10px] uppercase font-mono text-slate-400">Signed In As</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">{user.roleTitleEn}</div>
                  </div>

                  <div className="py-2 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{user.facilityName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{user.district ? `${user.district} District` : 'Maharashtra'}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'बाहेर पडा' : 'Sign Out'}</span>
                    </button>
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
