'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { Patient, PrescriptionItem } from '@/lib/types';
import {
  Stethoscope,
  Pill,
  Send,
  CreditCard,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  TestTube,
  Activity,
  History,
  Building2,
} from 'lucide-react';

interface PhcDoctorDashboardProps {
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function PhcDoctorDashboard({
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
}: PhcDoctorDashboardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { patients, referrals, addClinicalEncounter } = useSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0] || null);

  // Prescription Writer State
  const [diagnosis, setDiagnosis] = useState('');
  const [icd10, setIcd10] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      medicineName: 'Amlodipine',
      dosage: '5mg',
      frequency: '1-0-0',
      durationDays: 30,
      instructions: 'Take in the morning after breakfast',
    },
  ]);
  const [newMedName, setNewMedName] = useState('Paracetamol 650mg');
  const [newMedDosage, setNewMedDosage] = useState('650mg');
  const [newMedFreq, setNewMedFreq] = useState('1-0-1');
  const [newMedDays, setNewMedDays] = useState(5);
  const [newMedInstructions, setNewMedInstructions] = useState('After food');

  // Lab orders
  const [orderedLabs, setOrderedLabs] = useState<string[]>([]);
  const [labSearch, setLabSearch] = useState('');
  const edlPresets = [
    { name: 'Paracetamol', dosage: '650mg', freq: '1-0-1', days: 5, inst: 'After meals for fever/pain' },
    { name: 'Amlodipine', dosage: '5mg', freq: '1-0-0', days: 30, inst: 'Morning after food (Hypertension)' },
    { name: 'Metformin', dosage: '500mg', freq: '1-0-1', days: 30, inst: 'With meals (Diabetes)' },
    { name: 'Iron & Folic Acid (IFA)', dosage: '100mg', freq: '0-1-0', days: 30, inst: 'After lunch with lime water' },
    { name: 'ORS Sachet', dosage: '1 Packet', freq: 'Ad lib', days: 3, inst: 'Dissolve in 1 litre drinking water' },
    { name: 'Amoxicillin', dosage: '500mg', freq: '1-1-1', days: 5, inst: 'Antibiotic course after food' },
    { name: 'Labetalol', dosage: '100mg', freq: '1-0-1', days: 7, inst: 'Take strictly with water (Pre-eclampsia)' },
  ];

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.includes(q) ||
      p.phone.includes(q) ||
      p.village.toLowerCase().includes(q)
    );
  });

  const addPrescriptionRow = () => {
    if (!newMedName) return;
    setPrescriptions([
      ...prescriptions,
      {
        medicineName: newMedName,
        dosage: newMedDosage,
        frequency: newMedFreq,
        durationDays: newMedDays,
        instructions: newMedInstructions,
      },
    ]);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset: typeof edlPresets[0]) => {
    setPrescriptions([
      ...prescriptions,
      {
        medicineName: preset.name,
        dosage: preset.dosage,
        frequency: preset.freq,
        durationDays: preset.days,
        instructions: preset.inst,
      },
    ]);
  };

  const toggleLabOrder = (test: string) => {
    setOrderedLabs((prev) =>
      prev.includes(test) ? prev.filter((t) => t !== test) : [...prev, test]
    );
  };

  const handleSaveOpdEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const encounter = {
      id: 'enc-' + Date.now(),
      patientId: selectedPatient.id,
      date: new Date().toISOString().split('T')[0],
      facilityName: user.facilityName,
      facilityType: 'PHC',
      providerName: user.name,
      providerRole: 'Medical Officer (MBBS)',
      chiefComplaints: ['Clinical OPD Consultation'],
      diagnosis: diagnosis || 'Clinical Evaluation & Treatment',
      icd10Code: icd10 || undefined,
      vitals: selectedPatient.encounters[0]?.vitals || {
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 74,
        spO2: 98,
        respiratoryRate: 16,
        temperature: 37.0,
        consciousLevel: 'alert',
        recordedAt: new Date().toISOString(),
      },
      prescriptions,
      labReports: orderedLabs.map((lab) => ({
        id: 'lab-' + Date.now() + Math.random(),
        testName: lab,
        result: 'Sample collected, processing at PHC laboratory',
        normalRange: 'Pending',
        isAbnormal: false,
        date: new Date().toISOString().split('T')[0],
        labFacility: `${user.facilityName} Lab`,
      })),
      notes: `OPD clinical encounter documented by Medical Officer. Prescriptions issued from Maharashtra Essential Drugs List.`,
    };

    addClinicalEncounter(selectedPatient.id, encounter);
    setDiagnosis('');
    setIcd10('');
    setOrderedLabs([]);
  };

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-teal-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider">
            <Stethoscope className="w-4 h-4" />
            <span>{language === 'mr' ? 'प्राथमिक आरोग्य केंद्र (PHC) बाह्यरुग्ण कक्ष (OPD)' : 'Primary Health Centre Clinical OPD'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{user.name}</h2>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            {user.facilityName} • Reg: {user.registrationNumber} • {user.district}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewPatient}
            className="px-3.5 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow transition-colors"
          >
            + {t('newPatient')}
          </button>
        </div>
      </div>

      {/* Main Layout: Left Roster & Right Clinical Consultation Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Patient OPD Roster */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-blue-700" />
                <span>{language === 'mr' ? 'दैनिक बाह्यरुग्ण यादी' : 'Daily OPD Patient Queue'}</span>
              </h3>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {patients.length} Registered
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ABHA ID, Phone or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto">
              {filteredPatients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                const isHrp = p.isHighRiskPregnancy;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPatient(p)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 shadow-xs'
                        : isHrp
                        ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{p.fullName}</span>
                          {isHrp && (
                            <span className="text-[9px] font-extrabold bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                              HRP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.gender} • {p.age} Yrs • {p.village}
                        </div>
                        <div className="text-[10px] font-mono text-blue-900 mt-0.5">
                          ABHA: {p.abhaId}
                        </div>
                      </div>

                      {p.activeReferralId && (
                        <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                          Referral
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Clinical Examination, Longitudinal EHR & Prescription Desk */}
        <div className="lg:col-span-8 space-y-4">
          {selectedPatient ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
              {/* Selected Patient Header */}
              <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedPatient.fullName}</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {selectedPatient.gender}, {selectedPatient.age} Yrs
                    </span>
                    <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                      {selectedPatient.bloodGroup}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-mono">
                    ABHA: <strong className="text-blue-900">{selectedPatient.abhaId}</strong> • Phone: {selectedPatient.phone} • Village: {selectedPatient.village}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenAbhaCard(selectedPatient)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                    <span>ABHA Card</span>
                  </button>

                  <button
                    onClick={() => onOpenPatientTimeline(selectedPatient)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-200 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Full EHR Timeline</span>
                  </button>

                  <button
                    onClick={() => onOpenReferral(selectedPatient)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-lg shadow transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'स्मार्ट रेफरल बनवा' : 'Generate Referral'}</span>
                  </button>
                </div>
              </div>

              {/* Latest Vitals Strip from Sub-Centre or Prior OPD */}
              {selectedPatient.encounters[0] && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>{language === 'mr' ? 'उपकेंद्र / मागील तपासणीत नोंदवलेले Vitals:' : 'Latest Recorded Vitals (Sub-Centre / OPD):'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Recorded: {selectedPatient.encounters[0].date} ({selectedPatient.encounters[0].facilityName})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">BP (mmHg)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedPatient.encounters[0].vitals.systolicBp}/{selectedPatient.encounters[0].vitals.diastolicBp}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">SpO2 Oxygen</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {selectedPatient.encounters[0].vitals.spO2}%
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedPatient.encounters[0].vitals.heartRate} bpm
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Hemoglobin</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedPatient.encounters[0].vitals.hemoglobin || '11.8'} g/dL
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Consciousness</span>
                      <span className="font-bold text-slate-900 uppercase">
                        {selectedPatient.encounters[0].vitals.consciousLevel}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation Form: Diagnosis & Digital Prescription Writer */}
              <form onSubmit={handleSaveOpdEncounter} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {language === 'mr' ? 'वैद्यकीय निदान (Clinical Diagnosis) *' : 'Clinical Diagnosis *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Essential Hypertension Grade II / Acute Bronchitis"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">ICD-10 Code</label>
                    <input
                      type="text"
                      placeholder="e.g. I10 / J20"
                      value={icd10}
                      onChange={(e) => setIcd10(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Maharashtra Essential Drug List (EDL) Quick Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      <span>{language === 'mr' ? 'महाराष्ट्र आवश्यक औषध सूची (EDL) जलद निवड:' : 'Maharashtra Essential Drug List (EDL) Quick Presets:'}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {edlPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 rounded-md border border-slate-200 text-[11px] font-medium transition-colors"
                      >
                        + {preset.name} {preset.dosage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Prescriptions Table */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-800">
                    {language === 'mr' ? 'सध्याची औषध योजना (Rx Plan):' : 'Current Prescription Plan:'}
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-2">Medicine</th>
                          <th className="px-2 py-2">Dosage</th>
                          <th className="px-2 py-2">Frequency</th>
                          <th className="px-2 py-2">Days</th>
                          <th className="px-3 py-2">Instructions</th>
                          <th className="px-2 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {prescriptions.map((med, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-bold text-slate-900">{med.medicineName}</td>
                            <td className="px-2 py-2">{med.dosage}</td>
                            <td className="px-2 py-2 font-mono">{med.frequency}</td>
                            <td className="px-2 py-2">{med.durationDays}</td>
                            <td className="px-3 py-2 text-slate-500 italic">{med.instructions}</td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removePrescriptionRow(idx)}
                                className="text-rose-600 hover:text-rose-800 font-bold px-1"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Diagnostic Lab Orders */}
                <div className="space-y-2">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <TestTube className="w-4 h-4 text-purple-600" />
                    <span>{language === 'mr' ? 'प्रयोगशाळा तपासणी मागणी (Lab Test Orders):' : 'Order Diagnostic Lab Tests:'}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Complete Blood Count (CBC)',
                      'Urine Albumin / Sugar Dipstick',
                      'Dengue NS1 Antigen Rapid',
                      'Malaria Rapid Diagnostic Test (RDT)',
                      'Random Blood Sugar (RBS)',
                      'Serum Creatinine & Urea',
                      'Liver Function Test (LFT)',
                    ].map((test) => (
                      <button
                        type="button"
                        key={test}
                        onClick={() => toggleLabOrder(test)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          orderedLabs.includes(test)
                            ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {orderedLabs.includes(test) ? '✓ ' : '+ '}
                        {test}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-slate-200">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-teal-300" />
                    <span>{language === 'mr' ? 'प्रिस्क्रिप्शन व OPD नोंद जतन करा' : 'Save Prescription & Update ABDM EHR'}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
              Select a patient from the OPD queue on the left to begin consultation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
