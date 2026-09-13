'use client';

import React, { useState } from 'react';
import { Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { Search, Filter, Phone, User, MapPin, Activity, CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MemberDirectoryProps {
  patients: Patient[];
  onSelectMember: (patient: Patient) => void;
  workerName: string;
  workerRoleName: string;
  workerLocation: string;
}

export default function MemberDirectory({
  patients,
  onSelectMember,
  workerName,
  workerRoleName,
  workerLocation
}: MemberDirectoryProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredPatients = patients.filter(p => {
    const matchesSearch = 
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter === 'HIGH_RISK') matchesStatus = p.isHighRiskPregnancy || false;
    if (statusFilter === 'REFERRAL') matchesStatus = !!p.activeReferralId;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      
      {/* Directory Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 opacity-80" />
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Your Members</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">People assigned to your care in {workerLocation}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800/50">
            {workerName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{workerName}</div>
            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{workerRoleName}</div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Online Sync
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Last synced: Just now</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Name, ABHA Number, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="HIGH_RISK">High Risk / HRP</option>
            <option value="REFERRAL">Active Referral</option>
          </select>
          <button className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors font-medium text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* Member List */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Demographics</th>
                <th className="px-6 py-4">ABHA ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length > 0 ? filteredPatients.map(pat => (
                <tr 
                  key={pat.id} 
                  onClick={() => onSelectMember(pat)}
                  className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        {pat.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">{pat.fullName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {pat.village}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{pat.gender}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{pat.age} years old</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{pat.abhaId}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {pat.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      {pat.activeReferralId && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-800/50">
                          <Activity className="w-3 h-3" /> REFERRAL ACTIVE
                        </span>
                      )}
                      {pat.isHighRiskPregnancy && (
                        <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200 dark:border-rose-800/50">
                          <AlertTriangle className="w-3 h-3" /> HRP RISK
                        </span>
                      )}
                      {!pat.activeReferralId && !pat.isHighRiskPregnancy && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          <CheckCircle2 className="w-3 h-3" /> STABLE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">12 Sep 2026</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Routine Checkup</div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
