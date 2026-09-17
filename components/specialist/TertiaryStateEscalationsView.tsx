'use client';

import React, { useState, useMemo } from 'react';
import { Patient, Referral, HospitalBedSlot } from '@/lib/types';
import { StateEscalationItem, NewStateEscalationModal } from './NewStateEscalationModal';
import {
  Radio,
  Building2,
  Stethoscope,
  Truck,
  Bed,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  Plus,
  ShieldCheck,
  ChevronRight,
  Eye,
  Activity,
  PhoneCall,
  MapPin,
  ArrowUpRight,
  Layers,
  HeartPulse,
} from 'lucide-react';

interface TertiaryStateEscalationsViewProps {
  hospitalName: string;
  patients: Patient[];
  bedSlots: HospitalBedSlot[];
  referrals: Referral[];
  doctorName: string;
  onOpenPatientTimeline?: (patient: Patient) => void;
}

const INITIAL_STATE_ESCALATIONS_DEMO: StateEscalationItem[] = [
  {
    id: 'ESC-MH-2026-081',
    patientId: 'pat-001',
    patientName: 'Sunita Dnyaneshwar Jadhav',
    patientAge: 48,
    patientGender: 'Female',
    patientAbha: '91-2384-9102-3341',
    condition: 'Acute STEMI with Cardiogenic Shock, refractory hypotension',
    targetStateFacility: 'Sassoon General Hospital & B.J. Medical College, Pune',
    targetStateFacilityId: 'fac-tertiary-sassoon',
    escalationReason: 'Emergency Primary PCI / Cath Lab required; District ICU at 100% capacity',
    urgency: 'CRITICAL',
    status: 'EN_ROUTE_ALS',
    createdAt: new Date(Date.now() - 38 * 60000).toISOString(), // 38 mins ago
    stateResponseTimeMinutes: 12,
    slaWindowMinutes: 30,
    slaExpiresAt: new Date(Date.now() - 8 * 60000).toISOString(),
    transportAmbulanceToken: '108-ALS-PUN-402',
    referringDoctorName: 'Dr. Vikramaditya Salunkhe',
    stateAttendingDoctor: 'Dr. Shrikant Joshi (Chief of Cardiology, BJMC)',
    clinicalNotes: 'Intubated on mechanical ventilation. Inotropes: Noradrenaline @ 0.4 mcg/kg/min + Dobutamine. Heparin bolus 5000 IU given.',
    requiredSpecialty: 'Interventional Cardiology / Cath Lab',
  },
  {
    id: 'ESC-MH-2026-082',
    patientId: 'pat-002',
    patientName: 'Rohan Santosh Gaikwad',
    patientAge: 8,
    patientGender: 'Male',
    patientAbha: '91-4455-6677-8899',
    condition: 'Acute Depressed Skull Fracture with Extradural Hematoma (Post-fall from height)',
    targetStateFacility: 'K.E.M Hospital & Seth GS Medical College, Mumbai',
    targetStateFacilityId: 'fac-tertiary-kem',
    escalationReason: 'Emergency Pediatric Neurosurgical Craniotomy required (No Pediatric Neurosurgeon at District Hospital)',
    urgency: 'CRITICAL',
    status: 'STATE_ACCEPTED',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(), // 22 mins ago
    stateResponseTimeMinutes: 9,
    slaWindowMinutes: 30,
    slaExpiresAt: new Date(Date.now() + 8 * 60000).toISOString(),
    transportAmbulanceToken: '108-ALS-MUM-119',
    referringDoctorName: 'Dr. Ananya Kulkarni',
    stateAttendingDoctor: 'Dr. Praveen Shinde (Pediatric Neurosurgery, KEM)',
    clinicalNotes: 'GCS 8/15 (E2V2M4). Pupil left 4mm sluggish. Mannitol 20% 100mL infused. Urgent surgical evacuation indicated.',
    requiredSpecialty: 'Pediatric Neurosurgery',
  },
  {
    id: 'ESC-MH-2026-083',
    patientId: 'pat-003',
    patientName: 'Dattatray Keshav Bhosale',
    patientAge: 62,
    patientGender: 'Male',
    patientAbha: '91-7788-9900-1122',
    condition: 'Acute Necrotizing Pancreatitis with Severe ARDS & Anuric Renal Failure',
    targetStateFacility: 'Sassoon General Hospital & B.J. Medical College, Pune',
    targetStateFacilityId: 'fac-tertiary-sassoon',
    escalationReason: 'Continuous Renal Replacement Therapy (CRRT) & Level-3 ICU ECMO support required',
    urgency: 'CRITICAL',
    status: 'PENDING_STATE_REVIEW',
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(), // 14 mins ago
    slaWindowMinutes: 45,
    slaExpiresAt: new Date(Date.now() + 31 * 60000).toISOString(),
    referringDoctorName: 'Dr. Prashant Shinde',
    clinicalNotes: 'Serum Creatinine 6.8 mg/dL, PaO2/FiO2 ratio 110. Anuric for 12 hours. Arterial blood gas shows severe metabolic acidosis pH 7.12.',
    requiredSpecialty: 'Critical Care & Nephrology',
  },
  {
    id: 'ESC-MH-2026-079',
    patientId: 'pat-005',
    patientName: 'Kavita Mohan Shinde',
    patientAge: 29,
    patientGender: 'Female',
    patientAbha: '91-9988-7766-5544',
    condition: 'Post-Partum Hemorrhage with DIC & Uterine Atony (Post-Caesarean)',
    targetStateFacility: 'Sir J.J. Group of Government Hospitals, Mumbai',
    targetStateFacilityId: 'fac-tertiary-jj',
    escalationReason: 'Uterine Artery Embolization / Interventional Radiology requirement following refractory PPH',
    urgency: 'CRITICAL',
    status: 'ADMITTED_TERTIARY',
    createdAt: new Date(Date.now() - 320 * 60000).toISOString(), // ~5 hours ago
    stateResponseTimeMinutes: 7,
    slaWindowMinutes: 30,
    slaExpiresAt: new Date(Date.now() - 290 * 60000).toISOString(),
    transportAmbulanceToken: '108-ALS-MUM-084',
    referringDoctorName: 'Dr. Sneha Deshpande',
    stateAttendingDoctor: 'Dr. Meena Hazari (Interventional Radiology, JJ)',
    clinicalNotes: 'Uterine artery embolization successfully performed. 6 units PRBC + 4 FFP transfused. Hemodynamically stable in ICU-3.',
    requiredSpecialty: 'Interventional Radiology & ObGyn',
  },
];

