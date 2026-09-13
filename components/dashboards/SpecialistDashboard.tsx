'use client';
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, Referral } from '@/lib/types';
import {
  Users, Stethoscope, Search, Clock, 
  MapPin, AlertTriangle, ShieldCheck, 
  Activity, QrCode
} from 'lucide-react';
import { SpecialistTreatmentModal } from './SpecialistTreatmentModal';

interface SpecialistDashboardProps {
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenReferralToken: (referral: Referral) => void;
  onOpenBedMatrix: () => void;
}

export function SpecialistDashboard({
  onOpenPatientTimeline,
  onOpenReferralToken,
  onOpenBedMatrix,
}: SpecialistDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals, patients, updateReferralStatus, stockTransfers } = useSync();

  const [activeTab, setActiveTab] = useState<'incoming' | 'under_review' | 'accepted' | 'admitted' | 'escalated' | 'counter_referral' | 'history'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [treatmentModalRef, setTreatmentModalRef] = useState<Referral | null>(null);

  // Advanced Filtering
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'high' | 'routine'>('all');

  const getPatientForReferral = (patientId: string) => patients.find(p => p.id === patientId);

  const filteredReferrals = referrals.filter(r => {
    const p = getPatientForReferral(r.patientId);
    const searchMatch = p?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.includes(searchQuery);
    
    if (activeTab === 'incoming') {
      if (r.status !== 'PENDING') return false;
    } else if (activeTab === 'under_review') {
      // For now, no specific UNDER_REVIEW state, treat PENDING as under review if needed, or add logic
      if (r.status !== 'PENDING') return false;
    } else if (activeTab === 'accepted') {
      if (r.status !== 'ACCEPTED') return false;
    } else if (activeTab === 'admitted') {
      if (r.status !== 'ADMITTED') return false;
    } else if (activeTab === 'escalated') {
      if (r.status !== 'ESCALATED') return false;
    } else if (activeTab === 'counter_referral') {
      // Counter referrals are typically COMPLETED with a counterReferredTo flag
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
      <div className="mb-2">
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">District Health Operations</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {/* Critical Cases */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{referrals.filter(r => r.triagePriority === 'red' && r.status === 'PENDING').length}</div>
          <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1 uppercase tracking-wide">Critical Cases</div>
        </div>

        {/* Incoming Referrals */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-blue-900 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => setActiveTab('incoming')}>
          <div className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{referrals.filter(r => r.status === 'PENDING').length}</div>
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

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-slate-900 dark:text-white">PHC Medicine Transfer Oversight</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Read-only district coordination view · simulated PHC redistribution records</p>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Transfer</th><th className="p-3">PHC route</th><th className="p-3">Medicine</th><th className="p-3">Urgency</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{stockTransfers.slice(0, 5).map(transfer => <tr key={transfer.id}><td className="p-3 font-mono text-xs font-bold">{transfer.id}</td><td className="p-3 text-xs">{transfer.sourceFacilityName} &rarr; {transfer.destinationFacilityName}</td><td className="p-3">{transfer.medicineName}<span className="ml-1 text-xs text-slate-500">({transfer.requestedQuantity})</span></td><td className="p-3 text-xs font-bold">{transfer.urgency}</td><td className="p-3 text-xs font-bold">{transfer.status.replaceAll('_', ' ')}</td></tr>)}{stockTransfers.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-slate-500">No PHC transfer requests currently require district coordination.</td></tr>}</tbody></table></div>
      </section>

      {/* 2. REFERRAL COMMAND CENTER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[600px] mt-6">
        {/* Header & Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Referral Command Center</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user.facilityName} &middot; Trauma & Triage Desk</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
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

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 whitespace-nowrap">Urgency</th>
                <th className="p-4 whitespace-nowrap">Patient Details</th>
                <th className="p-4 whitespace-nowrap">Origin Facility</th>
                <th className="p-4 whitespace-nowrap">Specialty & Diagnosis</th>
                <th className="p-4 whitespace-nowrap">Triage Status</th>
                <th className="p-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReferrals.map(ref => {
                const patient = getPatientForReferral(ref.patientId);
                if (!patient) return null;
                const isHigh = ref.triagePriority === 'red';

                return (
                  <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="p-4">
                      {isHigh ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 animate-pulse">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => onOpenPatientTimeline(patient)}>
                        {patient.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{patient.age}y &middot; {patient.gender}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {ref.referringFacility}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Distance: ~45 km</div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2 py-1 rounded text-xs font-bold text-slate-700 dark:text-slate-200">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-500" /> {ref.specialtyRequired}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-1 max-w-[200px]" title={ref.referralReason}>"{ref.referralReason}"</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                        ref.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ref.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        ref.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                        ref.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {ref.status === 'PENDING' ? '🟡 PENDING' :
                         ref.status === 'ACCEPTED' ? '🟢 ACCEPTED' :
                         ref.status === 'ADMITTED' ? '🟢 ADMITTED' :
                         ref.status === 'COMPLETED' ? '⚪ COMPLETED' :
                         ref.status === 'CANCELLED' ? '🔴 CANCELLED' :
                         ref.status === 'ESCALATED' ? '🔵 ESCALATED' :
                         ref.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => onOpenReferralToken(ref)} className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg shadow-sm transition-all">
                        View QR
                      </button>
                      <button onClick={() => setTreatmentModalRef(ref)} className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition-all">
                        Process
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {filteredReferrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="text-slate-800 dark:text-slate-100 font-bold">No active cases</div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">Queue is empty for the selected filters.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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



