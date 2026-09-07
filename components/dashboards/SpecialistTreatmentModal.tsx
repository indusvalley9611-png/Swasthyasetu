import React, { useState } from 'react';
import { Referral, Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { Building2, FileText, CheckCircle2 } from 'lucide-react';

interface SpecialistTreatmentModalProps {
  referral: Referral;
  patient: Patient;
  onClose: () => void;
  onEscalateToState: (notes: string, diagnosis: string, targetFacility: string) => void;
}

export function SpecialistTreatmentModal({ referral, patient, onClose, onEscalateToState }: SpecialistTreatmentModalProps) {
  const { language } = useLanguage();
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [targetFacility, setTargetFacility] = useState('Sassoon General Hospital (State Level)');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onEscalateToState(notes, diagnosis, targetFacility);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-purple-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-300" />
            <h3 className="font-bold">
              {language === 'mr' ? '?????? ???????? ????? ? ????? ?????' : 'Specialist Treatment & State Referral'}
            </h3>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white">?</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2">
            <div className="text-xs font-bold text-slate-800">Patient: {patient.fullName} ({patient.age} Yrs)</div>
            <div className="text-xs text-slate-500">Current Status: Admitted at District Hospital</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Clinical Diagnosis (District Assessment)
            </label>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Complicated Eclampsia"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Treatment Notes & Escalation Reason
            </label>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe treatments given at district level and why tertiary care is needed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target State/Tertiary Facility
            </label>
            <select
              value={targetFacility}
              onChange={(e) => setTargetFacility(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="Sassoon General Hospital (State Level)">Sassoon General Hospital (State Level)</option>
              <option value="AIIMS Nagpur (Tertiary)">AIIMS Nagpur (Tertiary)</option>
              <option value="KEM Hospital Mumbai">KEM Hospital Mumbai</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-lg shadow flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Submit & Escalate to State
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
