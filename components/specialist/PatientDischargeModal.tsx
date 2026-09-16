'use client';

import React, { useState } from 'react';
import { HospitalBedSlot, FacilityDischargeRecord } from '@/lib/types';
import {
  X,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  Stethoscope,
  Plus,
  Trash2,
  Send,
  MapPin,
} from 'lucide-react';

interface PatientDischargeModalProps {
  bedSlot: HospitalBedSlot;
  dischargingDoctorName: string;
  dischargingDoctorId: string;
  onClose: () => void;
  onConfirmDischarge: (dischargeRecord: Omit<FacilityDischargeRecord, 'id' | 'dischargedAt'>) => void;
}

export function PatientDischargeModal({
  bedSlot,
  dischargingDoctorName,
  dischargingDoctorId,
  onClose,
  onConfirmDischarge,
}: PatientDischargeModalProps) {
  const [diagnosis, setDiagnosis] = useState('Acute severe illness resolved; stable for outpatient recovery');
  const [treatmentGiven, setTreatmentGiven] = useState('IV fluids, broad-spectrum antibiotics, hemodynamic stabilization, daily vitals monitoring');
  const [procedures, setProcedures] = useState<string>('Peripheral IV Line, Stat Blood Biochemistry, ECG');
  const [patientCondition, setPatientCondition] = useState<FacilityDischargeRecord['patientCondition']>('IMPROVED');
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [referBackFacilityName, setReferBackFacilityName] = useState('Velhe Primary Health Centre (PHC)');
  const [referBackFacilityId, setReferBackFacilityId] = useState('fac-phc-velhe');
  const [ashaWorkerName, setAshaWorkerName] = useState('Smt. Sunita Shinde');
  const [ashaWorkerPhone, setAshaWorkerPhone] = useState('9822019284');
  const [followUpInstructions, setFollowUpInstructions] = useState(
    'Report to local PHC for wound dressing / BP monitoring. ASHA worker to conduct home visit on Day 3.'
  );
  const [warningSigns, setWarningSigns] = useState(
    'High fever > 101°F, shortness of breath, severe chest pain, or bleeding.'
  );

  const [medications, setMedications] = useState<
    { medicineName: string; dosage: string; frequency: string; durationDays: number; instructions: string }[]
  >([
    {
      medicineName: 'Amoxicillin + Clavulanic Acid (625mg)',
      dosage: '625mg tablet',
      frequency: '1-0-1',
      durationDays: 5,
      instructions: 'Take after meals',
    },
    {
      medicineName: 'Paracetamol (650mg)',
      dosage: '650mg tablet',
      frequency: 'SOS (As needed)',
      durationDays: 3,
      instructions: 'For fever or bodyache',
    },
  ]);

  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('1-0-1');
  const [newMedDays, setNewMedDays] = useState(5);
  const [error, setError] = useState('');

  const handleAddMed = () => {
    if (!newMedName.trim()) return;
    setMedications((prev) => [
      ...prev,
      {
        medicineName: newMedName.trim(),
        dosage: newMedDosage.trim() || 'Standard dose',
        frequency: newMedFreq,
        durationDays: newMedDays,
        instructions: 'As directed by physician',
      },
    ]);
    setNewMedName('');
    setNewMedDosage('');
  };

  const handleRemoveMed = (idx: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setError('Discharge diagnosis is required.');
      return;
    }
    setError('');

    const procedureList = procedures
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    onConfirmDischarge({
      referralId: bedSlot.referralId,
      patientId: bedSlot.patientId || `pat-${Date.now()}`,
      patientName: bedSlot.patientName || 'Inpatient',
      patientAbha: bedSlot.patientAbha,
      dischargeDiagnosis: diagnosis.trim(),
      treatmentGiven: treatmentGiven.trim(),
      proceduresPerformed: procedureList,
      dischargeMedications: medications,
      patientCondition,
      followUpDate,
      referBackFacilityId,
      referBackFacilityName,
      ashaWorkerName,
      ashaWorkerPhone,
      followUpInstructions: followUpInstructions.trim(),
      warningSigns: warningSigns.trim(),
      dischargedByDoctorName: dischargingDoctorName,
      dischargedByDoctorId: dischargingDoctorId,
      assignedBedFreed: bedSlot.bedNumber,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-emerald-400" />
                DISCHARGE SUMMARY &amp; REFER-BACK LOOP
              </span>
              <span className="text-[10px] font-mono text-slate-300">
                Bed: {bedSlot.bedNumber} ({bedSlot.department})
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white mt-1">
              Discharge: {bedSlot.patientName}
            </h3>
            <p className="text-xs text-emerald-200/80">
              Generates structured care summary &amp; routes follow-up back to local PHC / ASHA worker.
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
          {/* Clinical Findings & Treatment */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Discharge Diagnosis *
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hospital Course &amp; Treatment Provided
              </label>
              <textarea
                value={treatmentGiven}
                onChange={(e) => setTreatmentGiven(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Procedures Performed (comma separated)
                </label>
                <input
                  type="text"
                  value={procedures}
                  onChange={(e) => setProcedures(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Condition at Discharge
                </label>
                <select
                  value={patientCondition}
                  onChange={(e) => setPatientCondition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="IMPROVED">Improved / Stable</option>
                  <option value="STABLE">Stable for Home Care</option>
                  <option value="REQUIRES_HOME_MONITORING">Requires Active ASHA Home Visits</option>
                  <option value="CRITICAL_TRANSFER">Transferred to Apex Tertiary</option>
                </select>
              </div>
            </div>
          </div>

          {/* Discharge Prescription Table */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Discharge Medication Schedule
              </h4>
              <span className="text-[10px] text-slate-400">{medications.length} items prescribed</span>
            </div>

            <div className="space-y-1.5">
              {medications.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                >
                  <div>
                    <strong className="text-slate-900 dark:text-slate-100">{m.medicineName}</strong> ({m.dosage})
                    <span className="text-slate-400 block text-[10px]">
                      Freq: {m.frequency} &bull; Duration: {m.durationDays} days &bull; {m.instructions}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMed(idx)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Med Line */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newMedName}
                onChange={(e) => setNewMedName(e.target.value)}
                placeholder="Medicine Name (e.g. Cefixime)"
                className="col-span-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              />
              <input
                type="text"
                value={newMedDosage}
                onChange={(e) => setNewMedDosage(e.target.value)}
                placeholder="Dose (e.g. 200mg)"
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              />
              <button
                type="button"
                onClick={handleAddMed}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Med</span>
              </button>
            </div>
          </div>

          {/* FEATURE 6: REFER-BACK-TO-PHC (CARE CONTINUITY LOOP) */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                CARE-CONTINUITY LOOP: REFER-BACK ROUTING
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Originating PHC / Follow-Up Facility
                </label>
                <input
                  type="text"
                  value={referBackFacilityName}
                  onChange={(e) => setReferBackFacilityName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned ASHA Worker (Community Review)
                </label>
                <input
                  type="text"
                  value={ashaWorkerName}
                  onChange={(e) => setAshaWorkerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-Up Review Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Red-Flag Warning Signs to Watch For
                </label>
                <input
                  type="text"
                  value={warningSigns}
                  onChange={(e) => setWarningSigns(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Instructions for PHC Doctor / ASHA Worker
              </label>
              <textarea
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                rows={2}
                className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Complete Discharge &amp; Refer Back</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
