'use client';

import React, { useState, useMemo } from 'react';
import {
  Patient,
  Referral,
  HospitalBedSlot,
  FacilityDischargeRecord,
  EmergencyWalkIn,
} from '@/lib/types';
import {
  Search,
  FileClock,
  Filter,
  Calendar,
  Stethoscope,
  Building2,
  User,
  HeartPulse,
  Activity,
  Bed,
  FileCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  FolderHeart,
  Pill,
  TestTube2,
  ArrowUpRight,
  Eye,
} from 'lucide-react';

interface ClinicalRecordsCaseHistoryViewProps {
  hospitalName: string;
  patients: Patient[];
  bedSlots: HospitalBedSlot[];
  referrals: Referral[];
  dischargeRecords: FacilityDischargeRecord[];
  walkIns: EmergencyWalkIn[];
  onOpenPatientTimeline?: (patient: Patient) => void;
  onOpenAbhaCard?: (patient: Patient) => void;
}

export function ClinicalRecordsCaseHistoryView({
  hospitalName,
  patients,
  bedSlots,
  referrals,
  dischargeRecords,
  walkIns,
  onOpenPatientTimeline,
  onOpenAbhaCard,
}: ClinicalRecordsCaseHistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('ALL');
  const [selectedRecordType, setSelectedRecordType] = useState<string>('ALL');
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [activePatientSubTab, setActivePatientSubTab] = useState<Record<string, 'encounters' | 'admissions' | 'referrals' | 'discharges'>>({});

  // Extract unique doctors from bed slots, walk-ins, and discharge records
  const availableDoctors = useMemo(() => {
    const docs = new Set<string>();
    docs.add('Dr. Ananya Kulkarni');
    docs.add('Dr. Vikramaditya Salunkhe');
    docs.add('Dr. Sneha Deshpande');
    docs.add('Dr. Milind Gadgil');
    docs.add('Dr. Radhika Joshi');
    docs.add('Dr. Prashant Shinde');
    bedSlots.forEach((b) => {
      if (b.attendingSpecialist) docs.add(b.attendingSpecialist);
    });
    dischargeRecords.forEach((d) => {
      if (d.dischargedByDoctorName) docs.add(d.dischargedByDoctorName);
    });
    return Array.from(docs);
  }, [bedSlots, dischargeRecords]);

  // Aggregate clinical dossiers per patient
  const patientDossiers = useMemo(() => {
    return patients.map((patient) => {
      // Find past and active bed admissions
      const patientBedStays = bedSlots.filter(
        (b) =>
          b.patientName?.toLowerCase() === patient.fullName.toLowerCase() ||
          b.patientAbha === patient.abhaId
      );

      // Find incoming & outgoing referrals linked to this hospital
      const patientReferrals = referrals.filter((r) => r.patientId === patient.id);

      // Find discharge summaries
      const patientDischarges = dischargeRecords.filter(
        (d) =>
          d.patientId === patient.id ||
          d.patientName.toLowerCase() === patient.fullName.toLowerCase() ||
          d.patientAbha === patient.abhaId
      );

      // Find emergency walk-in visits
      const patientWalkIns = walkIns.filter(
        (w) =>
          w.fullName.toLowerCase() === patient.fullName.toLowerCase() ||
          w.abhaId === patient.abhaId
      );

      // Clinical encounters recorded on patient
      const encounters = patient.encounters || [];

      // Calculate total clinical episodes at this facility
      const totalVisitsCount =
        patientBedStays.length +
        patientReferrals.length +
        patientDischarges.length +
        patientWalkIns.length +
        encounters.length;

      // Determine departments involved
      const departments = new Set<string>();
      patientBedStays.forEach((b) => departments.add(b.department));
      encounters.forEach((e) => departments.add(e.facilityType || 'General Medicine'));

      // Determine attending doctors involved
      const doctorsInvolved = new Set<string>();
      if (patient.assignedDoctorName) doctorsInvolved.add(patient.assignedDoctorName);
      patientBedStays.forEach((b) => {
        if (b.attendingSpecialist) doctorsInvolved.add(b.attendingSpecialist);
      });
      patientDischarges.forEach((d) => {
        if (d.dischargedByDoctorName) doctorsInvolved.add(d.dischargedByDoctorName);
      });

      return {
        patient,
        patientBedStays,
        patientReferrals,
        patientDischarges,
        patientWalkIns,
        encounters,
        totalVisitsCount,
        departments: Array.from(departments),
        doctorsInvolved: Array.from(doctorsInvolved),
      };
    });
  }, [patients, bedSlots, referrals, dischargeRecords, walkIns]);

  // Filter dossiers
  const filteredDossiers = useMemo(() => {
    return patientDossiers.filter(({ patient, departments, doctorsInvolved, totalVisitsCount }) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        patient.fullName.toLowerCase().includes(q) ||
        patient.abhaId.toLowerCase().includes(q) ||
        patient.phone.includes(q) ||
        patient.village.toLowerCase().includes(q) ||
        (patient.chronicConditions && patient.chronicConditions.some((c) => c.toLowerCase().includes(q)));

      const matchesDept =
        selectedDepartment === 'ALL' ||
        departments.some((d) => d.toLowerCase().includes(selectedDepartment.toLowerCase()));

      const matchesDoctor =
        selectedDoctor === 'ALL' ||
        doctorsInvolved.some((doc) => doc.toLowerCase().includes(selectedDoctor.toLowerCase()));

      return matchesSearch && matchesDept && matchesDoctor;
    });
  }, [patientDossiers, searchQuery, selectedDepartment, selectedDoctor]);

  const toggleExpandPatient = (patientId: string) => {
    setExpandedPatientId((prev) => (prev === patientId ? null : patientId));
  };

  const getSubTab = (patientId: string) => {
    return activePatientSubTab[patientId] || 'encounters';
  };

  const setSubTab = (patientId: string, tab: 'encounters' | 'admissions' | 'referrals' | 'discharges') => {
    setActivePatientSubTab((prev) => ({ ...prev, [patientId]: tab }));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-slate-800 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
              <FileClock className="w-3 h-3 text-blue-400" />
              LONGITUDINAL EHR &amp; CLINICAL ARCHIVE
            </span>
            <span className="text-[10px] text-slate-300">ABDM Milestones 1-3 Compliant</span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            Clinical Records &amp; Patient Case History
          </h3>
          <p className="text-xs text-slate-300/90 mt-0.5">
            Searchable repository of past admissions, specialist consultations, diagnostic summaries, and refer-back care episodes at <strong>{hospitalName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl shrink-0">
          <FolderHeart className="w-4 h-4 text-emerald-400" />
          <span>{filteredDossiers.length} Patient Case Records Archived</span>
        </div>
      </div>

      {/* 2. Search & Multi-Filter Control Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3">
        {/* Top Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search medical records by Patient Full Name, 14-Digit ABHA ID, Phone Number, Village, or Chronic Condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Dept:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Departments</option>
              <option value="ICU">ICU / Critical Care</option>
              <option value="Casualty">Casualty / Emergency</option>
              <option value="General">General Ward</option>
              <option value="Maternity">Maternity &amp; NICU</option>
              <option value="Surgical">Surgical Suite</option>
              <option value="Orthopedic">Orthopedics</option>
              <option value="Pediatric">Pediatrics</option>
            </select>
          </div>

          {/* Attending Doctor Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Doctor:</span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Attending Doctors</option>
              {availableDoctors.map((doc) => (
                <option key={doc} value={doc}>
                  {doc}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">Timeline:</span>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full bg-transparent text-slate-800 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Case History (Lifetime)</option>
              <option value="7D">Past 7 Days</option>
              <option value="30D">Past 30 Days</option>
              <option value="6M">Past 6 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Patient Dossier Records List */}
      <div className="space-y-3">
        {filteredDossiers.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <FolderHeart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Clinical Case Records Found
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try modifying your search term, department filter, or attending clinician selection.
            </p>
          </div>
        ) : (
          filteredDossiers.map(({
            patient,
            patientBedStays,
            patientReferrals,
            patientDischarges,
            patientWalkIns,
            encounters,
            totalVisitsCount,
          }) => {
            const isExpanded = expandedPatientId === patient.id;
            const subTab = getSubTab(patient.id);

            return (
              <div
                key={patient.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                {/* Dossier Header Row */}
                <div
                  onClick={() => toggleExpandPatient(patient.id)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
                      {patient.fullName.charAt(0)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {patient.fullName}
                        </h4>

                        {patient.isHighRiskPregnancy && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase border border-rose-300 dark:border-rose-800">
                            High Risk
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          {patient.age}y &bull; {patient.gender} &bull; Blood: {patient.bloodGroup || 'O+'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          ABHA: {patient.abhaId}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" /> {patient.village}, {patient.taluka}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {patient.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Status Summary & Toggle */}
                  <div className="flex items-center gap-3 self-end lg:self-auto shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                      <FileClock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{encounters.length + patientBedStays.length} Hospital Encounters</span>
                    </div>

                    {patientDischarges.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Discharged to PHC</span>
                      </div>
                    )}

                    <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Case Dossier Body */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-850/40 space-y-4 animate-in fade-in duration-200 text-xs">
                    {/* Sub-Tabs for Dossier Sections */}
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 overflow-x-auto">
                      <button
                        onClick={() => setSubTab(patient.id, 'encounters')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          subTab === 'encounters'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <HeartPulse className="w-3.5 h-3.5" />
                        <span>Consultations &amp; Vitals ({encounters.length})</span>
                      </button>

                      <button
                        onClick={() => setSubTab(patient.id, 'admissions')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          subTab === 'admissions'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Bed className="w-3.5 h-3.5" />
                        <span>Inpatient Stays ({patientBedStays.length})</span>
                      </button>

                      <button
                        onClick={() => setSubTab(patient.id, 'referrals')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          subTab === 'referrals'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Referrals In/Out ({patientReferrals.length})</span>
                      </button>

                      <button
                        onClick={() => setSubTab(patient.id, 'discharges')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          subTab === 'discharges'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Discharge Summaries ({patientDischarges.length})</span>
                      </button>
                    </div>

                    {/* Section 1: Consultations & Encounters */}
                    {subTab === 'encounters' && (
                      <div className="space-y-3">
                        {encounters.length === 0 ? (
                          <p className="text-slate-400 italic py-3">No direct outpatient encounter records on file.</p>
                        ) : (
                          encounters.map((enc) => (
                            <div
                              key={enc.id}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {enc.diagnosis || 'Clinical Consultation'}
                                  </span>
                                  {enc.icd10Code && (
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800">
                                      ICD-10: {enc.icd10Code}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {new Date(enc.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>

                              {enc.vitals && (
                                <div className="flex gap-2 flex-wrap text-[11px]">
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                                    BP: {enc.vitals.systolicBp}/{enc.vitals.diastolicBp} mmHg
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                                    HR: {enc.vitals.heartRate} bpm
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                                    SpO2: {enc.vitals.spO2}%
                                  </span>
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                                    Temp: {enc.vitals.temperature}&deg;C
                                  </span>
                                </div>
                              )}

                              {enc.notes && (
                                <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-[11px] italic">
                                  "{enc.notes}"
                                </p>
                              )}

                              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-2">
                                <span>Clinician: <strong>{enc.providerName}</strong> ({enc.providerRole})</span>
                                <span>&bull;</span>
                                <span>Facility: {enc.facilityName}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Section 2: Inpatient Stays */}
                    {subTab === 'admissions' && (
                      <div className="space-y-3">
                        {patientBedStays.length === 0 ? (
                          <p className="text-slate-400 italic py-3">No inpatient ward admissions recorded for this patient.</p>
                        ) : (
                          patientBedStays.map((bed) => (
                            <div
                              key={bed.bedId}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 text-[10px] font-black uppercase">
                                    {bed.bedNumber} ({bed.wardName})
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    Department of {bed.department}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  Status: {bed.status}
                                </span>
                              </div>

                              <div className="text-slate-600 dark:text-slate-400 text-xs">
                                <strong>Attending Specialist:</strong> {bed.attendingSpecialist || 'Dr. Ananya Kulkarni'}
                              </div>

                              {bed.assignedAt && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  Admitted: {new Date(bed.assignedAt).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Section 3: Referrals In & Out */}
                    {subTab === 'referrals' && (
                      <div className="space-y-3">
                        {patientReferrals.length === 0 ? (
                          <p className="text-slate-400 italic py-3">No referral network episodes recorded.</p>
                        ) : (
                          patientReferrals.map((ref) => (
                            <div
                              key={ref.id}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {ref.referralReason}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase">
                                  {ref.status}
                                </span>
                              </div>

                              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                                <span>From: <strong>{ref.referringFacility}</strong></span>
                                <span>&rarr;</span>
                                <span>Target: <strong>{ref.targetFacility}</strong></span>
                                <span>&bull;</span>
                                <span>Specialty: {ref.specialtyRequired}</span>
                              </div>

                              <div className="text-[10px] font-mono text-slate-400">
                                Token: #{ref.tokenCode || ref.id} &bull; {new Date(ref.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Section 4: Discharge Summaries */}
                    {subTab === 'discharges' && (
                      <div className="space-y-3">
                        {patientDischarges.length === 0 ? (
                          <p className="text-slate-400 italic py-3">No discharge summaries generated yet.</p>
                        ) : (
                          patientDischarges.map((dis) => (
                            <div
                              key={dis.id}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  Final Discharge Diagnosis: {dis.dischargeDiagnosis}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                                  DISCHARGED
                                </span>
                              </div>

                              <div className="text-slate-700 dark:text-slate-300 text-xs">
                                <strong>Treatment Provided:</strong> {dis.treatmentGiven}
                              </div>

                              {dis.dischargeMedications && dis.dischargeMedications.length > 0 && (
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Pill className="w-3 h-3 text-blue-500" /> Prescriptions:
                                  </span>
                                  {dis.dischargeMedications.map((med, idx) => (
                                    <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                                      &bull; {med.medicineName} — {med.dosage} ({med.frequency}) for {med.durationDays} days
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 text-[11px] text-emerald-900 dark:text-emerald-300">
                                <strong>Refer-Back Follow-up:</strong> {dis.referBackFacilityName} on {dis.followUpDate}. ASHA: {dis.ashaWorkerName || 'Assigned Field Staff'}.
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Bottom Action Toolbar */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2 flex-wrap">
                      {onOpenAbhaCard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAbhaCard(patient);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>ABHA Card</span>
                        </button>
                      )}

                      {onOpenPatientTimeline && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPatientTimeline(patient);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderHeart className="w-3.5 h-3.5" />
                          <span>View Full Longitudinal Timeline</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
