'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { StockTransfer } from '@/lib/types';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import { X, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DispatchModalProps {
  transfer: StockTransfer;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatchModal({ transfer, onClose, onSuccess }: DispatchModalProps) {
  const { user } = useAuth();
  const { processStockTransfer } = useSync();

  const [transportMode, setTransportMode] = useState<
    '108_AMBULANCE' | 'STATE_MEDICAL_COURIER' | 'POLICE_GREEN_CORRIDOR' | 'FACILITY_TRANSPORT'
  >('108_AMBULANCE');

  const consignmentCode = transfer.consignmentCode || `CON-MH-2026-${transfer.id.slice(-4)}`;

  const handleConfirmDispatch = () => {
    const success = processStockTransfer(transfer.id, 'DISPATCH', undefined, {
      consignmentCode,
      transportMode,
      dispatchedByUserName: user?.name || 'Logistics Officer',
      dispatchOtpVerified: true,
    });

    if (success) {
      recordAuditLog({
        userId: user?.id || 'anonymous',
        userName: user?.name || 'Logistics Officer',
        userRole: user?.role || 'pharmacist',
        userFacility: user?.facilityName || transfer.sourceFacilityName,
        administrativeLevel: user?.administrativeLevel || 'facility',
        patientId: 'MED-CONSIGNMENT-DISPATCH',
        patientName: 'Consignment Dispatch',
        patientAbha: 'N/A',
        action: 'EMERGENCY_DRUG_DISPATCHED',
        resource: `${transfer.medicineName} (${transfer.requestedQuantity} units via ${transportMode.replace('_', ' ')})`,
        reason: `Dispatched to ${transfer.destinationFacilityName} under consignment ${consignmentCode}`,
        accessGranted: true,
      });

      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>Authorize & Dispatch Emergency Consignment</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white">
              {transfer.medicineName} &bull; {transfer.requestedQuantity} Units
            </div>
            <div className="text-slate-500">
              Destination: <strong>{transfer.destinationFacilityName}</strong>
            </div>
            <div className="text-slate-500">
              Donor Facility: <strong>{transfer.sourceFacilityName}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Transport Fleet Assignment
            </label>
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
            >
              <option value="108_AMBULANCE">108 Emergency EMS Ambulance (Priority Siren)</option>
              <option value="STATE_MEDICAL_COURIER">Maharashtra State Medical Logistics Van</option>
              <option value="POLICE_GREEN_CORRIDOR">Police Green Corridor Emergency Escort</option>
              <option value="FACILITY_TRANSPORT">Local Facility Dedicated Ambulance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Generated Consignment Tracking Code
            </label>
            <input
              type="text"
              readOnly
              value={consignmentCode}
              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Releasing this consignment will deduct <strong>{transfer.requestedQuantity} units</strong> from your facility's active stock ledger. Destination facility must confirm physical 2FA handover.
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
            onClick={handleConfirmDispatch}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Confirm Dispatch & Release Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
}
