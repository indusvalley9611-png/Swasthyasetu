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
  ArrowUpRight,
  Clock3,
  Send,
} from 'lucide-react';
import { Referral } from '@/lib/types';

interface MemberDirectoryProps {
  patients: Patient[];
  onSelectMember: (patient: Patient) => void;
  workerName: string;
  workerRoleName: string;
  workerLocation: string;
  onOpenNewPatient?: () => void;
  onOpenReferral?: (patient: Patient) => void;
  onOpenReferralToken?: (referral: Referral) => void;
}

export default function MemberDirectory({
  patients,
  onSelectMember,
  workerName,
  workerRoleName,
  workerLocation,
  onOpenNewPatient,
  onOpenReferral,
  onOpenReferralToken,
}: MemberDirectoryProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeTab, setScopeTab] = useState<'ASSIGNED' | 'ALL' | 'REFERRED'>('ASSIGNED');

  const isAdmin = user?.administrativeLevel === 'district' || user?.role === 'district_officer';

  // Check if a patient has an active referral originating from the user's facility
  const getActiveReferralForPatient = (pat: Patient) => {
    // First check via activeReferralId
    if (pat.activeReferralId) {
      const ref = referrals.find(r => r.id === pat.activeReferralId && ['PENDING', 'ACCEPTED', 'ADMITTED', 'ESCALATED'].includes(r.status));
      if (ref) return ref;
    }
    // Fallback: search referrals array for any active referral for this patient
    return referrals.find(
      r => r.patientId === pat.id &&
           ['PENDING', 'ACCEPTED', 'ADMITTED', 'ESCALATED'].includes(r.status)
    ) ?? null;
  };

  // A patient is "referred" if they have an active referral AND the referral originated from the user's facility
  const isReferredFromMyFacility = (pat: Patient): boolean => {
    const ref = getActiveReferralForPatient(pat);
    if (!ref) return false;
    // Check if the referral was created from the user's facility
    return !!(
      (ref.referringFacilityId && user?.facilityId && ref.referringFacilityId === user.facilityId) ||
      (ref.referringUserId && user?.id && ref.referringUserId === user.id)
    );
  };

  // Determine if a patient is assigned to this user's direct care
  const isDirectlyAssignedToUser = (pat: Patient): boolean => {
    if (!user) return false;
    if (user.role === 'phc_doctor') {
      return !!(
        pat.assignedDoctorId === user.id ||
        (user.assignedPatientIds && user.assignedPatientIds.includes(pat.id)) ||
        (pat.registrationFacilityId && pat.registrationFacilityId === user.facilityId)
      );
    }
    if (user.role === 'specialist') {
      const isDirectWalkIn = !!(
        (pat.registrationFacilityId && pat.registrationFacilityId === user.facilityId) ||
        (pat.assignedFacilityId && pat.assignedFacilityId === user.facilityId) ||
        (pat.assignedFacilityName && user.facilityName && pat.assignedFacilityName === user.facilityName) ||
        (pat.registeredByUserId && pat.registeredByUserId === user.id) ||
        (pat.assignedDoctorId && pat.assignedDoctorId === user.id)
      );
      if (isDirectWalkIn) return true;
      // Patient with active referral directed to this specialist facility
      return referrals.some(
        (r) =>
          r.patientId === pat.id &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
          !!(
            (r.targetFacilityId && r.targetFacilityId === user.facilityId) ||
            (r.targetFacility && user.facilityName && r.targetFacility === user.facilityName)
          )
      );
    }
    if (user.role === 'nurse' || user.role === 'pharmacist') {
      return !!(
        (pat.assignedFacilityId && pat.assignedFacilityId === user.facilityId) ||
        (pat.registrationFacilityId && pat.registrationFacilityId === user.facilityId) ||
        (pat.assignedFacilityName && user.facilityName && pat.assignedFacilityName === user.facilityName)
      );
    }
    if (user.role === 'asha') {
      return !!(
        (pat.assignedFacilityId && pat.assignedFacilityId === user.facilityId) ||
        (pat.registrationFacilityId && pat.registrationFacilityId === user.facilityId) ||
        (user.villageId && pat.villageId && pat.villageId === user.villageId) ||
        (user.village && pat.village && pat.village === user.village)
      );
    }
    return true;
  };

  // Compute referred patients (those with active referrals from this facility)
  const referredPatients = patients.filter(p => isReferredFromMyFacility(p));
  const referredPatientIds = new Set(referredPatients.map(p => p.id));

  // Pre-calculate counts for tabs (excluding referred patients from normal counts)
  const assignedPatientsCount = patients.filter(p => isDirectlyAssignedToUser(p) && !referredPatientIds.has(p.id)).length;
  const allNonReferredCount = patients.filter(p => !referredPatientIds.has(p.id)).length;

  // Filtered patients calculation
  const filteredPatients = (scopeTab === 'REFERRED' ? referredPatients : patients).filter((p) => {
    // For REFERRED tab, search by patient details or referral details
    if (scopeTab === 'REFERRED') {
      const activeRef = getActiveReferralForPatient(p);
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.abhaId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        (activeRef?.targetFacility && activeRef.targetFacility.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activeRef?.referralReason && activeRef.referralReason.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (activeRef?.specialtyRequired && activeRef.specialtyRequired.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'HIGH_RISK') matchesStatus = p.isHighRiskPregnancy || false;

      return matchesSearch && matchesStatus;
    }

    // For ASSIGNED/ALL tabs, exclude referred patients
    if (referredPatientIds.has(p.id)) return false;

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
    if (statusFilter === 'REFERRAL') matchesStatus = false; // Active referrals are exclusively in the Referred List

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* 1. Refined Directory Header (Compact, no bloated blue card) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs mb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-white to-green-600 opacity-80" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'mr' ? 'रुग्ण निर्देशिका' : 'Patient Directory'}
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {user?.administrativeLevel === 'district' || user?.role === 'district_officer'
                ? 'District Level'
                : user?.administrativeLevel === 'field' || user?.role === 'asha'
                ? 'Field Level'
                : 'Facility Level'}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{workerLocation}</span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              ABDM Least-Privilege Data Access
            </span>
          </p>
        </div>

        {/* Compact Officer / Session Context */}
        <div className="flex items-center gap-2 text-xs self-start sm:self-auto text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{workerName}</span>
          <span className="text-slate-300 dark:text-slate-600">&bull;</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium text-[11px]">{workerRoleName}</span>
        </div>
      </div>

      {/* 2. Modern Segmented Control for Scope Selector Tabs */}
      <div className="bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-1 mb-3 w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setScopeTab('ASSIGNED')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scopeTab === 'ASSIGNED'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap">
            {user?.role === 'phc_doctor'
              ? 'Under My Care'
              : user?.role === 'specialist'
              ? 'Referred to My Hospital'
              : 'My Assigned Area'}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              scopeTab === 'ASSIGNED'
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {assignedPatientsCount}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('ALL')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scopeTab === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">
            {isAdmin
              ? 'All Network Patients'
              : user?.role === 'asha'
              ? 'Catchment Area Patients'
              : 'Facility Care Roster'}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              scopeTab === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {allNonReferredCount}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('REFERRED')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scopeTab === 'REFERRED'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="whitespace-nowrap">Referred List</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              scopeTab === 'REFERRED'
                ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                : referredPatients.length > 0
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            {referredPatients.length}
          </span>
        </button>
      </div>

      {/* 3. Compact Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-2xs mb-3 flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              scopeTab === 'REFERRED'
                ? 'Search referred patients by Name, ABHA, Phone, Destination, Reason...'
                : 'Search by Name, ABHA Number, Phone, Assigned Doctor...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex gap-2 items-center shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Clinical Statuses</option>
            <option value="HIGH_RISK">High Risk / HRP</option>
            {scopeTab !== 'REFERRED' && <option value="REFERRAL">Active Referral</option>}
          </select>

          {onOpenNewPatient && canRegisterPatient(user) && (
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="h-9 inline-flex items-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors shrink-0 cursor-pointer"
              title="Register Direct Patient / ABDM Search"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Refined Patient Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              {scopeTab === 'REFERRED' ? (
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  <th className="px-4 py-2.5 sm:py-3">Patient Member</th>
                  <th className="px-4 py-2.5 sm:py-3">Demographics & ABHA</th>
                  <th className="px-4 py-2.5 sm:py-3">Destination Hospital</th>
                  <th className="px-4 py-2.5 sm:py-3">Referral Reason</th>
                  <th className="px-4 py-2.5 sm:py-3">Urgency</th>
                  <th className="px-4 py-2.5 sm:py-3">Referral Date & Status</th>
                  <th className="px-4 py-2.5 sm:py-3 text-right">Action</th>
                </tr>
              ) : (
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  <th className="px-4 py-2.5 sm:py-3">Patient Member</th>
                  <th className="px-4 py-2.5 sm:py-3">Demographics</th>
                  <th className="px-4 py-2.5 sm:py-3">ABHA ID & Contact</th>
                  <th className="px-4 py-2.5 sm:py-3">Care Relationship & Access</th>
                  <th className="px-4 py-2.5 sm:py-3">Clinical Status</th>
                  <th className="px-4 py-2.5 sm:py-3 text-right">Action</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((pat) => {
                  const isAssigned = isDirectlyAssignedToUser(pat);
                  const activeReferral = getActiveReferralForPatient(pat);

                  if (scopeTab === 'REFERRED') {
                    const priorityClass =
                      activeReferral?.triagePriority === 'red'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : activeReferral?.triagePriority === 'yellow'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                    const priorityLabel =
                      activeReferral?.triagePriority === 'red'
                        ? 'CRITICAL'
                        : activeReferral?.triagePriority === 'yellow'
                        ? 'URGENT'
                        : 'ROUTINE';

                    const statusClass =
                      activeReferral?.status === 'ADMITTED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : activeReferral?.status === 'ACCEPTED'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                        : activeReferral?.status === 'ESCALATED'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700';

                    const formattedDate = activeReferral?.createdAt
                        ? new Date(activeReferral.createdAt).toLocaleString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <tr
                        key={pat.id}
                        onClick={() => onSelectMember(pat)}
                        className="hover:bg-amber-50/40 dark:hover:bg-amber-950/10 cursor-pointer transition-colors group"
                      >
                        {/* Patient Name & Location */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 group-hover:bg-amber-200 shrink-0">
                              {pat.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors truncate">
                                {pat.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 shrink-0" /> {pat.village}, {pat.taluka}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Demographics & ABHA */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {pat.age} yrs &bull; {pat.gender}
                          </div>
                          <div className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {pat.abhaId}
                          </div>
                        </td>

                        {/* Referral Destination */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {activeReferral?.targetFacility || 'District Hospital'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            Ref #{activeReferral?.tokenCode || activeReferral?.id}
                          </div>
                        </td>

                        {/* Referral Reason & Specialty */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200 text-xs max-w-[200px] truncate">
                            {activeReferral?.referralReason || 'Specialist Evaluation'}
                          </div>
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            {activeReferral?.specialtyRequired || 'General Medicine'}
                          </div>
                        </td>

                        {/* Urgency Priority */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${priorityClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {priorityLabel}
                          </span>
                        </td>

                        {/* Referral Date & Status */}
                        <td className="px-4 py-2.5 sm:py-3">
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusClass}`}>
                              <Activity className="w-3 h-3" /> {activeReferral?.status || 'PENDING'}
                            </span>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock3 className="w-3 h-3 shrink-0" /> {formattedDate}
                            </div>
                          </div>
                        </td>

                        {/* Action Button */}
                        <td className="px-4 py-2.5 sm:py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMember(pat);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <span>Open Referral</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Default view for ASSIGNED and ALL tabs
                  return (
                    <tr
                      key={pat.id}
                      onClick={() => onSelectMember(pat)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Patient Name & Location */}
                      <td className="px-4 py-2.5 sm:py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                              isAssigned
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 group-hover:bg-blue-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200'
                            }`}
                          >
                            {pat.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {pat.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <MapPin className="w-3 h-3 shrink-0" /> {pat.village}, {pat.taluka}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Demographics */}
                      <td className="px-4 py-2.5 sm:py-3">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{pat.gender}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {pat.age} yrs &bull; Blood: {pat.bloodGroup}
                        </div>
                      </td>

                      {/* ABHA ID */}
                      <td className="px-4 py-2.5 sm:py-3">
                        <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                          {pat.abhaId}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" /> {pat.phone}
                        </div>
                      </td>

                      {/* Care Relationship & Access Status Badge */}
                      <td className="px-4 py-2.5 sm:py-3">
                        <div className="flex flex-col gap-0.5 items-start">
                          {isAssigned ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-300/80 dark:border-emerald-700/60">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              {user?.role === 'phc_doctor'
                                ? 'Under Your Care'
                                : user?.role === 'specialist'
                                ? 'Referred to Your Facility'
                                : 'Assigned Member'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                              <Lock className="w-3 h-3 text-slate-400" />
                              Protected &bull;{' '}
                              {pat.assignedDoctorName ? pat.assignedDoctorName.split(' ')[1] || pat.assignedDoctorName : 'Other MO'}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {pat.assignedFacilityName || 'Primary Health Centre'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Clinical Status Badges */}
                      <td className="px-4 py-2.5 sm:py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {activeReferral && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-amber-200 dark:border-amber-800/60">
                              <Activity className="w-3 h-3" /> REFERRAL ACTIVE
                            </span>
                          )}
                          {pat.isHighRiskPregnancy && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-rose-200 dark:border-rose-800/60">
                              <AlertTriangle className="w-3 h-3" /> HRP RISK
                            </span>
                          )}
                          {!activeReferral && !pat.isHighRiskPregnancy && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> STABLE
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-2.5 sm:py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Dedicated Direct Referral Action for PHC & Field Workers */}
                          {activeReferral ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenReferralToken) onOpenReferralToken(activeReferral);
                                else onSelectMember(pat);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 cursor-pointer shrink-0"
                              title="Active referral in progress - click to view token"
                            >
                              <Activity className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Ref Active</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenReferral) onOpenReferral(pat);
                                else onSelectMember(pat);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                              title="Refer patient to District Hospital"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Refer to DH</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMember(pat);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                              isAssigned
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {isAssigned ? 'Open EHR' : 'View Profile'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={scopeTab === 'REFERRED' ? 7 : 6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                        {scopeTab === 'REFERRED'
                          ? 'No active referrals found'
                          : 'No members found in this view'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {scopeTab === 'REFERRED'
                          ? 'Patients with active referrals originating from this facility will appear here.'
                          : scopeTab === 'ASSIGNED'
                          ? 'There are no patients currently assigned directly to your profile. Switch to "Facility Care Roster" to search platform records.'
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
