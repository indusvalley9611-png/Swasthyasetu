'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer, RequestStatus, Facility } from '@/lib/types';
import { INITIAL_FACILITIES, resolveCanonicalFacilityName, resolveCanonicalFacility } from '@/lib/mockData';
import { findHierarchicalSupplySources, getSafeTransferableQuantity, getDistanceKm } from '@/lib/resourceManagement';
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
  RotateCcw,
  MapPin,
  Share2,
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
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Rejected / Buffer Breach</span>
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
  const { stocks, facilities, stockTransfers, processStockTransfer, createStockTransfer, forwardStockTransfer } = useSync();

  // Dynamic Facility Identity from authenticated user session
  const currentFacilityId = user?.facilityId || 'fac-phc-velhe';
  const currentFacilityName = user?.facilityName || resolveCanonicalFacilityName(currentFacilityId) || 'Primary Health Centre';
  const currentFacilityObj = useMemo(() => resolveCanonicalFacility(currentFacilityId) || facilities.find(f => f.id === currentFacilityId), [currentFacilityId, facilities]);
  const userDistrict = currentFacilityObj?.district || user?.district || 'Pune';

  // Primary active tab
  const [activeTab, setActiveTab] = useState<'AVAILABILITY' | 'INCOMING_REQUESTS' | 'MY_REQUESTS' | 'TRANSFERS' | 'DISPENSING'>('AVAILABILITY');
  const [statusFilter, setStatusFilter] = useState<StockStatusType>('ALL');
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

  // Dynamic Stocks Scoped for Authenticated Facility
  const facilityStocks = useMemo(() => {
    const directMatches = stocks.filter((s) => {
      return (
        s.facilityId === currentFacilityId ||
        (currentFacilityName && s.facilityName?.toLowerCase() === currentFacilityName.toLowerCase())
      );
    });

    if (directMatches.length > 0) return directMatches;

    // Fallback: If this facility has no stock entries yet, display standard essential formulary
    const standardDrugs = [
      { name: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', category: 'Critical Lifesaving', currentStock: 4, bufferStock: 20, unit: 'Vials (10ml)' },
      { name: 'Anti-Rabies Vaccine (ARV Purified Vero Cell)', category: 'Vaccine', currentStock: 12, bufferStock: 30, unit: 'Doses' },
      { name: 'Oxytocin Injection IP (10 IU/ml)', category: 'Maternal Health', currentStock: 45, bufferStock: 50, unit: 'Ampoules' },
      { name: 'Magnesium Sulphate 50% Inj', category: 'Maternal Health', currentStock: 8, bufferStock: 25, unit: 'Ampoules' },
      { name: 'Adrenaline Injection IP (1 mg/ml)', category: 'Critical Lifesaving', currentStock: 5, bufferStock: 30, unit: 'Ampoules' },
      { name: 'Paracetamol 500mg Tablets', category: 'Critical Lifesaving', currentStock: 1200, bufferStock: 500, unit: 'Tablets' },
      { name: 'Oral Rehydration Salts (ORS IP)', category: 'Critical Lifesaving', currentStock: 350, bufferStock: 150, unit: 'Packets' },
      { name: 'Amoxicillin 500mg Capsules', category: 'General Anti-infective', currentStock: 80, bufferStock: 200, unit: 'Capsules' },
    ];

    return standardDrugs.map((d, i) => ({
      id: `stk-${currentFacilityId}-${i + 1}`,
      facilityId: currentFacilityId,
      facilityName: currentFacilityName,
      drugName: d.name,
      category: d.category,
      currentStock: d.currentStock,
      bufferStock: d.bufferStock,
      unit: d.unit,
      batchNumber: `MH-2026-${100 + i}`,
      expiryDate: '2027-12-31',
      status: d.currentStock < d.bufferStock ? (d.currentStock <= d.bufferStock * 0.3 ? 'CRITICAL' as const : 'LOW' as const) : 'OPTIMAL' as const,
    }));
  }, [stocks, currentFacilityId, currentFacilityName]);

  // 1. DYNAMIC INCOMING REQUESTS: OTHER FACILITIES -> THIS FACILITY
  // (Source is THIS facility, Destination is another facility)
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

  // 2. DYNAMIC MY REQUESTS: THIS FACILITY -> OTHER FACILITIES
  // (Destination is THIS facility, Source is another facility)
  const myRequests = useMemo(() => {
    return stockTransfers.filter((t) => {
      const isDestThis =
        t.destinationFacilityId === currentFacilityId ||
        (t.destinationFacilityName && currentFacilityName && t.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      const isSourceOther =
        t.sourceFacilityId !== currentFacilityId &&
        (!t.sourceFacilityName || !currentFacilityName || !t.sourceFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()));
      return isDestThis && isSourceOther;
    });
  }, [stockTransfers, currentFacilityId, currentFacilityName]);

  // 3. ALL FACILITY TRANSFERS (Inbound + Outbound)
  const facilityTransfers = useMemo(() => {
    return stockTransfers.filter((t) => {
      return (
        t.sourceFacilityId === currentFacilityId ||
        t.destinationFacilityId === currentFacilityId ||
        (t.destinationFacilityName && currentFacilityName && t.destinationFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase())) ||
        (t.sourceFacilityName && currentFacilityName && t.sourceFacilityName.toLowerCase().includes(currentFacilityName.toLowerCase()))
      );
    });
  }, [stockTransfers, currentFacilityId, currentFacilityName]);

  // Available Donor Facilities (excluding current facility)
  const eligibleDonorFacilities = useMemo(() => {
    return INITIAL_FACILITIES.filter(f => f.id !== currentFacilityId);
  }, [currentFacilityId]);

  // Compute 5 Key Overview Metrics
  const activeMedicinesCount = facilityStocks.length;
  const adequateStockCount = facilityStocks.filter((s) => s.currentStock >= s.bufferStock).length;
  const lowStockCount = facilityStocks.filter((s) => s.currentStock < s.bufferStock && s.currentStock > s.bufferStock * 0.3).length;
  const shortageRiskCount = facilityStocks.filter((s) => s.currentStock <= s.bufferStock * 0.3 && s.currentStock > 0).length;
  const outOfStockCount = facilityStocks.filter((s) => s.currentStock === 0).length;
  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'PENDING_SOURCE_APPROVAL' || r.status === 'PENDING').length;
  const actionableMyRequestsCount = myRequests.filter((r) => r.status === 'DISPATCHED').length;

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

  // Buffer Safety Analysis for an incoming request at THIS facility
  const getSafetyAnalysis = (transfer: StockTransfer) => {
    const stockItem = stocks.find(
      (s) =>
        s.id === transfer.sourceStockId ||
        (s.facilityId === currentFacilityId && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase()) ||
        (s.facilityName?.toLowerCase().includes(currentFacilityName.toLowerCase()) && s.drugName.toLowerCase() === transfer.medicineName.toLowerCase())
    ) || facilityStocks.find(s => s.drugName.toLowerCase() === transfer.medicineName.toLowerCase());

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

  // Find candidate supply facilities for alternate forwarding
  const alternateSupplyCandidates = useMemo(() => {
    if (!forwardingTransfer) return [];
    const drugName = forwardingTransfer.medicineName.toLowerCase();
    
    return eligibleDonorFacilities
      .filter(fac => fac.id !== forwardingTransfer.sourceFacilityId && fac.id !== currentFacilityId)
      .map(fac => {
        const facStock = stocks.find(
          s => s.facilityId === fac.id &&
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
      .sort((a, b) => (b.surplus - a.surplus) || ((a.distance || 999) - (b.distance || 999)));
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
    const candidate = alternateSupplyCandidates.find(c => c.facility.id === selectedAlternateFacilityId);
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

  // Handle Creating New Dynamic Requisition from this Facility with Auto-Supplier Discovery
  const handleCreateRequisition = () => {
    const drugName = reqDrugName.trim();
    if (!drugName) return;
    const qty = parseInt(reqQuantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    let targetSourceId = reqSourceFacilityId;
    let sourceStock = stocks.find(
      s => s.facilityId === targetSourceId &&
      (s.drugName.toLowerCase() === drugName.toLowerCase() || s.drugName.toLowerCase().includes(drugName.toLowerCase()) || drugName.toLowerCase().includes(s.drugName.toLowerCase()))
    );
    let sourceName = targetSourceId ? resolveCanonicalFacilityName(targetSourceId) : '';
    let surplusUnits = sourceStock ? getSafeTransferableQuantity(sourceStock, stockTransfers) : 0;

    // If no manual source chosen, auto-search connected network for available surplus above statutory buffer
    if (!targetSourceId) {
      const destStock = facilityStocks.find(s => s.drugName.toLowerCase() === drugName.toLowerCase()) || {
        id: `stk-${currentFacilityId}-01`,
        facilityId: currentFacilityId,
        facilityName: currentFacilityName,
        drugName: drugName,
        category: 'Critical Lifesaving' as const,
        currentStock: 0,
        bufferStock: 20,
        unit: 'Units',
        batchNumber: 'N/A',
        expiryDate: 'N/A',
        status: 'CRITICAL' as const,
      };

      const supplyHierarchy = findHierarchicalSupplySources(
        destStock as any,
        stocks,
        stockTransfers,
        facilities,
        userDistrict,
        qty
      );

      const bestCandidate = supplyHierarchy.recommendedCandidate;
      if (bestCandidate && bestCandidate.transferable > 0) {
        targetSourceId = bestCandidate.stock.facilityId;
        sourceStock = bestCandidate.stock;
        sourceName = resolveCanonicalFacilityName(bestCandidate.stock.facilityId, bestCandidate.stock.facilityName);
        surplusUnits = bestCandidate.transferable;
      }
    }

    if (!targetSourceId || !sourceStock) {
      alert('No eligible supplier currently available in connected network with surplus above statutory buffer.');
      return;
    }

    const destStock = facilityStocks.find(s => s.drugName.toLowerCase() === drugName.toLowerCase());

    createStockTransfer({
      sourceStockId: sourceStock.id,
      destinationStockId: destStock?.id || `stk-${currentFacilityId}-01`,
      sourceFacilityId: targetSourceId,
      sourceFacilityName: sourceName,
      destinationFacilityId: currentFacilityId,
      destinationFacilityName: currentFacilityName,
      medicineName: drugName,
      requestedQuantity: qty,
      urgency: reqUrgency,
      reason: reqReason || `Replenishment requisition for ${drugName} formulary buffer restoration.`,
      donorAllocated: true,
      supplierAvailableSurplus: surplusUnits,
      isEmergency: reqUrgency === 'CRITICAL',
      transportMode: reqUrgency === 'CRITICAL' ? '108_AMBULANCE' : 'DISTRICT_MEDICAL_COURIER',
    });

    setIsNewReqOpen(false);
    setReqDrugName('');
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
              {currentFacilityName}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-700 dark:text-slate-300 font-semibold">
              {currentFacilityName} &bull; {currentFacilityObj?.taluka || 'District Node'} &bull; {userDistrict} District
            </span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              MahaAushadhi Facility-to-Facility Node Active
            </span>
          </p>
        </div>

        {/* Pharmacist profile chip & emergency grid shortcut */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {user?.name || 'Authorized Pharmacy Officer'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.roleTitleEn || 'Pharmacy Officer (B.Pharm)'} &bull; MSPC Verified
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
          <span>Facility-to-Facility Lifecycle:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">1. REQUISITION</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">2. BUFFER CHECK</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">3. APPROVE / RE-ROUTE</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">4. DISPATCH</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">5. TRACK</span>
          <span>&rarr;</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">6. OTP RECEIVE</span>
        </div>
      </div>

      {/* 3. 5 KEY SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        
        {/* Card 1: Total Formularies */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Formularies</span>
            <Pill className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {activeMedicinesCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active catalog items</div>
        </div>

        {/* Card 2: Adequate Reserves */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Safe / Adequate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {adequateStockCount}
          </div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Buffer &ge; 100%</div>
        </div>

        {/* Card 3: Low Buffer / Risk */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Buffer Deficit</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {lowStockCount + shortageRiskCount}
          </div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Below buffer threshold</div>
        </div>

        {/* Card 4: Pending Incoming Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Incoming Demands</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {pendingIncomingCount}
          </div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">From other PHCs/DH</div>
        </div>

        {/* Card 5: In-Transit / To Receive */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">In-Transit Arrivals</span>
            <Truck className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {actionableMyRequestsCount}
          </div>
          <div className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Awaiting OTP verify</div>
        </div>

      </div>

      {/* 4. TAB NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        
        {/* Tab 1: Formularies & Stock */}
        <button
          onClick={() => setActiveTab('AVAILABILITY')}
          className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'AVAILABILITY'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-blue-600 border-x border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Local Formularies & Stock</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {facilityStocks.length}
          </span>
        </button>

        {/* Tab 2: Incoming Requests (Other PHCs -> This PHC) */}
        <button
          onClick={() => setActiveTab('INCOMING_REQUESTS')}
          className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'INCOMING_REQUESTS'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-purple-600 border-x border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-purple-500" />
          <span>Incoming Demands</span>
          {pendingIncomingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold animate-pulse">
              {pendingIncomingCount}
            </span>
          )}
        </button>

        {/* Tab 3: My Outbound Requisitions (This PHC -> Supplying Hubs) */}
        <button
          onClick={() => setActiveTab('MY_REQUESTS')}
          className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'MY_REQUESTS'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-blue-600 border-x border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowUpRightIcon className="w-3.5 h-3.5 text-blue-500" />
          <span>My Requisitions</span>
          {actionableMyRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold">
              {actionableMyRequestsCount} Arriving
            </span>
          )}
        </button>

        {/* Tab 4: Transfers Audit Ledger */}
        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'TRANSFERS'
              ? 'bg-white dark:bg-slate-900 border-t-2 border-t-indigo-600 border-x border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Logistics Ledger</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {facilityTransfers.length}
          </span>
        </button>

      </div>

      {/* ============================================================== */}
      {/* 5. VIEW 0: LOCAL FORMULARIES & STOCK AVAILABILITY */}
      {/* ============================================================== */}
      {activeTab === 'AVAILABILITY' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search medicine name, category, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['ALL', 'AVAILABLE', 'LOW_BUFFER', 'SHORTAGE_RISK', 'OUT_OF_STOCK'] as StockStatusType[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}

              <button
                onClick={() => {
                  setReqDrugName(facilityStocks[0]?.drugName || '');
                  setIsNewReqOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1 shrink-0 ml-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ New Requisition</span>
              </button>
            </div>

          </div>

          {/* Formularies Table */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5">Medicine Name</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5 text-right">Current Stock</th>
                    <th className="px-4 py-2.5 text-right">Buffer Threshold</th>
                    <th className="px-4 py-2.5">Batch / Expiry</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredStocks.length > 0 ? (
                    filteredStocks.map((stock) => {
                      const status = getDrugStatus(stock.currentStock, stock.bufferStock);
                      const isCriticalOrLow = status.type === 'LOW_BUFFER' || status.type === 'SHORTAGE_RISK' || status.type === 'OUT_OF_STOCK';

                      return (
                        <tr key={stock.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <Pill className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{stock.drugName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {stock.category}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {stock.currentStock} <span className="text-[10px] font-normal text-slate-400">{stock.unit}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-500 dark:text-slate-400">
                            {stock.bufferStock} <span className="text-[10px] font-normal text-slate-400">{stock.unit}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {stock.batchNumber} &bull; {stock.expiryDate}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                              <span>{status.labelEn}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {isCriticalOrLow ? (
                              <button
                                onClick={() => {
                                  setReqDrugName(stock.drugName);
                                  setReqQuantity(String(Math.max(10, stock.bufferStock * 2 - stock.currentStock)));
                                  setIsNewReqOpen(true);
                                }}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <PlusCircle className="w-3 h-3" />
                                <span>Request Refill</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Adequate</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No formulary records match your search query.
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
      {/* 6. VIEW 1: INCOMING REQUESTS (OTHER FACILITIES -> THIS FACILITY) */}
      {/* ============================================================== */}
      {activeTab === 'INCOMING_REQUESTS' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Section Sub-header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Incoming Requisitions: Other Facilities &rarr; {currentFacilityName}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Requisitions requesting stock withdrawal from {currentFacilityName} reserves. Evaluates real-time statutory buffer safety before approval.
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
                    <th className="px-4 py-2.5">Request ID</th>
                    <th className="px-4 py-2.5">Requesting Facility</th>
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Priority</th>
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
                        <tr
                          key={req.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* 1. Request ID */}
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

                          {/* 2. Requesting Facility */}
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{req.destinationFacilityName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Requested {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </div>
                          </td>

                          {/* 3. Medicine */}
                          <td className="px-4 py-2.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {req.medicineName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 italic truncate max-w-xs">
                              &ldquo;{req.reason || 'Replenishment requisition'}&rdquo;
                            </div>
                          </td>

                          {/* 4. Quantity */}
                          <td className="px-4 py-2.5">
                            <div className="font-black text-slate-900 dark:text-white text-sm">
                              {req.requestedQuantity}
                              <span className="text-[10px] font-normal text-slate-500 ml-1">
                                {analysis.unit}
                              </span>
                            </div>
                          </td>

                          {/* 5. Priority */}
                          <td className="px-4 py-2.5">
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

                          {/* 6. Buffer Safety Badge */}
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

                          {/* 7. Status */}
                          <td className="px-4 py-2.5">
                            {req.status === 'PENDING_SOURCE_APPROVAL' || req.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>Pending Approval</span>
                              </span>
                            ) : req.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <CheckCircle2 className="w-3 h-3 text-blue-500" />
                                <span>Approved</span>
                              </span>
                            ) : req.status === 'DISPATCHED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Truck className="w-3 h-3 text-purple-500" />
                                <span>Dispatched</span>
                              </span>
                            ) : req.status === 'COMPLETED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span>Fulfilled & Received</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </td>

                          {/* 8. Action Button */}
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
                              <span>Review & Approve</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No incoming requests currently assigned to this facility.
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
      {/* 7. VIEW 2: MY OUTBOUND REQUISITIONS (THIS FACILITY -> OTHERS) */}
      {/* ============================================================== */}
      {activeTab === 'MY_REQUESTS' && (
        <div className="flex-1 flex flex-col space-y-3">
          
          {/* Section Sub-header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <ArrowUpRightIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  My Outbound Requisitions: {currentFacilityName} &rarr; Supplying Facilities
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Replenishment orders initiated by {currentFacilityName} to other PHCs, Rural Hospitals, and District Hospitals.
              </p>
            </div>

            <button
              onClick={() => {
                setReqDrugName(facilityStocks[0]?.drugName || '');
                setIsNewReqOpen(true);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Requisition</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                    <th className="px-4 py-2.5">Request ID</th>
                    <th className="px-4 py-2.5">Supplying Facility (Donor)</th>
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Quantity</th>
                    <th className="px-4 py-2.5">Lifecycle Progress</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {myRequests.length > 0 ? (
                    myRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* 1. Request ID */}
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                            {req.id}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </div>
                        </td>

                        {/* 2. Supplying Facility */}
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{req.sourceFacilityName || 'Awaiting Supplier Match'}</span>
                          </div>
                          {req.rejectionReason && (
                            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                              Rejected: {req.rejectionReason}
                            </div>
                          )}
                        </td>

                        {/* 3. Medicine */}
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {req.medicineName}
                          </div>
                          <div className="text-[10px] text-slate-400 italic truncate max-w-xs">
                            {req.reason || 'Buffer replenishment order'}
                          </div>
                        </td>

                        {/* 4. Quantity */}
                        <td className="px-4 py-2.5 font-black text-slate-900 dark:text-white">
                          {req.requestedQuantity} <span className="text-[10px] font-normal text-slate-400">Units</span>
                        </td>

                        {/* 5. Lifecycle Tracker */}
                        <td className="px-4 py-2.5">
                          <TransferProgressTracker status={req.status} />
                        </td>

                        {/* 6. Action */}
                        <td className="px-4 py-2.5 text-right">
                          {req.status === 'DISPATCHED' ? (
                            <button
                              onClick={() => {
                                setReceivingTransfer(req);
                                setInputOtp('');
                                setOtpError('');
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 animate-bounce"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Verify OTP & Receive</span>
                            </button>
                          ) : req.status === 'REJECTED' ? (
                            <button
                              onClick={() => {
                                setForwardingTransfer(req);
                                setForwardReason('Re-routing after source facility buffer breach');
                                setSelectedAlternateFacilityId(eligibleDonorFacilities[0]?.id || '');
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Find Alternate Supply</span>
                            </button>
                          ) : req.status === 'COMPLETED' ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Stock Reconciled</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setForwardingTransfer(req);
                                setForwardReason('Re-routing to faster supplying donor');
                                setSelectedAlternateFacilityId(eligibleDonorFacilities[0]?.id || '');
                              }}
                              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Share2 className="w-3 h-3 text-slate-400" />
                              <span>Re-route</span>
                            </button>
                          )}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No active requisitions created yet. Click "+ New Requisition" to request medicine replenishment.
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
      {/* 8. VIEW 3: TRANSFERS AUDIT LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'TRANSFERS' && (
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-500" />
                <span>Inter-Facility Logistics Ledger</span>
              </h3>
              <p className="text-xs text-slate-400">All inbound, outbound, and emergency transfers for {currentFacilityName}</p>
            </div>
            <span className="text-xs font-mono text-slate-500">Total: {facilityTransfers.length} records</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                  <th className="px-4 py-2.5">ID / Code</th>
                  <th className="px-4 py-2.5">Source Facility</th>
                  <th className="px-4 py-2.5">Destination Facility</th>
                  <th className="px-4 py-2.5">Medicine & Qty</th>
                  <th className="px-4 py-2.5">Priority / Mode</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {facilityTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {t.id}
                      {t.consignmentCode && <div className="text-[10px] text-slate-400">{t.consignmentCode}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">
                      {t.sourceFacilityName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200 font-medium">
                      {t.destinationFacilityName}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{t.medicineName}</div>
                      <div className="text-[10px] text-slate-400">{t.requestedQuantity} Units</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {t.transportMode || (t.isEmergency ? '108_AMBULANCE' : 'DISTRICT_COURIER')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-xs">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. MODAL: BUFFER SAFETY CHECK FOR INCOMING REQUESTS */}
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
                    <span>{currentFacilityName} Stock & Buffer Verification</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* 1. Current Stock */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        Current On-Hand Stock
                      </div>
                      <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                        {currentStock}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">{unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">In facility pharmacy</div>
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
                        Minimum Statutory Buffer
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
                        Remaining stock ({remainingStock} {unit}) is at or above the minimum statutory buffer ({minimumBuffer} {unit}). Approving this transfer will not breach {currentFacilityName} emergency reserves.
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
                        Remaining stock ({remainingStock} {unit}) would fall below statutory buffer ({minimumBuffer} {unit}). You may forward this request to an alternate facility with safe surplus.
                      </p>
                    </div>
                  )}
                </div>

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

              {/* Modal Footer */}
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
                          setForwardReason(`Forwarded by ${currentFacilityName} (insufficient surplus)`);
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
                          title="Approval not allowed: Transfer would breach minimum statutory buffer"
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
      {/* 10. MODAL: FIND ALTERNATE SUPPLY & FORWARD REQUISITION */}
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
              
              {/* Requisition Snapshot */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    ID: {forwardingTransfer.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {forwardingTransfer.urgency}
                  </span>
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {forwardingTransfer.medicineName} &bull; {forwardingTransfer.requestedQuantity} Units Required
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Recipient: <strong>{forwardingTransfer.destinationFacilityName}</strong>
                </div>
              </div>

              {/* Candidate Sourcing List */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Available Alternate Facilities in Network:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Ranked by surplus & proximity</span>
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
                          {cand.distance !== null && (
                            <span>{cand.distance} km away</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold text-xs ${cand.hasSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                          +{cand.surplus} Surplus
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {cand.currentStock} stock / {cand.bufferStock} buffer
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Forward Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Forwarding Note / Justification:
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
                <span>Forward to Selected Donor</span>
              </button>
            </div>

          </div>
        </div>
      )}

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
              
              {/* Origin Facility */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400">Requesting Facility (Recipient)</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">{currentFacilityName}</div>
              </div>

              {/* Select Medicine */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Select Medicine:
                </label>
                <select
                  value={reqDrugName}
                  onChange={(e) => setReqDrugName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Medicine --</option>
                  {facilityStocks.map((stock) => (
                    <option key={stock.id} value={stock.drugName}>
                      {stock.drugName} (Current: {stock.currentStock} / Buffer: {stock.bufferStock})
                    </option>
                  ))}
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

              {/* Supplying Facility (Donor) */}
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
                      s => s.facilityId === fac.id &&
                      reqDrugName && (s.drugName.toLowerCase() === reqDrugName.toLowerCase() || s.drugName.toLowerCase().includes(reqDrugName.toLowerCase()))
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
                  placeholder="e.g. Surge in cases / emergency buffer restoration"
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
