'use client';

import React, { useMemo, useState } from 'react';
import { Activity, CheckCircle2, ChevronRight, Clock3, MapPin, Phone, X, Building2, Bed, HeartPulse } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { BedResourceType, Facility, Referral } from '@/lib/types';
import { getAvailableResource, getDistanceKm, getFacilityStatus } from '@/lib/resourceManagement';

interface BedMatrixModalProps {
  onClose: () => void;
}

const labels: Record<BedResourceType, string> = {
  GENERAL: 'General bed',
  ICU: 'ICU bed',
  OXYGEN: 'Oxygen-supported bed',
  VENTILATOR: 'Ventilator'
};

const statusStyle = {
  HEALTHY: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  LIMITED: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
};

function Capacity({ label, available, total }: { label: string; available: number; total: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
        {available}
        <span className="text-xs font-semibold text-slate-400"> / {total} free</span>
      </p>
    </div>
  );
}

export function BedMatrixModal({ onClose }: BedMatrixModalProps) {
  const { user } = useAuth();
  const { facilities, referrals } = useSync();
  const [resource, setResource] = useState<BedResourceType>('ICU');
  const [detail, setDetail] = useState<Facility | null>(null);

  const origin = facilities.find(f => f.id === user?.facilityId) ?? facilities[0];

  const rows = useMemo(() => {
    return facilities
      .map(facility => ({
        facility,
        status: getFacilityStatus(facility),
        available: getAvailableResource(facility, resource),
        distance: origin ? getDistanceKm(origin, facility) : null,
        reserved: referrals.filter(ref => ref.targetFacility === facility.name && (ref.status === 'PENDING' || ref.status === 'ACCEPTED')).length
      }))
      .sort((a, b) => (b.available - a.available) || ((a.distance ?? Infinity) - (b.distance ?? Infinity)));
  }, [facilities, referrals, origin, resource]);

  const matches = rows.filter(row => row.available > 0 && row.facility.id !== origin?.id);

  const totals = facilities.reduce(
    (sum, f) => ({
      total: sum.total + f.totalBeds,
      occupied: sum.occupied + f.occupiedBeds,
      available: sum.available + getAvailableResource(f, 'GENERAL'),
      reserved: sum.reserved + referrals.filter(r => r.targetFacility === f.name && ['PENDING', 'ACCEPTED'].includes(r.status)).length,
      icu: sum.icu + getAvailableResource(f, 'ICU'),
      oxygen: sum.oxygen + getAvailableResource(f, 'OXYGEN'),
      ventilators: sum.ventilators + getAvailableResource(f, 'VENTILATOR')
    }),
    { total: 0, occupied: 0, available: 0, reserved: 0, icu: 0, oxygen: 0, ventilators: 0 }
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Referral Capacity Network">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-50 shadow-2xl dark:bg-slate-950">
        {/* 1. Header with Title & Subtitle */}
        <header className="flex items-start justify-between bg-slate-900 px-5 py-4 text-white sm:px-7 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Referral Capacity Network</h2>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider ring-1 ring-slate-700">
                  DEMO-SIMULATED NETWORK
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-300">
              Find a suitable facility for patients who need higher-level care.
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              SIMULATED operational network data · updated from this demo workspace
            </p>
          </div>
          <button onClick={onClose} aria-label="Close referral capacity network" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* 2. Referral Workflow Strip */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-2 sm:px-7">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 overflow-x-auto">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-black text-emerald-400 ring-1 ring-emerald-400/40">1</span>
              PATIENT NEED
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/20 text-[9px] font-black text-sky-400 ring-1 ring-sky-400/40">2</span>
              CAPACITY MATCH
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center gap-1 text-indigo-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/20 text-[9px] font-black text-indigo-400 ring-1 ring-indigo-400/40">3</span>
              REFERRAL
            </span>
            <span className="text-slate-600">→</span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[9px] font-black text-slate-400">4</span>
              TRACK CARE
            </span>
          </div>
        </div>

        {/* 3. Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Summary Strip */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="District resource summary">
            <Capacity label="Total beds" available={totals.available} total={totals.total} />
            <Capacity label="ICU beds" available={totals.icu} total={totals.total} />
            <Capacity label="Ventilators" available={totals.ventilators} total={totals.total} />
            <Capacity label="Oxygen-supported" available={totals.oxygen} total={totals.total} />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Reserved beds</p>
              <p className="mt-1 text-lg font-black text-indigo-600 dark:text-indigo-400">{totals.reserved}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Origin facility</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-slate-100">{origin?.name ?? 'District Center'}</p>
            </div>
          </section>

          {/* Resource Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['ICU', 'VENTILATOR', 'OXYGEN', 'GENERAL'] as BedResourceType[]).map(key => (
                <button
                  key={key}
                  onClick={() => setResource(key)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    resource === key
                      ? 'bg-indigo-700 text-white shadow-md'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {labels[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Facilities */}
          <section aria-label="Suitable referral facilities">
            <div className="mb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                FIND SUITABLE REFERRAL FACILITY
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Facilities are ranked using required capacity, availability and distance from referring facility.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {matches.slice(0, 3).map(({ facility, available, distance }) => (
                <div
                  key={facility.id}
                  className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white p-4 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-slate-900 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">{facility.type}</p>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{facility.name}</h4>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Suitable for referral
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong>Available {labels[resource]}:</strong> <span className="font-bold text-emerald-600">{available} units</span></p>
                    <p><strong>Distance:</strong> {distance !== null ? `${distance} km` : 'Regional referral center'}</p>
                    <p className="truncate"><strong>Specialists:</strong> {facility.availableSpecialists.slice(0, 3).join(', ')}</p>
                  </div>
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex justify-end">
                    <button
                      onClick={() => setDetail(facility)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span>View Facility Capacity</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Complete Facility Matrix Table */}
          <section aria-label="District facilities table">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              All District Facilities
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                    <th className="p-3 pl-4">Facility</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Selected ({labels[resource]})</th>
                    <th className="p-3">Total General Beds</th>
                    <th className="p-3">ICU Available</th>
                    <th className="p-3">Ventilators</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map(({ facility, status, available, distance }) => (
                    <tr key={facility.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                        {facility.name}
                        {facility.id === origin?.id && (
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">{facility.type}</td>
                      <td className="p-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${statusStyle[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {distance !== null ? `${distance} km` : '—'}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{available}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {getAvailableResource(facility, 'GENERAL')} / {facility.totalBeds}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {facility.icuBedsTotal - facility.icuBedsOccupied} / {facility.icuBedsTotal}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {facility.ventilatorsTotal - facility.ventilatorsOccupied} / {facility.ventilatorsTotal}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={() => setDetail(facility)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Facility Detail Modal */}
      {detail && (
        <FacilityDetail
          facility={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function FacilityDetail({
  facility,
  onClose,
}: {
  facility: Facility;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Facility Resource & Specialty Profile
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{facility.name}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <Phone className="h-4 w-4" />
              {facility.phone}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close facility details" className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Capacity label="General beds" available={getAvailableResource(facility, 'GENERAL')} total={facility.totalBeds} />
          <Capacity label="ICU" available={getAvailableResource(facility, 'ICU')} total={facility.icuBedsTotal} />
          <Capacity label="Oxygen" available={getAvailableResource(facility, 'OXYGEN')} total={facility.oxygenBedsTotal} />
          <Capacity label="Ventilators" available={getAvailableResource(facility, 'VENTILATOR')} total={facility.ventilatorsTotal} />
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 border border-slate-100 dark:border-slate-700">
          <p>
            <strong>Status:</strong> {getFacilityStatus(facility)} operational capacity
          </p>
          <p className="mt-1">
            <strong>Referral eligibility:</strong>{' '}
            {getAvailableResource(facility, 'GENERAL') > 0
              ? 'Eligible for resource-appropriate referral reception.'
              : 'No general capacity currently; find alternative district center.'}
          </p>
          <p className="mt-1">
            <strong>Available Specialists:</strong> {facility.availableSpecialists.join(', ')}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
