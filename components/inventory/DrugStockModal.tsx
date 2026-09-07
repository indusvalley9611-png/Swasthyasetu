'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem } from '@/lib/types';
import {
  X,
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Package,
  Plus,
  Minus,
} from 'lucide-react';

interface DrugStockModalProps {
  onClose: () => void;
}

export function DrugStockModal({ onClose }: DrugStockModalProps) {
  const { language, t } = useLanguage();
  const { stocks, updateDrugStock, requestStockTransfer } = useSync();

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [showRequisitionForm, setShowRequisitionForm] = useState<boolean>(false);
  const [selectedDrug, setSelectedDrug] = useState<string>('Anti-Snake Venom (ASV Polyvalent Lyophilized)');
  const [requestQty, setRequestQty] = useState<number>(10);
  const [targetFacility, setTargetFacility] = useState<string>('District Hospital Aundh, Pune');

  const categories = ['All', 'Critical Lifesaving', 'Maternal Health', 'Vaccine', 'Emergency Gas'];

  const filteredStocks = stocks.filter((s) => {
    if (filterCategory === 'All') return true;
    return s.category === filterCategory;
  });

  const handleRequisitionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestStockTransfer(selectedDrug, requestQty, targetFacility);
    setShowRequisitionForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-bold text-base">{t('emergencyStock')}</h3>
              <p className="text-xs text-slate-400">
                {language === 'mr'
                  ? 'सर्पविष प्रतिबंधक लस, रेबीज लस, ऑक्सिटोसिन व ऑक्सिजन सिलिंडर साठा'
                  : 'Anti-Snake Venom, Rabies, Oxytocin & Life-Saving Drug Reserves'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRequisitionForm(!showRequisitionForm)}
              className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{showRequisitionForm ? 'View Stock Ledger' : t('requestStock')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Requisition Drawer Form */}
        {showRequisitionForm && (
          <div className="bg-blue-50/90 border-b border-blue-200 p-5 animate-in slide-in-from-top-2">
            <h4 className="font-bold text-blue-950 text-xs mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-700" />
              <span>
                {language === 'mr'
                  ? 'जिल्हा गोदामाकडून तातडीची औषध पुरवठा मागणी (Emergency Requisition)'
                  : 'Inter-Facility Stock Requisition from District Warehouse'}
              </span>
            </h4>
            <form onSubmit={handleRequisitionSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Select Medicine</label>
                <select
                  value={selectedDrug}
                  onChange={(e) => setSelectedDrug(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Anti-Snake Venom (ASV Polyvalent Lyophilized)">
                    Anti-Snake Venom (ASV Polyvalent Lyophilized)
                  </option>
                  <option value="Anti-Rabies Vaccine (ARV Purified Vero Cell)">
                    Anti-Rabies Vaccine (ARV Purified Vero Cell)
                  </option>
                  <option value="Oxytocin Injection IP (10 IU/ml)">Oxytocin Injection IP (10 IU/ml)</option>
                  <option value="Magnesium Sulphate 50% Inj">Magnesium Sulphate 50% Inj</option>
                  <option value="Medical Oxygen D-Type Cylinders">Medical Oxygen D-Type Cylinders</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={requestQty}
                  onChange={(e) => setRequestQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg shadow transition-colors"
                >
                  Dispatch Requisition
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Pills */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Buffer Threshold Alert at &lt;25%
          </span>
        </div>

        {/* Stock Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Medicine Name</th>
                  <th className="px-3 py-2.5">Facility</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Stock / Buffer</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Quick Stock Mod</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.map((stk) => {
                  const percentOfBuffer = Math.round((stk.currentStock / stk.bufferStock) * 100);

                  return (
                    <tr key={stk.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{stk.drugName}</div>
                        <div className="text-[10px] text-slate-500">
                          Batch: {stk.batchNumber} • Exp: {stk.expiryDate}
                        </div>
                      </td>

                      <td className="px-3 py-3 font-medium text-slate-700">{stk.facilityName}</td>

                      <td className="px-3 py-3">
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                          {stk.category}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-slate-900">
                          {stk.currentStock} {stk.unit}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Buffer: {stk.bufferStock} ({percentOfBuffer}%)
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {stk.status === 'CRITICAL' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded-full text-[10px] border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            CRITICAL SHORTAGE
                          </span>
                        ) : stk.status === 'LOW' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px] border border-amber-300">
                            <AlertTriangle className="w-3 h-3" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            OPTIMAL
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => updateDrugStock(stk.id, stk.currentStock - 1)}
                            disabled={stk.currentStock <= 0}
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 disabled:opacity-30"
                            title="Dispense 1 unit (-1)"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => updateDrugStock(stk.id, stk.currentStock + 5)}
                            className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700"
                            title="Restock 5 units (+5)"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{language === 'mr' ? 'महाराष्ट्र वैद्यकीय वस्तू खरेदी प्राधिकरण (MMGCL) साठा व्यवस्थापन' : 'Integrated with Maha Medical Goods Procurement (e-Aushadhi)'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            {language === 'mr' ? 'बंद करा' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
