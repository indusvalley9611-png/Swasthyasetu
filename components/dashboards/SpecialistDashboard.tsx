'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, Referral } from '@/lib/types';
import {
  Users, Stethoscope, Search, Clock, 
  MapPin, AlertTriangle, ShieldCheck, ShieldAlert,
  Activity, QrCode, Flame, Lock, UserPlus
} from 'lucide-react';
import { SpecialistTreatmentModal } from './SpecialistTreatmentModal';

export interface SpecialistDashboardProps {
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenReferralToken: (referral: Referral) => void;
  onOpenBedMatrix: () => void;
  onOpenNewPatient?: () => void;
  activeTab?: 'incoming' | 'under_review' | 'accepted' | 'admitted' | 'escalated' | 'counter_referral' | 'history';
  onTabChange?: (tab: 'incoming' | 'under_review' | 'accepted' | 'admitted' | 'escalated' | 'counter_referral' | 'history') => void;
}

export function SpecialistDashboard({
  onOpenPatientTimeline,
  onOpenReferralToken,
  onOpenBedMatrix,
  onOpenNewPatient,
  activeTab: externalTab,
  onTabChange,
}: SpecialistDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals, patients, updateReferralStatus } = useSync();

  const [internalTab, setInternalTab] = useState<
    'incoming' | 'under_review' | 'accepted' | 'admitted' | 'escalated' | 'counter_referral' | 'history'
  >(externalTab || 'incoming');

  const activeTab = externalTab !== undefined ? externalTab : internalTab;
  const setActiveTab = (
    tab: 'incoming' | 'under_review' | 'accepted' | 'admitted' | 'escalated' | 'counter_referral' | 'history'
  ) => {
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [facilityScope, setFacilityScope] = useState<'MY_FACILITY' | 'ALL_DISTRICT'>('MY_FACILITY');
  
  // Modals
  const [treatmentModalRef, setTreatmentModalRef] = useState<Referral | null>(null);

  // Advanced Filtering
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'high' | 'routine'>('all');

  const getPatientForReferral = (patientId: string) => patients.find(p => p.id === patientId);

  const isReferralForMyFacility = (r: Referral) => {
    if (!user?.facilityName || !r.targetFacility) return false;
    const target = r.targetFacility.toLowerCase();
    const fac = user.facilityName.toLowerCase();
    return (
      target.includes(fac) ||
      fac.includes(target) ||
      (target.includes('aundh') && fac.includes('aundh')) ||
      (target.includes('pune') && fac.includes('pune') && target.includes('district') && fac.includes('district')) ||
      (target.includes('nashik') && fac.includes('nashik'))
    );
  };

  const myFacilityReferrals = referrals.filter(isReferralForMyFacility);

  const filteredReferrals = referrals.filter(r => {
    if (facilityScope === 'MY_FACILITY' && !isReferralForMyFacility(r)) {
      return false;
    }

    const p = getPatientForReferral(r.patientId);
    const pName = p?.fullName || r.patientName || '';
    const searchMatch = pName.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.includes(searchQuery) || (r.tokenCode && r.tokenCode.includes(searchQuery));
    
    if (activeTab === 'incoming') {
      if (r.status !== 'PENDING') return false;
    } else if (activeTab === 'under_review') {
      if (r.status !== 'PENDING') return false;
    } else if (activeTab === 'accepted') {
      if (r.status !== 'ACCEPTED') return false;
    } else if (activeTab === 'admitted') {
      if (r.status !== 'ADMITTED') return false;
    } else if (activeTab === 'escalated') {
      if (r.status !== 'ESCALATED') return false;
    } else if (activeTab === 'counter_referral') {
      if (r.status !== 'COMPLETED' || !r.counterReferredTo) return false;
    } else if (activeTab === 'history') {
      if (r.status !== 'COMPLETED' && r.status !== 'CANCELLED') return false;
    }

    if (urgencyFilter === 'high' && r.triagePriority !== 'red') return false;
    if (urgencyFilter === 'routine' && r.triagePriority === 'red') return false;

    return searchMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. DISTRICT HEALTH OPERATIONS */}
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            <MapPin className="w-3.5 h-3.5" /> {user?.facilityName || 'District Hospital'} &bull; {user?.district || 'Pune'} District
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
            Casualty & Specialty Referral Command
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenNewPatient && (
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Direct Hospital Patient Intake / ABDM Search & Registration"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Patient Intake</span>
            </button>
          )}
          <Link
            href="/maha-aushadhi"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-extrabold border border-rose-200 dark:border-rose-800 transition-colors"
            title="MahaAushadhi — Emergency Drug Response Network"
          >
            <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>Emergency Drug Grid (MahaAushadhi) &rarr;</span>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* Critical Cases */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{myFacilityReferrals.filter(r => r.triagePriority === 'red' && r.status === 'PENDING').length}</div>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 uppercase tracking-wide">Critical Cases</div>
        </div>

        {/* Incoming Referrals */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => setActiveTab('incoming')}>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{myFacilityReferrals.filter(r => r.status === 'PENDING').length}</div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-wide">Incoming Referrals</div>
        </div>

        {/* Active Admissions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => setActiveTab('admitted')}>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{referrals.filter(r => r.status === 'ADMITTED').length}</div>
          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wide">Active Admissions</div>
        </div>

        {/* Available Critical Beds */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-emerald-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={onOpenBedMatrix}>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">18</div>
          <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase tracking-wide">Critical Beds</div>
        </div>

        {/* Resource Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-100 dark:border-amber-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => {}}>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">3</div>
          <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wide">Resource Alerts</div>
        </div>
      </div>

      {/* RESOURCE ALERTS ENGINE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer" onClick={onOpenBedMatrix}>
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <div><div className="text-xs font-bold text-rose-800 dark:text-rose-300">CRITICAL</div><div className="text-xs text-rose-600 dark:text-rose-400">ICU capacity exhausted</div></div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div><div className="text-xs font-bold text-amber-800 dark:text-amber-300">WARNING</div><div className="text-xs text-amber-600 dark:text-amber-400">Anti-snake venom below buffer</div></div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('history')}>
          <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div><div className="text-xs font-bold text-yellow-800 dark:text-yellow-300">FOLLOW-UP</div><div className="text-xs text-yellow-600 dark:text-yellow-400">14 discharged patients require follow-up</div></div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('incoming')}>
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div><div className="text-xs font-bold text-blue-800 dark:text-blue-300">REFERRAL</div><div className="text-xs text-blue-600 dark:text-blue-400">8 referrals waiting for review</div></div>
        </div>
      </div>

      {/* 2. REFERRAL COMMAND CENTER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[600px] mt-6">
        {/* Header & Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Referral Command Center</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user.facilityName} &middot; Trauma & Triage Desk</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Facility Scope Toggle */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setFacilityScope('MY_FACILITY')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  facilityScope === 'MY_FACILITY'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                My Hospital ({myFacilityReferrals.length})
              </button>
              <button
                type="button"
                onClick={() => setFacilityScope('ALL_DISTRICT')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  facilityScope === 'ALL_DISTRICT'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All District Referrals ({referrals.length})
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap text-sm font-bold shadow-sm">
              {['incoming', 'under_review', 'accepted', 'admitted', 'escalated', 'counter_referral', 'history'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)} 
                  className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ABHA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:bg-slate-800 dark:text-white shadow-sm"
              />
            </div>
            <button className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm text-slate-600 dark:text-slate-300">
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Ribbon */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter By Urgency:</span>
          <div className="flex gap-2">
            <button onClick={() => setUrgencyFilter('all')} className={"px-3 py-1.5 rounded-md text-xs font-bold transition-colors " + (urgencyFilter === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-700')}>All</button>
            <button onClick={() => setUrgencyFilter('high')} className={"px-3 py-1.5 rounded-md text-xs font-bold transition-colors " + (urgencyFilter === 'high' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-700')}>Critical / High Risk</button>
            <button onClick={() => setUrgencyFilter('routine')} className={"px-3 py-1.5 rounded-md text-xs font-bold transition-colors " + (urgencyFilter === 'routine' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-700')}>Routine</button>
          </div>
        </div>

        {/* Patient List */}
        <div className="flex-1 overflow-y-auto">
          {filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-slate-800 dark:text-slate-100 font-bold">No active cases</div>
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">Queue is empty for the selected filters.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReferrals.map(ref => {
                const patient = getPatientForReferral(ref.patientId) || (ref.patientName ? ({
                  id: ref.patientId,
                  fullName: ref.patientName,
                  age: ref.patientAge || 30,
                  gender: (ref.patientGender as any) || 'Female',
                  abhaId: ref.patientAbha || 'ABDM-WALKIN',
                  phone: '9823091823',
                  village: 'Pune',
                  district: 'Pune',
                  bloodGroup: 'B Positive',
                  encounters: [],
                } as unknown as Patient) : null);
                if (!patient) return null;
                const isHigh = ref.triagePriority === 'red';
                const isMyFacility = isReferralForMyFacility(ref);

                return (
                  <div key={ref.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">

                    {/* Urgency avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isHigh
                        ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 animate-pulse'
                        : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                    }`}>
                      {isHigh
                        ? <AlertTriangle className="w-4 h-4" />
                        : <Clock className="w-4 h-4" />
                      }
                    </div>

                    {/* Patient identity */}
                    <div className="flex-1 min-w-0">
                      {isMyFacility ? (
                        <div
                          className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors cursor-pointer truncate"
                          onClick={() => onOpenPatientTimeline(patient)}
                          title="Open full EHR"
                        >
                          {patient.fullName}
                        </div>
                      ) : (
                        <div
                          className="font-semibold text-sm text-slate-700 dark:text-slate-300 hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-1.5 truncate"
                          onClick={() => setTreatmentModalRef(ref)}
                          title="View referral summary (coordination only)"
                        >
                          {patient.fullName}
                          <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{patient.age}y · {patient.gender}</span>
                        {!isMyFacility && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            Coordination Only
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Origin */}
                    <div className="hidden md:block w-40 shrink-0">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{ref.referringFacility}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{ref.targetFacility}</div>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        ref.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ref.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        ref.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                        ref.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ref.status === 'PENDING' ? 'Pending' :
                         ref.status === 'ACCEPTED' ? 'Accepted' :
                         ref.status === 'ADMITTED' ? 'Admitted' :
                         ref.status === 'COMPLETED' ? 'Done' :
                         ref.status === 'CANCELLED' ? 'Cancelled' :
                         ref.status === 'ESCALATED' ? 'Escalated' :
                         ref.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => onOpenReferralToken(ref)} className="px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm transition-all">
                        QR
                      </button>
                      {isMyFacility ? (
                        <button onClick={() => setTreatmentModalRef(ref)} className="px-2.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all">
                          Open
                        </button>
                      ) : (
                        <button
                          onClick={() => setTreatmentModalRef(ref)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg transition-all"
                          title="View coordination summary"
                        >
                          Summary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {treatmentModalRef && (
        <SpecialistTreatmentModal 
          referral={treatmentModalRef} 
          patient={getPatientForReferral(treatmentModalRef.patientId)!} 
          onClose={() => setTreatmentModalRef(null)} 
          updateReferralStatus={updateReferralStatus} 
        />
      )}
    </div>
  );
}
