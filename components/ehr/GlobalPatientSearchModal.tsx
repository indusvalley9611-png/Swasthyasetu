'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Patient } from '@/lib/types';
import { Search, X, CreditCard, History, Send, ShieldCheck, AlertTriangle } from 'lucide-react';

interface GlobalPatientSearchModalProps {
  onClose: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function GlobalPatientSearchModal({
  onClose,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
}: GlobalPatientSearchModalProps) {
  const { language, t } = useLanguage();
  const { patients } = useSync();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = patients.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.includes(q) ||
      p.phone.includes(q) ||
      p.village.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header with Search Input */}
        <div className="bg-slate-900 p-4 space-y-3">
          <div className="flex justify-between items-center text-white">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <span>{language === 'mr' ? 'आयुष्मान भारत (ABDM) रुग्ण शोध' : 'Simulated Central Patient Registry Search (Mock)'}</span>
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Enter 14-digit ABHA ID (e.g. 91-4829...), Mobile number, or Patient Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white rounded-xl text-xs focus:ring-2 focus:ring-teal-400 focus:outline-hidden dark:bg-slate-800 dark:text-white border border-slate-700 font-mono"
            />
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching patients found across Maharashtra health registry.
            </div>
          ) : (
            filtered.map((patient) => (
              <div
                key={patient.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 bg-white dark:bg-slate-900 transition-all shadow-xs flex flex-wrap justify-between items-center gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{patient.fullName}</h4>
                    <span className="text-xs bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 px-2 py-0.2 rounded-full">
                      {patient.gender}, {patient.age} Yrs
                    </span>
                    {patient.isHighRiskPregnancy && (
                      <span className="text-[10px] font-bold bg-rose-600 dark:bg-rose-500/20 text-white dark:text-rose-300 px-2 py-0.2 rounded-full">
                        HRP Alert
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    ABHA: <strong className="text-blue-900 dark:text-blue-200">{patient.abhaId}</strong> • Phone: {patient.phone}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Location: {patient.village}, {patient.taluka}, {patient.district} • Blood: {patient.bloodGroup}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onOpenAbhaCard(patient);
                      onClose();
                    }}
                    className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    title="View ABHA Card"
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      onOpenPatientTimeline(patient);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-900 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View EHR</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenReferral(patient);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Refer</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
