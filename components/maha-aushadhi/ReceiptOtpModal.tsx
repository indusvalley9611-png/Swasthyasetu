'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { StockTransfer } from '@/lib/types';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import { X, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

interface ReceiptOtpModalProps {
  transfer: StockTransfer;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReceiptOtpModal({ transfer, onClose, onSuccess }: ReceiptOtpModalProps) {
  const { user } = useAuth();
  const { processStockTransfer } = useSync();

  const [otp, setOtp] = useState<string>('123456');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleConfirmReceipt = () => {
    setErrorMsg('');
    if (!otp || otp.length < 6) {
      setErrorMsg('Please enter a valid 6-digit carrier handover OTP.');
      return;
    }

    const success = processStockTransfer(transfer.id, 'RECEIVE', undefined, {
      receivedByUserName: user?.name || 'Receiving Officer',
      receiptOtpVerified: true,
    });

    if (success) {
      recordAuditLog({
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Receiving Officer',
        userRole: user?.role || 'pharmacist',
        userFacility: user?.facilityName || transfer.destinationFacilityName,
        administrativeLevel: user?.administrativeLevel || 'facility',
        patientId: 'MED-CONSIGNMENT-RECEIPT',
        patientName: 'Consignment Handover Receipt',
        patientAbha: 'N/A',
        action: 'EMERGENCY_DRUG_RECEIVED',
        resource: `${transfer.medicineName} (${transfer.requestedQuantity} units received and stocked in)`,
        reason: `Verified with Carrier Handover OTP. Local buffer replenished.`,
        accessGranted: true,
      });

      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg('Receipt validation failed. Check if transfer status is DISPATCHED.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Acknowledge Physical Delivery & Stock-In</span>
          </h3>
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

        <div className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Enter the 6-digit delivery handover OTP provided by the transport carrier to verify unbroken cold-chain physical receipt.
          </p>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white">
              {transfer.medicineName} &bull; {transfer.requestedQuantity} Units
            </div>
            <div className="text-slate-500">
              Consignment: <strong>{transfer.consignmentCode || transfer.id}</strong>
            </div>
            <div className="text-slate-500">
              Origin: <strong>{transfer.sourceFacilityName}</strong>
            </div>
            <div className="text-slate-500">
              Carrier Fleet: {transfer.transportMode?.replace('_', ' ') || '108 EMERGENCY AMBULANCE'}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                6-Digit Carrier Handover OTP
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Demo PIN: 123456</span>
            </div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-emerald-500 bg-white dark:bg-slate-800 font-mono font-bold text-center text-base tracking-widest text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              Verification will automatically credit <strong>{transfer.requestedQuantity} units</strong> to your local facility drug stock ledger and notify the Maharashtra State Command Center.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmReceipt}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verify OTP & Add to Local Pharmacy Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
}
