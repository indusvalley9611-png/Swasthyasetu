'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Building2, ChevronRight, MapPin, Phone, X, Bed, HeartPulse, Wind, Stethoscope, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { BedResourceType, Facility } from '@/lib/types';
import { getAvailableResource, getDistanceKm, getFacilityStatus } from '@/lib/resourceManagement';

interface BedMatrixModalProps {
  onClose: () => void;
}

const statusConfig = {
  HEALTHY: { label: 'Available', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  LIMITED: { label: 'Limited', icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  CRITICAL: { label: 'Critical', icon: XCircle, bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
};

function CapacityCard({ icon: Icon, label, available, total, accent }: { icon: React.ElementType; label: string; available: number; total: number; accent: string }) {
  const ratio = total > 0 ? available / total : 0;
  const pct = Math.round(ratio * 100);
  const barColor = ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className={`rounded-2xl border p-5 ${accent} transition-shadow hover:shadow-md flex flex-col`}>
      {/* Row 1: Icon + Label */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-sm">
          <Icon className="h-4.5 w-4.5 text-slate-600 dark:text-slate-300" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">{label}</p>
      </div>

      {/* Row 2: Large available number */}
      <p className="text-4xl font-black text-slate-900 dark:text-white leading-none">{available}</p>

      {/* Row 3: "Available" label */}
      <p className="mt-1 text-xs font-semibold text-slate-400">Available</p>

      {/* Row 4: Separator + Total */}
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {total} <span className="font-semibold text-slate-400">Total</span>
        </p>
      </div>

      {/* Row 5: Progress bar */}
      <div className="mt-3 w-full">
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] font-bold text-slate-400">{pct}% available</p>
      </div>
    </div>
  );
}

export function BedMatrixModal({ onClose }: BedMatrixModalProps) {
  const { user } = useAuth();
  const { facilities } = useSync();
  const [detail, setDetail] = useState<Facility | null>(null);

  const myFacility = facilities.find(f => f.id === user?.facilityId) ?? facilities.find(f => f.type === 'PHC') ?? facilities[0];

  // Referral facilities: exclude the user's own facility, and exclude Sub-Centres (can't refer to them)
  const referralFacilities = useMemo(() => {
    return facilities
      .filter(f => f.id !== myFacility?.id && f.type !== 'Sub-Centre')
      .map(f => ({
        facility: f,
        status: getFacilityStatus(f),
        generalAvailable: getAvailableResource(f, 'GENERAL'),
        icuAvailable: getAvailableResource(f, 'ICU'),
        oxygenAvailable: getAvailableResource(f, 'OXYGEN'),
        ventilatorAvailable: getAvailableResource(f, 'VENTILATOR'),
        distance: myFacility ? getDistanceKm(myFacility, f) : null,
      }))
      .sort((a, b) => {
        // Sort by: available capacity descending, then distance ascending
        const capacityDiff = (b.generalAvailable + b.icuAvailable) - (a.generalAvailable + a.icuAvailable);
        if (capacityDiff !== 0) return capacityDiff;
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      });
  }, [facilities, myFacility]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Hospital Capacity">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-2xl">

        {/* ── Header ── */}
        <header className="flex items-start justify-between bg-slate-900 px-6 py-4 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                <Building2 className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-lg font-black tracking-tight">Hospital Capacity</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Monitor your PHC resources and find suitable referral facilities
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ SECTION 1: MY PHC CAPACITY ═══ */}
          <section className="px-6 py-6 border-b border-slate-100 dark:border-slate-800" aria-label="My PHC Capacity">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <Stethoscope className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  My PHC Capacity
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{myFacility?.name ?? 'Your Facility'} — What do we have?</p>
              </div>
            </div>

            {myFacility && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <CapacityCard
                  icon={Bed}
                  label="General Beds"
                  available={getAvailableResource(myFacility, 'GENERAL')}
                  total={myFacility.totalBeds}
                  accent="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
                <CapacityCard
                  icon={HeartPulse}
                  label="ICU Beds"
                  available={getAvailableResource(myFacility, 'ICU')}
                  total={myFacility.icuBedsTotal}
                  accent="border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20"
                />
                <CapacityCard
                  icon={Wind}
                  label="Oxygen Beds"
                  available={getAvailableResource(myFacility, 'OXYGEN')}
                  total={myFacility.oxygenBedsTotal}
                  accent="border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20"
                />
                <CapacityCard
                  icon={Activity}
                  label="Ventilators"
                  available={getAvailableResource(myFacility, 'VENTILATOR')}
                  total={myFacility.ventilatorsTotal}
                  accent="border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20"
                />
              </div>
            )}
          </section>

          {/* ═══ SECTION 2: REFERRAL FACILITIES ═══ */}
          <section className="px-6 py-6" aria-label="Referral Facilities">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Referral Facilities
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Where can we send the patient?</p>
              </div>
            </div>

            <div className="space-y-3">
              {referralFacilities.map(({ facility, status, generalAvailable, icuAvailable, oxygenAvailable, ventilatorAvailable, distance }) => {
                const cfg = statusConfig[status];
                return (
                  <div
                    key={facility.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Facility Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{facility.name}</h4>
                          <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">{facility.type}</span>
                          {distance !== null && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {distance} km
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {facility.phone}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Resources */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">General</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{generalAvailable}<span className="text-slate-400 font-semibold">/{facility.totalBeds}</span></p>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">ICU</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{icuAvailable}<span className="text-slate-400 font-semibold">/{facility.icuBedsTotal}</span></p>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">O₂</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{oxygenAvailable}<span className="text-slate-400 font-semibold">/{facility.oxygenBedsTotal}</span></p>
                        </div>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Vent.</p>
                          <p className="font-black text-slate-800 dark:text-slate-100">{ventilatorAvailable}<span className="text-slate-400 font-semibold">/{facility.ventilatorsTotal}</span></p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setDetail(facility)}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          View Capacity
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {referralFacilities.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No referral facilities configured</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Facility Detail Modal ── */}
      {detail && (
        <FacilityDetail facility={detail} origin={myFacility ?? null} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

function FacilityDetail({ facility, origin, onClose }: { facility: Facility; origin: Facility | null; onClose: () => void }) {
  const status = getFacilityStatus(facility);
  const cfg = statusConfig[status];
  const distance = origin ? getDistanceKm(origin, facility) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{facility.type}</span>
            </div>
            <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{facility.name}</h3>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {facility.phone}</span>
              {distance !== null && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {distance} km away</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close facility details" className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CapacityCard icon={Bed} label="General Beds" available={getAvailableResource(facility, 'GENERAL')} total={facility.totalBeds} accent="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50" />
          <CapacityCard icon={HeartPulse} label="ICU" available={getAvailableResource(facility, 'ICU')} total={facility.icuBedsTotal} accent="border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20" />
          <CapacityCard icon={Wind} label="Oxygen" available={getAvailableResource(facility, 'OXYGEN')} total={facility.oxygenBedsTotal} accent="border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20" />
          <CapacityCard icon={Activity} label="Ventilators" available={getAvailableResource(facility, 'VENTILATOR')} total={facility.ventilatorsTotal} accent="border-amber-100 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20" />
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 p-4 text-sm text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 space-y-1.5">
          <p>
            <strong>Referral eligibility:</strong>{' '}
            {getAvailableResource(facility, 'GENERAL') > 0
              ? 'Eligible for referral — capacity available.'
              : 'No general bed capacity currently. Consider an alternative facility.'}
          </p>
          <p>
            <strong>Available Specialists:</strong> {facility.availableSpecialists.join(', ')}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
