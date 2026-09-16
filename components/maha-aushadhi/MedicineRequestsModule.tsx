'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer, RequestStatus, Facility } from '@/lib/types';
import { INITIAL_FACILITIES, resolveCanonicalFacilityName, resolveCanonicalFacility } from '@/lib/mockData';
import { getSafeTransferableQuantity, getDistanceKm } from '@/lib/resourceManagement';
import {
  Inbox,
  History,
  Building2,
  Package,
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Truck,
  XCircle,
  Shield,
  Check,
  X,
  Send,
  PlusCircle,
  KeyRound,
  Copy,
  RotateCcw,
  Share2,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Activity,
  Layers,
} from 'lucide-react';

export function TransferProgressTrackerMini({ status }: { status: RequestStatus }) {
  const steps = [
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'ON_THE_WAY', label: 'On the Way' },
    { key: 'RECEIVED', label: 'Received' },
  ];

  let currentStepIdx = 0;
  if (status === 'PENDING' || status === 'PENDING_SOURCE_APPROVAL') currentStepIdx = 0;
  else if (status === 'APPROVED') currentStepIdx = 1;
  else if (status === 'DISPATCHED') currentStepIdx = 2;
  else if (status === 'COMPLETED') currentStepIdx = 3;
  else if (status === 'REJECTED') currentStepIdx = -1;

  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3 h-3" />
        <span>Rejected</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, idx) => {
        const isDone = idx < currentStepIdx;
        const isCurrent = idx === currentStepIdx;
        return (
          <React.Fragment key={s.key}>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight ${
                isCurrent
                  ? 'bg-blue-600 text-white font-extrabold shadow-2xs animate-pulse'
                  : isDone
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && <span className="text-[8px] text-slate-300 dark:text-slate-600">&rarr;</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function MedicineRequestsModule() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const {
    stocks,
    facilities,
    stockTransfers,
    processStockTransfer,
    createStockTransfer,
    forwardStockTransfer,
  } = useSync();

  // Dynamic Facility Scoping from authenticated user session
  const currentFacilityId = user?.facilityId || 'fac-phc-velhe';
  const currentFacilityName =
    user?.facilityName || resolveCanonicalFacilityName(currentFacilityId) || 'Primary Health Centre';
  const currentFacilityObj = useMemo(
    () => resolveCanonicalFacility(currentFacilityId) || facilities.find((f) => f.id === currentFacilityId),
    [currentFacilityId, facilities]
  );
  const userDistrict = currentFacilityObj?.district || user?.district || 'Pune';

  // Primary 2-tab navigation: 'INCOMING' vs 'HISTORY'
  const [activeTab, setActiveTab] = useState<'INCOMING' | 'HISTORY'>('INCOMING');

  // History sub-filters
  const [historyScope, setHistoryScope] = useState<'ALL' | 'REQUESTED_BY_US' | 'SUPPLIED_BY_US'>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedIncomingRequest, setSelectedIncomingRequest] = useState<StockTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Forward / Alternate Supply Modal
  const [forwardingTransfer, setForwardingTransfer] = useState<StockTransfer | null>(null);
  const [forwardReason, setForwardReason] = useState('');
  const [selectedAlternateFacilityId, setSelectedAlternateFacilityId] = useState('');

  // OTP Verification Modal for Receiving Outbound Transfers
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // New Requisition Modal
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [reqDrugName, setReqDrugName] = useState('');
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'ROUTINE' | 'URGENT' | 'CRITICAL'>('URGENT');
  const [reqReason, setReqReason] = useState('');
  const [reqSourceFacilityId, setReqSourceFacilityId] = useState('');

  // 1. INCOMING REQUESTS: OTHER FACILITIES -> THIS PHC
  // (Source is THIS PHC, Destination is another facility)
  const incomingRequests = useMemo(() => {
    return stockTransfers.filter((t) => {
      const isSourceThis =
        t.sourceFacilityId === currentFacilityId ||
        (t.sourceFacilityName && currentFacilityName && t.sourceFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      const isDestOther =
        t.destinationFacilityId !== currentFacilityId &&
        (!t.destinationFacilityName || !currentFacilityName || !t.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      return isSourceThis && isDestOther;
    });
  }, [stockTransfers, currentFacilityId, currentFacilityName]);

  // 2. COMPLETE REQUEST HISTORY FOR THIS PHC (Requests Made + Requests Sent/Supplied)
  const allHistoryTransfers = useMemo(() => {
    return stockTransfers.filter((t) => {
      const isSourceThis =
        t.sourceFacilityId === currentFacilityId ||
        (t.sourceFacilityName && currentFacilityName && t.sourceFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      const isDestThis =
        t.destinationFacilityId === currentFacilityId ||
        (t.destinationFacilityName && currentFacilityName && t.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      return isSourceThis || isDestThis;
    });
  }, [stockTransfers, currentFacilityId, currentFacilityName]);

  // Filtered History list
  const filteredHistory = useMemo(() => {
    return allHistoryTransfers.filter((t) => {
      const isDestThis =
        t.destinationFacilityId === currentFacilityId ||
        (t.destinationFacilityName && currentFacilityName && t.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      const isSourceThis =
        t.sourceFacilityId === currentFacilityId ||
        (t.sourceFacilityName && currentFacilityName && t.sourceFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));

      if (historyScope === 'REQUESTED_BY_US' && !isDestThis) return false;
      if (historyScope === 'SUPPLIED_BY_US' && !isSourceThis) return false;

      if (historyStatusFilter !== 'ALL') {
        if (historyStatusFilter === 'PENDING' && t.status !== 'PENDING' && t.status !== 'PENDING_SOURCE_APPROVAL') return false;
        if (historyStatusFilter === 'APPROVED' && t.status !== 'APPROVED') return false;
        if (historyStatusFilter === 'DISPATCHED' && t.status !== 'DISPATCHED') return false;
        if (historyStatusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
        if (historyStatusFilter === 'REJECTED' && t.status !== 'REJECTED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.medicineName.toLowerCase().includes(q) ||
          (t.sourceFacilityName && t.sourceFacilityName.toLowerCase().includes(q)) ||
          (t.destinationFacilityName && t.destinationFacilityName.toLowerCase().includes(q)) ||
          (t.consignmentCode && t.consignmentCode.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [allHistoryTransfers, historyScope, historyStatusFilter, searchQuery, currentFacilityId, currentFacilityName]);

  // Eligible donor facilities
  const eligibleDonorFacilities = useMemo(() => {
    return INITIAL_FACILITIES.filter((f) => f.id !== currentFacilityId);
  }, [currentFacilityId]);

  // Safety buffer calculation for incoming request
  const getSafetyAnalysis = (transfer: StockTransfer) => {
    const stockItem = stocks.find(
      (s) =>
        s.id === transfer.sourceStockId ||
        (s.facilityId === currentFacilityId && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase()) ||
        (s.facilityName?.toLowerCase().includes(currentFacilityName.toLowerCase()) && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase())
    );

    const currentStock = stockItem ? stockItem.currentStock : 0;
    const requestedQuantity = transfer.requestedQuantity;
    const remainingStock = currentStock - requestedQuantity;
    const minimumBuffer = stockItem ? stockItem.bufferStock : 10;
    const unit = stockItem?.unit || 'Units';
    const isSafe = remainingStock >= minimumBuffer && currentStock >= requestedQuantity;
    const isBufferBreach = !isSafe;

    return {
      stockItem,
      currentStock,
      requestedQuantity,
      remainingStock,
      minimumBuffer,
      unit,
      isSafe,
      isBufferBreach,
    };
  };

  // Alternate sourcing candidates
  const alternateSupplyCandidates = useMemo(() => {
    if (!forwardingTransfer) return [];
    const drugName = forwardingTransfer.medicineName.toLowerCase();

    return eligibleDonorFacilities
      .filter((fac) => fac.id !== forwardingTransfer.sourceFacilityId && fac.id !== currentFacilityId)
      .map((fac) => {
        const facStock = stocks.find(
          (s) =>
            s.facilityId === fac.id &&
            (s.drugName.toLowerCase() === drugName || s.drugName.toLowerCase().includes(drugName) || drugName.includes(s.drugName.toLowerCase()))
        );
        const current = facStock ? facStock.currentStock : 0;
        const buffer = facStock ? facStock.bufferStock : 0;
        const surplus = Math.max(0, current - buffer);
        const distance = currentFacilityObj ? getDistanceKm(currentFacilityObj, fac) : null;

        return {
          facility: fac,
          stock: facStock,
          currentStock: current,
          bufferStock: buffer,
          surplus,
          distance,
          hasSurplus: surplus >= forwardingTransfer.requestedQuantity,
        };
      })
      .sort((a, b) => b.surplus - a.surplus || (a.distance || 999) - (b.distance || 999));
  }, [forwardingTransfer, eligibleDonorFacilities, currentFacilityId, stocks, currentFacilityObj]);

  // Handle Receiving Consignment with OTP
  const handleConfirmReceipt = async () => {
    if (!receivingTransfer) return;
    if (inputOtp.trim() !== '4482' && inputOtp.trim() !== '1234' && inputOtp.trim().length !== 4) {
      setOtpError('Invalid OTP code. Please enter demo OTP: 4482');
      return;
    }
    await processStockTransfer(receivingTransfer.id, 'RECEIVE', undefined, { receiptOtpVerified: true });
    setReceivingTransfer(null);
    setInputOtp('');
    setOtpError('');
  };

  // Handle Forwarding Requisition to Alternate Donor
  const handleForwardToAlternate = () => {
    if (!forwardingTransfer || !selectedAlternateFacilityId) return;
    const candidate = alternateSupplyCandidates.find((c) => c.facility.id === selectedAlternateFacilityId);
    forwardStockTransfer(
      forwardingTransfer.id,
      selectedAlternateFacilityId,
      candidate?.stock?.id,
      forwardReason || 'Forwarded to facility with active stock surplus'
    );
    setForwardingTransfer(null);
    setForwardReason('');
    setSelectedAlternateFacilityId('');
    if (selectedIncomingRequest?.id === forwardingTransfer.id) {
      setSelectedIncomingRequest(null);
    }
  };

  // Handle Creating New Dynamic Requisition
  const handleCreateRequisition = () => {
    const drugName = reqDrugName.trim();
    if (!drugName) return;
    const qty = parseInt(reqQuantity, 10);
    if (isNaN(qty) || qty <= 0) return;
    const targetSourceId = reqSourceFacilityId || eligibleDonorFacilities[0]?.id || 'fac-dh-pune';

    const sourceStock = stocks.find(
      (s) =>
        s.facilityId === targetSourceId &&
        (s.drugName.toLowerCase() === drugName.toLowerCase() || s.drugName.toLowerCase().includes(drugName.toLowerCase()))
    );

    const destStock = stocks.find((s) => s.facilityId === currentFacilityId && s.drugName.toLowerCase() === drugName.toLowerCase());
    const sourceName = resolveCanonicalFacilityName(targetSourceId);

    createStockTransfer({
      sourceStockId: sourceStock?.id || `stk-${targetSourceId}-01`,
      destinationStockId: destStock?.id || `stk-${currentFacilityId}-01`,
      sourceFacilityId: targetSourceId,
      sourceFacilityName: sourceName,
      destinationFacilityId: currentFacilityId,
      destinationFacilityName: currentFacilityName,
      medicineName: drugName,
      requestedQuantity: qty,
      urgency: reqUrgency,
      reason: reqReason || `Replenishment requisition for ${drugName} buffer restoration.`,
      donorAllocated: true,
      isEmergency: reqUrgency === 'CRITICAL',
      transportMode: reqUrgency === 'CRITICAL' ? '108_AMBULANCE' : 'DISTRICT_MEDICAL_COURIER',
    });

    setIsNewReqOpen(false);
    setReqDrugName('');
    setReqQuantity('');
    setReqReason('');
    setActiveTab('HISTORY');
    setHistoryScope('REQUESTED_BY_US');
  };

  const pendingIncomingCount = incomingRequests.filter(
    (r) => r.status === 'PENDING_SOURCE_APPROVAL' || r.status === 'PENDING'
  ).length;

  return (
    <div className="flex flex-col h-full space-y-3 animate-in fade-in duration-300">
      
      {/* 1. MODULE CONTEXT HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 opacity-90" />
        
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Inbox className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>{language === 'mr' ? 'औषध मागण्या व रसद व्यवस्थापन' : 'Medicine Requests & Inter-Facility Supply'}</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {currentFacilityName}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage incoming medicine demands from peer facilities and track complete requisition lifecycle history for {currentFacilityName}.
          </p>
        </div>

        <button
          onClick={() => {
            setReqDrugName('Anti-Snake Venom (ASV Polyvalent Lyophilized)');
            setIsNewReqOpen(true);
          }}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ New Requisition</span>
        </button>
      </div>

      {/* 2. TAB TOGGLE BUTTONS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        
        {/* Tab 1: Incoming Requests */}
        <button
          onClick={() => setActiveTab('INCOMING')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'INCOMING'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-purple-600 border-x border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 shadow-2xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-purple-500" />
          <span>1. Incoming Requests</span>
          {pendingIncomingCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-600 text-white font-black animate-pulse">
              {pendingIncomingCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {incomingRequests.length}
            </span>
          )}
        </button>

        {/* Tab 2: Request History */}
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'HISTORY'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-blue-600 border-x border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-300 shadow-2xs font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-blue-500" />
          <span>2. Request History</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
            {allHistoryTransfers.length}
          </span>
        </button>

      </div>

      {/* ============================================================== */}
      {/* 3. TAB 1: INCOMING REQUESTS (OTHER PHCs -> THIS PHC) */}
      {/* ============================================================== */}
      {activeTab === 'INCOMING' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Active Inbound Demands Requiring Action by {currentFacilityName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review on-hand stock and statutory buffer thresholds before dispatching consignments.
              </p>
            </div>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
              {incomingRequests.length} Total Received
            </span>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5">Request ID</th>
                    <th className="px-4 py-2.5">Requesting PHC</th>
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Priority</th>
                    <th className="px-4 py-2.5">Requested Date/Time</th>
                    <th className="px-4 py-2.5">Buffer Safety</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {incomingRequests.length > 0 ? (
                    incomingRequests.map((req) => {
                      const analysis = getSafetyAnalysis(req);

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* Request ID */}
                          <td className="px-4 py-2.5">
                            <div className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                              {req.id}
                            </div>
                            {req.consignmentCode && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {req.consignmentCode}
                              </div>
                            )}
                          </td>

                          {/* Requesting PHC */}
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{req.destinationFacilityName}</span>
                            </div>
                          </td>

                          {/* Medicine */}
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {req.medicineName}
                            </div>
                            <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                              &ldquo;{req.reason || 'Emergency replenishment requisition'}&rdquo;
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white">
                            {req.requestedQuantity} <span className="text-[10px] font-normal text-slate-400">{analysis.unit}</span>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-2.5">
                            {req.urgency === 'CRITICAL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                                <span>CRITICAL</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>{req.urgency}</span>
                              </span>
                            )}
                          </td>

                          {/* Date/Time */}
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {new Date(req.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Buffer Safety */}
                          <td className="px-4 py-2.5">
                            {analysis.isSafe ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Safe (+{analysis.remainingStock - analysis.minimumBuffer})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                <span>Buffer Breach</span>
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-xs">
                              {req.status === 'PENDING_SOURCE_APPROVAL' || req.status === 'PENDING' ? (
                                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              ) : req.status === 'APPROVED' ? (
                                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Approved</span>
                                </span>
                              ) : req.status === 'DISPATCHED' ? (
                                <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  <span>On the Way</span>
                                </span>
                              ) : req.status === 'COMPLETED' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Received</span>
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedIncomingRequest(req);
                                setShowRejectInput(false);
                                setRejectReason('');
                              }}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Review & Fulfill</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No pending incoming medicine requests for {currentFacilityName}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAB 2: REQUEST HISTORY (ALL INBOUND + OUTBOUND) */}
      {/* ============================================================== */}
      {activeTab === 'HISTORY' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Controls & Sub-Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Scope Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'ALL', label: 'All History' },
                { key: 'REQUESTED_BY_US', label: 'Requests Made (Outbound)' },
                { key: 'SUPPLIED_BY_US', label: 'Requests Supplied (Inbound)' },
              ].map((scope) => (
                <button
                  key={scope.key}
                  onClick={() => setHistoryScope(scope.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    historyScope === scope.key
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>

            {/* Search & Status Filter */}
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by ID, drug, facility..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                />
              </div>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Requested / Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="DISPATCHED">On the Way</option>
                <option value="COMPLETED">Received</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

          </div>

          {/* History Table */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5">ID / Date</th>
                    <th className="px-4 py-2.5">Flow Direction</th>
                    <th className="px-4 py-2.5">Source Facility</th>
                    <th className="px-4 py-2.5">Destination Facility</th>
                    <th className="px-4 py-2.5">Medicine & Qty</th>
                    <th className="px-4 py-2.5">Progress / Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((req) => {
                      const isRequestedByUs =
                        req.destinationFacilityId === currentFacilityId ||
                        (req.destinationFacilityName && currentFacilityName && req.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          
                          {/* ID / Date */}
                          <td className="px-4 py-2.5">
                            <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {req.id}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          {/* Flow Direction */}
                          <td className="px-4 py-2.5">
                            {isRequestedByUs ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <ArrowUpRight className="w-3 h-3 text-blue-500" />
                                <span>Requested by Us</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <ArrowDownLeft className="w-3 h-3 text-purple-500" />
                                <span>Supplied by Us</span>
                              </span>
                            )}
                          </td>

                          {/* Source */}
                          <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {req.sourceFacilityName || 'Unallocated Donor'}
                          </td>

                          {/* Destination */}
                          <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                            {req.destinationFacilityName}
                          </td>

                          {/* Medicine & Qty */}
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-white">{req.medicineName}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-bold">{req.requestedQuantity} Units</div>
                          </td>

                          {/* Progress */}
                          <td className="px-4 py-2.5">
                            <TransferProgressTrackerMini status={req.status} />
                          </td>

                          {/* Action */}
                          <td className="px-4 py-2.5 text-right">
                            {isRequestedByUs && req.status === 'DISPATCHED' ? (
                              <button
                                onClick={() => {
                                  setReceivingTransfer(req);
                                  setInputOtp('');
                                  setOtpError('');
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Receive (OTP)</span>
                              </button>
                            ) : isRequestedByUs && req.status === 'REJECTED' ? (
                              <button
                                onClick={() => {
                                  setForwardingTransfer(req);
                                  setForwardReason('Re-routing after previous donor rejection');
                                  setSelectedAlternateFacilityId(eligibleDonorFacilities[0]?.id || '');
                                }}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Alternate Supply</span>
                              </button>
                            ) : req.status === 'COMPLETED' ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Reconciled</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs font-mono">{req.status}</span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No request history records match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL: BUFFER SAFETY CHECK FOR INCOMING REQUESTS */}
      {/* ============================================================== */}
      {selectedIncomingRequest && (() => {
        const analysis = getSafetyAnalysis(selectedIncomingRequest);
        const { currentStock, requestedQuantity, remainingStock, minimumBuffer, unit, isSafe, isBufferBreach } = analysis;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Incoming Requisition Review
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Request ID: <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{selectedIncomingRequest.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedIncomingRequest(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                        Requesting Facility
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-4 h-4 text-slate-500" />
                        <span>{selectedIncomingRequest.destinationFacilityName}</span>
                      </div>
                    </div>
                    <div>
                      {selectedIncomingRequest.urgency === 'CRITICAL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                          <span>CRITICAL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>{selectedIncomingRequest.urgency}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {selectedIncomingRequest.medicineName}
                      </span>
                    </div>
                    <div className="text-xs font-black text-purple-700 dark:text-purple-400">
                      Req: {selectedIncomingRequest.requestedQuantity} {unit}
                    </div>
                  </div>

                  {selectedIncomingRequest.reason && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Clinical Reason: &ldquo;{selectedIncomingRequest.reason}&rdquo;
                    </div>
                  )}
                </div>

                {/* 4 Key Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Current On-Hand Stock</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {currentStock} <span className="text-[10px] font-normal text-slate-400">{unit}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Requested Quantity</div>
                    <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {requestedQuantity} <span className="text-[10px] font-normal text-slate-400">{unit}</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border shadow-2xs ${
                    remainingStock < minimumBuffer
                      ? 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                  }`}>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Remaining Stock</div>
                    <div className={`text-xl font-black mt-1 ${
                      remainingStock < minimumBuffer ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {remainingStock} <span className="text-[10px] font-normal text-slate-400">{unit}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Minimum Statutory Buffer</div>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                      {minimumBuffer} <span className="text-[10px] font-normal text-slate-400">{unit}</span>
                    </div>
                  </div>
                </div>

                {/* Safe vs Buffer Breach */}
                {isSafe ? (
                  <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                        🟢 SAFE TO TRANSFER
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      Remaining stock ({remainingStock} {unit}) is at or above the minimum buffer ({minimumBuffer} {unit}). Approving this transfer will not breach {currentFacilityName} emergency reserves.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-black text-sm text-rose-900 dark:text-rose-200">
                        🔴 BUFFER BREACH
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                      Remaining stock ({remainingStock} {unit}) would fall below statutory buffer ({minimumBuffer} {unit}). You may forward this request to an alternate facility.
                    </p>
                  </div>
                )}

                {/* Reject Input */}
                {showRejectInput && (
                  <div className="space-y-1.5 p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20">
                    <label className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                      Rejection Reason (Transmitted to Requesting Facility):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Statutory buffer breach at source facility..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                )}

              </div>

              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  onClick={() => setSelectedIncomingRequest(null)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {(selectedIncomingRequest.status === 'PENDING_SOURCE_APPROVAL' || selectedIncomingRequest.status === 'PENDING') && (
                    <>
                      <button
                        onClick={() => {
                          setForwardingTransfer(selectedIncomingRequest);
                          setForwardReason(`Forwarded by ${currentFacilityName} (insufficient buffer surplus)`);
                          setSelectedAlternateFacilityId(eligibleDonorFacilities[0]?.id || '');
                        }}
                        className="px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Forward Alternate</span>
                      </button>

                      {!showRejectInput ? (
                        <button
                          onClick={() => {
                            setShowRejectInput(true);
                            setRejectReason(isBufferBreach ? `Statutory buffer breach at ${currentFacilityName}` : 'Unavailable for transfer');
                          }}
                          className="px-3 py-1.5 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await processStockTransfer(selectedIncomingRequest.id, 'REJECT', rejectReason || 'Buffer breach at donor facility');
                            setSelectedIncomingRequest(null);
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Confirm Rejection
                        </button>
                      )}

                      {isSafe ? (
                        <button
                          onClick={async () => {
                            await processStockTransfer(selectedIncomingRequest.id, 'APPROVE');
                            setSelectedIncomingRequest(null);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve Transfer</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 opacity-80"
                        >
                          <Ban className="w-4 h-4 text-rose-500" />
                          <span>Approval Blocked</span>
                        </button>
                      )}
                    </>
                  )}

                  {selectedIncomingRequest.status === 'APPROVED' && (
                    <button
                      onClick={async () => {
                        await processStockTransfer(selectedIncomingRequest.id, 'DISPATCH', undefined, { transportMode: selectedIncomingRequest.urgency === 'CRITICAL' ? '108_AMBULANCE' : 'DISTRICT_MEDICAL_COURIER' });
                        setSelectedIncomingRequest(null);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Dispatch Consignment</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 6. MODAL: FIND ALTERNATE SUPPLY & FORWARD REQUISITION */}
      {/* ============================================================== */}
      {forwardingTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Find Alternate Supply & Forward Requisition
                </h3>
              </div>
              <button
                onClick={() => setForwardingTransfer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  ID: {forwardingTransfer.id} &bull; {forwardingTransfer.urgency}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {forwardingTransfer.medicineName} &bull; {forwardingTransfer.requestedQuantity} Units
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Recipient: <strong>{forwardingTransfer.destinationFacilityName}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Available Alternate Facilities with Surplus:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ranked by surplus & distance</span>
                </label>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {alternateSupplyCandidates.map((cand) => (
                    <div
                      key={cand.facility.id}
                      onClick={() => setSelectedAlternateFacilityId(cand.facility.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        selectedAlternateFacilityId === cand.facility.id
                          ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cand.facility.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                            {cand.facility.type}
                          </span>
                          {cand.distance !== null && <span>{cand.distance} km away</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-xs ${cand.hasSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          +{cand.surplus} Surplus
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Forwarding Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Re-routing due to source buffer deficit"
                  value={forwardReason}
                  onChange={(e) => setForwardReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between gap-2.5">
              <button
                onClick={() => setForwardingTransfer(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleForwardToAlternate}
                disabled={!selectedAlternateFacilityId}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Forward Requisition</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL: OTP RECEIPT VERIFICATION */}
      {/* ============================================================== */}
      {receivingTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Verify OTP & Receive Consignment
                </h3>
              </div>
              <button
                onClick={() => setReceivingTransfer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400">Consignment Details</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {receivingTransfer.requestedQuantity} Units &bull; {receivingTransfer.medicineName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  From: <strong>{receivingTransfer.sourceFacilityName}</strong> &rarr; To: <strong>{receivingTransfer.destinationFacilityName}</strong>
                </div>
                <div className="font-mono text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">
                  Tracking Code: {receivingTransfer.consignmentCode || receivingTransfer.id}
                </div>
              </div>

              {/* Demo OTP Helper */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                    MahaAushadhi Demo OTP Helper
                  </div>
                  <div className="font-mono text-base font-black text-emerald-950 dark:text-emerald-200 tracking-widest mt-0.5">
                    4482
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInputOtp('4482')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Use OTP</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Enter 4-Digit Receipt OTP from Courier / Ambulance:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter OTP (e.g. 4482)"
                  value={inputOtp}
                  onChange={(e) => {
                    setInputOtp(e.target.value);
                    setOtpError('');
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-base font-bold text-center tracking-widest text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
                {otpError && <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{otpError}</p>}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between gap-2.5">
              <button
                onClick={() => setReceivingTransfer(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmReceipt}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Receipt & Reconcile Stock</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL: CREATE NEW REPLENISHMENT REQUISITION */}
      {/* ============================================================== */}
      {isNewReqOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  New Medicine Requisition
                </h3>
              </div>
              <button
                onClick={() => setIsNewReqOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto max-h-[75vh]">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Requesting Facility (Recipient)</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{currentFacilityName}</div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Medicine:
                </label>
                <select
                  value={reqDrugName}
                  onChange={(e) => setReqDrugName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="Anti-Snake Venom (ASV Polyvalent Lyophilized)">Anti-Snake Venom (ASV Polyvalent Lyophilized)</option>
                  <option value="Anti-Rabies Vaccine (ARV Purified Vero Cell)">Anti-Rabies Vaccine (ARV Purified Vero Cell)</option>
                  <option value="Oxytocin Injection IP (10 IU/ml)">Oxytocin Injection IP (10 IU/ml)</option>
                  <option value="Magnesium Sulphate 50% Inj">Magnesium Sulphate 50% Inj</option>
                  <option value="Adrenaline Injection IP (1 mg/ml)">Adrenaline Injection IP (1 mg/ml)</option>
                  <option value="Ceftriaxone 1g Injection">Ceftriaxone 1g Injection</option>
                  <option value="Paracetamol 500mg Tablets">Paracetamol 500mg Tablets</option>
                  <option value="Oral Rehydration Salts (ORS IP)">Oral Rehydration Salts (ORS IP)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Requisition Quantity:
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={reqQuantity}
                  onChange={(e) => setReqQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Supplying Facility (Any PHC or Hospital in Network):
                </label>
                <select
                  value={reqSourceFacilityId}
                  onChange={(e) => setReqSourceFacilityId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {eligibleDonorFacilities.map((fac) => {
                    const donorStock = stocks.find(
                      (s) =>
                        s.facilityId === fac.id &&
                        reqDrugName &&
                        (s.drugName.toLowerCase() === reqDrugName.toLowerCase() || s.drugName.toLowerCase().includes(reqDrugName.toLowerCase()))
                    );
                    const surplus = donorStock ? Math.max(0, donorStock.currentStock - donorStock.bufferStock) : 0;
                    return (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} ({fac.type}) {donorStock ? `• Surplus: +${surplus}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Priority Tier:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReqUrgency('ROUTINE')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      reqUrgency === 'ROUTINE'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ROUTINE
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqUrgency('URGENT')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      reqUrgency === 'URGENT'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    URGENT
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqUrgency('CRITICAL')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      reqUrgency === 'CRITICAL'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    CRITICAL (108)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Clinical Indication / Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency buffer replenishment"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex items-center justify-between gap-2.5">
              <button
                onClick={() => setIsNewReqOpen(false)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateRequisition}
                disabled={!reqDrugName.trim() || !reqQuantity}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Submit Requisition</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
