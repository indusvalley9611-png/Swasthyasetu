'use client';

import React, { useState } from 'react';
import { SpecialistOnDuty, HospitalDepartment } from '@/lib/types';
import {
  Users,
  Stethoscope,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface SpecialistRosterViewProps {
  hospitalName: string;
  specialists: SpecialistOnDuty[];
}

export function SpecialistRosterView({
  hospitalName,
  specialists,
}: SpecialistRosterViewProps) {
  const [selectedDept, setSelectedDept] = useState<HospitalDepartment | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecialists = specialists.filter((s) => {
    if (selectedDept !== 'ALL' && s.department !== selectedDept) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.specialty.toLowerCase().includes(q) ||
        s.qualification.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    }
    return true;
  });

  const onDutyCount = specialists.filter((s) => s.status === 'ON_DUTY' || s.status === 'IN_SURGERY').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
              <Users className="w-3 h-3 text-teal-400" />
              SPECIALIST ON-CALL ROSTER &amp; DUTY DESK
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {hospitalName}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            Today&apos;s Active Specialist Roster
          </h3>
          <p className="text-xs text-teal-200/80 mt-0.5">
            Real-time specialist duty roster, on-call schedules, and department alignments.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 block">ON-DUTY SPECIALISTS</span>
            <span className="text-lg font-black text-teal-300">{onDutyCount} Active</span>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <span className="text-[10px] font-bold text-emerald-400">{specialists.length} Total Roster</span>
            <span className="text-[10px] text-slate-400 block">24/7 Coverage</span>
          </div>
        </div>
      </div>

      {/* Department Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedDept === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Departments ({specialists.length})
          </button>
          {(['Casualty / ER', 'ICU', 'Maternity / NICU', 'Surgical Suite'] as HospitalDepartment[]).map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search specialist, discipline..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSpecialists.map((spec) => {
          const isOnDuty = spec.status === 'ON_DUTY';
          const isInSurgery = spec.status === 'IN_SURGERY';
          const isOnCall = spec.status === 'ON_CALL';

          const statusBadgeStyle = isOnDuty
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : isInSurgery
            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30'
            : isOnCall
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
            : 'bg-slate-500/10 text-slate-400 border border-slate-500/30';

          return (
            <div
              key={spec.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-teal-400 transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{spec.name}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono">{spec.qualification}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${statusBadgeStyle}`}>
                    {spec.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Specialty:</span>
                    <strong className="text-teal-700 dark:text-teal-300">{spec.specialty}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Department:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{spec.department}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Shift Schedule:</span>
                    <span className="font-mono text-[11px]">{spec.shift.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <a
                    href={`tel:${spec.phone}`}
                    className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline font-mono text-[11px]"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{spec.phone}</span>
                  </a>
                  <span className="text-[10px] text-slate-400">
                    {spec.activeCasesCount} active cases
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
