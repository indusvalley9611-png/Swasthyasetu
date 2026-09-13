'use client';

import React from 'react';
import { Flame, ShieldCheck, Siren } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface MahaAushadhiHeaderProps {
  roleTitle: string;
  facilityName: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionIcon?: React.ElementType;
  primaryActionClass?: string;
}

export function MahaAushadhiHeader({
  roleTitle,
  facilityName,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionIcon: PrimaryIcon = Siren,
  primaryActionClass = 'bg-rose-600 hover:bg-rose-700 text-white',
}: MahaAushadhiHeaderProps) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-md shrink-0">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              MahaAushadhi
            </h1>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {language === 'mr' ? 'आपत्कालीन औषध नेटवर्क' : 'Emergency Drug Network'}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              {roleTitle}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span>
              {facilityName} &bull; {language === 'mr' ? 'सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन' : 'Directorate of Health Services, Govt. of Maharashtra'}
            </span>
          </p>
        </div>
      </div>

      {primaryActionLabel && onPrimaryAction && (
        <button
          onClick={onPrimaryAction}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2 self-start md:self-auto cursor-pointer shrink-0 ${primaryActionClass}`}
        >
          <PrimaryIcon className="w-4 h-4" />
          <span>{primaryActionLabel}</span>
        </button>
      )}
    </div>
  );
}
