'use client';

import React, { useState } from 'react';
import { Patient, Referral, HospitalBedSlot } from '@/lib/types';
import {
  X,
  AlertTriangle,
  Building2,
  Stethoscope,
  Truck,
  Bed,
  CheckCircle2,
  Radio,
  FileText,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export interface StateEscalationItem {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAbha: string;
  condition: string;
  targetStateFacility: string;
  targetStateFacilityId: string;
  escalationReason: string;
  urgency: 'CRITICAL' | 'URGENT' | 'HIGH';
  status: 'PENDING_STATE_REVIEW' | 'STATE_ACCEPTED' | 'EN_ROUTE_ALS' | 'ADMITTED_TERTIARY' | 'COUNTER_REFERRED_BACK';
  createdAt: string;
  stateResponseTimeMinutes?: number;
  slaWindowMinutes: number;
  slaExpiresAt: string;
  transportAmbulanceToken?: string;
  referringDoctorName: string;
  stateAttendingDoctor?: string;
  clinicalNotes?: string;
  requiredSpecialty: string;
}

interface NewStateEscalationModalProps {
  onClose: () => void;
  onSubmit: (escalation: StateEscalationItem) => void;
  patients: Patient[];
  bedSlots: HospitalBedSlot[];
  referrals: Referral[];
  doctorName: string;
  hospitalName: string;
}

const STATE_TERTIARY_FACILITIES = [
  {
    id: 'fac-tertiary-sassoon',
    name: 'Sassoon General Hospital & B.J. Medical College, Pune',
    type: 'Apex State Medical College',
    specialties: ['Cardiology & Cath Lab', 'Neurosurgery', 'Pediatric ICU', 'Level-1 Trauma', 'Nephrology / Dialysis'],
    availableIcuBeds: 6,
    distanceKm: 14.5,
  },
  {
    id: 'fac-tertiary-kem',
    name: 'K.E.M Hospital & Seth GS Medical College, Mumbai',
    type: 'State Super-Specialty Apex Center',
    specialties: ['Cardiothoracic Surgery', 'ECMO Support', 'Comprehensive Cancer Care', 'Toxicology & Poison Control'],
    availableIcuBeds: 4,
    distanceKm: 152.0,
  },
  {
    id: 'fac-tertiary-jj',
    name: 'Sir J.J. Group of Government Hospitals, Mumbai',
    type: 'State Apex Tertiary Hospital',
    specialties: ['Vascular Surgery', 'Burns & Plastic Reconstruction', 'Neonatology NICU Level-3', 'Neurology'],
    availableIcuBeds: 8,
    distanceKm: 148.0,
  },
  {
    id: 'fac-tertiary-aiims',
    name: 'AIIMS Nagpur (State Tertiary Hub)',
    type: 'National Institute of Excellence',
    specialties: ['Organ Transplant', 'Advanced Critical Care', 'Interventional Radiology', 'Medical Oncology'],
    availableIcuBeds: 12,
    distanceKm: 710.0,
  },
];

const ESCALATION_REASONS = [
  'Critical ICU Bed Saturation at District Hospital (0 Ventilators Available)',
  'Super-Specialty Care Required (Emergency Cath Lab / PCI / Neurosurgery)',
  'Pediatric / Neonatal Level-3 Intensive Care with ECMO Support Required',
  'Severe Multi-Organ Dysfunction / Septic Shock requiring Tertiary Dialysis',
  'Advanced Complex Trauma requiring Multi-Specialty Surgical Team',
];

export function NewStateEscalationModal({
  onClose,
  onSubmit,
  patients,
  bedSlots,
  referrals,
  doctorName,
  hospitalName,
}: NewStateEscalationModalProps) {
  const admittedInpatients = bedSlots
    .filter((b) => b.status === 'OCCUPIED' && b.patientName)
    .map((b) => ({
      id: b.patientAbha || b.bedId,
      name: b.patientName!,
      age: 45,
      gender: 'Male',
      abha: b.patientAbha || '91-XXXX-XXXX-XXXX',
      condition: `Admitted under ${b.department} (${b.wardName})`,
    }));

  const [patientNameInput, setPatientNameInput] = useState<string>('');
  const [patientAgeInput, setPatientAgeInput] = useState<number>(42);
  const [patientGenderInput, setPatientGenderInput] = useState<string>('Male');
  const [patientAbhaInput, setPatientAbhaInput] = useState<string>('91-8833-2211-9900');
  const [clinicalCondition, setClinicalCondition] = useState<string>('Severe Cardiogenic Shock with refractory hypotension (STEMI)');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('fac-tertiary-sassoon');
  const [escalationReason, setEscalationReason] = useState<string>(ESCALATION_REASONS[0]);
  const [requiredSpecialty, setRequiredSpecialty] = useState<string>('Cardiology & Cath Lab');
  const [urgency, setUrgency] = useState<'CRITICAL' | 'URGENT' | 'HIGH'>('CRITICAL');
  const [requestAlsAmbulance, setRequestAlsAmbulance] = useState<boolean>(true);
  const [clinicalNotes, setClinicalNotes] = useState<string>('Patient requires emergency coronary angiography and mechanical circulatory support. Inotropic support maxed out (Noradrenaline + Vasopressin).');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSelectInpatient = (inpatientName: string) => {
    setPatientNameInput(inpatientName);
    const matched = patients.find((p) => p.fullName.toLowerCase() === inpatientName.toLowerCase());
    if (matched) {
      setPatientAgeInput(matched.age);
      setPatientGenderInput(matched.gender);
      setPatientAbhaInput(matched.abhaId);
      if (matched.encounters && matched.encounters.length > 0) {
        setClinicalCondition(matched.encounters[0].diagnosis || clinicalCondition);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientNameInput.trim()) {
      setError('Please select or specify a patient name.');
      return;
    }
    if (!clinicalCondition.trim()) {
      setError('Clinical condition and diagnosis cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const targetFacility = STATE_TERTIARY_FACILITIES.find((f) => f.id === selectedFacilityId) || STATE_TERTIARY_FACILITIES[0];
    const newEscalation: StateEscalationItem = {
      id: `ESC-MH-2026-${Math.floor(100 + Math.random() * 900)}`,
      patientId: `pat-esc-${Date.now()}`,
      patientName: patientNameInput.trim(),
      patientAge: Number(patientAgeInput) || 40,
      patientGender: patientGenderInput,
      patientAbha: patientAbhaInput.trim(),
      condition: clinicalCondition.trim(),
      targetStateFacility: targetFacility.name,
      targetStateFacilityId: targetFacility.id,
      escalationReason,
      urgency,
      status: 'PENDING_STATE_REVIEW',
      createdAt: new Date().toISOString(),
      slaWindowMinutes: urgency === 'CRITICAL' ? 30 : 60,
      slaExpiresAt: new Date(Date.now() + (urgency === 'CRITICAL' ? 30 : 60) * 60000).toISOString(),
      transportAmbulanceToken: requestAlsAmbulance ? `108-ALS-${Math.floor(100 + Math.random() * 900)}` : undefined,
      referringDoctorName: doctorName || 'District Medical Specialist',
      clinicalNotes: clinicalNotes.trim(),
      requiredSpecialty,
    };

    setTimeout(() => {
      onSubmit(newEscalation);
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Modal Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
                <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                TERTIARY STATE ESCALATION GATEWAY
              </span>
              <span className="text-[10px] text-slate-300">Level-3 / Apex Protocol</span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white mt-1">
              Escalate Case to State Medical Centers
            </h3>
            <p className="text-xs text-slate-300">
              Transfer care ownership above district tier when ICU saturation or specialized surgical requirements exceed district capacity.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Patient Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>1. Patient Identification &amp; Demographics</span>
            </h4>

            {admittedInpatients.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quick Select from Admitted Inpatients:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {admittedInpatients.map((inp) => (
                    <button
                      key={inp.id}
                      type="button"
                      onClick={() => handleSelectInpatient(inp.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        patientNameInput === inp.name
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {inp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  value={patientNameInput}
                  onChange={(e) => setPatientNameInput(e.target.value)}
                  placeholder="e.g. Rameshwar Pawar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ABHA Number
                </label>
                <input
                  type="text"
                  value={patientAbhaInput}
                  onChange={(e) => setPatientAbhaInput(e.target.value)}
                  placeholder="91-XXXX-XXXX-XXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={patientAgeInput}
                  onChange={(e) => setPatientAgeInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={patientGenderInput}
                  onChange={(e) => setPatientGenderInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Clinical Condition & Escalation Rationale */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>2. Clinical Condition &amp; Escalation Rationale</span>
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Primary Diagnosis &amp; Critical Presentation *
              </label>
              <input
                type="text"
                value={clinicalCondition}
                onChange={(e) => setClinicalCondition(e.target.value)}
                placeholder="e.g. Acute STEMI with cardiogenic shock, Glasgow Coma Scale 7/15"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Escalation Reason
                </label>
                <select
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {ESCALATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Tertiary Specialty
                </label>
                <input
                  type="text"
                  value={requiredSpecialty}
                  onChange={(e) => setRequiredSpecialty(e.target.value)}
                  placeholder="e.g. Interventional Cardiology / Cath Lab"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Attending Doctor Clinical Summary &amp; Interventions Completed
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Detail hemodynamic status, inotropic support, intubation parameters, or blood products administered..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Step 3: Target State Facility */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>3. Target State/Tertiary Healthcare Facility</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STATE_TERTIARY_FACILITIES.map((fac) => {
                const isSelected = selectedFacilityId === fac.id;
                return (
                  <div
                    key={fac.id}
                    onClick={() => setSelectedFacilityId(fac.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {fac.name}
                      </div>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0 font-black">
                        {fac.distanceKm} km
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                      <span>{fac.type}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {fac.availableIcuBeds} ICU Beds Available
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {fac.specialties.slice(0, 3).map((sp) => (
                        <span
                          key={sp}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {sp}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 4: Urgency & ALS Logistics */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>108 Advanced Life Support (ALS) Transport Protocol</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Auto-dispatch dedicated ventilator-equipped ALS ambulance with critical care paramedic for state inter-facility transit.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={requestAlsAmbulance}
                onChange={(e) => setRequestAlsAmbulance(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Dispatch ALS Unit
              </span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <footer className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>{isSubmitting ? 'Transmitting Escalation...' : 'Transmit State Escalation'}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
