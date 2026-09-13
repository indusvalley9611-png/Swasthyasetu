'use client';
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { getMedicineStatus } from '@/lib/resourceManagement';
import {
  Activity, BarChart3, TrendingUp, Users, Map,
  AlertTriangle, ShieldCheck, Database, Server,
  Building2, Package, Search, ChevronRight, MapPin
} from 'lucide-react';

interface StateAdminDashboardProps {
  onOpenBedMatrix: () => void;
  onOpenStockLedger: () => void;
}

export function StateAdminDashboard({
  onOpenBedMatrix,
  onOpenStockLedger,
}: StateAdminDashboardProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { facilities, stocks, medicineRequests, stockTransfers } = useSync();
  
  const [activeView, setActiveView] = useState<'overview' | 'facilities' | 'outbreaks'>('overview');
  const totalBeds = facilities.reduce((total, facility) => total + facility.totalBeds, 0);
  const occupiedBeds = facilities.reduce((total, facility) => total + facility.occupiedBeds, 0);
  const bedUtilization = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const criticalShortages = stocks.filter(stock => getMedicineStatus(stock) === 'CRITICAL').length;
  const openSupplyRequests = medicineRequests.filter(request => request.status === 'PENDING').length + stockTransfers.filter(transfer => !['COMPLETED', 'REJECTED'].includes(transfer.status)).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. TOP HEALTH INTELLIGENCE KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-[100px] -z-10 group-hover:bg-blue-500/30 transition-colors"></div>
          <div className="w-12 h-12 bg-white dark:bg-slate-900/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/10">
            <Users className="w-6 h-6 text-blue-300" />
          </div>
          <div className="text-4xl font-black tracking-tight">1.2M</div>
          <div className="text-sm font-bold text-blue-200 mt-1 uppercase tracking-wide">Population Coverage</div>
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-md border border-emerald-400/20">
            <TrendingUp className="w-3 h-3" /> +12% this month
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer" onClick={onOpenBedMatrix}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/20 rounded-bl-[100px] -z-10 group-hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"></div>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800">
            <Building2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100">{bedUtilization}%</div>
          <div className="text-sm font-bold text-emerald-600 mt-1 uppercase tracking-wide">Bed Utilization</div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${bedUtilization}%` }}></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group cursor-pointer" onClick={onOpenStockLedger}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/20 rounded-bl-[100px] -z-10 group-hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"></div>
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mb-4 border border-amber-200 dark:border-amber-800">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100">{criticalShortages}</div>
          <div className="text-sm font-bold text-amber-600 mt-1 uppercase tracking-wide">Critical Shortages</div>
          <div className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> {openSupplyRequests} pending supply request(s)
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/10 rounded-bl-[100px] -z-10"></div>
          <div className="w-12 h-12 bg-white dark:bg-slate-900/10 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/10">
            <Server className="w-6 h-6 text-purple-300" />
          </div>
          <div className="text-4xl font-black tracking-tight flex items-center gap-3">
            99.9% <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
          </div>
          <div className="text-sm font-bold text-purple-200 mt-1 uppercase tracking-wide">ABDM Network Status</div>
          <div className="mt-4 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Fully Interoperable
          </div>
        </div>
      </div>

      {/* 2. COMMAND CENTER MAP & REFERRAL FLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        {/* Left: Intelligence Map */}
        <div className="lg:col-span-2 bg-slate-950 rounded-3xl shadow-lg border border-slate-800 overflow-hidden relative flex flex-col">
          <div className="p-5 flex justify-between items-center z-10 border-b border-white/10 bg-black/20 backdrop-blur-md">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-400" /> State Health Intelligence Map
            </h3>
            <div className="flex bg-white dark:bg-slate-900/10 rounded-lg p-1 border border-white/5">
              <button className="px-3 py-1.5 text-xs font-bold text-white bg-white dark:bg-slate-900/20 rounded shadow-sm">Real-time</button>
              <button className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white">Predictive</button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden bg-slate-900 flex items-center justify-center">
            {/* Abstract map representation using Ashoka Chakra and data points */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            <svg width="600" height="400" viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none animate-[spin_120s_linear_infinite]">
              <circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="1" />
              {[...Array(24)].map((_, i) => (
                <line key={i} x1="50" y1="50" x2="50" y2="2" stroke="#fff" strokeWidth="0.5" transform={"rotate(" + (i * 15) + " 50 50)"} />
              ))}
            </svg>

            {/* Glowing nodes representing facilities */}
            <div className="absolute top-[30%] left-[40%] group">
              <div className="absolute inset-0 bg-blue-500 blur-xl opacity-50 rounded-full animate-pulse"></div>
              <div className="w-4 h-4 bg-blue-400 rounded-full border-2 border-white relative z-10"></div>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Pune District Hospital</div>
            </div>

            <div className="absolute top-[60%] left-[30%] group">
              <div className="absolute inset-0 bg-rose-500 blur-xl opacity-50 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-rose-400 rounded-full border-2 border-white relative z-10"></div>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Velhe PHC (High Risk Alert)</div>
            </div>

            <div className="absolute top-[45%] left-[65%] group">
              <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-50 rounded-full"></div>
              <div className="w-3 h-3 bg-emerald-400 rounded-full border-2 border-white relative z-10"></div>
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">Shirur Sub-Centre</div>
            </div>

            {/* Animated SVG lines for Referrals */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <path d="M 30% 60% Q 35% 45% 40% 30%" fill="none" stroke="rgba(244, 63, 94, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_2s_linear_infinite]" />
              <path d="M 65% 45% Q 52% 37% 40% 30%" fill="none" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_3s_linear_infinite]" />
            </svg>
            
          </div>
        </div>

        {/* Right: Outbreak & Alerts panel */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" /> AI Outbreak Signals
            </h3>
          </div>
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-2 py-1 rounded uppercase tracking-wide">High Confidence</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Just now</span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dengue Cluster Detected</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-3">AI identified 14 correlating fever/platelet cases across 3 adjacent PHCs in Velhe block.</p>
              <button className="w-full py-2 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors flex justify-center items-center gap-1">
                Deploy Mobile Team <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded uppercase tracking-wide">Monitor</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">2 hrs ago</span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Maternal Anemia Trend</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">22% increase in severe anemia flags reported by ASHA offline syncs in rural clusters.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

