'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Referral, Patient, Facility } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import { getAvailableResource, getFacilityStatus } from '@/lib/resourceManagement';
import {
  X,
  Building2,
  Users,
  HeartPulse,
  Bed,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Check,
  RotateCcw,
} from 'lucide-react';

interface DistrictReferralReviewModalProps {
  referral: Referral;
  patient?: Patient | null;
  onClose: () => void;
  updateReferralStatus: (id: string, status: Referral['status'], updates?: Partial<Referral>) => void;
}

export function DistrictReferralReviewModal({
  referral,
  patient,
  onClose,
  updateReferralStatus,
}: DistrictReferralReviewModalProps) {
  const { user } = useAuth();
  const { facilities } = useSync();

  // Selected or current target facility
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(() => {
    if (referral.targetFacilityId) return referral.targetFacilityId;
    const match = facilities.find(f => f.name.toLowerCase() === (referral.targetFacility || '').toLowerCase());
    return match ? match.id : facilities[0]?.id || '';
  });

  const targetFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId) || facilities[0];
  }, [facilities, selectedFacilityId]);

  // Log coordination review access
  useEffect(() => {
    if (user && referral) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName || 'District Health Authority',
        administrativeLevel: user.administrativeLevel || 'district',
        patientId: referral.patientId,
        patientName: referral.patientName,
        patientAbha: referral.patientAbha,
        action: 'DISTRICT_REFERRAL_COORDINATION',
        resource: `Referral ${referral.tokenCode || referral.id}`,
        reason: 'District Officer referral review and capacity verification',
        accessGranted: true,
      });
    }
  }, [user?.id, referral.id]);

  // Lifecycle stage mapping
  const currentStep = useMemo(() => {
    if (referral.status === 'COMPLETED') return 4;
    if (referral.status === 'ADMITTED') return 3;
    if (referral.status === 'ACCEPTED') return 2;
    return 1; // PENDING / REQUESTED
  }, [referral.status]);

  const handleAcceptReferral = () => {
    updateReferralStatus(referral.id, 'ACCEPTED', {
      targetFacility: targetFacility?.name || referral.targetFacility,
      targetFacilityId: targetFacility?.id || referral.targetFacilityId,
    });
    onClose();
  };

  const handleCoordinateDestination = (newFacId: string) => {
    setSelectedFacilityId(newFacId);
    const newFac = facilities.find(f => f.id === newFacId);
    if (newFac) {
      updateReferralStatus(referral.id, referral.status === 'PENDING' ? 'ACCEPTED' : referral.status, {
        targetFacility: newFac.name,
        targetFacilityId: newFac.id,
      });
    }
  };

  const isCritical = referral.triagePriority === 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <header className="flex items-start justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                DISTRICT REFERRAL REVIEW
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {referral.tokenCode || referral.id}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white mt-1">
              {referral.patientName || 'Emergency Patient'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span>ABHA: {referral.patientAbha || '91-XXXX-XXXX'}</span>
              <span>&bull;</span>
              <span>{referral.patientAge || 35} yrs, {referral.patientGender || 'Female'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* 4-Step Lifecycle Progress Stepper */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between max-w-lg mx-auto text-xs">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Requested</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Approved</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Admitted</span>
            </div>

            <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 4 ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-700'}`} />

            {/* Step 4 */}
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                currentStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                {currentStep >= 4 ? <Check className="w-3.5 h-3.5" /> : '4'}
              </div>
              <span className="text-[10px] font-bold mt-1 text-slate-600 dark:text-slate-300">Completed</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* 1. Origin & Clinical Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box A: Origin */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                <span>Origin Facility</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono">PHC LEVEL</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {referral.referringFacility}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Referring Doctor: <strong>{referral.referringDoctorName || 'Medical Officer'}</strong>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Initiated: {new Date(referral.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>

            {/* Box B: Triage & Urgency */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px]">
                <span>Clinical Triage</span>
                <span className={`px-2 py-0.5 rounded-full font-black ${
                  isCritical ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'
                }`}>
                  {referral.triagePriority?.toUpperCase() || 'ROUTINE'}
                </span>
              </div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {referral.specialtyRequired || 'General Emergency Care'}
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Reason: <em>"{referral.referralReason}"</em>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Status: <strong className="text-blue-600 dark:text-blue-400">{referral.status}</strong>
              </div>
            </div>
          </div>

          {/* 2. Destination Hospital & Real-time Capacity Check */}
          <div className="p-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Target Facility Capacity Check
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live resource availability at <strong>{targetFacility?.name}</strong>
                </p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {getFacilityStatus(targetFacility)} CAPACITY
              </span>
            </div>

            {/* Resource grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">General Beds</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                  {getAvailableResource(targetFacility, 'GENERAL')} / {targetFacility.totalBeds} free
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">ICU Beds</span>
                <span className="font-black text-sm text-purple-600 dark:text-purple-400">
                  {targetFacility.icuBedsTotal - targetFacility.icuBedsOccupied} / {targetFacility.icuBedsTotal} free
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Ventilators</span>
                <span className="font-black text-sm text-slate-800 dark:text-slate-200">
                  {targetFacility.ventilatorsTotal - targetFacility.ventilatorsOccupied} free
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Oxygen Beds</span>
                <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                  {targetFacility.oxygenBedsTotal - targetFacility.oxygenBedsOccupied} free
                </span>
              </div>
            </div>

            {/* Alternative Facility Selector if re-routing is required */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-indigo-100 dark:border-indigo-900/40">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Coordinate / Change Destination:
              </label>
              <select
                value={selectedFacilityId}
                onChange={(e) => handleCoordinateDestination(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({getAvailableResource(fac, 'GENERAL')} beds free)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {referral.status === 'PENDING' && (
              <button
                onClick={handleAcceptReferral}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Accept Referral</span>
              </button>
            )}
            {referral.status === 'ACCEPTED' && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Referral Accepted & Coordinated</span>
              </span>
            )}
            {referral.status === 'ADMITTED' && (
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>Patient In Inpatient Care</span>
              </span>
            )}
            {referral.status === 'COMPLETED' && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Care Episode Completed</span>
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
