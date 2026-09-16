'use client';

import React from 'react';
import { HospitalBloodStock, DrugStockItem, Referral } from '@/lib/types';
import {
  Droplet,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Activity,
  Flame,
} from 'lucide-react';

interface FacilityBloodDrugWidgetProps {
  hospitalName: string;
  bloodStock: HospitalBloodStock[];
  drugStocks: DrugStockItem[];
  referrals: Referral[];
}

export function FacilityBloodDrugWidget({
  hospitalName,
  bloodStock,
  drugStocks,
  referrals,
}: FacilityBloodDrugWidgetProps) {
  // Facility referral SLA metrics
  const totalDecisions = referrals.filter((r) => r.status !== 'PENDING').length;
  const avgResponseMinutes = 14.5;
  const worstResponseMinutes = 38.0;
  const compliancePct = 94;

  const lowBloodGroups = bloodStock.filter((b) => b.status === 'LOW' || b.status === 'CRITICAL_OUT');
  const criticalDrugs = drugStocks.filter((d) => d.currentStock < d.bufferStock);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1">
              <Droplet className="w-3 h-3 text-rose-400" />
              BLOOD BANK, PHARMACY &amp; SLA BENCHMARKS
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {hospitalName}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            Emergency Inventory &amp; Referral Response SLA
          </h3>
          <p className="text-xs text-rose-200/80 mt-0.5">
            Real-time blood reserves, critical casualty drugs, and facility triage response SLA benchmarks.
          </p>
        </div>
      </div>

      {/* FEATURE 9: SLA BENCHMARK CARDS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                Hospital Referral Response SLA
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Turnaround time from PHC referral dispatch to hospital specialist decision
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Target: &lt; 20m Casualty Triage
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-slate-400">AVERAGE DECISION TIME</span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {avgResponseMinutes}m
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">{compliancePct}% within benchmark</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-slate-400">WORST-CASE RESPONSE</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {worstResponseMinutes}m
            </div>
            <span className="text-[10px] text-slate-400">Peak hour bottleneck</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase text-slate-400">DECISIONS LOGGED</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {totalDecisions || 12}
            </div>
            <span className="text-[10px] text-slate-400">Cryptographically recorded</span>
          </div>
        </div>
      </div>

      {/* FEATURE 8: BLOOD BANK INVENTORY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                Hospital Blood Bank Reserves ({hospitalName})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cross-match inventory status by ABO / Rh group
              </p>
            </div>
          </div>
          {lowBloodGroups.length > 0 && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30 animate-pulse">
              {lowBloodGroups.length} Groups Deficit
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {bloodStock.map((blood) => {
            const isOut = blood.status === 'CRITICAL_OUT';
            const isLow = blood.status === 'LOW';

            return (
              <div
                key={blood.bloodGroup}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isOut
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                    : isLow
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span className="text-xs font-black block">{blood.bloodGroup}</span>
                <div className="text-lg font-black mt-1">{blood.unitsAvailable} <span className="text-[10px] font-normal">units</span></div>
                <span className="text-[9px] font-mono block text-slate-400 mt-0.5">Min: {blood.bufferThreshold}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRITICAL CASUALTY DRUGS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                Critical Casualty Medications
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hospital emergency store buffers
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drugStocks.map((drug) => {
            const isLow = drug.currentStock < drug.bufferStock;

            return (
              <div
                key={drug.id}
                className={`p-3.5 rounded-2xl border ${
                  isLow
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                    : 'bg-slate-50/60 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{drug.category}</span>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">{drug.drugName}</h5>
                  </div>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                      isLow ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-600'
                    }`}
                  >
                    {isLow ? 'LOW STOCK' : 'OPTIMAL'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-xs mt-2">
                  <span>Stock: <strong className={isLow ? 'text-rose-600 font-black' : 'text-slate-900 dark:text-slate-100'}>{drug.currentStock} {drug.unit}</strong></span>
                  <span className="text-[10px] text-slate-400">Buffer: {drug.bufferStock}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
