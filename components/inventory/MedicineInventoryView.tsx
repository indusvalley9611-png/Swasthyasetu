'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightLeft,
  CheckCircle2,
  Flame,
  PackageSearch,
  Search,
  X,
  Package,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Pill,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer, Facility } from '@/lib/types';
import {
  findHierarchicalSupplySources,
  getMedicineStatus,
  isExpiringSoon,
} from '@/lib/resourceManagement';
import { resolveCanonicalFacilityName, resolveCanonicalFacility } from '@/lib/mockData';

type Filter = 'ALL' | 'LOW' | 'EXPIRING';
const statusColor = {
  HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  LIMITED: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export function MedicineInventoryView() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const {
    stocks,
    facilities,
    medicineRequests,
    stockTransfers,
    createMedicineRequest,
    createStockTransfer,
    processStockTransfer,
  } = useSync();

  const workspaceId = user?.facilityId || facilities[0]?.id || '';
  const workspace = facilities.find((f) => f.id === workspaceId);
  const workspaceName = user?.facilityName || workspace?.name || 'Primary Health Centre';
  const userDistrict = workspace?.district || user?.district || 'Pune';

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  // Modals
  const [requesting, setRequesting] = useState<DrugStockItem | null>(null);
  const [supplyFor, setSupplyFor] = useState<DrugStockItem | null>(null);

  // Inventory scoped to this facility
  const inventory = useMemo(() => {
    const directMatches = stocks.filter(
      (s) =>
        s.facilityId === workspaceId ||
        (workspaceName && s.facilityName?.toLowerCase() === workspaceName.toLowerCase())
    );

    if (directMatches.length > 0) return directMatches;

    // Fallback: standard essential formulary if no stock entries yet
    const standardDrugs: Array<{
      name: string;
      category: DrugStockItem['category'];
      currentStock: number;
      bufferStock: number;
      unit: string;
    }> = [
      { name: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', category: 'Critical Lifesaving', currentStock: 4, bufferStock: 20, unit: 'Vials (10ml)' },
      { name: 'Anti-Rabies Vaccine (ARV Purified Vero Cell)', category: 'Vaccine', currentStock: 12, bufferStock: 30, unit: 'Doses' },
      { name: 'Oxytocin Injection IP (10 IU/ml)', category: 'Maternal Health', currentStock: 45, bufferStock: 50, unit: 'Ampoules' },
      { name: 'Magnesium Sulphate 50% Inj', category: 'Maternal Health', currentStock: 8, bufferStock: 25, unit: 'Ampoules' },
      { name: 'Adrenaline Injection IP (1 mg/ml)', category: 'Critical Lifesaving', currentStock: 5, bufferStock: 30, unit: 'Ampoules' },
      { name: 'Paracetamol 500mg Tablets', category: 'Critical Lifesaving', currentStock: 1200, bufferStock: 500, unit: 'Tablets' },
      { name: 'Oral Rehydration Salts (ORS IP)', category: 'Critical Lifesaving', currentStock: 350, bufferStock: 150, unit: 'Packets' },
      { name: 'Amoxicillin 500mg Capsules', category: 'General Anti-infective', currentStock: 80, bufferStock: 200, unit: 'Capsules' },
    ];

    return standardDrugs.map((d, i): DrugStockItem => ({
      id: `stk-${workspaceId}-${i + 1}`,
      facilityId: workspaceId,
      facilityName: workspaceName,
      drugName: d.name,
      category: d.category,
      currentStock: d.currentStock,
      bufferStock: d.bufferStock,
      unit: d.unit,
      batchNumber: `MH-2026-${100 + i}`,
      expiryDate: '2027-12-31',
      status: d.currentStock < d.bufferStock ? (d.currentStock <= d.bufferStock * 0.3 ? 'CRITICAL' as const : 'LOW' as const) : 'OPTIMAL' as const,
    }));
  }, [stocks, workspaceId, workspaceName]);

  const rows = useMemo(
    () =>
      inventory.filter((stock) => {
        const matches = `${stock.drugName} ${stock.category}`
          .toLowerCase()
          .includes(search.toLowerCase());
        if (!matches) return false;
        if (filter === 'LOW') return getMedicineStatus(stock) !== 'HEALTHY';
        if (filter === 'EXPIRING') return isExpiringSoon(stock.expiryDate);
        return true;
      }),
    [inventory, search, filter]
  );

  // Summary counts
  const critical = inventory.filter((s) => getMedicineStatus(s) === 'CRITICAL').length;
  const limited = inventory.filter((s) => getMedicineStatus(s) === 'LIMITED').length;
  const healthy = inventory.filter((s) => getMedicineStatus(s) === 'HEALTHY').length;
  const expiringSoon = inventory.filter((s) => isExpiringSoon(s.expiryDate)).length;

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-500" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {language === 'mr' ? 'औषध साठा नोंदवही' : 'Medicine Inventory'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {workspaceName} — {language === 'mr' ? 'सध्याचा साठा, बफर, बॅच व एक्सपायरी' : 'Current stock, minimum buffer, batch & expiry status'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">Critical</p>
            <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">{critical}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Low Buffer</p>
            <p className="mt-1 text-2xl font-black text-amber-700 dark:text-amber-300">{limited}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Healthy</p>
            <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">{healthy}</p>
          </div>
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">Expiring Soon</p>
            <p className="mt-1 text-2xl font-black text-violet-700 dark:text-violet-300">{expiringSoon}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'mr' ? 'औषध शोधा...' : 'Search medicine name or category...'}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter(filter === 'LOW' ? 'ALL' : 'LOW')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filter === 'LOW'
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <AlertTriangle className="inline w-3 h-3 mr-1" />
              Low / Critical
            </button>
            <button
              onClick={() => setFilter(filter === 'EXPIRING' ? 'ALL' : 'EXPIRING')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                filter === 'EXPIRING'
                  ? 'bg-violet-700 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Clock className="inline w-3 h-3 mr-1" />
              Expiring Soon
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="p-3">Medicine</th>
                <th className="p-3 text-right">Current / Buffer</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Expiry</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((stock) => {
                const status = getMedicineStatus(stock);
                const criticalOrLow = status !== 'HEALTHY';
                const expiring = isExpiringSoon(stock.expiryDate);
                return (
                  <tr key={stock.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <p className="font-bold text-slate-900 dark:text-white">{stock.drugName}</p>
                      <p className="text-xs text-slate-500">{stock.category}</p>
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-black ${criticalOrLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {stock.currentStock}
                      </span>
                      <span className="text-xs font-normal text-slate-500"> / {stock.bufferStock} {stock.unit}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {stock.batchNumber}
                    </td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                      {stock.expiryDate}
                      {expiring && (
                        <span className="ml-1 text-[9px] font-bold text-violet-600 dark:text-violet-400">⚠ EXPIRY</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusColor[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setRequesting(stock)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Request Refill
                        </button>
                        {criticalOrLow && (
                          <button
                            onClick={() => setSupplyFor(stock)}
                            className="rounded-lg bg-indigo-700 hover:bg-indigo-800 px-2.5 py-1.5 text-xs font-bold text-white transition-colors"
                          >
                            Find Supply
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm text-slate-500">
                    {language === 'mr' ? 'या फिल्टरसाठी कोणतेही रेकॉर्ड नाही.' : 'No inventory records match this filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total count */}
        <p className="text-xs text-slate-500 text-right">
          Showing {rows.length} of {inventory.length} medicines
        </p>
      </div>

      {/* Request Refill Modal */}
      {requesting && (
        <RefillModal
          stock={requesting}
          onClose={() => setRequesting(null)}
          onSubmit={(quantity, urgency, reason) => {
            createMedicineRequest({
              destinationFacilityId: workspaceId,
              destinationFacilityName: workspaceName,
              requestedByUserId: user?.id ?? '',
              requestedByUserName: user?.name ?? '',
              urgency,
              items: [
                {
                  stockId: requesting.id,
                  medicineName: requesting.drugName,
                  currentStock: requesting.currentStock,
                  bufferStock: requesting.bufferStock,
                  requestedQuantity: quantity,
                  unit: requesting.unit,
                  urgency,
                  reason,
                },
              ],
            });
            setRequesting(null);
          }}
        />
      )}

      {/* Find Supply Modal */}
      {supplyFor && (
        <SupplyModal
          destination={supplyFor}
          stocks={stocks}
          facilities={facilities}
          transfers={stockTransfers}
          userDistrict={userDistrict}
          workspaceName={workspaceName}
          onClose={() => setSupplyFor(null)}
          onRequestRefill={() => {
            setRequesting(supplyFor);
            setSupplyFor(null);
          }}
          onSubmit={(source, quantity, urgency, reason, tier) => {
            const created = createStockTransfer({
              medicineName: supplyFor.drugName,
              sourceStockId: source.id,
              destinationStockId: supplyFor.id,
              sourceFacilityId: source.facilityId,
              sourceFacilityName: source.facilityName,
              destinationFacilityId: supplyFor.facilityId,
              destinationFacilityName: supplyFor.facilityName,
              requestedQuantity: quantity,
              urgency,
              reason,
              supplyTier: tier,
            });
            if (created) setSupplyFor(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Request Refill Modal ───────────────────────────────────────────── */
function RefillModal({
  stock,
  onClose,
  onSubmit,
}: {
  stock: DrugStockItem;
  onClose: () => void;
  onSubmit: (quantity: number, urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL', reason: string) => void;
}) {
  const [quantity, setQuantity] = useState(Math.max(1, stock.bufferStock - stock.currentStock));
  const [reason, setReason] = useState('Restore minimum buffer stock.');
  const urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' =
    getMedicineStatus(stock) === 'CRITICAL' ? 'CRITICAL' : 'URGENT';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Request Central Refill</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          District supply coordination request for <b>{stock.drugName}</b>
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold">
            Quantity
            <input
              min="1"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"
            />
          </label>
          <label className="block text-sm font-bold">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 font-bold">Cancel</button>
          <button
            disabled={quantity <= 0 || !reason.trim()}
            onClick={() => onSubmit(quantity, urgency, reason)}
            className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white disabled:opacity-40"
          >
            Create Refill Request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Find Supply Modal ──────────────────────────────────────────────── */
function SupplyModal({
  destination,
  stocks,
  facilities,
  transfers,
  userDistrict,
  workspaceName,
  onClose,
  onRequestRefill,
  onSubmit,
}: {
  destination: DrugStockItem;
  stocks: DrugStockItem[];
  facilities: Facility[];
  transfers: StockTransfer[];
  userDistrict: string;
  workspaceName: string;
  onClose: () => void;
  onRequestRefill: () => void;
  onSubmit: (source: DrugStockItem, quantity: number, urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL', reason: string, tier: 'PHC' | 'DISTRICT') => void;
}) {
  const result = findHierarchicalSupplySources(destination, stocks, transfers, facilities, userDistrict);
  const allCandidates = [...result.phcCandidates, ...result.districtCandidates];
  const recommendedId = result.recommendedCandidate?.stock.id ?? '';
  const [sourceId, setSourceId] = useState(recommendedId);
  const sourceCandidate = allCandidates.find((c) => c.stock.id === sourceId);
  const need = Math.max(0, destination.bufferStock - destination.currentStock);
  const [quantity, setQuantity] = useState(need);
  const [reason, setReason] = useState('Emergency stock shortage');
  const urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' =
    getMedicineStatus(destination) === 'CRITICAL' ? 'CRITICAL' : 'URGENT';
  const limit = sourceCandidate?.transferable ?? 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">FIND SUPPLY SOURCE</p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{destination.drugName}</h3>
            <p className="text-sm font-bold text-slate-500">{workspaceName}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold text-slate-500">Current</p>
            <p className="text-lg font-black">{destination.currentStock}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">Required</p>
            <p className="text-lg font-black">{destination.bufferStock}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-rose-600">Shortage</p>
            <p className="text-lg font-black text-rose-600">{need}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-lg border p-3 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-500">PHC / FACILITY SOURCES</p>
            {result.phcAvailableUnits > 0 ? (
              <div className="mt-2 space-y-2">
                {result.phcCandidates
                  .filter((c) => c.isAvailable)
                  .map((c) => (
                    <button
                      key={c.stock.id}
                      onClick={() => setSourceId(c.stock.id)}
                      className={`w-full rounded-xl border p-2 text-left text-sm ${
                        sourceId === c.stock.id
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between">
                        <b>{c.stock.facilityName}</b>
                        <span className="font-black text-emerald-700">Available: {c.transferable}</span>
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="mt-1 text-sm font-bold text-slate-400">No safe surplus available at PHC level</p>
            )}
          </div>

          <div className="rounded-lg border p-3 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-500">DISTRICT SUPPLY SOURCES</p>
            {result.districtAvailableUnits > 0 ? (
              <div className="mt-2 space-y-2">
                {result.districtCandidates
                  .filter((c) => c.isAvailable)
                  .map((c) => (
                    <button
                      key={c.stock.id}
                      onClick={() => setSourceId(c.stock.id)}
                      className={`w-full rounded-xl border p-2 text-left text-sm ${
                        sourceId === c.stock.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between">
                        <b>{c.stock.facilityName}</b>
                        <span className="font-black text-blue-700">Available: {c.transferable}</span>
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="mt-1 text-sm font-bold text-slate-400">No district supply available</p>
            )}
          </div>
        </div>

        {sourceCandidate ? (
          <div className="mt-6 border-t pt-4 dark:border-slate-800">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Requested quantity (max {limit})
                <input
                  type="number"
                  min="1"
                  max={limit}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"
                />
              </label>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <b>Urgency</b>
                <br />
                {urgency}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-rose-50 p-4 border border-rose-200 text-center dark:bg-rose-950/30 dark:border-rose-900">
            <p className="font-bold text-rose-800 dark:text-rose-300">No supply currently available.</p>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">Request replenishment instead</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 font-bold">
            Cancel
          </button>
          {sourceCandidate ? (
            <button
              disabled={quantity <= 0 || quantity > limit || !reason.trim()}
              onClick={() =>
                onSubmit(sourceCandidate.stock, quantity, urgency, reason, sourceCandidate.tier)
              }
              className={`rounded-lg px-3 py-2 font-bold text-white disabled:opacity-40 ${
                sourceCandidate.tier === 'DISTRICT' ? 'bg-blue-700' : 'bg-emerald-700'
              }`}
            >
              REQUEST FROM {sourceCandidate.tier}
            </button>
          ) : (
            <button
              onClick={onRequestRefill}
              className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white"
            >
              Request Refill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
