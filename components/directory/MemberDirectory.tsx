'use client';

import React, { useState } from 'react';
import { Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { canRegisterPatient } from '@/lib/patientPrivacyService';
import {
  Search,
  Filter,
  Phone,
  User,
  MapPin,
  Activity,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  UserCheck,
  Building2,
  Stethoscope,
  UserPlus,
} from 'lucide-react';

interface MemberDirectoryProps {
  patients: Patient[];
  onSelectMember: (patient: Patient) => void;
  workerName: string;
  workerRoleName: string;
  workerLocation: string;
  onOpenNewPatient?: () => void;
}

export default function MemberDirectory({
  patients,
  onSelectMember,
  workerName,
  workerRoleName,
  workerLocation,
  onOpenNewPatient,
}: MemberDirectoryProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeTab, setScopeTab] = useState<'ASSIGNED' | 'ALL'>('ASSIGNED');

  // Determine if a patient is assigned to this user's direct care
  const isDirectlyAssignedToUser = (pat: Patient): boolean => {
    if (!user) return false;
    if (user.role === 'phc_doctor') {
      return (
        pat.assignedDoctorId === user.id ||
        (user.assignedPatientIds && user.assignedPatientIds.includes(pat.id)) ||
        pat.assignedDoctorName === user.name
      );
    }
    if (user.role === 'specialist') {
      // Patient with active referral directed to this specialist facility
      return referrals.some(
        (r) =>
          r.patientId === pat.id &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
          (r.targetFacility.toLowerCase().includes(user.facilityName.toLowerCase()) ||
            user.facilityName.toLowerCase().includes(r.targetFacility.toLowerCase()) ||
            (user.facilityName.includes('District Hospital') && r.targetFacility.includes('District Hospital')))
      );
    }
    if (user.role === 'nurse' || user.role === 'pharmacist') {
      return (
        pat.assignedFacilityId === user.facilityId ||
        pat.assignedFacilityName === user.facilityName
      );
    }
    if (user.role === 'asha') {
      return (
        pat.village.toLowerCase().includes(user.facilityName.split(' ')[0].toLowerCase()) ||
        pat.taluka.toLowerCase() === user.taluka.toLowerCase()
      );
    }
    return true;
  };

  // Pre-calculate counts for tabs
  const assignedPatientsCount = patients.filter(isDirectlyAssignedToUser).length;

  // Filtered patients calculation
  const filteredPatients = patients.filter((p) => {
    // Scope filter (Assigned vs All)
    if (scopeTab === 'ASSIGNED' && !isDirectlyAssignedToUser(p)) {
      return false;
    }

    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.assignedFacilityName && p.assignedFacilityName.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'HIGH_RISK') matchesStatus = p.isHighRiskPregnancy || false;
    if (statusFilter === 'REFERRAL') matchesStatus = !!p.activeReferralId;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Directory Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 opacity-80" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'mr' ? 'रुग्ण निर्देशिका' : 'Patient Directory'}
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {user?.administrativeLevel === 'facility'
                ? 'Facility Level'
                : user?.administrativeLevel === 'district'
                ? 'District Level'
                : 'State Level'}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span>{workerLocation}</span> &bull;{' '}
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              ABDM Least-Privilege Data Access
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold border border-blue-200 dark:border-blue-800/50">
            {workerName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{workerName}</div>
            <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              {workerRoleName}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Active Session
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              HFR: {user?.hfrCode || 'ABDM-VERIFIED'}
            </div>
          </div>
        </div>
      </div>

      {/* Scope Selector Tabs (My Assigned Patients vs All Patients) */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setScopeTab('ASSIGNED')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ${
            scopeTab === 'ASSIGNED'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>
            {user?.role === 'phc_doctor'
              ? 'Under My Care'
              : user?.role === 'specialist'
              ? 'Referred to My Hospital'
              : 'My Assigned Area'}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              scopeTab === 'ASSIGNED'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {assignedPatientsCount}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('ALL')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border ${
            scopeTab === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>All Network Patients</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              scopeTab === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {patients.length}
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ABHA Number, Phone, Assigned Doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Clinical Statuses</option>
            <option value="HIGH_RISK">High Risk / HRP</option>
            <option value="REFERRAL">Active Referral</option>
          </select>

          {onOpenNewPatient && canRegisterPatient(user) && (
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
              title="Register Direct Patient / ABDM Search"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Member List Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                <th className="px-6 py-4">Patient Member</th>
                <th className="px-6 py-4">Demographics</th>
                <th className="px-6 py-4">ABHA ID & Contact</th>
                <th className="px-6 py-4">Care Relationship & Access</th>
                <th className="px-6 py-4">Clinical Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((pat) => {
                  const isAssigned = isDirectlyAssignedToUser(pat);
                  const activeReferral = pat.activeReferralId
                    ? referrals.find((r) => r.id === pat.activeReferralId)
                    : null;

                  return (
                    <tr
                      key={pat.id}
                      onClick={() => onSelectMember(pat)}
                      className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                    >
                      {/* Patient Name & Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                              isAssigned
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 group-hover:bg-blue-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200'
                            }`}
                          >
                            {pat.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                              {pat.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {pat.village}, {pat.taluka}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{pat.gender}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pat.age} yrs &bull; Blood: {pat.bloodGroup}
                        </div>
                      </td>

                      {/* ABHA ID */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                          {pat.abhaId}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {pat.phone}
                        </div>
                      </td>

                      {/* Care Relationship & Access Status Badge */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {user?.role === 'phc_doctor'
                                ? 'Under Your Care'
                                : user?.role === 'specialist'
                                ? 'Referred to Your Facility'
                                : 'Assigned Member'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                              <Lock className="w-3 h-3 text-slate-400" />
                              Protected &bull;{' '}
                              {pat.assignedDoctorName ? pat.assignedDoctorName.split(' ')[1] || pat.assignedDoctorName : 'Other MO'}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                              {pat.assignedFacilityName || 'Velhe PHC'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Clinical Status Badges */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          {activeReferral && (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 dark:border-amber-800/50">
                              <Activity className="w-3 h-3" /> REFERRAL ACTIVE
                            </span>
                          )}
                          {pat.isHighRiskPregnancy && (
                            <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-rose-200 dark:border-rose-800/50">
                              <AlertTriangle className="w-3 h-3" /> HRP RISK
                            </span>
                          )}
                          {!activeReferral && !pat.isHighRiskPregnancy && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                              <CheckCircle2 className="w-3 h-3" /> STABLE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMember(pat);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isAssigned
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isAssigned ? 'Open EHR' : 'View Profile'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                        No members found in this view
                      </div>
                      <p className="text-xs text-slate-400">
                        {scopeTab === 'ASSIGNED'
                          ? 'There are no patients currently assigned directly to your profile. Switch to "All Network Patients" to search platform records.'
                          : 'Try adjusting your search query or status filter.'}
                      </p>
                    </div>
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
