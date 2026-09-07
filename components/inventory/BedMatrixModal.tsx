'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { X, Building2, Activity, Plus, Minus, Check, AlertCircle } from 'lucide-react';

interface BedMatrixModalProps {
  onClose: () => void;
}

export function BedMatrixModal({ onClose }: BedMatrixModalProps) {
  const { language, t } = useLanguage();
  const { facilities, updateBedOccupancy } = useSync();
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');

  const districts = ['All', 'Pune', 'Gadchiroli', 'Nashik'];

  const filteredFacilities = facilities.filter((f) => {
    if (selectedDistrict === 'All') return true;
    return f.district === selectedDistrict;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-base">{t('bedMatrix')}</h3>
              <p className="text-xs text-slate-400">
                {language === 'mr'
                  ? 'थेट आयसीयू, व्हेंटिलेटर व ऑक्सिजन खाटा उपलब्धता मॅट्रिक्स'
                  : 'Live Statewide ICU, Ventilator & Oxygen Bed Availability'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d === 'All' ? 'All Districts (सर्व जिल्हे)' : `${d} District`}
                </option>
              ))}
            </select>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Matrix Content Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacilities.map((fac) => {
              const generalVacant = fac.totalBeds - fac.occupiedBeds;
              const icuVacant = fac.icuBedsTotal - fac.icuBedsOccupied;
              const ventVacant = fac.ventilatorsTotal - fac.ventilatorsOccupied;
              const o2Vacant = fac.oxygenBedsTotal - fac.oxygenBedsOccupied;

              const icuOccupancyPercent =
                fac.icuBedsTotal > 0 ? Math.round((fac.icuBedsOccupied / fac.icuBedsTotal) * 100) : 0;

              return (
                <div
                  key={fac.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 hover:border-blue-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fac.type === 'District Hospital' || fac.type === 'Medical College'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {fac.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {fac.taluka}, {fac.district}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{fac.name}</h4>
                    </div>

                    {fac.icuBedsTotal > 0 && (
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md ${
                          icuVacant === 0
                            ? 'bg-rose-100 text-rose-800'
                            : icuVacant <= 2
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {icuVacant} ICU Open
                      </span>
                    )}
                  </div>

                  {/* Beds Matrix 4-Column Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Total Beds</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {fac.totalBeds - fac.occupiedBeds}/{fac.totalBeds}
                      </span>
                      <span className="text-[9px] text-emerald-700 font-semibold block">
                        {generalVacant} Free
                      </span>
                    </div>

                    <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                      <span className="text-[10px] text-blue-900 block font-semibold">ICU Beds</span>
                      <span className="font-mono font-bold text-blue-950 text-sm">
                        {fac.icuBedsTotal - fac.icuBedsOccupied}/{fac.icuBedsTotal}
                      </span>
                      <span className="text-[9px] text-blue-800 font-bold block">
                        {icuVacant} Free
                      </span>
                    </div>

                    <div className="bg-purple-50/70 p-2 rounded-lg border border-purple-200">
                      <span className="text-[10px] text-purple-900 block font-semibold">Ventilator</span>
                      <span className="font-mono font-bold text-purple-950 text-sm">
                        {fac.ventilatorsTotal - fac.ventilatorsOccupied}/{fac.ventilatorsTotal}
                      </span>
                      <span className="text-[9px] text-purple-800 font-bold block">
                        {ventVacant} Free
                      </span>
                    </div>

                    <div className="bg-teal-50/70 p-2 rounded-lg border border-teal-200">
                      <span className="text-[10px] text-teal-900 block font-semibold">Oxygen (O2)</span>
                      <span className="font-mono font-bold text-teal-950 text-sm">
                        {fac.oxygenBedsTotal - fac.oxygenBedsOccupied}/{fac.oxygenBedsTotal}
                      </span>
                      <span className="text-[9px] text-teal-800 font-bold block">
                        {o2Vacant} Free
                      </span>
                    </div>
                  </div>

                  {/* Specialists On Duty */}
                  <div className="text-[11px] text-slate-600">
                    <strong className="text-slate-800">Specialists:</strong>{' '}
                    {fac.availableSpecialists.join(' • ')}
                  </div>

                  {/* Live Simulation Controls */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Simulate Bed Status:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateBedOccupancy(fac.id, 'icuBedsOccupied', 1)}
                        disabled={fac.icuBedsOccupied >= fac.icuBedsTotal}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border disabled:opacity-40"
                        title="Admit patient to ICU (+1 Occupied)"
                      >
                        <Plus className="w-3 h-3 text-rose-600" />
                        <span>Admit ICU</span>
                      </button>

                      <button
                        onClick={() => updateBedOccupancy(fac.id, 'icuBedsOccupied', -1)}
                        disabled={fac.icuBedsOccupied <= 0}
                        className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border disabled:opacity-40"
                        title="Discharge patient from ICU (-1 Occupied)"
                      >
                        <Minus className="w-3 h-3 text-emerald-600" />
                        <span>Discharge ICU</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{language === 'mr' ? 'आरोग्य व्यवस्थापन माहिती प्रणाली (HMIS) सह समक्रमित' : 'Real-time telemetry synced with Maharashtra HMIS Portal'}</span>
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
