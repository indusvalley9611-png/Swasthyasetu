'use client';

import React, { useState } from 'react';
import { HospitalBedSlot, HospitalDepartment, Referral, EmergencyWalkIn, TriagePriority } from '@/lib/types';
import {
  X,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Stethoscope,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface PatientAdmissionModalProps {
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientAbha?: string;
  triagePriority: TriagePriority;
  chiefComplaint: string;
  specialtyRequired?: string;
  referralId?: string;
  walkInId?: string;
  bedSlots: HospitalBedSlot[];
  attendingSpecialistName: string;
  onClose: () => void;
  onConfirmAdmission: (params: {
    bedId: string;
    department: HospitalDepartment;
    attendingDoctor: string;
    admissionNotes: string;
  }) => void;
}

export function PatientAdmissionModal({
  patientName,
  patientAge,
  patientGender,
  patientAbha,
  triagePriority,
  chiefComplaint,
  specialtyRequired,
  referralId,
  walkInId,
  bedSlots,
  attendingSpecialistName,
  onClose,
  onConfirmAdmission,
}: PatientAdmissionModalProps) {
  // Determine suggested department based on triage priority & specialty
  const defaultDept: HospitalDepartment =
    triagePriority === 'red'
      ? 'ICU'
      : specialtyRequired?.toLowerCase().includes('obstetric') || specialtyRequired?.toLowerCase().includes('gynaec')
      ? 'Maternity / NICU'
      : 'General Ward';

  const [selectedDept, setSelectedDept] = useState<HospitalDepartment>(defaultDept);
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>(attendingSpecialistName);
  const [admissionNotes, setAdmissionNotes] = useState<string>(
    `Emergency admission under triage priority ${triagePriority.toUpperCase()}. Initial resuscitation initiated.`
  );
  const [error, setError] = useState<string>('');

  // Available beds in selected department
  const availableBeds = bedSlots.filter(
    (b) => b.department === selectedDept && b.status === 'AVAILABLE'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId) {
      setError('Please select an available bed slot to proceed with admission.');
      return;
    }
    setError('');
    onConfirmAdmission({
      bedId: selectedBedId,
      department: selectedDept,
      attendingDoctor: doctorName,
      admissionNotes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                INPATIENT ADMISSION &amp; BED ASSIGNMENT
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white mt-1">
              Admit: {patientName} {patientAge ? `(${patientAge}y / ${patientGender})` : ''}
            </h3>
            <p className="text-xs text-slate-300">
              {chiefComplaint}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Patient Overview Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400">ABHA: {patientAbha || 'ABDM-VERIFIED'}</span>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Triage: <strong className={triagePriority === 'red' ? 'text-rose-600' : 'text-amber-600'}>{triagePriority.toUpperCase()}</strong> &bull; Specialty: {specialtyRequired || 'Emergency Care'}
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/30">
              {referralId ? `Ref #${referralId}` : 'Direct Walk-In'}
            </span>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Inpatient Department
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['ICU', 'Casualty / ER', 'Maternity / NICU', 'General Ward'] as HospitalDepartment[]).map((dept) => {
                const count = bedSlots.filter((b) => b.department === dept && b.status === 'AVAILABLE').length;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      setSelectedDept(dept);
                      setSelectedBedId('');
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedDept === dept
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{dept}</div>
                    <span className={`text-[10px] ${selectedDept === dept ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {count} beds free
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bed Slot Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Available Bed Slot ({availableBeds.length} Free in {selectedDept})
            </label>

            {availableBeds.length === 0 ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                <strong className="block">No Available Beds in {selectedDept}!</strong>
                <span className="text-[11px]">Select another department or convert an observation bed.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableBeds.map((bed) => (
                  <button
                    key={bed.bedId}
                    type="button"
                    onClick={() => setSelectedBedId(bed.bedId)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      selectedBedId === bed.bedId
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs">{bed.bedNumber}</span>
                      <Bed className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[10px] block mt-0.5 line-clamp-1 ${selectedBedId === bed.bedId ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {bed.wardName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attending Doctor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Attending Specialist / Medical Officer
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Admission Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Admission Clinical Orders &amp; Plan
            </label>
            <textarea
              value={admissionNotes}
              onChange={(e) => setAdmissionNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Start IV fluid resuscitation, order stat ECG and troponin, continuous vitals monitoring..."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}

          {/* Footer */}
          <footer className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedBedId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Bed Assignment &amp; Admit</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
