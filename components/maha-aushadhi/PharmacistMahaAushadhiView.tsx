'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { MahaAushadhiHeader } from './MahaAushadhiHeader';
import { DispatchModal } from './DispatchModal';
import { ReceiptOtpModal } from './ReceiptOtpModal';
import { KPICard } from '@/components/ui/design-system';
import { getMedicineStatus, getSafeTransferableQuantity, isExpiringSoon } from '@/lib/resourceManagement';
import { StockTransfer, DrugStockItem } from '@/lib/types';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import {
  Pill,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Package,
  ShieldCheck,
  Send,
  X,
  FileText,
  Clock,
  Building2,
  Flame,
} from 'lucide-react';

export function PharmacistMahaAushadhiView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers, processStockTransfer } = useSync();

  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming' | 'inventory' | 'audit'>('outgoing');
  const [dispatchTarget, setDispatchTarget] = useState<StockTransfer | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<StockTransfer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StockTransfer | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const facilityId = user?.facilityId || 'fac-phc-nasrapur';
  const facilityName = user?.facilityName || 'Nasrapur Primary Health Centre (PHC)';

  // Facility stock items
  const facilityStocks = useMemo(() => {
    return stocks.filter((s) => s.facilityId === facilityId);
  }, [stocks, facilityId]);

  const bufferBreaches = useMemo(() => {
    return facilityStocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
  }, [facilityStocks]);

  const expiringBatches = useMemo(() => {
    return facilityStocks.filter((s) => isExpiringSoon(s.expiryDate));
  }, [facilityStocks]);

  // Outgoing transfers (where this facility is donor/source)
  const outgoingTransfers = useMemo(() => {
    return stockTransfers.filter(
      (t) =>
        t.donorAllocated !== false &&
        (t.sourceFacilityId === facilityId ||
          (facilityName && t.sourceFacilityName.toLowerCase().includes(facilityName.toLowerCase())) ||
          t.sourceFacilityName.toLowerCase().includes('nasrapur'))
    );
  }, [stockTransfers, facilityId, facilityName]);

  // Incoming transfers (where this facility is destination)
  const incomingTransfers = useMemo(() => {
    return stockTransfers.filter(
      (t) =>
        t.destinationFacilityId === facilityId ||
        t.destinationFacilityName.toLowerCase().includes(facilityName.toLowerCase()) ||
        t.destinationFacilityName.toLowerCase().includes('nasrapur')
    );
  }, [stockTransfers, facilityId, facilityName]);

  const pendingDispatches = useMemo(() => {
    return outgoingTransfers.filter(
      (t) => t.status === 'PENDING_SOURCE_APPROVAL' || t.status === 'APPROVED'
    );
  }, [outgoingTransfers]);

  const pendingReceipts = useMemo(() => {
    return incomingTransfers.filter((t) => t.status === 'DISPATCHED');
  }, [incomingTransfers]);

  // Relevant audit logs
  const auditLogs = useMemo(() => {
    return getAuditLogs()
      .filter(
        (l) =>
          l.action.includes('STOCK') ||
          l.action.includes('DRUG') ||
          l.action.includes('EMERGENCY') ||
          l.userFacility.toLowerCase().includes('nasrapur') ||
          l.userFacility.toLowerCase().includes('velhe')
      )
      .slice(0, 25);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header with Single Primary Action */}
      <MahaAushadhiHeader
        roleTitle="PHC Pharmacy Officer (B.Pharm)"
        facilityName={facilityName}
        primaryActionLabel="Review Pending Dispatches"
        onPrimaryAction={() => setActiveTab('outgoing')}
        primaryActionIcon={Package}
        primaryActionClass="bg-blue-600 hover:bg-blue-700 text-white"
      />

      {/* 2. 4 Pharmacy Operational KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Active Stock Lines"
          value={facilityStocks.length}
          subtext="Formulary items"
          color="emerald"
          icon={Pill}
        />
        <KPICard
          label="Safe Buffer Breaches"
          value={bufferBreaches.length}
          subtext={bufferBreaches.length > 0 ? 'Critical buffer alert' : 'Buffers protected'}
          color={bufferBreaches.length > 0 ? 'rose' : 'emerald'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Pending Dispatches"
          value={pendingDispatches.length}
          subtext="Awaiting donor release"
          color={pendingDispatches.length > 0 ? 'amber' : 'emerald'}
          icon={Truck}
        />
        <KPICard
          label="Incoming Shipments"
          value={pendingReceipts.length}
          subtext="En route for physical 2FA receipt"
          color={pendingReceipts.length > 0 ? 'blue' : 'slate'}
          icon={Package}
        />
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'outgoing'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Outgoing Dispatches ({pendingDispatches.length})
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'incoming'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Incoming Consignments ({pendingReceipts.length})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Critical Stock Buffer Ledger ({facilityStocks.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Logistics Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* 4. Tab 1: Outgoing Dispatches (Donor Facility Role) */}
      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          {outgoingTransfers.map((req) => {
            const sourceStock = stocks.find((s) => s.id === req.sourceStockId);
            const safeTransferable = sourceStock ? getSafeTransferableQuantity(sourceStock, stockTransfers) : 0;
            const isCritical = req.urgency === 'CRITICAL';
            const isApproved = req.status === 'APPROVED';
            const isPendingApproval = req.status === 'PENDING_SOURCE_APPROVAL';

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 relative overflow-hidden"
              >
                <div
                  className={`absolute top-0 left-0 w-2 h-full ${
                    isCritical ? 'bg-rose-600' : 'bg-amber-500'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-500">
                        {req.consignmentCode || req.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isCritical
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        {req.urgency} EMERGENCY
                      </span>
                      <span className="text-xs text-slate-400">
                        Received: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                      {req.medicineName}
                    </h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-0.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{req.emergencyIndication || req.reason}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                      {req.requestedQuantity} <span className="text-xs text-slate-500 font-normal">units requested</span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Destination: {req.destinationFacilityName}
                    </div>
                  </div>
                </div>

                {/* Safe Buffer Math Context (Non-destructive Statutory Validation) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Donor Facility Inventory Check ({facilityName})
                    </span>
                    <div className="text-slate-700 dark:text-slate-300">
                      Current Stock: <strong>{sourceStock?.currentStock ?? 0} {sourceStock?.unit}</strong> &bull; Statutory Buffer: <strong>{sourceStock?.bufferStock ?? 20} {sourceStock?.unit}</strong>
                    </div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Safe Transferable Surplus: {safeTransferable} units</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">
                      Target Health Centre Shortage
                    </span>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {req.destinationFacilityName}
                    </div>
                    <div className="text-slate-500">
                      Timeline: Required by {req.requiredByTime ? new Date(req.requiredByTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Stat'}
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pl-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-teal-500" />
                    <span>Statutory 20% Safe Buffer Algorithm Validated</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendingApproval && (
                      <>
                        <button
                          onClick={() => setRejectTarget(req)}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 hover:text-rose-600 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => processStockTransfer(req.id, 'APPROVE')}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-all shadow-xs"
                        >
                          Approve Allocation
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <button
                        onClick={() => setDispatchTarget(req)}
                        className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Authorize Dispatch & Handover Carrier</span>
                      </button>
                    )}

                    {req.status === 'DISPATCHED' && (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        In Transit ({req.transportMode?.replace(/_/g, ' ') || 'EMS Ambulance'})
                      </span>
                    )}

                    {req.status === 'COMPLETED' && (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        Delivered & Received
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {outgoingTransfers.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No outgoing donor requisitions currently pending for {facilityName}.
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Incoming Consignments (Receiving Facility Role) */}
      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {incomingTransfers.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-500">
                      {req.consignmentCode || req.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        req.status === 'DISPATCHED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : req.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    {req.medicineName} &bull; {req.requestedQuantity} Units
                  </h4>
                  <p className="text-xs text-slate-500">
                    Dispatched from: <strong>{req.sourceFacilityName}</strong> via{' '}
                    <strong>{req.transportMode?.replace(/_/g, ' ') || '108 Ambulance'}</strong>
                  </p>
                </div>

                {req.status === 'DISPATCHED' && (
                  <button
                    onClick={() => setReceiveTarget(req)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Physical Receipt (OTP)</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {incomingTransfers.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              No incoming shipments currently dispatched to {facilityName}.
            </div>
          )}
        </div>
      )}

      {/* 6. Tab 3: Critical Stock Buffer Ledger */}
      {activeTab === 'inventory' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Facility Pharmacy Inventory & Statutory Safe Buffer Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Statutory buffer enforced per Maharashtra DHS guidelines. Safe transferable quantity strictly respects local 20% reserves.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3">Medicine & Category</th>
                  <th className="py-2.5 px-3">Current Units</th>
                  <th className="py-2.5 px-3">Statutory Buffer</th>
                  <th className="py-2.5 px-3">Safe Transferable</th>
                  <th className="py-2.5 px-3">Batch & Expiry</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {facilityStocks.map((s) => {
                  const status = getMedicineStatus(s);
                  const safeQty = getSafeTransferableQuantity(s, stockTransfers);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.drugName}</div>
                        <div className="text-[10px] text-slate-400">{s.category}</div>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                        {s.currentStock} {s.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {s.bufferStock} {s.unit}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-black ${safeQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {safeQty} {s.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        <div className="font-mono">{s.batchNumber}</div>
                        <div className="text-[10px] text-slate-400">{s.expiryDate}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            status === 'CRITICAL'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                              : status === 'LIMITED'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Tab 4: Logistics Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Local Logistics Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Cryptographic immutable log of local stock movements and OTP verifications
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black text-teal-600">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{log.resource}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Officer: <strong>{log.userName}</strong> ({log.userRole}) &bull; Facility: {log.userFacility}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {dispatchTarget && (
        <DispatchModal
          transfer={dispatchTarget}
          onClose={() => setDispatchTarget(null)}
        />
      )}

      {receiveTarget && (
        <ReceiptOtpModal
          transfer={receiveTarget}
          onClose={() => setReceiveTarget(null)}
        />
      )}

      {/* Rejection Dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              Reject Emergency Requisition
            </h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason for rejecting requisition {rejectTarget.id}. This will be logged permanently in the state audit trail.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Local stock allocated for pending high-risk delivery in labor room"
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectionReason.trim()) {
                    processStockTransfer(rejectTarget.id, 'REJECT', rejectionReason);
                    setRejectTarget(null);
                    setRejectionReason('');
                  }
                }}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
