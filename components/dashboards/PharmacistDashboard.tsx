'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer, RequestStatus } from '@/lib/types';
import {
  Pill,
  Package,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Building2,
  FileCheck,
  Search,
  Truck,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  XCircle,
  ArrowRight,
  Shield,
  Info,
  Check,
  X,
  FileText,
  Ban,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  ChevronRight,
  Send,
  PlusCircle,
  KeyRound,
  Copy,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export type StockStatusType = 'ALL' | 'AVAILABLE' | 'LOW_BUFFER' | 'SHORTAGE_RISK' | 'OUT_OF_STOCK';

export function getDrugStatus(current: number, buffer: number): {
  type: 'AVAILABLE' | 'LOW_BUFFER' | 'SHORTAGE_RISK' | 'OUT_OF_STOCK';
  labelEn: string;
  labelMr: string;
  badgeClass: string;
  dotColor: string;
  icon: React.ElementType;
} {
  if (current === 0) {
    return {
      type: 'OUT_OF_STOCK',
      labelEn: 'Out of Stock',
      labelMr: 'साठा संपला',
      badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
      dotColor: 'bg-slate-700 dark:bg-slate-300',
      icon: XCircle,
    };
  }
  if (current <= buffer * 0.3) {
    return {
      type: 'SHORTAGE_RISK',
      labelEn: 'Shortage Risk',
      labelMr: 'तीव्र तुटवडा धोका',
      badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      dotColor: 'bg-rose-500',
      icon: AlertTriangle,
    };
  }
  if (current < buffer) {
    return {
      type: 'LOW_BUFFER',
      labelEn: 'Low Buffer',
      labelMr: 'कमी बफर साठा',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      dotColor: 'bg-amber-500',
      icon: AlertCircle,
    };
  }
  return {
    type: 'AVAILABLE',
    labelEn: 'Available',
    labelMr: 'उपलब्ध',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  };
}

/**
 * 4-Step Visual Progress Tracker for MahaAushadhi Transfers:
 * REQUESTED -> APPROVED -> ON THE WAY -> RECEIVED
 */
export function TransferProgressTracker({ status }: { status: RequestStatus }) {
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
      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3.5 h-3.5" />
        <span>Request Rejected / Buffer Breach</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs sm:max-w-sm py-1">
      <div className="flex items-center justify-between relative">
        
        {/* Background Connecting Line */}
        <div className="absolute top-2.5 left-3 right-3 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
        
        {/* Active Connecting Progress Fill */}
        <div
          className="absolute top-2.5 left-3 h-0.5 bg-blue-600 dark:bg-blue-400 transition-all duration-500 -z-0"
          style={{
            width: `${(currentStepIdx / (steps.length - 1)) * 88}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          const isPending = idx > currentStepIdx;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  isDone
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/60 animate-pulse'
                    : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isCurrent && idx === 2 ? (
                  <Truck className="w-3 h-3 text-white" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[9px] sm:text-[10px] font-bold mt-1 tracking-tight text-center ${
                  isCurrent
                    ? 'text-blue-700 dark:text-blue-300 font-extrabold'
                    : isDone
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PharmacistDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers, processStockTransfer, createStockTransfer } = useSync();

  // Primary active tab
  const [activeTab, setActiveTab] = useState<'AVAILABILITY' | 'INCOMING_REQUESTS' | 'MY_REQUESTS' | 'TRANSFERS' | 'DISPENSING'>('AVAILABILITY');
  const [statusFilter, setStatusFilter] = useState<StockStatusType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedIncomingRequest, setSelectedIncomingRequest] = useState<StockTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  
  // OTP Verification Modal for Receiving Outbound Transfers
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);
  const [inputOtp, setInputOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // New Requisition Modal
  const [isNewReqOpen, setIsNewReqOpen] = useState(false);
  const [reqDrugId, setReqDrugId] = useState('');
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'ROUTINE' | 'URGENT' | 'CRITICAL'>('URGENT');
  const [reqReason, setReqReason] = useState('');
  const [reqSourceFacilityId, setReqSourceFacilityId] = useState('fac-dh-pune');

  // Scoped stocks for Nasrapur PHC
  const facilityStocks = useMemo(() => {
    return stocks.filter((s) => {
      if (!user?.facilityId && !user?.facilityName) return true;
      return (
        s.facilityId === user?.facilityId ||
        s.facilityName.toLowerCase().includes((user?.facilityName || '').toLowerCase()) ||
        (user?.facilityName || '').toLowerCase().includes(s.facilityName.toLowerCase()) ||
        (user?.facilityName?.toLowerCase().includes('nasrapur') && s.facilityName.toLowerCase().includes('nasrapur'))
      );
    });
  }, [stocks, user]);

  // 1. INCOMING REQUESTS: OTHER PHC -> NASRAPUR PHC
  // (Source is Nasrapur PHC, Destination is another facility)
  const incomingRequests = useMemo(() => {
    const userFacId = user?.facilityId || 'fac-phc-nasrapur';
    return stockTransfers.filter((t) => {
      const isSourceNasrapur =
        t.sourceFacilityId === userFacId ||
        (t.sourceFacilityName && t.sourceFacilityName.toLowerCase().includes('nasrapur'));
      const isDestOther =
        t.destinationFacilityId !== userFacId &&
        (!t.destinationFacilityName || !t.destinationFacilityName.toLowerCase().includes('nasrapur'));
      return isSourceNasrapur && isDestOther;
    });
  }, [stockTransfers, user]);

  // 2. MY REQUESTS: NASRAPUR PHC -> ANOTHER FACILITY
  // (Destination is Nasrapur PHC, Source is another facility)
  const myRequests = useMemo(() => {
    const userFacId = user?.facilityId || 'fac-phc-nasrapur';
    return stockTransfers.filter((t) => {
      const isDestNasrapur =
        t.destinationFacilityId === userFacId ||
        (t.destinationFacilityName && t.destinationFacilityName.toLowerCase().includes('nasrapur'));
      const isSourceOther =
        t.sourceFacilityId !== userFacId &&
        (!t.sourceFacilityName || !t.sourceFacilityName.toLowerCase().includes('nasrapur'));
      return isDestNasrapur && isSourceOther;
    });
  }, [stockTransfers, user]);

  // 3. ALL FACILITY TRANSFERS (Inbound + Outbound)
  const facilityTransfers = useMemo(() => {
    return stockTransfers.filter((t) => {
      if (!user?.facilityId) return true;
      return (
        t.sourceFacilityId === user.facilityId ||
        t.destinationFacilityId === user.facilityId ||
        (t.destinationFacilityName && user?.facilityName && t.destinationFacilityName.toLowerCase().includes(user.facilityName.toLowerCase())) ||
        (t.sourceFacilityName && user?.facilityName && t.sourceFacilityName.toLowerCase().includes(user.facilityName.toLowerCase()))
      );
    });
  }, [stockTransfers, user]);

  // Compute 5 Key Overview Metrics
  const activeMedicinesCount = facilityStocks.length;
  const adequateStockCount = facilityStocks.filter((s) => s.currentStock >= s.bufferStock).length;
  const lowStockCount = facilityStocks.filter((s) => s.currentStock < s.bufferStock && s.currentStock > s.bufferStock * 0.3).length;
  const shortageRiskCount = facilityStocks.filter((s) => s.currentStock <= s.bufferStock * 0.3 && s.currentStock > 0).length;
  const outOfStockCount = facilityStocks.filter((s) => s.currentStock === 0).length;
  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'PENDING_SOURCE_APPROVAL' || r.status === 'PENDING').length;
  const actionableMyRequestsCount = myRequests.filter((r) => r.status === 'DISPATCHED').length;

  // Compute "Needs Attention" alert items
  const pendingIncomingAlerts = incomingRequests.filter((r) => r.status === 'PENDING_SOURCE_APPROVAL' || r.status === 'PENDING');
  const criticalLowStockAlerts = facilityStocks.filter((s) => s.currentStock < s.bufferStock);
  const emergency108InboundAlerts = myRequests.filter((r) => r.status === 'DISPATCHED' && r.isEmergency);
  const totalNeedsAttention = pendingIncomingAlerts.length + criticalLowStockAlerts.length + emergency108InboundAlerts.length;

  // Filtered stocks for "Medicine Availability"
  const filteredStocks = useMemo(() => {
    return facilityStocks.filter((stock) => {
      const statusObj = getDrugStatus(stock.currentStock, stock.bufferStock);
      if (statusFilter !== 'ALL' && statusObj.type !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          stock.drugName.toLowerCase().includes(q) ||
          stock.category.toLowerCase().includes(q) ||
          stock.batchNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facilityStocks, statusFilter, searchQuery]);

  // Buffer Safety Analysis for an incoming request
  const getSafetyAnalysis = (transfer: StockTransfer) => {
    const stockItem = stocks.find(
      (s) =>
        s.id === transfer.sourceStockId ||
        (s.facilityId === transfer.sourceFacilityId && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase()) ||
        (s.facilityName.toLowerCase().includes('nasrapur') && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase())
    );

    const currentStock = stockItem ? stockItem.currentStock : 0;
    const requestedQuantity = transfer.requestedQuantity;
    const remainingStock = currentStock - requestedQuantity;
    const minimumBuffer = stockItem ? stockItem.bufferStock : 0;
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

  // Handle Creating New Requisition from Nasrapur PHC
  const handleCreateRequisition = () => {
    const selectedStock = facilityStocks.find((s) => s.id === reqDrugId);
    if (!selectedStock) return;
    const qty = parseInt(reqQuantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    let sourceName = 'District Hospital Aundh, Pune';
    let sourceStockId = 'stk-009';
    if (reqSourceFacilityId === 'fac-sassoon-pune') {
      sourceName = 'Sassoon General Hospital & BJMC, Pune';
      sourceStockId = 'stk-006';
    } else if (reqSourceFacilityId === 'fac-rh-bhor') {
      sourceName = 'Bhor Rural Hospital (RH)';
      sourceStockId = 'stk-005';
    }

    createStockTransfer({
      sourceStockId,
      destinationStockId: selectedStock.id,
      sourceFacilityId: reqSourceFacilityId,
      sourceFacilityName: sourceName,
      destinationFacilityId: 'fac-phc-nasrapur',
      destinationFacilityName: 'Nasrapur Primary Health Centre (PHC)',
      medicineName: selectedStock.drugName,
      requestedQuantity: qty,
      urgency: reqUrgency,
      reason: reqReason || `Emergency replenishment requisition for ${selectedStock.drugName} buffer restoration.`,
      donorAllocated: true,
      isEmergency: reqUrgency === 'CRITICAL',
      transportMode: reqUrgency === 'CRITICAL' ? '108_AMBULANCE' : 'DISTRICT_MEDICAL_COURIER',
    });

    setIsNewReqOpen(false);
    setReqDrugId('');
    setReqQuantity('');
    setReqReason('');
    setActiveTab('MY_REQUESTS');
  };

  return (
    <div className="flex flex-col h-full space-y-3 animate-in fade-in duration-300">
      
      {/* 1. FACILITY & OFFICER CONTEXT HEADER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 shadow-2xs relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 via-white to-green-600 opacity-80" />
        
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'mr' ? 'औषधालय व साठा नियंत्रण' : 'Pharmacy & Drug Inventory Console'}
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {user?.facilityName || 'Nasrapur Primary Health Centre (PHC)'}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {user?.facilityName?.includes('Nasrapur') ? 'Nasrapur PHC • Bhor Taluka • Pune District' : user?.facilityName || 'Nasrapur PHC'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              MahaAushadhi Emergency Node Active
            </span>
          </p>
        </div>

        {/* Pharmacist profile chip & emergency grid shortcut */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {user?.name || 'Shri Anand Kadam'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.roleTitleEn || 'Pharmacy Officer (B.Pharm)'} &bull; Reg: MSPC-2019/12/8762
            </div>
          </div>
          <Link
            href="/maha-aushadhi"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Open MahaAushadhi Inter-Facility Stock Redistribution Grid"
          >
            <Flame className="w-3.5 h-3.5 animate-pulse text-rose-200" />
            <span>MahaAushadhi Grid</span>
          </Link>
        </div>
      </div>

      {/* 2. WORKFLOW BLUEPRINT BANNER (Clear closed-loop pipeline) */}
      <div className="bg-slate-50/80 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] overflow-x-auto flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300 font-bold">
          <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>MahaAushadhi Lifecycle:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">STOCK</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">REQUEST</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">CHECK BUFFER</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">APPROVE</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">TRANSFER</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">TRACK</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">RECEIVED</span>
        </div>
      </div>

      {/* 3. NEEDS ATTENTION AREA */}
      {totalNeedsAttention > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-850 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">
                Needs Attention ({totalNeedsAttention} Action Items)
              </h4>
            </div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Operational Requisition Triage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            
            {/* 1. Pending Incoming Requests */}
            {pendingIncomingAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('INCOMING_REQUESTS')}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-left hover:border-purple-400 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                    Pending Incoming Requests
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {pendingIncomingAlerts.length} Requiring Buffer Check
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </button>
            )}

            {/* 2. Low Stock & Shortage Alerts */}
            {criticalLowStockAlerts.length > 0 && (
              <button
                onClick={() => setActiveTab('AVAILABILITY')}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between text-left hover:border-rose-400 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                    Low Stock at Nasrapur
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {criticalLowStockAlerts.length} Medicines Below Buffer
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors" />
              </button>
            )}

            {/* 3. Emergency Inbound Consignments */}
            {emergency108InboundAlerts.length > 0 ? (
              <button
                onClick={() => setActiveTab('MY_REQUESTS')}
                className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-left hover:border-blue-400 transition-colors cursor-pointer group"
              >
                <div>
                  <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    <span>108 Ambulance En Route</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {emergency108InboundAlerts[0].medicineName} ({emergency108InboundAlerts[0].requestedQuantity} units)
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-600 text-white rounded-md">
                  Verify OTP
                </span>
              </button>
            ) : (
              <div className="p-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-400">
                <span className="text-xs">No active emergency dispatches</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. PRIMARY OPERATIONAL TABS (Three Clear Views + Matrix & Dispensing) */}
      <div className="bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-1 w-full sm:w-fit overflow-x-auto">
        
        {/* Tab 1: Medicine Availability */}
        <button
          onClick={() => setActiveTab('AVAILABILITY')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'AVAILABILITY'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Pill className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap">Medicine Availability</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {facilityStocks.length}
          </span>
        </button>

        {/* View 1: Incoming Requests (OTHER PHC -> NASRAPUR PHC) */}
        <button
          onClick={() => setActiveTab('INCOMING_REQUESTS')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'INCOMING_REQUESTS'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="whitespace-nowrap">Incoming Requests</span>
          {pendingIncomingCount > 0 ? (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-rose-500 text-white animate-pulse">
              {pendingIncomingCount}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {incomingRequests.length}
            </span>
          )}
        </button>

        {/* View 2: My Requests (NASRAPUR PHC -> ANOTHER FACILITY) */}
        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'MY_REQUESTS'
              ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <ArrowUpRightIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap">My Requests</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
            {myRequests.length}
          </span>
        </button>

        {/* View 3: Transfers (Live Logistics Tracking) */}
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'TRANSFERS'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
          <span className="whitespace-nowrap">Transfers</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
            {facilityTransfers.length}
          </span>
        </button>

        {/* Tab 5: Doctor Prescriptions */}
        <button
          onClick={() => setActiveTab('DISPENSING')}
          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'DISPENSING'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap">Doctor Prescriptions</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
            3
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 5. TAB 1: MEDICINE AVAILABILITY MATRIX */}
      {/* ============================================================== */}
      {activeTab === 'AVAILABILITY' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Controls Bar: Search & Status Filter Chips */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by drug name, category, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 h-9 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All ({facilityStocks.length})
              </button>
              
              <button
                onClick={() => setStatusFilter('AVAILABLE')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'AVAILABLE'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <span>🟢 Available</span>
                <span className="opacity-80">({adequateStockCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('LOW_BUFFER')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'LOW_BUFFER'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <span>🟡 Low Buffer</span>
                <span className="opacity-80">({lowStockCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('SHORTAGE_RISK')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'SHORTAGE_RISK'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                <span>🔴 Shortage Risk</span>
                <span className="opacity-80">({shortageRiskCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('OUT_OF_STOCK')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'OUT_OF_STOCK'
                    ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>⚫ Out of Stock</span>
                <span className="opacity-80">({outOfStockCount})</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5 sm:py-3">Medicine</th>
                    <th className="px-4 py-2.5 sm:py-3">Available</th>
                    <th className="px-4 py-2.5 sm:py-3">Minimum Buffer</th>
                    <th className="px-4 py-2.5 sm:py-3">Status</th>
                    <th className="px-4 py-2.5 sm:py-3">Expiry</th>
                    <th className="px-4 py-2.5 sm:py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredStocks.length > 0 ? (
                    filteredStocks.map((stock) => {
                      const statusObj = getDrugStatus(stock.currentStock, stock.bufferStock);
                      const isBreached = stock.currentStock < stock.bufferStock;
                      const bufferPct = stock.bufferStock > 0 ? Math.round((stock.currentStock / stock.bufferStock) * 100) : 100;

                      return (
                        <tr
                          key={stock.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Medicine */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {stock.drugName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span>{stock.category}</span>
                              <span>&bull;</span>
                              <span className="font-mono text-[10px] text-slate-400">{stock.unit}</span>
                            </div>
                          </td>

                          {/* 2. Available */}
                          <td className="px-4 py-2.5 sm:py-3 font-medium">
                            <div className={`text-sm font-black ${
                              stock.currentStock === 0
                                ? 'text-slate-400'
                                : stock.currentStock <= stock.bufferStock * 0.3
                                ? 'text-rose-600 dark:text-rose-400'
                                : stock.currentStock < stock.bufferStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}>
                              {stock.currentStock.toLocaleString()}
                              <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                                {stock.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {bufferPct}% of threshold
                            </div>
                          </td>

                          {/* 3. Minimum Buffer */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                              {stock.bufferStock.toLocaleString()} {stock.unit}
                            </div>
                            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${
                                  bufferPct === 0
                                    ? 'bg-slate-400'
                                    : bufferPct <= 30
                                    ? 'bg-rose-500'
                                    : bufferPct < 100
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(bufferPct, 100)}%` }}
                              />
                            </div>
                          </td>

                          {/* 4. Status */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusObj.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dotColor}`} />
                              <span>{statusObj.labelEn}</span>
                            </span>
                          </td>

                          {/* 5. Expiry */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                              {stock.batchNumber}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Exp: {stock.expiryDate}</span>
                            </div>
                          </td>

                          {/* 6. Action */}
                          <td className="px-4 py-2.5 sm:py-3 text-right">
                            {isBreached ? (
                              <button
                                onClick={() => {
                                  setReqDrugId(stock.id);
                                  setReqQuantity(String(Math.max(10, stock.bufferStock - stock.currentStock)));
                                  setReqUrgency(stock.currentStock === 0 ? 'CRITICAL' : 'URGENT');
                                  setIsNewReqOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                                title="Request Inter-Facility Transfer via MahaAushadhi"
                              >
                                <Flame className="w-3 h-3 text-white animate-pulse" />
                                <span>Request Stock</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Adequate</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <Package className="w-8 h-8 mx-auto text-slate-400" />
                          <div className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                            No medicines match your filter
                          </div>
                          <p className="text-xs text-slate-400">
                            Try switching status filter tabs or adjusting your search term.
                          </p>
                        </div>
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
      {/* 6. VIEW 1: INCOMING REQUESTS (OTHER PHC -> NASRAPUR PHC) */}
      {/* ============================================================== */}
      {activeTab === 'INCOMING_REQUESTS' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Section Sub-header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Incoming Requisitions: Other Facilities &rarr; Nasrapur PHC
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Requisitions requesting stock withdrawal from Nasrapur PHC formulary reserves. Evaluates real-time buffer safety before approval.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {incomingRequests.length} Incoming Requisitions
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5 sm:py-3">Request ID</th>
                    <th className="px-4 py-2.5 sm:py-3">Requesting PHC</th>
                    <th className="px-4 py-2.5 sm:py-3">Medicine</th>
                    <th className="px-4 py-2.5 sm:py-3">Quantity</th>
                    <th className="px-4 py-2.5 sm:py-3">Priority</th>
                    <th className="px-4 py-2.5 sm:py-3">Status</th>
                    <th className="px-4 py-2.5 sm:py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {incomingRequests.length > 0 ? (
                    incomingRequests.map((req) => {
                      const analysis = getSafetyAnalysis(req);
                      
                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Request ID */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                              {req.id}
                            </div>
                            {req.consignmentCode && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {req.consignmentCode}
                              </div>
                            )}
                          </td>

                          {/* 2. Requesting PHC */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{req.destinationFacilityName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Requested on {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* 3. Medicine */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {req.medicineName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-xs">
                              &ldquo;{req.reason || 'Emergency replenishment requisition'}&rdquo;
                            </div>
                          </td>

                          {/* 4. Quantity */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {req.requestedQuantity}
                              <span className="text-[10px] font-normal text-slate-500 ml-1">
                                {analysis.unit}
                              </span>
                            </div>
                            {/* Quick buffer safety badge inline */}
                            <div className="mt-0.5">
                              {analysis.isSafe ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Safe (+{analysis.remainingStock - analysis.minimumBuffer})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-400">
                                  <AlertTriangle className="w-3 h-3 text-rose-500" />
                                  <span>Buffer Breach</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Priority */}
                          <td className="px-4 py-2.5 sm:py-3">
                            {req.urgency === 'CRITICAL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                                <span>CRITICAL</span>
                              </span>
                            ) : req.urgency === 'URGENT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>URGENT</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <span>ROUTINE</span>
                              </span>
                            )}
                          </td>

                          {/* 6. Status */}
                          <td className="px-4 py-2.5 sm:py-3">
                            {req.status === 'PENDING_SOURCE_APPROVAL' || req.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>Requested</span>
                              </span>
                            ) : req.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                <span>Approved</span>
                              </span>
                            ) : req.status === 'DISPATCHED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Truck className="w-3 h-3 text-purple-500" />
                                <span>On the Way</span>
                              </span>
                            ) : req.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Received</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <XCircle className="w-3 h-3 text-slate-500" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </td>

                          {/* 7. Action */}
                          <td className="px-4 py-2.5 sm:py-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedIncomingRequest(req);
                                setShowRejectInput(false);
                                setRejectReason('');
                              }}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Open Request</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <ArrowDownLeft className="w-8 h-8 mx-auto text-slate-400" />
                          <div className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                            No incoming requests addressed to Nasrapur PHC
                          </div>
                          <p className="text-xs text-slate-400">
                            When other primary health centres request stock from Nasrapur PHC, they will appear here for buffer safety validation.
                          </p>
                        </div>
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
      {/* 7. VIEW 2: MY REQUESTS (NASRAPUR PHC -> ANOTHER FACILITY) */}
      {/* ============================================================== */}
      {activeTab === 'MY_REQUESTS' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Section Sub-header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ArrowUpRightIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  My Requests: Nasrapur PHC &rarr; Supplying Facilities
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Replenishment requisitions initiated by Nasrapur PHC to District Hospitals, Medical Colleges, and Rural Hospitals.
              </p>
            </div>

            <button
              onClick={() => {
                setReqDrugId(facilityStocks.find((s) => s.currentStock < s.bufferStock)?.id || facilityStocks[0]?.id || '');
                setReqQuantity('25');
                setReqUrgency('URGENT');
                setIsNewReqOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ New Requisition</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5 sm:py-3">Medicine</th>
                    <th className="px-4 py-2.5 sm:py-3">Quantity</th>
                    <th className="px-4 py-2.5 sm:py-3">Source (Donor)</th>
                    <th className="px-4 py-2.5 sm:py-3">Destination</th>
                    <th className="px-4 py-2.5 sm:py-3">Request ID</th>
                    <th className="px-4 py-2.5 sm:py-3">Status & Lifecycle Progress</th>
                    <th className="px-4 py-2.5 sm:py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {myRequests.length > 0 ? (
                    myRequests.map((req) => {
                      const destStock = facilityStocks.find(
                        (s) => s.id === req.destinationStockId || s.drugName.toLowerCase() === req.medicineName.toLowerCase()
                      );

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Medicine */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {req.medicineName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {req.reason || 'Statutory buffer replenishment'}
                            </div>
                          </td>

                          {/* 2. Quantity */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {req.requestedQuantity}
                              <span className="text-[10px] font-normal text-slate-500 ml-1">
                                {destStock?.unit || 'Units'}
                              </span>
                            </div>
                            {req.urgency === 'CRITICAL' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                108 EMERGENCY
                              </span>
                            )}
                          </td>

                          {/* 3. Source (Donor) */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{req.sourceFacilityName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Supplying Facility</div>
                          </td>

                          {/* 4. Destination */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {req.destinationFacilityName}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                              Receiving Node (Nasrapur PHC)
                            </div>
                          </td>

                          {/* 5. Request ID */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                              {req.id}
                            </div>
                            {req.consignmentCode && (
                              <div className="text-[10px] font-mono text-slate-400">
                                {req.consignmentCode}
                              </div>
                            )}
                          </td>

                          {/* 6. Status & Visual Progress Tracker */}
                          <td className="px-4 py-2.5 sm:py-3">
                            <div className="mb-1 flex items-center gap-1.5">
                              {req.status === 'PENDING' || req.status === 'PENDING_SOURCE_APPROVAL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  <Clock className="w-3 h-3" /> REQUESTED
                                </span>
                              ) : req.status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                  <CheckCircle2 className="w-3 h-3" /> APPROVED
                                </span>
                              ) : req.status === 'DISPATCHED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 animate-pulse">
                                  <Truck className="w-3 h-3" /> ON THE WAY
                                </span>
                              ) : req.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> RECEIVED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                  <XCircle className="w-3 h-3" /> REJECTED
                                </span>
                              )}
                            </div>
                            
                            {/* Visual 4-Step Stepper */}
                            <TransferProgressTracker status={req.status} />
                          </td>

                          {/* 7. Action */}
                          <td className="px-4 py-2.5 sm:py-3 text-right">
                            {req.status === 'DISPATCHED' ? (
                              <button
                                onClick={() => {
                                  setReceivingTransfer(req);
                                  setInputOtp('');
                                  setOtpError('');
                                }}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Verify OTP & Receive</span>
                              </button>
                            ) : req.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Reconciled</span>
                              </span>
                            ) : req.status === 'APPROVED' ? (
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                                Awaiting Dispatch
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">
                                Awaiting Source Review
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        <div className="max-w-md mx-auto space-y-1.5">
                          <ArrowUpRightIcon className="w-8 h-8 mx-auto text-slate-400" />
                          <div className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                            No active requisitions created yet
                          </div>
                          <p className="text-xs text-slate-400">
                            Click &ldquo;+ New Requisition&rdquo; to request medicine replenishment from supplying facilities.
                          </p>
                        </div>
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
      {/* 8. VIEW 3: TRANSFERS & LOGISTICS */}
      {/* ============================================================== */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-600" />
                <span>MahaAushadhi Inter-Facility Consignments</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live logistics tracking for emergency medicine dispatches and receipts at Nasrapur PHC
              </p>
            </div>
            <Link
              href="/maha-aushadhi"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Full MahaAushadhi Network</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {facilityTransfers.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Truck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">No active transfer consignments</div>
              <p className="text-[11px] text-slate-400 mt-0.5">All local buffer levels are currently stable or handled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {facilityTransfers.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {t.consignmentCode || t.id}
                      </span>
                      {t.isEmergency && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          EMERGENCY 108
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      {t.requestedQuantity} Units &bull; {t.medicineName}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      From: <strong>{t.sourceFacilityName}</strong> &rarr; To: <strong>{t.destinationFacilityName}</strong>
                    </p>

                    {/* Visual Progress Stepper inside Transfer Card */}
                    <div className="pt-1">
                      <TransferProgressTracker status={t.status} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    {(t.status === 'PENDING' || t.status === 'PENDING_SOURCE_APPROVAL') && (t.sourceFacilityId === user?.facilityId || user?.facilityName?.toLowerCase().includes('nasrapur') || user?.role === 'district_officer') && (
                      <button
                        onClick={() => setSelectedIncomingRequest(t)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Review & Approve
                      </button>
                    )}
                    {t.status === 'APPROVED' && (t.sourceFacilityId === user?.facilityId || user?.facilityName?.toLowerCase().includes('nasrapur') || user?.role === 'district_officer') && (
                      <button
                        onClick={() => processStockTransfer(t.id, 'DISPATCH', undefined, { transportMode: '108_AMBULANCE' })}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Dispatch via 108
                      </button>
                    )}
                    {t.status === 'DISPATCHED' && (t.destinationFacilityId === user?.facilityId || user?.facilityName?.toLowerCase().includes('nasrapur') || user?.role === 'district_officer') && (
                      <button
                        onClick={() => {
                          setReceivingTransfer(t);
                          setInputOtp('');
                          setOtpError('');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Verify OTP & Receive</span>
                      </button>
                    )}
                    <Link
                      href="/maha-aushadhi"
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                    >
                      View Grid &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. TAB 5: DOCTOR PRESCRIPTIONS DISPENSING */}
      {/* ============================================================== */}
      {activeTab === 'DISPENSING' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Doctor Prescriptions Dispensing Queue</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Authorized PHC OPD consultations awaiting medication dispensing at Nasrapur PHC pharmacy
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: 'rx-01',
                patientName: 'Priya Sachin Kamble',
                age: 24,
                gender: 'Female',
                doctorName: 'Dr. Suresh Patil (Nasrapur PHC)',
                drugs: ['Tab. Iron & Folic Acid 1-0-0 (30 days)', 'Tab. Calcium D3 0-1-0 (30 days)'],
                status: 'READY_TO_DISPENSE',
              },
              {
                id: 'rx-02',
                patientName: 'Sanjay Tukaram Pawar',
                age: 52,
                gender: 'Male',
                doctorName: 'Dr. Suresh Patil (Nasrapur PHC)',
                drugs: ['Tab. Metformin 500mg 1-0-1 (15 days)', 'Tab. Amlodipine 5mg 1-0-0 (15 days)'],
                status: 'READY_TO_DISPENSE',
              },
              {
                id: 'rx-03',
                patientName: 'Kiran Dattatray More',
                age: 18,
                gender: 'Male',
                doctorName: 'Dr. Suresh Patil (Nasrapur PHC)',
                drugs: ['Oral Rehydration Salts (ORS) 3 packets', 'Tab. Paracetamol 500mg 1-1-1 (3 days)'],
                status: 'DISPENSED',
              },
            ].map((rx) => (
              <div
                key={rx.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {rx.patientName} ({rx.age}y, {rx.gender})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Prescribed by {rx.doctorName}</span>
                  </div>

                  <ul className="mt-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {rx.drugs.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  {rx.status === 'READY_TO_DISPENSE' ? (
                    <button
                      onClick={() => alert(`Prescription ${rx.id} marked as dispensed to ${rx.patientName} at Nasrapur PHC.`)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Dispense & Log ABDM
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dispensed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. MODAL: BUFFER SAFETY CHECK FOR INCOMING REQUESTS */}
      {/* ============================================================== */}
      {selectedIncomingRequest && (() => {
        const analysis = getSafetyAnalysis(selectedIncomingRequest);
        const { currentStock, requestedQuantity, remainingStock, minimumBuffer, unit, isSafe, isBufferBreach } = analysis;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
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

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                
                {/* Request Origin & Medicine Card */}
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

                {/* THE 4 KEY METRICS GRID */}
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    <span>Nasrapur Stock & Buffer Verification</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* 1. Current Nasrapur Stock */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Current Nasrapur Stock
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {currentStock}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">{unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">On-hand in pharmacy</div>
                    </div>

                    {/* 2. Requested Quantity */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Requested Quantity
                      </div>
                      <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {requestedQuantity}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">{unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Requisition amount</div>
                    </div>

                    {/* 3. Remaining Stock */}
                    <div className={`p-3 rounded-xl border shadow-2xs ${
                      remainingStock < minimumBuffer
                        ? 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
                        : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                    }`}>
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Remaining Stock
                      </div>
                      <div className={`text-xl font-black mt-1 ${
                        remainingStock < minimumBuffer
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {remainingStock}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">{unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Stock post-transfer</div>
                    </div>

                    {/* 4. Minimum Buffer */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Minimum Buffer
                      </div>
                      <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
                        {minimumBuffer}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">{unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Statutory reserve limit</div>
                    </div>

                  </div>
                </div>

                {/* RESULT CARD: SAFE TO TRANSFER vs BUFFER BREACH */}
                <div>
                  {isSafe ? (
                    <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-black text-sm text-emerald-900 dark:text-emerald-200">
                          🟢 SAFE TO TRANSFER
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                        Remaining stock ({remainingStock} {unit}) is at or above the minimum statutory buffer ({minimumBuffer} {unit}). Approving this transfer will not breach Nasrapur PHC emergency reserves.
                      </p>
                      <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold text-emerald-900 dark:text-emerald-200">
                        Stock: {currentStock} | Requested: {requestedQuantity} | Remaining: {remainingStock} | Minimum Buffer: {minimumBuffer}
                      </div>
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
                        Remaining stock ({remainingStock} {unit}) would fall below the required minimum statutory buffer ({minimumBuffer} {unit}). Transfer approval is BLOCKED to prevent local shortage at Nasrapur PHC.
                      </p>
                      <div className="pt-2 border-t border-rose-200 dark:border-rose-800 text-[11px] font-mono font-bold text-rose-900 dark:text-rose-200">
                        Stock: {currentStock} | Requested: {requestedQuantity} | Remaining: {remainingStock} | Minimum Buffer: {minimumBuffer}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Reject Reason Input */}
                {showRejectInput && (
                  <div className="space-y-1.5 p-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20">
                    <label className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                      Rejection Reason (Transmitted to Requesting PHC):
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

              {/* Modal Footer */}
              <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  onClick={() => setSelectedIncomingRequest(null)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {(selectedIncomingRequest.status === 'PENDING_SOURCE_APPROVAL' || selectedIncomingRequest.status === 'PENDING') && (
                    <>
                      {!showRejectInput ? (
                        <button
                          onClick={() => {
                            setShowRejectInput(true);
                            setRejectReason(isBufferBreach ? 'Statutory buffer breach at source facility (Nasrapur PHC)' : 'Unavailable for transfer');
                          }}
                          className="px-3 py-1.5 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                          Reject Request
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await processStockTransfer(selectedIncomingRequest.id, 'REJECT', rejectReason || 'Buffer breach at donor PHC');
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
                          title="Approval not allowed: Transfer would breach minimum statutory buffer"
                          className="px-4 py-1.5 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5 opacity-80"
                        >
                          <Ban className="w-4 h-4 text-rose-500" />
                          <span>Approval Blocked (Buffer Breach)</span>
                        </button>
                      )}
                    </>
                  )}

                  {selectedIncomingRequest.status === 'APPROVED' && (
                    <button
                      onClick={async () => {
                        await processStockTransfer(selectedIncomingRequest.id, 'DISPATCH', undefined, { transportMode: '108_AMBULANCE' });
                        setSelectedIncomingRequest(null);
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Dispatch via 108 Logistics</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 11. MODAL: OTP VERIFICATION FOR RECEIVING OUTBOUND CONSIGNMENTS */}
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

              {/* Demo OTP Helper Banner */}
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

              {/* OTP Input Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Enter 4-Digit Receipt OTP from 108 Dispatcher:
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
                {otpError && (
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">{otpError}</p>
                )}
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
      {/* 12. MODAL: CREATE NEW REPLENISHMENT REQUISITION */}
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
              
              {/* Select Medicine */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Medicine (Nasrapur PHC Formularies):
                </label>
                <select
                  value={reqDrugId}
                  onChange={(e) => setReqDrugId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  {facilityStocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.drugName} (Current: {stock.currentStock} / Buffer: {stock.bufferStock} {stock.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
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

              {/* Supplying Facility */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Recommended Source Facility (Donor):
                </label>
                <select
                  value={reqSourceFacilityId}
                  onChange={(e) => setReqSourceFacilityId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="fac-dh-pune">District Hospital Aundh, Pune (Surplus Stock Node)</option>
                  <option value="fac-sassoon-pune">Sassoon General Hospital & BJMC, Pune (Tertiary Centre)</option>
                  <option value="fac-rh-bhor">Bhor Rural Hospital (RH) (Taluka Hub)</option>
                </select>
              </div>

              {/* Urgency */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Priority & Urgency Tier:
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

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Clinical Indication / Reason:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surge in obstetric cases / emergency buffer restoration"
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
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
