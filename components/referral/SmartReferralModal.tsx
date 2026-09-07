'use client';

import React, { useState, useMemo } from 'react';
import { Patient, Referral, Vitals } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { calculateTriageScore } from '@/lib/triageEngine';
import { generateReferralToken } from '@/lib/idbStorage';
import {
  X,
  Send,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Stethoscope,
  Ambulance,
  HeartPulse,
} from 'lucide-react';

interface SmartReferralModalProps {
  patient: Patient | null;
  onClose: () => void;
  onReferralCreated: (referral: Referral) => void;
}

export function SmartReferralModal({
  patient,
  onClose,
  onReferralCreated,
}: SmartReferralModalProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { facilities, createReferral } = useSync();

  // Initialize with latest vitals from patient encounter if available
  const latestEncounter = patient?.encounters[0];
  const initialVitals: Vitals = latestEncounter?.vitals || {
    systolicBp: 120,
    diastolicBp: 80,
    heartRate: 76,
    spO2: 98,
    respiratoryRate: 16,
    temperature: 37.0,
    consciousLevel: 'alert',
    recordedAt: new Date().toISOString(),
  };

  const [vitals, setVitals] = useState<Vitals>(initialVitals);
  const [specialty, setSpecialty] = useState<string>('Obstetrics & Gynaecology');
  const [targetFacility, setTargetFacility] = useState<string>('District Hospital Aundh, Pune');
  const [referralReason, setReferralReason] = useState<string>(
    patient?.isHighRiskPregnancy
      ? 'Severe Pre-eclampsia, persistent headache, elevated SBP, proteinuria. Emergency specialist OB-GYN review needed.'
      : 'Specialist clinical evaluation and diagnostic workup.'
  );
  const [dispatchAmbulance, setDispatchAmbulance] = useState<boolean>(true);

  // Real-time calculation of algorithmic triage score
  const triageResult = useMemo(() => {
    return calculateTriageScore(vitals);
  }, [vitals]);

  // Filter facilities that match specialty or have high capacity
  const recommendedFacilities = useMemo(() => {
    return facilities.map((f) => {
      const hasSpecialty = f.availableSpecialists.some((s) =>
        s.toLowerCase().includes(specialty.toLowerCase())
      );
      const vacantIcu = f.icuBedsTotal - f.icuBedsOccupied;
      return {
        ...f,
        hasSpecialty,
        vacantIcu,
      };
    });
  }, [facilities, specialty]);

  if (!patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenCode = generateReferralToken();

    const qrPayload = JSON.stringify({
      token: tokenCode,
      abha: patient.abhaId,
      patientName: patient.fullName,
      triage: triageResult.priority.toUpperCase(),
      triageScore: triageResult.score,
      targetFacility,
      specialty,
      vitals: `${vitals.systolicBp}/${vitals.diastolicBp} mmHg, SpO2 ${vitals.spO2}%, HR ${vitals.heartRate}`,
      referringDoctor: user.name,
      referringFacility: user.facilityName,
      ambulance: dispatchAmbulance ? '108 ALS Ambulance' : 'Private / Public Transit',
    });

    const newRef: Referral = {
      id: 'ref-' + Date.now(),
      tokenCode,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      patientAge: patient.age,
      patientGender: patient.gender,
      referringFacility: user.facilityName,
      targetFacility,
      specialtyRequired: specialty,
      referralReason,
      triagePriority: triageResult.priority,
      triageScore: triageResult.score,
      triageReasons: triageResult.reasons,
      vitalsAtReferral: vitals,
      referringDoctorName: `${user.name} (${user.roleTitleEn})`,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      ambulanceDispatched: dispatchAmbulance,
      qrPayload,
    };

    createReferral(newRef);
    onReferralCreated(newRef);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-base">
                {language === 'mr' ? 'स्मार्ट ट्रायज व डिजिटल संदर्भ (Referral)' : 'Smart Triage & Digital Referral'}
              </h3>
              <p className="text-xs text-slate-400">
                {patient.fullName} (ABHA: {patient.abhaId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Dynamic Live Triage Indicator Banner */}
          <div
            className={`p-4 rounded-xl border-2 transition-all shadow-sm ${
              triageResult.priority === 'red'
                ? 'bg-rose-50 border-rose-500 text-rose-950'
                : triageResult.priority === 'yellow'
                ? 'bg-amber-50 border-amber-500 text-amber-950'
                : 'bg-emerald-50 border-emerald-500 text-emerald-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {triageResult.priority === 'red' ? (
                  <AlertOctagon className="w-7 h-7 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                ) : triageResult.priority === 'yellow' ? (
                  <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full text-white ${
                        triageResult.priority === 'red'
                          ? 'bg-rose-600'
                          : triageResult.priority === 'yellow'
                          ? 'bg-amber-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {triageResult.priority === 'red'
                        ? t('triageRed')
                        : triageResult.priority === 'yellow'
                        ? t('triageYellow')
                        : t('triageGreen')}
                    </span>
                    <span className="font-mono font-bold text-xs">
                      NEWS2 Score: {triageResult.score} / 20
                    </span>
                  </div>
                  <div className="font-semibold text-xs mt-1.5">{triageResult.recommendedAction}</div>
                  <div className="text-[11px] text-slate-700 mt-1">
                    <strong>{language === 'mr' ? 'ट्रायज कारणे:' : 'Identified Risk Factors:'}</strong>{' '}
                    {triageResult.reasons.join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Vitals Input Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center justify-between">
              <span>{language === 'mr' ? 'थेट शारीरिक निर्देशक (Live Vitals for Algorithmic Scoring)' : 'Live Vitals for Algorithmic Triage'}</span>
              <span className="text-[10px] text-slate-500 font-normal">
                Score updates dynamically with changes
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('systolicBp')} (mmHg)</label>
                <input
                  type="number"
                  required
                  value={vitals.systolicBp}
                  onChange={(e) => setVitals({ ...vitals, systolicBp: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('diastolicBp')} (mmHg)</label>
                <input
                  type="number"
                  required
                  value={vitals.diastolicBp}
                  onChange={(e) => setVitals({ ...vitals, diastolicBp: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('spO2')} (%) *</label>
                <input
                  type="number"
                  required
                  value={vitals.spO2}
                  onChange={(e) => setVitals({ ...vitals, spO2: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('heartRate')} (bpm)</label>
                <input
                  type="number"
                  required
                  value={vitals.heartRate}
                  onChange={(e) => setVitals({ ...vitals, heartRate: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('respiratoryRate')} (/min)</label>
                <input
                  type="number"
                  required
                  value={vitals.respiratoryRate}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t('temperature')} (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: parseFloat(e.target.value) || 37.0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">{t('consciousLevel')}</label>
                <select
                  value={vitals.consciousLevel}
                  onChange={(e) => setVitals({ ...vitals, consciousLevel: e.target.value as any })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="alert">Alert (A) - Fully conscious & responsive</option>
                  <option value="voice">Voice (V) - Responds only to vocal stimuli</option>
                  <option value="pain">Pain (P) - Responds only to pain stimulus</option>
                  <option value="unresponsive">Unresponsive (U) - Comatose / GCS low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Specialty & Destination Facility Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('specialtyRequired')} *</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology / NICU</option>
                <option value="Cardiology">Cardiology (Cath Lab / CCU)</option>
                <option value="Pediatrics">Pediatrics & Neonatology</option>
                <option value="Orthopedics">Orthopedics & Trauma</option>
                <option value="General Surgery">General & Laparoscopic Surgery</option>
                <option value="Pulmonology">Pulmonology & Critical Care</option>
                <option value="General Medicine">General Medicine</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t('targetFacility')} *</label>
              <select
                value={targetFacility}
                onChange={(e) => setTargetFacility(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              >
                {recommendedFacilities.map((fac) => (
                  <option key={fac.id} value={fac.name}>
                    {fac.name} ({fac.type}) {fac.hasSpecialty ? '★ Has Specialty' : ''} — {fac.vacantIcu} ICU beds open
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clinical Reason for Referral */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t('reasonForReferral')} *</label>
            <textarea
              required
              rows={2}
              value={referralReason}
              onChange={(e) => setReferralReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Ambulance Dispatch Toggle */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ambulance className="w-5 h-5 text-blue-700" />
              <div>
                <div className="font-bold text-slate-900 text-xs">
                  {language === 'mr' ? '१०८ आपत्कालीन रुग्णवाहिका (MEMS) समन्वय' : '108 Emergency ALS Ambulance Dispatch'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {language === 'mr' ? 'ऑक्सिजन व जीवरक्षक उपकरणांसह १०८ रुग्णवाहिका तत्काळ पाठवा' : 'Automatically notify nearest 108 ALS Ambulance dispatch unit with patient vitals'}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dispatchAmbulance}
              onChange={(e) => setDispatchAmbulance(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              {language === 'mr' ? 'रद्द करा' : 'Cancel'}
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 ${
                triageResult.priority === 'red'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{t('generateQrToken')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
