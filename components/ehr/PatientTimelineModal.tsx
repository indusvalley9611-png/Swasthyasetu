'use client';

import React, { useState } from 'react';
import { Patient, ClinicalEncounter } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  CreditCard,
  Send,
  Calendar,
  Building2,
  User,
  Heart,
  Activity,
  FileText,
  Pill,
  TestTube,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface PatientTimelineModalProps {
  patient: Patient | null;
  onClose: () => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function PatientTimelineModal({
  patient,
  onClose,
  onOpenAbhaCard,
  onOpenReferral,
}: PatientTimelineModalProps) {
  const { language, t } = useLanguage();
  const [filterFacility, setFilterFacility] = useState<string>('all');

  if (!patient) return null;

  const filteredEncounters = patient.encounters.filter((enc) => {
    if (filterFacility === 'all') return true;
    return enc.facilityType === filterFacility;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">
                {language === 'mr' ? 'एकात्मिक इलेक्ट्रॉनिक आरोग्य नोंद (EHR)' : 'Unified Electronic Health Record'}
              </span>
              <span className="bg-blue-800 text-blue-200 text-[10px] font-mono px-2 py-0.5 rounded">
                ABHA: {patient.abhaId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{patient.fullName}</span>
              <span className="text-xs font-normal text-slate-300">
                ({patient.gender}, {patient.age} Yrs • Blood: {patient.bloodGroup})
              </span>
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              {patient.village}, {patient.taluka}, {patient.district} • Contact: {patient.phone}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenAbhaCard(patient)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-800 hover:bg-blue-700 text-white rounded-lg transition-colors border border-blue-600"
            >
              <CreditCard className="w-3.5 h-3.5 text-teal-300" />
              <span>{language === 'mr' ? 'आभा कार्ड' : 'ABHA Card'}</span>
            </button>

            <button
              onClick={() => onOpenReferral(patient)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'रेफर करा' : 'Refer Patient'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clinical Flags Bar */}
        {(patient.isHighRiskPregnancy || (patient.chronicConditions && patient.chronicConditions.length > 0)) && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold text-rose-900">
              {language === 'mr' ? 'वैद्यकीय धोके / दक्षतेचा इशारा:' : 'Clinical Risk Flags:'}
            </span>
            {patient.isHighRiskPregnancy && (
              <span className="bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-md border border-rose-300">
                {language === 'mr' ? 'अतिधोकादायक गरोदरपण (HRP) - आठवडे ' : 'High Risk Pregnancy (HRP) - Week '}
                {patient.gestationalWeeks}
              </span>
            )}
            {patient.chronicConditions?.map((cond, i) => (
              <span key={i} className="bg-amber-100 text-amber-900 font-medium px-2 py-0.5 rounded-md border border-amber-300">
                {cond}
              </span>
            ))}
          </div>
        )}

        {/* Filter Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            {language === 'mr' ? 'आरोग्य संस्था स्तरानुसार फिल्टर करा:' : 'Filter Encounters by Facility Tier:'}
          </span>
          <div className="flex gap-1.5">
            {['all', 'Sub-Centre', 'PHC', 'Rural Hospital', 'District Hospital'].map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterFacility(tier)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filterFacility === tier
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {tier === 'all' ? (language === 'mr' ? 'सर्व नोंदी' : 'All Tiers') : tier}
              </button>
            ))}
          </div>
        </div>

        {/* Longitudinal Timeline Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredEncounters.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              {language === 'mr' ? 'या स्तरावर कोणत्याही नोंदी आढळल्या नाहीत.' : 'No encounters recorded for this filter.'}
            </div>
          ) : (
            filteredEncounters.map((enc, idx) => (
              <div key={enc.id} className="relative pl-6 border-l-2 border-teal-500/40 pb-2">
                {/* Timeline node */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-teal-600 border-2 border-white shadow-xs" />

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-teal-300 transition-colors">
                  {/* Encounter Header */}
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            enc.facilityType === 'Sub-Centre'
                              ? 'bg-emerald-100 text-emerald-800'
                              : enc.facilityType === 'PHC'
                              ? 'bg-blue-100 text-blue-800'
                              : enc.facilityType === 'Rural Hospital'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {enc.facilityType}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">{enc.facilityName}</h4>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        <span>
                          {enc.providerName} ({enc.providerRole})
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{enc.date}</span>
                    </div>
                  </div>

                  {/* Vitals Ribbon */}
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Blood Pressure</span>
                      <span
                        className={`font-bold ${
                          enc.vitals.systolicBp >= 140 || enc.vitals.systolicBp <= 90
                            ? 'text-rose-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {enc.vitals.systolicBp}/{enc.vitals.diastolicBp} mmHg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Pulse Rate</span>
                      <span
                        className={`font-bold ${
                          enc.vitals.heartRate > 100 || enc.vitals.heartRate < 50
                            ? 'text-amber-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {enc.vitals.heartRate} bpm
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SpO2 Saturation</span>
                      <span
                        className={`font-bold ${
                          enc.vitals.spO2 < 94 ? 'text-rose-700 font-extrabold' : 'text-emerald-700'
                        }`}
                      >
                        {enc.vitals.spO2}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Consciousness (AVPU)</span>
                      <span className="font-bold text-slate-800 uppercase">
                        {enc.vitals.consciousLevel}
                      </span>
                    </div>
                  </div>

                  {/* Diagnosis & Complaints */}
                  <div className="space-y-1">
                    <div className="text-xs">
                      <strong className="text-slate-700">{language === 'mr' ? 'तक्रारी:' : 'Chief Complaints:'}</strong>{' '}
                      <span className="text-slate-600">{enc.chiefComplaints.join(', ')}</span>
                    </div>
                    <div className="text-xs">
                      <strong className="text-slate-700">{language === 'mr' ? 'निदान:' : 'Diagnosis:'}</strong>{' '}
                      <span className="font-semibold text-blue-950">{enc.diagnosis}</span>
                      {enc.icd10Code && (
                        <span className="ml-2 text-[10px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          ICD: {enc.icd10Code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Prescriptions */}
                  {enc.prescriptions && enc.prescriptions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-teal-600" />
                        <span>{language === 'mr' ? 'दिलेली औषधे (Prescriptions):' : 'Prescribed Medications:'}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-600 border border-slate-200 rounded-lg">
                          <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                            <tr>
                              <th className="px-3 py-1.5">Medicine</th>
                              <th className="px-2 py-1.5">Dosage</th>
                              <th className="px-2 py-1.5">Freq</th>
                              <th className="px-2 py-1.5">Days</th>
                              <th className="px-3 py-1.5">Instructions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enc.prescriptions.map((p, pIdx) => (
                              <tr key={pIdx} className="border-t border-slate-100">
                                <td className="px-3 py-1 font-semibold text-slate-800">{p.medicineName}</td>
                                <td className="px-2 py-1">{p.dosage}</td>
                                <td className="px-2 py-1 font-mono">{p.frequency}</td>
                                <td className="px-2 py-1">{p.durationDays}</td>
                                <td className="px-3 py-1 text-slate-500 italic">{p.instructions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Lab Reports */}
                  {enc.labReports && enc.labReports.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <TestTube className="w-3.5 h-3.5 text-purple-600" />
                        <span>{language === 'mr' ? 'प्रयोगशाळा तपासण्या (Lab Tests):' : 'Laboratory Reports:'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {enc.labReports.map((lab) => (
                          <div
                            key={lab.id}
                            className={`p-2 rounded border ${
                              lab.isAbnormal
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex justify-between font-semibold">
                              <span>{lab.testName}</span>
                              <span className={lab.isAbnormal ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                                {lab.result}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Normal: {lab.normalRange} • {lab.labFacility}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {enc.notes && (
                    <div className="text-xs bg-amber-50/60 border-l-2 border-amber-500 p-2 text-amber-900">
                      <strong>Note:</strong> {enc.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{language === 'mr' ? 'आयुष्मान भारत डिजिटल मिशन (ABDM) द्वारे प्रमाणीकृत' : 'Verified via ABDM Health Information Exchange (HIE)'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            {language === 'mr' ? 'बंद करा' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
