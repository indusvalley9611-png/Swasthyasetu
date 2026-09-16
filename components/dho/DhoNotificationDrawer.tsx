'use client';

import React, { useState } from 'react';
import { DhoNotification } from '@/lib/types';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  ShieldAlert,
  Package,
  Users,
  Activity,
} from 'lucide-react';

interface DhoNotificationDrawerProps {
  notifications: DhoNotification[];
  onSelectNotification: (notif: DhoNotification) => void;
  onMarkAllAsRead: () => void;
}

export function DhoNotificationDrawer({
  notifications,
  onSelectNotification,
  onMarkAllAsRead,
}: DhoNotificationDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (cat: DhoNotification['category']) => {
    switch (cat) {
      case 'REFERRAL':
        return <Users className="w-3.5 h-3.5 text-blue-500" />;
      case 'STOCK':
        return <Package className="w-3.5 h-3.5 text-amber-500" />;
      case 'CAPACITY':
        return <Activity className="w-3.5 h-3.5 text-purple-500" />;
      case 'EPIDEMIC':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'ESCALATION':
      case 'SLA_ALERT':
        return <Clock className="w-3.5 h-3.5 text-rose-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-xs cursor-pointer"
        title="DHO Live Operational Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-top-2 overflow-hidden text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-850">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h4 className="font-black text-slate-900 dark:text-white text-xs">
                Operational Alerts & Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMarkAllAsRead}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Mark all read
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-xs">No active alerts.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => {
                    onSelectNotification(notif);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    !notif.read ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-slate-900 dark:text-white text-xs">{notif.title}</h5>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {new Date(notif.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
