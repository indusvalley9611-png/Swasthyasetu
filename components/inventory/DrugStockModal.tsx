'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRightLeft, CheckCircle2, Flame, PackageSearch, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer, Facility } from '@/lib/types';
import { findHierarchicalSupplySources, getMedicineStatus, isExpiringSoon } from '@/lib/resourceManagement';
import { resolveCanonicalFacilityName } from '@/lib/mockData';

interface DrugStockModalProps { onClose: () => void; }
type Filter = 'ALL' | 'LOW' | 'EXPIRING';
const statusColor = { HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-200', LIMITED: 'bg-amber-100 text-amber-800 border-amber-200', CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200' };

export function DrugStockModal({ onClose }: DrugStockModalProps) {
  const { user } = useAuth();
  const { stocks, facilities, medicineRequests, stockTransfers, createMedicineRequest, createStockTransfer, processStockTransfer } = useSync();
  const workspaceId = user?.facilityId || facilities[0]?.id || '';
  const workspace = facilities.find(facility => facility.id === workspaceId);
  const userDistrict = workspace?.district || user?.district || 'Pune';
  
  const [search, setSearch] = useState(''); 
  const [filter, setFilter] = useState<Filter>('ALL');
  const [historyQuery, setHistoryQuery] = useState(''); 
  const [historyStatus, setHistoryStatus] = useState('ALL'); 
  const [historyUrgency, setHistoryUrgency] = useState('ALL'); 
  const [historyDate, setHistoryDate] = useState('');
  
  const [requesting, setRequesting] = useState<DrugStockItem | null>(null); 
  const [supplyFor, setSupplyFor] = useState<DrugStockItem | null>(null); 
  const [reviewing, setReviewing] = useState<StockTransfer | null>(null);
  const [confirmation, setConfirmation] = useState<{ transfer: StockTransfer; action: 'DISPATCH' | 'RECEIVE' } | null>(null);

  const inventory = stocks.filter(stock => stock.facilityId === workspaceId);
  const rows = useMemo(() => inventory.filter(stock => { 
    const matches = `${stock.drugName} ${stock.category}`.toLowerCase().includes(search.toLowerCase()); 
    if (!matches) return false; 
    if (filter === 'LOW') return getMedicineStatus(stock) !== 'HEALTHY'; 
    if (filter === 'EXPIRING') return isExpiringSoon(stock.expiryDate); 
    return true; 
  }), [inventory, search, filter]);

  // Incoming requests: Other facilities requesting medicine FROM this PHC (source = this PHC)
  const incoming = stockTransfers.filter(transfer => transfer.sourceFacilityId === workspaceId && !['COMPLETED', 'REJECTED'].includes(transfer.status));
  // Outgoing requests: Requests made BY this PHC to other facilities (destination = this PHC)
  const outgoing = stockTransfers.filter(transfer => transfer.destinationFacilityId === workspaceId && !['COMPLETED', 'REJECTED'].includes(transfer.status));
  const completed = stockTransfers.filter(transfer => {
    if (transfer.sourceFacilityId !== workspaceId && transfer.destinationFacilityId !== workspaceId) return false;
    if (historyStatus !== 'ALL' && transfer.status !== historyStatus) return false;
    if (historyUrgency !== 'ALL' && transfer.urgency !== historyUrgency) return false;
    if (historyDate && !transfer.createdAt.startsWith(historyDate)) return false;
    return `${transfer.id} ${transfer.medicineName} ${transfer.sourceFacilityName} ${transfer.destinationFacilityName}`.toLowerCase().includes(historyQuery.toLowerCase());
  });

  const critical = inventory.filter(stock => getMedicineStatus(stock) === 'CRITICAL').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Medicine redistribution network">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-50 shadow-2xl dark:bg-slate-950">
        <header className="flex justify-between bg-slate-900 px-5 py-4 text-white sm:px-7">
          <div>
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-amber-400"/>
              <h2 className="text-lg font-black">Medicine Stock & Supply Network</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">Medicine inventory ledger & quick shortage status</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/maha-aushadhi"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all"
            >
              <Flame className="w-3.5 h-3.5 text-white animate-pulse" />
              <span>Canonical MahaAushadhi Page &rarr;</span>
            </Link>
            <button onClick={onClose} aria-label="Close medicine network" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><X className="h-5 w-5"/></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[["Critical", critical], ["Low stock", inventory.filter(s => getMedicineStatus(s) === 'LIMITED').length], ["Healthy", inventory.filter(s => getMedicineStatus(s) === 'HEALTHY').length], ["Incoming transfers", incoming.length], ["Outgoing transfers", outgoing.length], ["Refill requests", medicineRequests.filter(request => request.destinationFacilityId === workspaceId && request.overallStatus === 'PENDING').length]].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </section>

          <section className="mt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search this PHC inventory" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"/>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFilter(filter === 'LOW' ? 'ALL' : 'LOW')} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === 'LOW' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>Low stock</button>
                <button onClick={() => setFilter(filter === 'EXPIRING' ? 'ALL' : 'EXPIRING')} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === 'EXPIRING' ? 'bg-violet-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>Expiring soon</button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="p-3">Medicine</th>
                    <th className="p-3 text-right">Current / minimum</th>
                    <th className="p-3">Expiry</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(stock => { 
                    const status = getMedicineStatus(stock); 
                    const criticalOrLow = status !== 'HEALTHY'; 
                    return (
                      <tr key={stock.id}>
                        <td className="p-3">
                          <p className="font-bold text-slate-900 dark:text-white">{stock.drugName}</p>
                          <p className="text-xs text-slate-500">{stock.category} · {stock.batchNumber}</p>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {stock.currentStock} <span className="text-xs font-normal text-slate-500">/ {stock.bufferStock} {stock.unit}</span>
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-300">
                          {stock.expiryDate}{isExpiringSoon(stock.expiryDate) ? ' · expiry risk' : ''}
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusColor[status]}`}>{status}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setRequesting(stock)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">Request refill</button>
                            {criticalOrLow && <button onClick={() => setSupplyFor(stock)} className="rounded-lg bg-indigo-700 px-2.5 py-1.5 text-xs font-bold text-white">Find supply</button>}
                          </div>
                        </td>
                      </tr>
                    ); 
                  })}
                  {rows.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-sm text-slate-500">No inventory records match this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <TransferTable title="Incoming transfer requests" transfers={incoming} workspaceId={workspaceId} userRole={user?.role} facilities={facilities} onReview={setReviewing} onAction={(id, action) => { const transfer = stockTransfers.find(item => item.id === id); if (transfer && (action === 'DISPATCH' || action === 'RECEIVE')) setConfirmation({ transfer, action }); return true; }}/>

          <section className="mt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-black text-slate-900 dark:text-white">Transfer history</h3>
              <div className="flex flex-wrap gap-2">
                <input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Medicine or PHC" className="rounded-lg border px-2 py-1.5 text-xs dark:bg-slate-800"/>
                <select value={historyStatus} onChange={event => setHistoryStatus(event.target.value)} className="rounded-lg border px-2 py-1.5 text-xs dark:bg-slate-800"><option value="ALL">All status</option><option>COMPLETED</option><option>REJECTED</option><option>DISPATCHED</option><option>APPROVED</option><option>PENDING_SOURCE_APPROVAL</option></select>
                <select value={historyUrgency} onChange={event => setHistoryUrgency(event.target.value)} className="rounded-lg border px-2 py-1.5 text-xs dark:bg-slate-800"><option value="ALL">All urgency</option><option>CRITICAL</option><option>URGENT</option><option>ROUTINE</option></select>
                <input type="date" value={historyDate} onChange={event => setHistoryDate(event.target.value)} className="rounded-lg border px-2 py-1.5 text-xs dark:bg-slate-800"/>
              </div>
            </div>
            <TransferTable title="" transfers={completed} workspaceId={workspaceId} userRole={user?.role} facilities={facilities} onReview={setReviewing} onAction={(id, action) => { const transfer = stockTransfers.find(item => item.id === id); if (transfer && (action === 'DISPATCH' || action === 'RECEIVE')) setConfirmation({ transfer, action }); return true; }} history />
          </section>
        </div>
      </div>
      {requesting && <RefillForm stock={requesting} onClose={() => setRequesting(null)} onSubmit={(quantity, urgency, reason) => { createMedicineRequest({ destinationFacilityId: workspaceId, destinationFacilityName: workspace?.name ?? 'Primary Health Centre', requestedByUserId: user?.id ?? '', requestedByUserName: user?.name ?? '', urgency, items: [{ stockId: requesting.id, medicineName: requesting.drugName, currentStock: requesting.currentStock, bufferStock: requesting.bufferStock, requestedQuantity: quantity, unit: requesting.unit, urgency, reason }] }); setRequesting(null); }} />}
      {supplyFor && <SupplyForm destination={supplyFor} stocks={stocks} facilities={facilities} transfers={stockTransfers} userDistrict={userDistrict} workspaceName={workspace?.name || 'Facility'} onClose={() => setSupplyFor(null)} onRequestRefill={() => { setRequesting(supplyFor); setSupplyFor(null); }} onSubmit={(source, quantity, urgency, reason, tier) => { const created = createStockTransfer({ medicineName: supplyFor.drugName, sourceStockId: source.id, destinationStockId: supplyFor.id, sourceFacilityId: source.facilityId, sourceFacilityName: source.facilityName, destinationFacilityId: supplyFor.facilityId, destinationFacilityName: supplyFor.facilityName, requestedQuantity: quantity, urgency, reason, supplyTier: tier }); if (created) setSupplyFor(null); }} />}
      {reviewing && <ReviewTransfer transfer={reviewing} stocks={stocks} onClose={() => setReviewing(null)} onAction={async (action, reason) => { if (await processStockTransfer(reviewing.id, action, reason)) setReviewing(null); }} />}
      {confirmation && <TransferConfirmation transfer={confirmation.transfer} action={confirmation.action} stocks={stocks} onClose={() => setConfirmation(null)} onConfirm={async () => { if (await processStockTransfer(confirmation.transfer.id, confirmation.action)) setConfirmation(null); }} />}
    </div>
  );
}

function TransferTable({ title, transfers, workspaceId, userRole, facilities, onReview, onAction, history = false }: { title: string; transfers: StockTransfer[]; workspaceId: string; userRole?: string; facilities: import('@/lib/types').Facility[]; onReview: (transfer: StockTransfer) => void; onAction: (id: string, action: 'APPROVE' | 'REJECT' | 'DISPATCH' | 'RECEIVE') => boolean; history?: boolean }) { 
  const isDistrictAdmin = userRole === 'district_officer';
  return (
    <section className="mt-6">
      {title && <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>}
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-950">
            <tr><th className="p-3">Transfer</th><th className="p-3">Route</th><th className="p-3">Medicine</th><th className="p-3">Urgency</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {transfers.map(transfer => { 
              const canApproveOrDispatch = transfer.sourceFacilityId === workspaceId || isDistrictAdmin; 
              const canReceive = transfer.destinationFacilityId === workspaceId || isDistrictAdmin; 
              const srcName = resolveCanonicalFacilityName(transfer.sourceFacilityId);
              const dstName = resolveCanonicalFacilityName(transfer.destinationFacilityId);
              return (
                <tr key={transfer.id}>
                  <td className="p-3 font-mono text-xs font-bold text-slate-800 dark:text-white">
                    {transfer.id}<br/><span className="font-normal text-slate-500">{new Date(transfer.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td className="p-3 text-xs">{srcName} <ArrowRightLeft className="mx-1 inline h-3 w-3"/> {dstName}</td>
                  <td className="p-3">
                    <b>{transfer.medicineName}</b><br/>
                    <span className="text-xs text-slate-500">{transfer.requestedQuantity} units</span>
                    {transfer.supplyTier && <span className="ml-2 rounded bg-slate-100 px-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800">{transfer.supplyTier}</span>}
                  </td>
                  <td className="p-3 text-xs font-bold">{transfer.urgency}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{transfer.status.replaceAll('_', ' ')}</span></td>
                  <td className="p-3 text-right">
                    {canApproveOrDispatch && (transfer.status === 'PENDING_SOURCE_APPROVAL' || transfer.status === 'PENDING') && (
                      <button onClick={() => onReview(transfer)} className="rounded-lg bg-indigo-700 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer">Review & Approve</button>
                    )}
                    {canApproveOrDispatch && transfer.status === 'APPROVED' && (
                      <button onClick={() => onAction(transfer.id, 'DISPATCH')} className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer">Dispatch</button>
                    )}
                    {canReceive && !canApproveOrDispatch && (transfer.status === 'PENDING_SOURCE_APPROVAL' || transfer.status === 'PENDING' || transfer.status === 'APPROVED') && (
                      <span className="rounded bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Tracked Request</span>
                    )}
                    {canReceive && transfer.status === 'DISPATCHED' && (
                      <button onClick={() => onAction(transfer.id, 'RECEIVE')} className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white cursor-pointer">Mark received</button>
                    )}
                    {history && transfer.status === 'REJECTED' && (
                      <span className="text-xs text-rose-600 font-semibold">{transfer.rejectionReason || 'Rejected by source donor'}</span>
                    )}
                  </td>
                </tr>
              ); 
            })}
            {transfers.length === 0 && <tr><td colSpan={6} className="p-7 text-center text-sm text-slate-500">No transfer records for this facility.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  ); 
}

function SupplyForm({ destination, stocks, facilities, transfers, userDistrict, workspaceName, onClose, onRequestRefill, onSubmit }: { destination: DrugStockItem; stocks: DrugStockItem[]; facilities: import('@/lib/types').Facility[]; transfers: StockTransfer[]; userDistrict: string; workspaceName: string; onClose: () => void; onRequestRefill: () => void; onSubmit: (source: DrugStockItem, quantity: number, urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL', reason: string, tier: 'PHC' | 'DISTRICT') => void }) { 
  const result = findHierarchicalSupplySources(destination, stocks, transfers, facilities, userDistrict);
  
  const allCandidates = [
    ...result.phcCandidates,
    ...result.districtCandidates,
  ];
  
  const recommendedId = result.recommendedCandidate?.stock.id ?? '';
  const [sourceId, setSourceId] = useState(recommendedId);
  const sourceCandidate = allCandidates.find(c => c.stock.id === sourceId);
  
  const need = Math.max(0, destination.bufferStock - destination.currentStock);
  const [quantity, setQuantity] = useState(need);
  const [reason, setReason] = useState('Emergency stock shortage');
  
  const urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' = getMedicineStatus(destination) === 'CRITICAL' ? 'CRITICAL' : 'URGENT';
  const limit = sourceCandidate?.transferable ?? 0;
  
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">MEDICINE NEEDED</p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{destination.drugName}</h3>
            <p className="text-sm font-bold text-slate-500">{workspaceName}</p>
          </div>
          <button onClick={onClose} aria-label="Close transfer request"><X className="h-5 w-5"/></button>
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

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">HIERARCHICAL SUPPLY SEARCH (DEMO-SIMULATED)</p>
            {sourceCandidate && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                RECOMMENDED: {sourceCandidate.tier} TIER
              </span>
            )}
          </div>

          {/* 2-Tier Step Progression Visualizer */}
          <div className="mb-4 flex items-center justify-between gap-1 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-bold border border-slate-200 dark:border-slate-700">
            <span className={result.phcAvailableUnits > 0 ? "text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1" : "text-slate-400 line-through opacity-60"}>
              1. PHC {result.phcAvailableUnits > 0 ? "✓" : "✗"}
            </span>
            <span className="text-slate-400">→</span>
            <span className={result.districtAvailableUnits > 0 ? "text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1" : "text-slate-400 line-through opacity-60"}>
              2. District {result.districtAvailableUnits > 0 ? "✓" : "✗"}
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border p-3 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500">PHC / FACILITY</p>
              {result.phcAvailableUnits > 0 ? (
                <div className="mt-2 space-y-2">
                  {result.phcCandidates.filter(c => c.isAvailable).map(c => (
                    <button key={c.stock.id} onClick={() => setSourceId(c.stock.id)} className={`w-full rounded-xl border p-2 text-left text-sm ${sourceId === c.stock.id ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex justify-between">
                        <b>{c.stock.facilityName}</b>
                        <span className="font-black text-emerald-700">Available: {c.transferable}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">Unavailable - No safe surplus available</p>
              )}
            </div>
            
            <div className="rounded-lg border p-3 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500">DISTRICT SUPPLY</p>
              {result.districtAvailableUnits > 0 ? (
                <div className="mt-2 space-y-2">
                  {result.districtCandidates.filter(c => c.isAvailable).map(c => (
                    <button key={c.stock.id} onClick={() => setSourceId(c.stock.id)} className={`w-full rounded-xl border p-2 text-left text-sm ${sourceId === c.stock.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex justify-between">
                        <b>{c.stock.facilityName}</b>
                        <span className="font-black text-blue-700">Available: {c.transferable}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">Unavailable</p>
              )}
            </div>
          </div>
        </div>

        {sourceCandidate ? (
          <div className="mt-6 border-t pt-4 dark:border-slate-800">
            <p className={`text-xs font-black uppercase tracking-wider mb-2 ${sourceCandidate.tier === 'DISTRICT' ? 'text-blue-600' : 'text-emerald-600'}`}>
              {sourceCandidate.tier} SUPPLY AVAILABLE
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Requested quantity (max {limit})
                <input type="number" min="1" max={limit} value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/>
              </label>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <b>Urgency</b><br/>{urgency}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-rose-50 p-4 border border-rose-200 text-center dark:bg-rose-950/30 dark:border-rose-900">
            <p className="font-bold text-rose-800 dark:text-rose-300">No supply currently available.</p>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">Next action: Request replenishment</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 font-bold">Cancel</button>
          {sourceCandidate ? (
            <button disabled={quantity <= 0 || quantity > limit || !reason.trim()} onClick={() => onSubmit(sourceCandidate.stock, quantity, urgency, reason, sourceCandidate.tier)} className={`rounded-lg px-3 py-2 font-bold text-white disabled:opacity-40 ${sourceCandidate.tier === 'DISTRICT' ? 'bg-blue-700' : 'bg-emerald-700'}`}>
              REQUEST FROM {sourceCandidate.tier}
            </button>
          ) : (
            <button onClick={onRequestRefill} className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white">Request Refill</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewTransfer({ transfer, stocks, onClose, onAction }: { transfer: StockTransfer; stocks: DrugStockItem[]; onClose: () => void; onAction: (action: 'APPROVE' | 'REJECT', reason?: string) => void }) { 
  const [rejecting, setRejecting] = useState(false); 
  const [reason, setReason] = useState(''); 
  const source = stocks.find(stock => stock.id === transfer.sourceStockId); 
  const after = (source?.currentStock ?? 0) - transfer.requestedQuantity; 
  const safetyPass = Boolean(source && after >= source.bufferStock); 
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Transfer request review</h3>
          <button onClick={onClose} aria-label="Close transfer review"><X className="h-5 w-5"/></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <p><b>Destination</b><br/>{transfer.destinationFacilityName}</p>
          <p><b>Medicine</b><br/>{transfer.medicineName}</p>
          <p><b>Requested</b><br/>{transfer.requestedQuantity} units</p>
          <p><b>Source current / min</b><br/>{source?.currentStock} / {source?.bufferStock}</p>
          <p><b>After transfer</b><br/>{after}</p>
          <p className={safetyPass ? 'text-emerald-700' : 'text-rose-700'}><b>Safety check</b><br/>{safetyPass ? 'PASS' : 'FAIL'}</p>
        </div>
        {rejecting && (
          <label className="mt-4 block text-sm font-bold">
            Rejection reason
            <textarea value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/>
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setRejecting(!rejecting)} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-bold text-rose-700">Reject</button>
          {rejecting ? (
            <button disabled={!reason.trim()} onClick={() => onAction('REJECT', reason)} className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Confirm rejection</button>
          ) : (
            <button disabled={!safetyPass} onClick={() => onAction('APPROVE')} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"><CheckCircle2 className="mr-1 inline h-4 w-4"/>Approve transfer</button>
          )}
        </div>
      </div>
    </div>
  ); 
}

function TransferConfirmation({ transfer, action, stocks, onClose, onConfirm }: { transfer: StockTransfer; action: 'DISPATCH' | 'RECEIVE'; stocks: DrugStockItem[]; onClose: () => void; onConfirm: () => void }) { 
  const source = stocks.find(stock => stock.id === transfer.sourceStockId); 
  const destination = stocks.find(stock => stock.id === transfer.destinationStockId); 
  const receiving = action === 'RECEIVE'; 
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm {receiving ? 'receipt' : 'dispatch'}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{transfer.sourceFacilityName} &rarr; {transfer.destinationFacilityName}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
          <p><b>Medicine</b><br/>{transfer.medicineName}</p>
          <p><b>Quantity</b><br/>{transfer.requestedQuantity}</p>
          <p><b>Source after completion</b><br/>{(source?.currentStock ?? 0) - transfer.requestedQuantity}</p>
          <p><b>Destination after receipt</b><br/>{(destination?.currentStock ?? 0) + transfer.requestedQuantity}</p>
        </div>
        <p className="mt-4 text-xs text-slate-500">{receiving ? 'Confirming receipt updates both inventories and recalculates stock status.' : 'Dispatch does not update inventory until the destination confirms receipt.'}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 font-bold">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-emerald-700 px-3 py-2 font-bold text-white">Confirm {receiving ? 'receipt' : 'dispatch'}</button>
        </div>
      </div>
    </div>
  ); 
}

function RefillForm({ stock, onClose, onSubmit }: { stock: DrugStockItem; onClose: () => void; onSubmit: (quantity: number, urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL', reason: string) => void }) { 
  const [quantity, setQuantity] = useState(Math.max(1, stock.bufferStock - stock.currentStock)); 
  const [reason, setReason] = useState('Restore minimum buffer stock.'); 
  const urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' = getMedicineStatus(stock) === 'CRITICAL' ? 'CRITICAL' : 'URGENT'; 
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Request central refill</h3>
        <p className="mt-1 text-sm text-slate-500">Separate from supply redistribution network. This request goes to district supply coordination.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-bold">
            Quantity
            <input min="1" type="number" value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/>
          </label>
          <label className="block text-sm font-bold">
            Reason
            <textarea value={reason} onChange={event => setReason(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800"/>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 font-bold">Cancel</button>
          <button disabled={quantity <= 0 || !reason.trim()} onClick={() => onSubmit(quantity, urgency, reason)} className="rounded-lg bg-amber-600 px-3 py-2 font-bold text-white disabled:opacity-40">Create refill request</button>
        </div>
      </div>
    </div>
  ); 
}
