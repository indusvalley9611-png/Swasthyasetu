'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Building2,
  MapPin,
} from 'lucide-react';

/* ==========================================================================
   1. PAGE HEADER
   Unified top-of-page header showing Title, Administrative Scope, and Action
   ========================================================================== */

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    level?: 'field' | 'facility' | 'district' | 'state' | 'national';
  };
  facilityContext?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  facilityContext,
  action,
  children,
}: PageHeaderProps) {
  const getBadgeStyle = (level?: string) => {
    switch (level) {
      case 'field':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'facility':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'district':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'state':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'national':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
            {title}
          </h1>
          {badge && (
            <span
              className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getBadgeStyle(
                badge.level
              )}`}
            >
              {badge.label}
            </span>
          )}
        </div>
        {(subtitle || facilityContext) && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 truncate">
            {facilityContext && (
              <>
                <span className="truncate">{facilityContext}</span>
                {subtitle && <span>&bull;</span>}
              </>
            )}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </p>
        )}
      </div>

      {(action || children) && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {action}
          {children}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   2. SECTION HEADER
   Dividing header inside content areas with item count and actions
   ========================================================================== */

export interface SectionHeaderProps {
  title: string;
  count?: number | string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}

export function SectionHeader({
  title,
  count,
  description,
  icon: Icon,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-2">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-[11px] font-extrabold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {count}
          </span>
        )}
        {description && (
          <span className="hidden md:inline text-xs text-slate-400 font-normal">
            &mdash; {description}
          </span>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ==========================================================================
   3. KPI CARD
   Compact 100-120px tall operational metric tile with icon and accent
   ========================================================================== */

export interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate';
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  onClick,
}: KPICardProps) {
  const colorStyles = {
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      accent: 'border-l-blue-600',
    },
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
      accent: 'border-l-emerald-600',
    },
    amber: {
      iconBg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      accent: 'border-l-amber-500',
    },
    rose: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
      accent: 'border-l-rose-600',
    },
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
      accent: 'border-l-indigo-600',
    },
    purple: {
      iconBg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      accent: 'border-l-purple-600',
    },
    slate: {
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
      accent: 'border-l-slate-400',
    },
  };

  const currentTheme = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col justify-between h-[105px] transition-all ${
        onClick ? 'cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate pr-2 uppercase tracking-wide">
          {label}
        </span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentTheme.iconBg}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="mt-1">
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {value}
        </div>
        {subtext && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-1">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   4. STATUS BADGE
   Standardized semantic badge for triage priority, referral state, stock
   ========================================================================== */

export interface StatusBadgeProps {
  status: string;
  variant?: 'priority' | 'referral' | 'stock' | 'severity';
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const norm = status.toUpperCase();

  // Priority (red, yellow, green)
  if (variant === 'priority' || ['RED', 'YELLOW', 'GREEN'].includes(norm)) {
    if (norm === 'RED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
          EMERGENCY (RED)
        </span>
      );
    }
    if (norm === 'YELLOW') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          URGENT (YELLOW)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        ROUTINE (GREEN)
      </span>
    );
  }

  // Stock status (OPTIMAL, LOW, CRITICAL)
  if (variant === 'stock' || ['OPTIMAL', 'LOW', 'CRITICAL'].includes(norm)) {
    if (norm === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          CRITICAL SHORTAGE
        </span>
      );
    }
    if (norm === 'LOW') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          BELOW BUFFER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        OPTIMAL BUFFER
      </span>
    );
  }

  // Referral states
  if (norm === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Clock className="w-3 h-3" /> PENDING TRIAGE
      </span>
    );
  }
  if (norm === 'ACCEPTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <CheckCircle2 className="w-3 h-3" /> ACCEPTED
      </span>
    );
  }
  if (norm === 'ADMITTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <Activity className="w-3 h-3" /> ADMITTED
      </span>
    );
  }
  if (norm === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        COMPLETED
      </span>
    );
  }
  if (norm === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 line-through">
        CANCELLED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {status}
    </span>
  );
}

/* ==========================================================================
   5. ALERT BANNER
   Semantic operational alert box (Critical, Warning, Info)
   ========================================================================== */

export interface AlertBannerProps {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function AlertBanner({
  severity,
  title,
  message,
  actionLabel,
  onAction,
  actionHref,
}: AlertBannerProps) {
  const styles = {
    CRITICAL: {
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      icon: AlertTriangle,
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-rose-950 dark:text-rose-100',
      btn: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    WARNING: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
      icon: AlertCircle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-950 dark:text-amber-100',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    INFO: {
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      icon: Info,
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-blue-950 dark:text-blue-100',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const current = styles[severity];
  const Icon = current.icon;

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${current.bg}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${current.iconColor}`} />
        <div className="min-w-0">
          <h4 className={`text-xs sm:text-sm font-bold truncate ${current.textColor}`}>
            {title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {message}
          </p>
        </div>
      </div>

      {actionLabel && (
        <div className="shrink-0 self-start sm:self-auto">
          {actionHref ? (
            <Link
              href={actionHref}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${current.btn}`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              onClick={onAction}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${current.btn}`}
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   6. EMPTY STATE
   Clean placeholder when queue, table, or roster is empty
   ========================================================================== */

export interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