export function TertiaryStateEscalationsView({
  hospitalName,
  patients,
  bedSlots,
  referrals,
  doctorName,
  onOpenPatientTimeline,
}: TertiaryStateEscalationsViewProps) {
  const [escalations, setEscalations] = useState<StateEscalationItem[]>(INITIAL_STATE_ESCALATIONS_DEMO);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_STATE_REVIEW' | 'STATE_ACCEPTED' | 'EN_ROUTE_ALS' | 'ADMITTED_TERTIARY'>('ALL');
  const [selectedEscalation, setSelectedEscalation] = useState<StateEscalationItem | null>(null);

  const handleAddNewEscalation = (newItem: StateEscalationItem) => {
    setEscalations((prev) => [newItem, ...prev]);
  };

  const handleUpdateStatus = (id: string, newStatus: StateEscalationItem['status']) => {
    setEscalations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: newStatus,
            stateResponseTimeMinutes: item.stateResponseTimeMinutes || Math.floor(10 + Math.random() * 15),
          };
        }
        return item;
      })
    );
  };

  const filteredEscalations = useMemo(() => {
    return escalations.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.patientName.toLowerCase().includes(q) ||
        item.patientAbha.includes(q) ||
        item.condition.toLowerCase().includes(q) ||
        item.targetStateFacility.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [escalations, searchQuery, statusFilter]);

  // SLA Calculation helper
  const getElapsedMins = (createdAt: string) => {
    return Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  };

  // Stat metrics
  const pendingCount = escalations.filter((e) => e.status === 'PENDING_STATE_REVIEW').length;
  const enRouteCount = escalations.filter((e) => e.status === 'EN_ROUTE_ALS').length;
  const acceptedCount = escalations.filter((e) => e.status === 'STATE_ACCEPTED' || e.status === 'ADMITTED_TERTIARY').length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
              <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
              TERTIARY STATE ESCALATION GATEWAY (LEVEL-3 APEX PROTOCOL)
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            State Healthcare Escalations &amp; Apex Medical Transfers
          </h3>
          <p className="text-xs text-indigo-200/80 mt-0.5">
            Real-time inter-tier escalation protocol for cases exceeding district capacity (ICU saturation, ECMO, Super-Specialty Surgery).
          </p>
        </div>

        <button
          onClick={() => setIsEscalateModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Escalate Patient to State</span>
        </button>
      </div>

      {/* 2. 4 Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total State Escalations
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {escalations.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Total Cases</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending State Review
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Awaiting Apex Triage</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              ALS Transit En Route
            </span>
            <Truck className="w-4 h-4 text-blue-500 animate-bounce" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {enRouteCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">108 ALS Transits</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Under Tertiary Care
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {acceptedCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Apex Beds Occupied</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Status Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search escalated cases by Patient Name, ABHA ID, State Hospital, Diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 items-center shrink-0 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Escalation Statuses ({escalations.length})</option>
            <option value="PENDING_STATE_REVIEW">Pending State Review ({pendingCount})</option>
            <option value="EN_ROUTE_ALS">En Route (108 ALS) ({enRouteCount})</option>
            <option value="STATE_ACCEPTED">State Accepted</option>
            <option value="ADMITTED_TERTIARY">Admitted Tertiary</option>
          </select>
        </div>
      </div>

      {/* 4. Escalations List */}
      <div className="space-y-3">
        {filteredEscalations.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Escalations Found</h4>
            <p className="text-xs text-slate-400 mt-1">
              No matching state-tier escalations under the current search/filter criteria.
            </p>
          </div>
        ) : (
          filteredEscalations.map((item) => {
            const elapsedMins = getElapsedMins(item.createdAt);
            const isPending = item.status === 'PENDING_STATE_REVIEW';
            const isEnRoute = item.status === 'EN_ROUTE_ALS';
            const isAccepted = item.status === 'STATE_ACCEPTED';
            const isAdmitted = item.status === 'ADMITTED_TERTIARY';

            return (
              <div
                key={item.id}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-3"
              >
                {/* Card Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                      {item.urgency}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse'
                          : isEnRoute
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          : isAccepted
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      }`}
                    >
                      {item.status.replace(/_/g, ' ')}
                    </span>

                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {item.patientName} ({item.patientAge}y &bull; {item.patientGender})
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      ABHA: {item.patientAbha}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                      #{item.id}
                    </span>
                  </div>

                  {/* Live State Response Time Tracker */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        Raised {elapsedMins}m ago
                      </span>
                    </div>

                    {item.stateResponseTimeMinutes ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-[11px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>State Response SLA: {item.stateResponseTimeMinutes}m</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px]">
                        <Activity className="w-3 h-3 text-amber-500 animate-spin" />
                        <span>SLA: &lt; {item.slaWindowMinutes}m</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Clinical Diagnosis & Reason */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
                      <span><strong>Condition:</strong> {item.condition}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      <strong>Escalation Reason:</strong> {item.escalationReason}
                    </div>
                    {item.clinicalNotes && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 italic">
                        "{item.clinicalNotes}"
                      </div>
                    )}
                  </div>

                  {/* Column 2: Route, Hospital & Ambulance */}
                  <div className="space-y-2 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px]">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{item.targetStateFacility}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Specialty: <strong>{item.requiredSpecialty}</strong></span>
                    </div>
                    {item.transportAmbulanceToken && (
                      <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 font-mono font-bold bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-blue-600" /> ALS Unit:
                        </span>
                        <span>{item.transportAmbulanceToken}</span>
                      </div>
                    )}
                    {item.stateAttendingDoctor && (
                      <div className="text-slate-500 dark:text-slate-400">
                        State Specialist: <strong className="text-slate-800 dark:text-slate-200">{item.stateAttendingDoctor}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 flex-wrap gap-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Originating Doctor: <strong>{item.referringDoctorName}</strong> ({hospitalName})
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'EN_ROUTE_ALS')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Truck className="w-3 h-3" />
                        <span>Dispatch ALS Ambulance</span>
                      </button>
                    )}

                    {isEnRoute && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'ADMITTED_TERTIARY')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirm State Bed Intake</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedEscalation(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View Dossier</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Modals */}
      {isEscalateModalOpen && (
        <NewStateEscalationModal
          onClose={() => setIsEscalateModalOpen(false)}
          onSubmit={handleAddNewEscalation}
          patients={patients}
          bedSlots={bedSlots}
          referrals={referrals}
          doctorName={doctorName}
          hospitalName={hospitalName}
        />
      )}

      {/* Detail Dossier Modal */}
      {selectedEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
            <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  STATE ESCALATION DOSSIER #{selectedEscalation.id}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {selectedEscalation.patientName} ({selectedEscalation.patientAge}y &bull; {selectedEscalation.patientGender})
                </h3>
                <p className="text-xs text-indigo-200">
                  {selectedEscalation.targetStateFacility}
                </p>
              </div>
              <button
                onClick={() => setSelectedEscalation(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                &times;
              </button>
            </header>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Clinical Presentation &amp; Rationale
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Diagnosis:</strong> {selectedEscalation.condition}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Escalation Reason:</strong> {selectedEscalation.escalationReason}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Required Tertiary Specialty:</strong> {selectedEscalation.requiredSpecialty}
                </p>
              </div>

              {selectedEscalation.clinicalNotes && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 text-slate-700 dark:text-slate-300">
                  <div className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                    Attending Medical Officer Notes
                  </div>
                  <p className="italic">{selectedEscalation.clinicalNotes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-slate-600 dark:text-slate-400">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Transport Logistics</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedEscalation.transportAmbulanceToken || 'Standard 108 Emergency Transit'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Escalated By</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedEscalation.referringDoctorName}</span>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => setSelectedEscalation(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold cursor-pointer"
              >
                Close Dossier
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
