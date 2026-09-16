'use client';

import React, { useState, useMemo } from 'react';
import { HospitalBedSlot, HospitalDepartment } from '@/lib/types';
import {
  Bed,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Activity,
  Plus,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';

interface DepartmentBedMatrixViewProps {
  hospitalName: string;
  bedSlots: HospitalBedSlot[];
  onSelectBed?: (bed: HospitalBedSlot) => void;
  onInitiateDischarge?: (bed: HospitalBedSlot) => void;
}

export function DepartmentBedMatrixView({
  hospitalName,
  bedSlots,
  onSelectBed,
  onInitiateDischarge,
}: DepartmentBedMatrixViewProps) {
  const [selectedDept, setSelectedDept] = useState<HospitalDepartment | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Department statistics
  const deptStats = useMemo(() => {
    const departments: HospitalDepartment[] = ['ICU', 'Casualty / ER', 'Maternity / NICU', 'General Ward'];
    return departments.map((dept) => {
      const slots = bedSlots.filter((b) => b.department === dept);
      const total = slots.length;
      const occupied = slots.filter((b) => b.status === 'OCCUPIED').length;
      const available = slots.filter((b) => b.status === 'AVAILABLE').length;
      const occPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
      return {
        dept,
        total,
        occupied,
        available,
        occPct,
      };
    });
  }, [bedSlots]);

  // Filtered bed slots
  const filteredBeds = useMemo(() => {
    return bedSlots.filter((b) => {
      if (selectedDept !== 'ALL' && b.department !== selectedDept) return false;
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.bedNumber.toLowerCase().includes(q) ||
          b.wardName.toLowerCase().includes(q) ||
          (b.patientName && b.patientName.toLowerCase().includes(q)) ||
          (b.patientAbha && b.patientAbha.toLowerCase().includes(q)) ||
          (b.attendingSpecialist && b.attendingSpecialist.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [bedSlots, selectedDept, statusFilter, searchQuery]);

  // Overall totals
  const totalBeds = bedSlots.length;
  const totalOccupied = bedSlots.filter((b) => b.status === 'OCCUPIED').length;
  const totalAvailable = bedSlots.filter((b) => b.status === 'AVAILABLE').length;
  const overallOccupancyPct = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 rounded-3xl p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Bed className="w-3 h-3 text-indigo-400" />
              DEPARTMENT-WISE HOSPITAL BED MATRIX
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {hospitalName}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-tight text-white mt-1">
            Real-Time Inpatient Bed Management
          </h3>
          <p className="text-xs text-indigo-200/80 mt-0.5">
            Live occupancy across ICU, Casualty ER, Maternity/NICU, and General Wards.
          </p>
        </div>

        {/* Global Occupancy Pill */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
          <div className="text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 block">OCCUPANCY RATE</span>
            <span className="text-lg font-black text-indigo-300">{overallOccupancyPct}%</span>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <span className="text-[10px] font-bold text-emerald-400">{totalAvailable} Available</span>
            <span className="text-[10px] text-slate-400 block">{totalOccupied} / {totalBeds} Occupied</span>
          </div>
        </div>
      </div>

      {/* 4 Department Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {deptStats.map((stat) => {
          const isSelected = selectedDept === stat.dept;
          const isHigh = stat.occPct >= 80;

          return (
            <div
              key={stat.dept}
              onClick={() => setSelectedDept(isSelected ? 'ALL' : stat.dept)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500/50 ring-2 ring-indigo-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {stat.dept}
                </span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isHigh
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {stat.occPct}%
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {stat.available}
                  </span>
                  <span className="text-xs text-slate-400"> free</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {stat.occupied}/{stat.total} beds
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedDept === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Departments
          </button>
          {(['ICU', 'Casualty / ER', 'Maternity / NICU', 'General Ward'] as HospitalDepartment[]).map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'AVAILABLE' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'OCCUPIED' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs' : 'text-slate-500'
              }`}
            >
              Occupied
            </button>
          </div>

          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bed, patient..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Bed Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredBeds.map((bed) => {
          const isOccupied = bed.status === 'OCCUPIED';
          const isMaintenance = bed.status === 'MAINTENANCE';

          return (
            <div
              key={bed.bedId}
              className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 shadow-sm ${
                isOccupied
                  ? 'bg-gradient-to-br from-rose-50/40 to-white dark:from-rose-950/20 dark:to-slate-900 border-rose-200 dark:border-rose-900/50'
                  : isMaintenance
                  ? 'bg-slate-100 dark:bg-slate-850 border-slate-300 dark:border-slate-700 opacity-75'
                  : 'bg-gradient-to-br from-emerald-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        isOccupied
                          ? 'bg-rose-500 text-white'
                          : isMaintenance
                          ? 'bg-slate-400 text-white'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      <Bed className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">{bed.bedNumber}</h4>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{bed.department}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                      isOccupied
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : isMaintenance
                        ? 'bg-slate-500/10 text-slate-500 border border-slate-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{bed.wardName}</span>
                </div>

                {/* Occupied Details */}
                {isOccupied && bed.patientName ? (
                  <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
                      <span>{bed.patientName}</span>
                      {bed.triagePriority && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                            bed.triagePriority === 'red' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                          }`}
                        >
                          {bed.triagePriority}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ABHA: {bed.patientAbha || 'ABDM-VERIFIED'}
                    </div>
                    {bed.attendingSpecialist && (
                      <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Doctor: {bed.attendingSpecialist}
                      </div>
                    )}
                    {bed.assignedAt && (
                      <div className="text-[9px] text-slate-400 font-mono">
                        Admitted: {new Date(bed.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-800/60 text-center py-4">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">
                      Ready for Intake
                    </span>
                    <span className="text-[10px] text-slate-400">Sanitized &amp; Monitored</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div>
                {isOccupied ? (
                  onInitiateDischarge && (
                    <button
                      onClick={() => onInitiateDischarge(bed)}
                      className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Discharge Patient</span>
                    </button>
                  )
                ) : !isMaintenance && onSelectBed ? (
                  <button
                    onClick={() => onSelectBed(bed)}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Bed</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
