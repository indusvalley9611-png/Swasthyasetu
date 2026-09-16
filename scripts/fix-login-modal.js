const fs = require('fs');

const modalCode = `'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import {
  INITIAL_FACILITIES,
  resolveCanonicalFacilityName,
  isValidCanonicalFacilityId,
} from '@/lib/mockData';
import { findHierarchicalSupplySources } from '@/lib/resourceManagement';
import { CreateReplenishmentItemInput } from '@/lib/types';
import {
  X,
  Plus,
  Trash2,
  Boxes,
  Building2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MedicineRow {
  id: string;
  drugName: string;
  quantity: number;
  unit: string;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  reason: string;
  selectedStockId?: string;
}

interface NewReplenishmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCreated: (requestId: string) => void;
}

export function NewReplenishmentRequestModal({
  isOpen,
  onClose,
  onRequestCreated,
}: NewReplenishmentRequestModalProps) {
  const { user, role } = useAuth();
  const {
    stocks,
    stockTransfers,
    facilities,
    createReplenishmentRequest,
    createStockTransfer,
    linkTransferToRequestItem,
  } = useSync();

  const defaultFacilityId = user?.facilityId || 'fac-phc-velhe';
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(defaultFacilityId);
  const [requestNotes, setRequestNotes] = useState<string>('Facility medicine replenishment order');
  const [overallUrgency, setOverallUrgency] = useState<'ROUTINE' | 'URGENT' | 'CRITICAL'>('CRITICAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isHighLevelAdmin = ['district_officer', 'state_admin', 'national_admin'].includes(role || '');
  const availableFacilities = useMemo(() => {
    if (!isHighLevelAdmin && user?.facilityId) {
      return INITIAL_FACILITIES.filter(f => f.id === user.facilityId);
    }
    if (user?.district) {
      return INITIAL_FACILITIES.filter(f => f.district === user.district || f.type.includes('Reserve'));
    }
    return INITIAL_FACILITIES;
  }, [isHighLevelAdmin, user]);

  const facilityStocks = useMemo(() => {
    return stocks.filter(s => s.facilityId === selectedFacilityId);
  }, [stocks, selectedFacilityId]);

  const [rows, setRows] = useState<MedicineRow[]>([
    {
      id: 'row-init-0',
      drugName: facilityStocks[0]?.drugName || 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
      quantity: 10,
      unit: facilityStocks[0]?.unit || 'Vials',
      urgency: 'CRITICAL',
      reason: 'Buffer replenishment requisition',
      selectedStockId: facilityStocks[0]?.id,
    },
  ]);

  if (!isOpen) return null;

  const isAsha = role === 'asha';
  if (isAsha) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Role Access Restriction</h3>
          <p className="text-xs text-slate-500">
            ASHA field workers are not authorized to create pharmacy replenishment requests. Please contact your Primary Health Centre Medical Officer.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleAddRow = () => {
    const newRow: MedicineRow = {
      id: 'row-' + Date.now() + '-' + rows.length,
      drugName: '',
      quantity: 10,
      unit: 'units',
      urgency: 'URGENT',
      reason: 'Facility replenishment',
    };
    setRows(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      setErrorMessage('A request must contain at least one medicine item.');
      return;
    }
    setRows(prev => prev.filter(r => r.id !== rowId));
    setErrorMessage('');
  };

  const handleRowChange = (rowId: string, field: keyof MedicineRow, value: any) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        const updated = { ...row, [field]: value };
        if (field === 'drugName') {
          const matchedStock = facilityStocks.find(s => s.drugName === value);
          if (matchedStock) {
            updated.unit = matchedStock.unit;
            updated.selectedStockId = matchedStock.id;
          }
        }
        return updated;
      })
    );
    setErrorMessage('');
  };

  const handleSubmitRequest = async () => {
    setErrorMessage('');
    if (!isValidCanonicalFacilityId(selectedFacilityId)) {
      setErrorMessage('Please select a valid canonical destination facility.');
      return;
    }

    if (rows.length === 0) {
      setErrorMessage('Please add at least one medicine line item.');
      return;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.drugName.trim()) {
        setErrorMessage('Item #' + (i + 1) + ': Please specify a medicine name.');
        return;
      }
      if (!r.quantity || r.quantity <= 0) {
        setErrorMessage('Item #' + (i + 1) + ' (' + r.drugName + '): Quantity must be greater than 0.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const authRes = await fetch('/api/authorize-mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_REPLENISHMENT_REQUEST',
          resource: {
            destinationFacilityId: selectedFacilityId,
            items: rows.map(r => ({
              medicineName: r.drugName.trim(),
              requestedQuantity: Number(r.quantity),
              unit: r.unit,
              urgency: r.urgency,
            })),
          },
        }),
      });

      if (!authRes.ok) {
        const errorData = await authRes.json().catch(() => ({}));
        if (authRes.status === 403 || authRes.status === 401) {
          setErrorMessage(errorData.error || 'Server authorization failed for this facility.');
          setIsSubmitting(false);
          return;
        }
      }

      const destFacilityName = resolveCanonicalFacilityName(selectedFacilityId);
      const itemInputs: CreateReplenishmentItemInput[] = rows.map(r => ({
        stockId: r.selectedStockId || 'stk-custom-' + Date.now(),
        medicineName: r.drugName.trim(),
        currentStock: 0,
        bufferStock: 0,
        requestedQuantity: Number(r.quantity),
        unit: r.unit || 'units',
        urgency: r.urgency,
        reason: r.reason || 'MahaAushadhi Requisition',
      }));

      const createdRequest = createReplenishmentRequest(
        { facilityId: selectedFacilityId, facilityName: destFacilityName },
        { id: user?.id || 'user-phc-01', name: user?.name || 'Medical Officer' },
        itemInputs,
        overallUrgency,
        requestNotes
      );

      if (!createdRequest) {
        setErrorMessage('Could not generate replenishment request. Please verify inputs.');
        setIsSubmitting(false);
        return;
      }

      const activeDistrict = user?.district || 'Pune';
      createdRequest.items.forEach(item => {
        const matchingStock = stocks.find(
          s => s.facilityId === selectedFacilityId && s.drugName.toLowerCase().includes(item.medicineName.toLowerCase())
        ) || {
          id: item.stockId,
          facilityId: selectedFacilityId,
          facilityName: destFacilityName,
          drugName: item.medicineName,
          category: 'Critical Lifesaving',
          currentStock: 0,
          bufferStock: item.requestedQuantity * 2,
          unit: item.unit,
          batchNumber: 'N/A',
          expiryDate: 'N/A',
          status: 'CRITICAL',
        };

        const supplyHierarchy = findHierarchicalSupplySources(
          matchingStock as any,
          stocks,
          stockTransfers,
          facilities,
          activeDistrict
        );

        const bestCandidate = supplyHierarchy.recommendedCandidate;
        if (bestCandidate) {
          const transfer = createStockTransfer({
            medicineName: item.medicineName,
            sourceStockId: bestCandidate.stock.id,
            destinationStockId: item.stockId,
            sourceFacilityId: bestCandidate.stock.facilityId,
            sourceFacilityName: resolveCanonicalFacilityName(bestCandidate.stock.facilityId, bestCandidate.stock.facilityName),
            destinationFacilityId: selectedFacilityId,
            destinationFacilityName: destFacilityName,
            requestedQuantity: item.requestedQuantity,
            urgency: item.urgency,
            reason: item.reason,
            isEmergency: overallUrgency === 'CRITICAL',
            donorAllocated: true,
            allocatedByDistrictUserId: user?.id,
            allocatedByDistrictUserName: user?.name,
            allocatedAt: new Date().toISOString(),
            supplyTier: bestCandidate.tier,
            requestId: createdRequest.id,
            requestItemId: item.id,
          });

          if (transfer) {
            linkTransferToRequestItem(createdRequest.id, item.id, transfer);
          }
        }
      });

      setIsSubmitting(false);
      onRequestCreated(createdRequest.id);
      onClose();
    } catch (err: any) {
      console.error('[MAHAAUSHADHI] Failed to create request:', err);
      setErrorMessage(err.message || 'An error occurred while creating the request.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  MahaAushadhi
                </span>
                <span className="text-xs text-slate-400 font-mono">1..N Requisition</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                New Medicine Replenishment Order
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Destination Facility & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Destination Facility</span>
              </label>
              {isHighLevelAdmin ? (
                <select
                  value={selectedFacilityId}
                  onChange={e => setSelectedFacilityId(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  {availableFacilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white truncate">
                  {resolveCanonicalFacilityName(selectedFacilityId)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ROUTINE', 'URGENT', 'CRITICAL'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setOverallUrgency(lvl)}
                    className={'py-2 px-2 text-[11px] font-black rounded-xl border transition-all cursor-pointer ' + (
                      overallUrgency === lvl
                        ? lvl === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : lvl === 'URGENT'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 1..N Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Medicine Line Items ({rows.length})
              </span>
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Medicine</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-slate-400">
                      LINE ITEM #{idx + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Remove medicine line item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        list={'med-list-' + row.id}
                        value={row.drugName}
                        onChange={e => handleRowChange(row.id, 'drugName', e.target.value)}
                        placeholder="e.g. Anti-Snake Venom, Oxytocin..."
                        className="w-full text-xs font-bold p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                      <datalist id={'med-list-' + row.id}>
                        {facilityStocks.map(s => (
                          <option key={s.id} value={s.drugName} />
                        ))}
                        <option value="Anti-Snake Venom (ASV Polyvalent Lyophilized)" />
                        <option value="Anti-Rabies Vaccine (ARV Purified Vero Cell)" />
                        <option value="Oxytocin Injection IP (10 IU/ml)" />
                        <option value="Magnesium Sulphate 50% Inj" />
                        <option value="Adrenaline Injection IP (1 mg/ml)" />
                        <option value="Human Insulin Regular (100 IU/ml)" />
                        <option value="Medical Oxygen D-Type Cylinders (46.7L)" />
                        <option value="Artemether + Lumefantrine Inj (Severe Malaria)" />
                        <option value="Paracetamol Tablets IP (500 mg)" />
                        <option value="Amoxicillin Capsules IP (500 mg)" />
                        <option value="Oral Rehydration Salts (ORS IP 21.8g)" />
                      </datalist>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={e => handleRowChange(row.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full text-xs font-black p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={row.unit}
                        onChange={e => handleRowChange(row.id, 'unit', e.target.value)}
                        placeholder="Vials, Doses..."
                        className="w-full text-xs font-medium p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Request Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Clinical Notes / Requisition Purpose
            </label>
            <input
              type="text"
              value={requestNotes}
              onChange={e => setRequestNotes(e.target.value)}
              placeholder="e.g. Seasonal surge in snakebite cases, maternity emergency stock buffer..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Statutory Buffer Guarantee Badge */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>MahaAushadhi Invariant:</strong> Creating this parent requisition will record a formal supply need. Stock will <em>only</em> be decremented from donor facilities upon verified physical receipt.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span>Submitting Order...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Submit Replenishment Order ({rows.length} Medicines)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('components/maha-aushadhi/NewReplenishmentRequestModal.tsx', modalCode, 'utf8');
console.log('Successfully written components/maha-aushadhi/NewReplenishmentRequestModal.tsx');

