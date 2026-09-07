'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { SpecialistTreatmentModal } from './SpecialistTreatmentModal';
import { Referral, Patient } from '@/lib/types';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Bed,
  QrCode,
  Search,
  Ambulance,
  Calendar,
  UserCheck,
  Stethoscope,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface SpecialistDashboardProps {
  onOpenReferralToken: (referral: Referral) => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenBedMatrix: () => void;
}

export function SpecialistDashboard({
  onOpenReferralToken,
  onOpenPatientTimeline,
  onOpenBedMatrix,
}: SpecialistDashboardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { referrals, patients, facilities, updateReferralStatus, addClinicalEncounter } = useSync();

  const [triageFilter, setTriageFilter] = useState<'ALL' | 'RED' | 'YELLOW' | 'GREEN'>('ALL');
  const [tokenLookup, setTokenLookup] = useState('');
  const [assignBedInput, setAssignBedInput] = useState<{ [refId: string]: string }>({});
  const [treatmentModalRef, setTreatmentModalRef] = useState<Referral | null>(null);

  const matchingTreatmentPatient = treatmentModalRef 
    ? patients.find(p => p.id === treatmentModalRef.patientId) 
    : null;

  // District Hospital Aundh data
  const hospital = facilities.find((f) => f.id === 'fac-dh-pune') || facilities[0];

  // Sort referrals: RED first, then YELLOW, then GREEN, newest first
  const sortedReferrals = [...referrals].sort((a, b) => {
    const priorityWeight = { red: 3, yellow: 2, green: 1 };
    const diff = priorityWeight[b.triagePriority] - priorityWeight[a.triagePriority];
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredReferrals = sortedReferrals.filter((r) => {
    if (triageFilter !== 'ALL' && r.triagePriority.toUpperCase() !== triageFilter) {
      return false;
    }
    if (tokenLookup.trim()) {
      const q = tokenLookup.toLowerCase();
      return (
        r.tokenCode.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.patientAbha.includes(q)
      );
    }
    return true;
  });

  const handleAcceptAndReserve = (ref: Referral) => {
    const bedName = assignBedInput[ref.id] || (ref.triagePriority === 'red' ? 'ICU-Emergency Bed #02' : 'General Ward Bed #14');
    updateReferralStatus(ref.id, 'ACCEPTED', bedName);
  };

  const handleMarkAdmitted = (ref: Referral) => {
    updateReferralStatus(ref.id, 'ADMITTED');
  };

  const handleEscalateToState = (ref: Referral, notes: string, diagnosis: string, targetFacility: string) => {
    updateReferralStatus(ref.id, 'ESCALATED');
    
    const encounter = {
      id: 'enc-escalate-' + Date.now(),
      patientId: ref.patientId,
      date: new Date().toISOString().split('T')[0],
      facilityName: 'District Hospital Pune',
      facilityType: 'District Hospital',
      providerName: user.name,
      providerRole: 'District Specialist',
      chiefComplaints: ['Condition required advanced care beyond district capabilities'],
      diagnosis: diagnosis,
      vitals: ref.vitalsAtReferral,
      notes: `Specialist Treatment Notes: ${notes} | Escalated to: ${targetFacility}`,
    };
    addClinicalEncounter(ref.patientId, encounter);
  };

  // Specialist on-call rota for District Hospital
  const specialistRota = [
    { name: 'Dr. Ananya Kulkarni', specialty: 'Chief Triage & Cardiology', status: 'ON-DUTY', room: 'Emergency Trauma Room 1' },
    { name: 'Dr. Vivek Sawant', specialty: 'Obstetrics & Gynaecology', status: 'ON-CALL (10 min)', room: 'Maternity OT 2' },
    { name: 'Dr. Neha Bapat', specialty: 'Pediatrics & Neonatology', status: 'ON-DUTY', room: 'NICU Block B' },
    { name: 'Dr. Rohan Joshi', specialty: 'Orthopedics & Trauma', status: 'IN-SURGERY', room: 'Main OT 1' },
    { name: 'Dr. Sanjay Thorat', specialty: 'Anesthesiology & Critical Care', status: 'ON-DUTY', room: 'ICU Unit A' },
  ];

  return (
    <div className="space-y-6">
      {/* Specialist Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>{language === 'mr' ? 'जिल्हा सामान्य रुग्णालय • आपत्कालीन ट्रायज डेस्क' : 'District General Hospital • Emergency Triage & Casualty Intake'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{user.name}</h2>
          <p className="text-xs sm:text-sm text-purple-200 mt-1">
            {user.facilityName} • {user.roleTitleEn} • Reg: {user.registrationNumber}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBedMatrix}
            className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5"
          >
            <Bed className="w-4 h-4" />
            <span>{language === 'mr' ? 'खाटा उपलब्धता मॅट्रिक्स' : 'Live Bed Matrix'}</span>
          </button>
        </div>
      </div>

      {/* Hospital Capacity Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 block font-medium">Total Beds</span>
          <div className="text-2xl font-bold text-slate-900">
            {hospital.totalBeds - hospital.occupiedBeds}
            <span className="text-xs text-slate-500 font-normal"> / {hospital.totalBeds} Available</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            {Math.round(((hospital.totalBeds - hospital.occupiedBeds) / hospital.totalBeds) * 100)}% Available
          </span>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 shadow-sm">
          <span className="text-[11px] text-blue-800 block font-semibold">ICU Beds Vacant</span>
          <div className="text-2xl font-bold text-blue-950">
            {hospital.icuBedsTotal - hospital.icuBedsOccupied}
            <span className="text-xs text-blue-700 font-normal"> / {hospital.icuBedsTotal}</span>
          </div>
          <span className="text-[10px] text-blue-700 block mt-0.5 font-bold">
            {hospital.icuBedsTotal - hospital.icuBedsOccupied <= 2 ? '⚠️ High ICU Pressure' : 'Normal Capacity'}
          </span>
        </div>

        <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200 shadow-sm">
          <span className="text-[11px] text-purple-800 block font-semibold">Ventilators Open</span>
          <div className="text-2xl font-bold text-purple-950">
            {hospital.ventilatorsTotal - hospital.ventilatorsOccupied}
            <span className="text-xs text-purple-700 font-normal"> / {hospital.ventilatorsTotal}</span>
          </div>
          <span className="text-[10px] text-purple-700 block mt-0.5">Critical Care Unit</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[11px] text-rose-800 block font-semibold">Critical Red Inbound</span>
          <div className="text-2xl font-bold text-rose-900">
            {referrals.filter((r) => r.triagePriority === 'red' && r.status !== 'ADMITTED').length}
          </div>
          <span className="text-[10px] text-rose-700 block mt-0.5 font-bold">108 ALS En Route</span>
        </div>
      </div>

      {/* Main Triage Queue Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Incoming Smart Referral Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-rose-600" />
                  <span>
                    {language === 'mr' ? 'थेट ट्रायज रेफरल रांग (Incoming Triage Queue)' : 'Live Incoming Smart Referral Queue'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Priority-ranked: Critical RED referrals trigger immediate casualty bed reserve
                </p>
              </div>

              {/* Triage Band Filter Pills */}
              <div className="flex items-center gap-1.5 text-xs">
                {(['ALL', 'RED', 'YELLOW', 'GREEN'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTriageFilter(filter)}
                    className={`px-3 py-1 rounded-full font-bold transition-all ${
                      triageFilter === filter
                        ? filter === 'RED'
                          ? 'bg-rose-600 text-white'
                          : filter === 'YELLOW'
                          ? 'bg-amber-500 text-slate-950'
                          : filter === 'GREEN'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Token Lookup Bar */}
            <div className="relative">
              <QrCode className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'रेफरल टोकन स्कॅन करा किंवा टाका (उदा. MH-REF-2026-9842)...' : 'Scan or Enter Referral Token ID (e.g. MH-REF-2026-9842)...'}
                value={tokenLookup}
                onChange={(e) => setTokenLookup(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
              />
            </div>

            {/* Referral Cards */}
            <div className="space-y-3">
              {filteredReferrals.map((ref) => {
                const isRed = ref.triagePriority === 'red';
                const isYellow = ref.triagePriority === 'yellow';
                const matchingPatient = patients.find((p) => p.id === ref.patientId);

                return (
                  <div
                    key={ref.id}
                    onClick={() => matchingPatient && onOpenPatientTimeline(matchingPatient)}
                    className={`rounded-xl border-2 p-4 space-y-3 cursor-pointer hover:shadow-md transition-all ${
                      isRed
                        ? 'bg-rose-50/40 border-rose-400 shadow-sm hover:border-rose-500'
                        : isYellow
                        ? 'bg-amber-50/30 border-amber-300 hover:border-amber-400'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white ${
                              isRed ? 'bg-rose-600 animate-pulse' : isYellow ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          >
                            {isRed ? t('triageRed') : isYellow ? t('triageYellow') : t('triageGreen')}
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {ref.tokenCode}
                          </span>
                          <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.2 rounded">
                            {ref.specialtyRequired}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm mt-1">
                          {ref.patientName} ({ref.patientGender}, {ref.patientAge} Yrs)
                        </h4>
                        <div className="text-xs text-slate-600">
                          From: <strong>{ref.referringFacility}</strong> → To: <strong>{ref.targetFacility}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ref.status === 'ESCALATED'
                              ? 'bg-purple-100 text-purple-800'
                              : ref.status === 'ADMITTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ref.status === 'ACCEPTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ref.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Vitals & Triage Rationale Ribbon */}
                    <div className="bg-white/80 rounded-lg p-2.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                        <span className="font-mono font-bold text-slate-900">
                          {ref.vitalsAtReferral.systolicBp}/{ref.vitalsAtReferral.diastolicBp} mmHg
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">SpO2</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {ref.vitalsAtReferral.spO2}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                        <span className="font-mono font-bold text-slate-900">
                          {ref.vitalsAtReferral.heartRate} bpm
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Ambulance</span>
                        <span className="font-bold text-blue-700 flex items-center gap-1">
                          <Ambulance className="w-3.5 h-3.5" />
                          <span>108 ALS Dispatched</span>
                        </span>
                      </div>
                    </div>

                    {/* Clinical Reasons */}
                    <div className="text-xs text-slate-700">
                      <strong>Clinical Assessment:</strong> {ref.referralReason}
                    </div>

                    {ref.assignedBed && (
                      <div className="text-xs bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Reserved Bed: {ref.assignedBed}</span>
                      </div>
                    )}

                    {/* Action Bar for Specialist */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onOpenReferralToken(ref); }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 flex items-center gap-1"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR Slip</span>
                        </button>

                        {matchingPatient && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onOpenPatientTimeline(matchingPatient); }}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-md border border-blue-200"
                          >
                            Longitudinal EHR
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ref.status !== 'ADMITTED' && ref.status !== 'ESCALATED' && (
                          <>
                            <input
                              type="text"
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Assign Bed #"
                              value={assignBedInput[ref.id] || ''}
                              onChange={(e) =>
                                setAssignBedInput({ ...assignBedInput, [ref.id]: e.target.value })
                              }
                              className="w-32 px-2 py-1 text-xs border border-slate-300 rounded-md"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAcceptAndReserve(ref); }}
                              className="px-3 py-1 text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white rounded-md shadow-xs"
                            >
                              Accept & Reserve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAdmitted(ref); }}
                              className="px-3 py-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md shadow-xs"
                            >
                              Mark Admitted
                            </button>
                          </>
                        )}
                        {ref.status === 'ADMITTED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setTreatmentModalRef(ref); }}
                            className="px-3 py-1 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-md shadow-xs flex items-center gap-1"
                          >
                            <Stethoscope className="w-3.5 h-3.5" />
                            Examine & Escalate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Specialist On-Duty Rota & Facility Matrix */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-700" />
              <span>{language === 'mr' ? 'तज्ज्ञ वैद्यकीय अधिकारी उपस्थिती (On-Call Rota)' : 'District Specialist On-Call Rota'}</span>
            </h3>

            <div className="space-y-2.5">
              {specialistRota.map((spec, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900">{spec.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        spec.status.includes('ON-DUTY')
                          ? 'bg-emerald-100 text-emerald-800'
                          : spec.status.includes('IN-SURGERY')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {spec.status}
                    </span>
                  </div>
                  <div className="text-teal-800 font-medium text-[11px] mt-0.5">{spec.specialty}</div>
                  <div className="text-slate-500 text-[10px]">{spec.room}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Helpline Memo */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-teal-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              <span>108 Casualty Control Room Link</span>
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Casualty desk is synchronized with MEMS 108 GPS telemetry. Ambulance ETAs are recalculated automatically based on Western Ghats road transit conditions.
            </p>
          </div>
        </div>
      </div>

      {treatmentModalRef && matchingTreatmentPatient && (
        <SpecialistTreatmentModal
          referral={treatmentModalRef}
          patient={matchingTreatmentPatient}
          onClose={() => setTreatmentModalRef(null)}
          onEscalateToState={(notes: string, diagnosis: string, targetFacility: string) => {
            handleEscalateToState(treatmentModalRef, notes, diagnosis, targetFacility);
            setTreatmentModalRef(null);
          }}
        />
      )}
    </div>
  );
}
