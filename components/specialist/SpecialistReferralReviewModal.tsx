'use client';

import React, { useState } from 'react';
import { Referral, Patient, SpecialistOnDuty, HospitalBloodStock } from '@/lib/types';
import { calculateReferralRiskScore } from '@/lib/dhoIntelligenceEngine';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Stethoscope,
  Building2,
  Users,
  Bed,
  HeartPulse,
  Flame,
  FileText,
  AlertOctagon,
  Droplet,
} from 'lucide-react';

interface SpecialistReferralReviewModalProps {
  referral: Referral;
  patient?: Patient | null;
  specialistsOnDuty: SpecialistOnDuty[];
  bloodStock?: HospitalBloodStock[];
  onClose: () => void;
  onAccept: (referral: Referral, overrideReason?: string) => void;
  onReject: (referral: Referral, reason: string) => void;
}

export function SpecialistReferralReviewModal({
  referral,
  patient,
  specialistsOnDuty,
  bloodStock = [],
  onClose,
  onAccept,
  onReject,
}: SpecialistReferralReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState('');

  // Calculate composite risk score
  const risk = calculateReferralRiskScore(referral, patient || null);

  // Check if required specialist is on duty
  const requiredSpecialty = referral.specialtyRequired || 'General Medicine';
  const matchingSpecialist = specialistsOnDuty.find(
    (s) =>
      s.specialty.toLowerCase().includes(requiredSpecialty.toLowerCase()) ||
      requiredSpecialty.toLowerCase().includes(s.specialty.toLowerCase())
  );

  const isSpecialistAvailable = matchingSpecialist && matchingSpecialist.status !== 'OFF_DUTY';

  // Check blood group availability if known
  const patientBloodGroup = patient?.bloodGroup || 'O+';
  const matchingBlood = bloodStock.find((b) => b.bloodGroup === patientBloodGroup);
  const isBloodLow = matchingBlood && (matchingBlood.status === 'LOW' || matchingBlood.status === 'CRITICAL_OUT');

  const handleAcceptClick = () => {
    if (!isSpecialistAvailable && !overrideReason.trim()) {
      setError('Clinical override justification is mandatory when accepting a case without the required specialist on duty.');
      return;
    }
    setError('');
    onAccept(referral, overrideReason.trim() || undefined);
  };

  const handleRejectClick = () => {
    if (!rejectReason.trim()) {
      setError('Mandatory clinical justification is required to reject an incoming emergency referral.');
      return;
    }
    setError('');
    onReject(referral, rejectReason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                INCOMING REFERRAL REVIEW
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Token: #{referral.tokenCode || referral.id}
              </span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-white mt-1">
              {referral.patientName} ({referral.patientAge}y &bull; {referral.patientGender})
            </h3>
            <p className="text-xs text-slate-300">
              Origin: {referral.referringFacility} &rarr; Target: {referral.targetFacility}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Risk Score Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                COMPOSITE CLINICAL RISK SCORE
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                  {risk.compositeScore} <span className="text-xs text-slate-400">/ 100</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30">
                  {risk.riskLevel} PRIORITY
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-rose-600">{risk.clinicalSeverityScore}/50</div>
                <span className="text-slate-400">Clinical</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-blue-600">{risk.transportRiskScore}/30</div>
                <span className="text-slate-400">Transit</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-purple-600">{risk.destinationCapacityScore}/20</div>
                <span className="text-slate-400">Capacity</span>
              </div>
            </div>
          </div>

          {/* Clinical Reason & Vitals */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
              <span>Clinical Referral Reason &amp; Findings</span>
            </h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {referral.referralReason}
            </p>

            {referral.vitalsAtReferral && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                <div>BP: <strong className="text-slate-900 dark:text-slate-100">{referral.vitalsAtReferral.systolicBp}/{referral.vitalsAtReferral.diastolicBp}</strong></div>
                <div>Pulse: <strong className="text-slate-900 dark:text-slate-100">{referral.vitalsAtReferral.heartRate} bpm</strong></div>
                <div>SpO2: <strong className="text-slate-900 dark:text-slate-100">{referral.vitalsAtReferral.spO2}%</strong></div>
                <div>Temp: <strong className="text-slate-900 dark:text-slate-100">{referral.vitalsAtReferral.temperature}&deg;C</strong></div>
              </div>
            )}
          </div>

          {/* FEATURE 4: SPECIALIST ON-CALL ROSTER CROSS-CHECK */}
          <div className="p-4 rounded-2xl border transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                SPECIALIST ON-CALL ROSTER CROSS-CHECK
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Required: {requiredSpecialty}
              </span>
            </div>

            {isSpecialistAvailable ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    {matchingSpecialist.name} ({matchingSpecialist.qualification}) is on duty today
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Status: <strong className="uppercase">{matchingSpecialist.status.replace('_', ' ')}</strong> &bull; Shift: {matchingSpecialist.shift} &bull; Contact: {matchingSpecialist.phone}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-rose-800 dark:text-rose-300">
                      WARNING: No {requiredSpecialty} Specialist currently on active duty at this hospital!
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400">
                      The primary specialist for this discipline is currently off-duty or in another emergency procedure. You may still accept under Casualty CMO protocol with mandatory override reasoning.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-rose-700 dark:text-rose-300 mb-1">
                    Specialist Override Rationale (Mandatory to Accept):
                  </label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Casualty Medical Officer initiating emergency resuscitation; On-call specialist alerted via phone"
                    className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FEATURE 8: BLOOD BANK STOCK WARNING (IF CRITICAL) */}
          {isBloodLow && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-800 dark:text-amber-300">
              <Droplet className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Blood Bank Notice:</strong> Hospital inventory for group <strong>{patientBloodGroup}</strong> is currently at <strong>{matchingBlood?.unitsAvailable || 0} units</strong> (Buffer: {matchingBlood?.bufferThreshold || 4}). Verify cross-match availability immediately.
              </div>
            </div>
          )}

          {/* Rejection Justification Field */}
          {isRejecting && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold">
                <AlertOctagon className="w-4 h-4" />
                <span>Mandatory Clinical Rejection Justification</span>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="State clinical rationale for turning away or diverting this referral (e.g. Incompatible tertiary care requirement, full ICU capacity, patient diverted to Medical College)..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {!isRejecting ? (
              <>
                <button
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-800 hover:bg-rose-200 transition-colors cursor-pointer"
                >
                  Reject Referral
                </button>
                <button
                  onClick={handleAcceptClick}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept &amp; Assign Bed</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Back to Accept
                </button>
                <button
                  onClick={handleRejectClick}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Clinical Rejection</span>
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
