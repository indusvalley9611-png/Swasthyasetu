'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { findSurplusSources } from '@/lib/resourceManagement';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import { X, Send, Lock, AlertTriangle, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';

interface EmergencyRequestModalProps {
  onClose: () => void;
  onSuccess?: (transferId: string) => void;
  defaultUrgency?: 'CRITICAL' | 'URGENT' | 'ROUTINE';
}

export function EmergencyRequestModal({
  onClose,
  onSuccess,
  defaultUrgency = 'CRITICAL',
}: EmergencyRequestModalProps) {
  const { user, sendOtp } = useAuth();
  const {
    stocks,
    facilities,
    stockTransfers,
    createStockTransfer,
  } = useSync();

  const userFacilityId = user?.facilityId || 'fac-phc-velhe';
  const isAsha = user?.role === 'asha';

  // Available medicines across user facility or statewide defaults
  const userFacilityStocks = useMemo(() => {
    const direct = stocks.filter((s) => s.facilityId === userFacilityId);
    if (direct.length > 0) return direct;
    return stocks.slice(0, 10);
  }, [stocks, userFacilityId]);

  const [selectedStockId, setSelectedStockId] = useState<string>(
    userFacilityStocks[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(10);
  const [urgency, setUrgency] = useState<'CRITICAL' | 'URGENT' | 'ROUTINE'>(defaultUrgency);
  const [requiredHours, setRequiredHours] = useState<string>('2');
  const [patientContext, setPatientContext] = useState<string>('');
  const [indication, setIndication] = useState<string>(
    'Snakebite Envenomation — Neurotoxic symptoms presenting at field'
  );
  const [phone, setPhone] = useState<string>(user?.phone || '9422018374');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedStock = useMemo(() => {
    return stocks.find((s) => s.id === selectedStockId) || userFacilityStocks[0];
  }, [stocks, selectedStockId, userFacilityStocks]);

  const handleSendOtp = () => {
    setErrorMsg('');
    if (!phone || phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    const res = sendOtp(phone);
    if (res.success) {
      setOtpSent(true);
      setOtp(res.otp || '123456');
    } else {
      setErrorMsg(res.error || 'Failed to dispatch verification OTP.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedStock) {
      setErrorMsg('Please select a medicine.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }

    if (!otpVerified) {
      if (otp !== '123456') {
        setErrorMsg('Invalid verification OTP. Enter 123456 for demo authorization.');
        return;
      }
      setOtpVerified(true);
    }

    setIsSubmitting(true);

    const requiredByTime = new Date(Date.now() + parseInt(requiredHours, 10) * 3600 * 1000).toISOString();
    const finalReason = patientContext ? `[${urgency}] ${indication} (Patient: ${patientContext})` : `[${urgency}] ${indication}`;

    const newTransfer = createStockTransfer({
      medicineName: selectedStock.drugName,
      sourceStockId: '',
      destinationStockId: selectedStock.id,
      sourceFacilityId: '',
      sourceFacilityName: 'Awaiting District Allocation',
      destinationFacilityId: selectedStock.facilityId,
      destinationFacilityName: selectedStock.facilityName,
      requestedQuantity: quantity,
      urgency,
      reason: finalReason,
      isEmergency: urgency === 'CRITICAL' || urgency === 'URGENT',
      emergencyIndication: indication,
      requiredByTime,
      dispatchOtpVerified: true,
      donorAllocated: false,
    } as any);

    if (newTransfer) {
      recordAuditLog({
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Healthcare Worker',
        userRole: user?.role || 'phc_doctor',
        userFacility: user?.facilityName || selectedStock.facilityName,
        administrativeLevel: user?.administrativeLevel || 'facility',
        patientId: 'MED-SOS-REQUISITION',
        patientName: patientContext || 'Emergency Drug Requisition',
        patientAbha: 'N/A',
        action: 'EMERGENCY_DRUG_SOS_RAISED',
        resource: `${selectedStock.drugName} (${quantity} ${selectedStock.unit})`,
        reason: finalReason,
        accessGranted: true,
      });

      setIsSubmitting(false);
      if (onSuccess) onSuccess(newTransfer.id);
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMsg('Failed to queue transfer request. Please retry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {isAsha ? 'Emergency Medicine Support Request' : 'Raise Emergency Drug Requisition (SOS)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {user?.facilityName} &bull; Maharashtra DHS Red Alert Grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Medicine Selection */}
          <div className="space-y-1">
            <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Critical Lifesaving Medicine Required *
            </label>
            <select
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            >
              {userFacilityStocks.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.drugName} (Current: {s.currentStock} / Buffer: {s.bufferStock} {s.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Urgency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Quantity Needed ({selectedStock?.unit || 'Units'}) *
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Urgency Level *
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                {(['CRITICAL', 'URGENT', 'ROUTINE'] as const).map((lvl) => (
                  <button
                    type="button"
                    key={lvl}
                    onClick={() => setUrgency(lvl)}
                    className={`py-2 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all text-center ${
                      urgency === lvl
                        ? lvl === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : lvl === 'URGENT'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical Indication */}
          <div className="space-y-1">
            <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Clinical Reason / Indication *
            </label>
            <select
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="Snakebite Envenomation — Neurotoxic/hemotoxic symptoms presenting">
                Snakebite Envenomation — Neurotoxic/hemotoxic symptoms (ASV)
              </option>
              <option value="Severe Postpartum Hemorrhage (PPH) — Active uterine atony emergency">
                Severe Postpartum Hemorrhage (PPH) — Active uterine atony emergency (Oxytocin)
              </option>
              <option value="Severe Preeclampsia / Eclampsia Convulsion Triage">
                Severe Preeclampsia / Eclampsia Convulsion Triage (Magnesium Sulphate)
              </option>
              <option value="Anaphylactic Shock / Cardiac Arrest Resuscitation">
                Anaphylactic Shock / Cardiac Arrest Resuscitation (Adrenaline Inj)
              </option>
              <option value="Complicated Falciparum Malaria with Cerebral Symptoms">
                Complicated Falciparum Malaria with Cerebral Symptoms (Artemether)
              </option>
              <option value="Acute Bronchospasm / Severe Asthma Crisis">
                Acute Bronchospasm / Severe Asthma Crisis (Salbutamol Neb)
              </option>
              <option value="Critical Facility Stock Depletion below Statutory Safe Buffer">
                Critical Facility Stock Depletion below Statutory Safe Buffer
              </option>
            </select>
          </div>

          {/* Required Within & Optional Patient Context */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Required Within (Timeline)
              </label>
              <select
                value={requiredHours}
                onChange={(e) => setRequiredHours(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="1">Within 1 Hour (Golden Hour Stat)</option>
                <option value="2">Within 2 Hours (Urgent Inpatient)</option>
                <option value="4">Within 4 Hours (Buffer Protection)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Patient / Care Context (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Savita Shinde (Kondhur)"
                value={patientContext}
                onChange={(e) => setPatientContext(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* OTP Verification Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <Lock className="w-3.5 h-3.5 text-teal-500" />
                <span>2-Factor Authorization (Registered Mobile)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Demo OTP: 123456</span>
            </div>

            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Registered Mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                {otpSent ? 'Resend' : 'Send OTP'}
              </button>
            </div>

            {otpSent && (
              <div className="flex gap-2 pt-1 animate-in fade-in">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-teal-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono tracking-widest font-bold text-center text-xs"
                />
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                  Verified Ready
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!otpSent && !otpVerified)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Verify & Broadcast Emergency Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
