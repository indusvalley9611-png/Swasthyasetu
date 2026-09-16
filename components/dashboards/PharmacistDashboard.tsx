'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { DrugStockItem, StockTransfer } from '@/lib/types';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  StatusBadge,
  AlertBanner,
  EmptyState,
} from '@/components/ui/design-system';
import {
  Pill,
  Package,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  Building2,
  FileCheck,
  Search,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export function PharmacistDashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { stocks, stockTransfers, processStockTransfer } = useSync();

  const [activeTab, setActiveTab] = useState<'STOCK_LEDGER' | 'TRANSFERS' | 'DISPENSING'>('STOCK_LEDGER');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter stocks for this pharmacist's facility
  const facilityStocks = stocks.filter((s) => {
    if (!user?.facilityId && !user?.facilityName) return true;
    return (
      s.facilityId === user?.facilityId ||
      s.facilityName.toLowerCase().includes((user?.facilityName || '').toLowerCase()) ||
      (user?.facilityName || '').toLowerCase().includes(s.facilityName.toLowerCase())
    );
  });

  // Filter transfers involving this facility
  const facilityTransfers = stockTransfers.filter((t) => {
    if (!user?.facilityId) return true;
    return t.sourceFacilityId === user.facilityId || t.destinationFacilityId === user.facilityId;
  });

  const criticalShortages = facilityStocks.filter((s) => s.currentStock < s.bufferStock);
  const bufferBreachCount = criticalShortages.length;
  const activeEmergencyTransfers = facilityTransfers.filter(
    (t) => t.status !== 'COMPLETED' && t.status !== 'REJECTED'
  );

  const searchedStocks = facilityStocks.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.drugName.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.batchNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title={language === 'mr' ? 'औषधालय व साठा नोंदवही' : 'Pharmacy & Drug Inventory Console'}
        subtitle={language === 'mr' ? 'औषध पुरवठा, बफर साठा व महा औषधी नेटवर्क' : 'Buffer Stock Control, Dispensing & MahaAushadhi Logistics'}
        facilityContext={user?.facilityName || 'Nasrapur Primary Health Centre'}
        badge={{
          label: language === 'mr' ? 'औषध निर्माण अधिकारी' : 'Pharmacy Officer (Level 2)',
          level: 'facility',
        }}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/maha-aushadhi"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 text-white animate-pulse" />
              <span>{language === 'mr' ? 'महा औषधी आपत्कालीन ग्रिड' : 'MahaAushadhi Emergency Grid'}</span>
            </Link>
          </div>
        }
      />

      {/* 2. COMPACT 4-CARD PHARMACY KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label={language === 'mr' ? 'एकूण औषधे' : 'Active Drug Lines'}
          value={facilityStocks.length}
          subtext={language === 'mr' ? 'केंद्रातील साठा' : 'Monitored at PHC'}
          icon={Package}
          color="blue"
          onClick={() => setActiveTab('STOCK_LEDGER')}
        />
        <KPICard
          label={language === 'mr' ? 'बफर तुटवडा' : 'Buffer Stock Breaches'}
          value={bufferBreachCount}
          subtext={language === 'mr' ? 'किमान मर्यादेखालील' : 'Below Mandatory Buffer'}
          icon={AlertTriangle}
          color="rose"
          onClick={() => setActiveTab('STOCK_LEDGER')}
        />
        <KPICard
          label={language === 'mr' ? 'सक्रिय बदल्या' : 'MahaAushadhi Transfers'}
          value={activeEmergencyTransfers.length}
          subtext={language === 'mr' ? 'इंटर-सुविधा हस्तांतरण' : 'Active Logistics Consignments'}
          icon={Truck}
          color="amber"
          onClick={() => setActiveTab('TRANSFERS')}
        />
        <KPICard
          label={language === 'mr' ? 'कालबाह्य बॅचेस' : 'Expiring Batches'}
          value="2"
          subtext={language === 'mr' ? 'पुढील ६० दिवसांत' : 'Expiring in <60 Days'}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* 3. OPERATIONAL NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('STOCK_LEDGER')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'STOCK_LEDGER'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? 'साठा नोंदवही व बफर' : 'Critical Stock Ledger'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {facilityStocks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSFERS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TRANSFERS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? 'महा औषधी हस्तांतरण' : 'MahaAushadhi Transfers'}</span>
          {activeEmergencyTransfers.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-600 text-white animate-pulse">
              {activeEmergencyTransfers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DISPENSING')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'DISPENSING'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? 'औषध वितरण यादी' : 'Prescriptions Dispensing'}</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: STOCK LEDGER */}
      {/* ============================================================== */}
      {activeTab === 'STOCK_LEDGER' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SectionHeader
              title={language === 'mr' ? 'औषध बफर व साठा स्थिती' : 'Facility Drug Stock Buffer Matrix'}
              count={facilityStocks.length}
              icon={Pill}
            />

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={language === 'mr' ? 'औषधाचे नाव किंवा बॅच शोधा...' : 'Search medicine or batch...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Medicine & Category</th>
                  <th className="py-2.5 px-3">Available Stock</th>
                  <th className="py-2.5 px-3">Buffer Ratio</th>
                  <th className="py-2.5 px-3">Batch & Expiry</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {searchedStocks.map((stock) => {
                  const ratio = Math.round((stock.currentStock / stock.bufferStock) * 100);
                  const isBreached = stock.currentStock < stock.bufferStock;

                  return (
                    <tr key={stock.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {stock.drugName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {stock.category}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {stock.currentStock} <span className="text-xs font-normal text-slate-400">{stock.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Min Buffer: {stock.bufferStock} {stock.unit}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${
                              ratio < 50 ? 'bg-rose-500' : ratio < 100 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{ratio}% of Buffer</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        <div className="font-mono text-[11px]">{stock.batchNumber}</div>
                        <div className="text-[10px] text-slate-400">Exp: {stock.expiryDate}</div>
                      </td>

                      <td className="py-3 px-3">
                        <StatusBadge
                          status={isBreached ? 'CRITICAL' : ratio < 120 ? 'LOW' : 'OPTIMAL'}
                          variant="stock"
                        />
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isBreached ? (
                          <Link
                            href="/maha-aushadhi"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors text-[11px]"
                          >
                            <Flame className="w-3 h-3 animate-pulse" />
                            <span>Request Stock</span>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                            Adequate
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: MAHAAUSHADHI TRANSFERS */}
      {/* ============================================================== */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <SectionHeader
            title={language === 'mr' ? 'आपत्कालीन औषध हस्तांतरण यादी' : 'MahaAushadhi Inter-Facility Transfer Consignments'}
            count={facilityTransfers.length}
            icon={Truck}
          />

          {facilityTransfers.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No active transfers"
              description="There are currently no active or historical inter-facility stock transfers logged for this facility."
            />
          ) : (
            <div className="space-y-3">
              {facilityTransfers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {t.consignmentCode || t.id}
                      </span>
                      {t.isEmergency && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          EMERGENCY 108
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {t.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      {t.requestedQuantity} Units &bull; {t.medicineName}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      From: <strong>{t.sourceFacilityName}</strong> &rarr; To: <strong>{t.destinationFacilityName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {(t.status === 'PENDING' || t.status === 'PENDING_SOURCE_APPROVAL') && (t.sourceFacilityId === user?.facilityId || user?.role === 'district_officer') && (
                      <button
                        onClick={() => processStockTransfer(t.id, 'APPROVE')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Approve Transfer
                      </button>
                    )}
                    {t.status === 'APPROVED' && (t.sourceFacilityId === user?.facilityId || user?.role === 'district_officer') && (
                      <button
                        onClick={() => processStockTransfer(t.id, 'DISPATCH')}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Dispatch via Ambulance
                      </button>
                    )}
                    {t.status === 'DISPATCHED' && (t.destinationFacilityId === user?.facilityId || user?.role === 'district_officer') && (
                      <button
                        onClick={() => processStockTransfer(t.id, 'RECEIVE')}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Verify OTP & Receive
                      </button>
                    )}
                    <Link
                      href="/maha-aushadhi"
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors"
                    >
                      View Live Grid &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PRESCRIPTIONS DISPENSING */}
      {/* ============================================================== */}
      {activeTab === 'DISPENSING' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <SectionHeader
            title={language === 'mr' ? 'वैद्यकीय अधिकारी औषध चिठ्ठी वितरण' : 'Doctor Prescriptions Dispensing Queue'}
            count="3 Pending"
            icon={FileCheck}
          />

          <div className="space-y-3">
            {[
              {
                id: 'rx-01',
                patientName: 'Priya Sachin Kamble',
                age: 24,
                gender: 'Female',
                doctorName: 'Dr. Rajesh Deshmukh',
                drugs: ['Tab. Iron & Folic Acid 1-0-0 (30 days)', 'Tab. Calcium D3 0-1-0 (30 days)'],
                status: 'READY_TO_DISPENSE',
              },
              {
                id: 'rx-02',
                patientName: 'Sanjay Tukaram Pawar',
                age: 52,
                gender: 'Male',
                doctorName: 'Dr. Rajesh Deshmukh',
                drugs: ['Tab. Metformin 500mg 1-0-1 (15 days)', 'Tab. Amlodipine 5mg 1-0-0 (15 days)'],
                status: 'READY_TO_DISPENSE',
              },
              {
                id: 'rx-03',
                patientName: 'Kiran Dattatray More',
                age: 18,
                gender: 'Male',
                doctorName: 'Dr. Rajesh Deshmukh',
                drugs: ['Oral Rehydration Salts (ORS) 3 packets', 'Tab. Paracetamol 500mg 1-1-1 (3 days)'],
                status: 'DISPENSED',
              },
            ].map((rx) => (
              <div
                key={rx.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {rx.patientName} ({rx.age}y, {rx.gender})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Prescribed by {rx.doctorName}</span>
                  </div>

                  <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    {rx.drugs.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="shrink-0 self-start sm:self-auto">
                  {rx.status === 'READY_TO_DISPENSE' ? (
                    <button
                      onClick={() => alert(`Prescription ${rx.id} marked as dispensed to ${rx.patientName}.`)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
                    >
                      Dispense & Log ABDM
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dispensed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
