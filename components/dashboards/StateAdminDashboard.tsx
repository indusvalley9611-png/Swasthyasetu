'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { INITIAL_OUTBREAKS } from '@/lib/mockData';
import {
  MapPin,
  TrendingUp,
  AlertTriangle,
  Building2,
  Activity,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
} from 'lucide-react';

interface StateAdminDashboardProps {
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
}

export function StateAdminDashboard({
  onOpenBedMatrix,
  onOpenStockLedger,
}: StateAdminDashboardProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { facilities, referrals, stocks } = useSync();

  const [selectedDisease, setSelectedDisease] = useState<string>('All');
  const [outbreakList, setOutbreakList] = useState(INITIAL_OUTBREAKS);

  const filteredOutbreaks = outbreakList.filter((o) => {
    if (selectedDisease === 'All') return true;
    return o.diseaseName === selectedDisease;
  });

  // Calculate macro KPIs
  const totalBeds = facilities.reduce((sum, f) => sum + f.totalBeds, 0);
  const occupiedBeds = facilities.reduce((sum, f) => sum + f.occupiedBeds, 0);
  const bedOccupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

  const totalIcu = facilities.reduce((sum, f) => sum + f.icuBedsTotal, 0);
  const occupiedIcu = facilities.reduce((sum, f) => sum + f.icuBedsOccupied, 0);
  const icuOccupancyRate = Math.round((occupiedIcu / totalIcu) * 100);

  const redReferralsCount = referrals.filter((r) => r.triagePriority === 'red').length;
  const yellowReferralsCount = referrals.filter((r) => r.triagePriority === 'yellow').length;
  const greenReferralsCount = referrals.filter((r) => r.triagePriority === 'green').length;

  const criticalStockItems = stocks.filter((s) => s.status === 'CRITICAL');

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'mr' ? 'आरोग्य सेवा संचालनालय • महाराष्ट्र राज्य नियंत्रण कक्ष' : 'Directorate of Health Services • State Command & Analytics Center'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{user.name}</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {user.facilityName} • Government of Maharashtra • {user.registrationNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenBedMatrix}
            className="px-3.5 py-2 text-xs font-bold bg-blue-800 hover:bg-blue-700 text-white rounded-xl shadow transition-colors"
          >
            {t('bedMatrix')}
          </button>
          <button
            onClick={onOpenStockLedger}
            className="px-3.5 py-2 text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow transition-colors"
          >
            {t('emergencyStock')}
          </button>
        </div>
      </div>

      {/* Macro Healthcare Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 block font-medium">Statewide Bed Occupancy</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {bedOccupancyRate}%
          </div>
          <span className="text-[10px] text-slate-600 block mt-0.5">
            {occupiedBeds} of {totalBeds} beds utilized
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 block font-medium">Statewide ICU Occupancy</span>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {icuOccupancyRate}%
          </div>
          <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
            {occupiedIcu} / {totalIcu} ICU beds filled
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 block font-medium">Referral Completion Rate</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">94.8%</div>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            Zero dropped maternal referrals
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 block font-medium">Critical Drug Alerts</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">
            {criticalStockItems.length}
          </div>
          <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
            Facilities below 25% buffer
          </span>
        </div>
      </div>

      {/* Main Grid: Outbreak Surveillance & Referral Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Disease Outbreak Surveillance Map & Hotspot Clusters */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-600" />
                  <span>
                    {language === 'mr' ? 'राज्यस्तरीय संसर्गजन्य रोग प्रादुर्भाव सनियंत्रण' : 'Epidemiological Disease Outbreak Surveillance'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Integrated Integrated Disease Surveillance Programme (IDSP) syndromic reporting
                </p>
              </div>

              {/* Disease Filter */}
              <select
                value={selectedDisease}
                onChange={(e) => setSelectedDisease(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50"
              >
                <option value="All">All Diseases (सर्व आजार)</option>
                <option value="Dengue">Dengue</option>
                <option value="Malaria">Malaria</option>
                <option value="Acute Diarrheal Disease">Acute Diarrheal Disease</option>
                <option value="Leptospirosis">Leptospirosis</option>
                <option value="Chikungunya">Chikungunya</option>
              </select>
            </div>

            {/* Interactive Visual Map Representation */}
            <div className="bg-slate-900 rounded-xl p-4 text-white space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-teal-400">MAHARASHTRA DISTRICT HOTSPOT CLUSTERS</span>
                <span className="text-[10px] text-slate-400">Live Telemetry Map</span>
              </div>

              {/* Graphical Hotspot Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {filteredOutbreaks.map((out) => (
                  <div
                    key={out.id}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      out.riskLevel === 'HIGH'
                        ? 'bg-rose-950/70 border-rose-600'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{out.district}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          out.riskLevel === 'HIGH'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {out.diseaseName} • {out.riskLevel}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      Taluka: <strong>{out.taluka}</strong> (Hotspot: {out.primaryHotspotVillage})
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                      <span>{out.activeCases} Active Cases</span>
                      <span
                        className={out.weeklyChangePercent > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}
                      >
                        {out.weeklyChangePercent > 0 ? `▲ +${out.weeklyChangePercent}%` : `▼ ${out.weeklyChangePercent}%`} / wk
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sub-Centres Affected Table */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">High Vulnerability Talukas Requiring Medical Mobile Units:</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Velhe & Bhor (Pune District)</span>
                  <span className="text-rose-700 font-bold">Dengue Cluster — 142 cases (9 Sub-Centres alerted)</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Bhamragad & Dhanora (Gadchiroli District)</span>
                  <span className="text-rose-700 font-bold">Falciparum Malaria — 98 cases (14 Sub-Centres alerted)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Referral Corridor Bottlenecks & Critical Stock Matrix */}
        <div className="lg:col-span-5 space-y-4">
          {/* Referral Triage Stratification */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <span>{language === 'mr' ? 'रेफरल ट्रायज वर्गीकरण (State Triage Stratification)' : 'Statewide Referral Severity Breakdown'}</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-rose-700">RED (Critical Emergency)</span>
                  <span className="font-mono font-bold">{redReferralsCount} Referrals</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-600 w-[50%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-amber-700">YELLOW (Urgent 2-Hour)</span>
                  <span className="font-mono font-bold">{yellowReferralsCount} Referrals</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[25%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-bold text-emerald-700">GREEN (Routine Elective)</span>
                  <span className="font-mono font-bold">{greenReferralsCount} Referrals</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[25%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Critical Stock Deficit Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Critical Drug Depletion Alerts</span>
              </h3>
              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                Action Required
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {criticalStockItems.map((stk) => (
                <div key={stk.id} className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{stk.drugName}</span>
                    <span className="text-rose-700 font-mono">{stk.currentStock} {stk.unit}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex justify-between">
                    <span>{stk.facilityName}</span>
                    <span className="text-slate-500">Buffer Min: {stk.bufferStock}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenStockLedger}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Trigger Inter-District Stock Reallocation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
