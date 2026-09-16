'use client';

import React, { useState } from 'react';
import { KpiTrendDataPoint } from '@/lib/types';
import { getDistrictKpiTrends } from '@/lib/dhoIntelligenceEngine';
import {
  BarChart3,
  TrendingUp,
  AlertOctagon,
  Bed,
  Users,
  Package,
  HeartPulse,
} from 'lucide-react';

export function DistrictKpiCharts() {
  const [activeMetric, setActiveMetric] = useState<'BED' | 'REFERRAL' | 'STOCK' | 'ICU'>('BED');
  const data = getDistrictKpiTrends();

  const getMetricDetails = () => {
    switch (activeMetric) {
      case 'BED':
        return {
          title: 'Bed Occupancy Rate (%)',
          unit: '%',
          color: '#3b82f6', // blue-500
          icon: Bed,
          currentValue: `${data[data.length - 1].bedOccupancyPct}%`,
          getValue: (d: KpiTrendDataPoint) => d.bedOccupancyPct,
          baseline: 75,
        };
      case 'REFERRAL':
        return {
          title: 'District Referral Flow (Cases/Day)',
          unit: 'cases',
          color: '#8b5cf6', // purple-500
          icon: Users,
          currentValue: `${data[data.length - 1].referralVolume} Cases`,
          getValue: (d: KpiTrendDataPoint) => d.referralVolume,
          baseline: 15,
        };
      case 'STOCK':
        return {
          title: 'Medicine Buffer Turnover Rate (%)',
          unit: '%',
          color: '#f59e0b', // amber-500
          icon: Package,
          currentValue: `${data[data.length - 1].medicineTurnoverRate}%`,
          getValue: (d: KpiTrendDataPoint) => d.medicineTurnoverRate,
          baseline: 90,
        };
      case 'ICU':
        return {
          title: 'ICU Bed Utilization Rate (%)',
          unit: '%',
          color: '#ef4444', // rose-500
          icon: HeartPulse,
          currentValue: `${data[data.length - 1].icuUtilizationPct}%`,
          getValue: (d: KpiTrendDataPoint) => d.icuUtilizationPct,
          baseline: 70,
        };
    }
  };

  const current = getMetricDetails();
  const maxVal = Math.max(...data.map(current.getValue), current.baseline * 1.3);
  const minVal = Math.min(...data.map(current.getValue)) * 0.8;

  // Chart SVG Coordinates computation
  const svgWidth = 600;
  const svgHeight = 180;
  const padding = 30;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (svgWidth - padding * 2);
    const val = current.getValue(d);
    const y = svgHeight - padding - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
    return { x, y, d, val };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`;

  // Anomaly point
  const anomalyPoint = points.find((p) => p.d.isAnomaly);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header & Metric Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
              District KPI Historical Trends
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            7-day rolling time-series with automated anomaly deviation flagging
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveMetric('BED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'BED'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Bed Occ %
          </button>
          <button
            onClick={() => setActiveMetric('REFERRAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'REFERRAL'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Referrals
          </button>
          <button
            onClick={() => setActiveMetric('STOCK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'STOCK'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Stock Buffer
          </button>
          <button
            onClick={() => setActiveMetric('ICU')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMetric === 'ICU'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            ICU Stress
          </button>
        </div>
      </div>

      {/* SVG Time-Series Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 sm:h-52 overflow-visible">
          <defs>
            <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={current.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={current.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
          <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#e2e8f0" strokeDasharray="3 3" className="dark:stroke-slate-800" />
          <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#cbd5e1" className="dark:stroke-slate-700" />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#grad-${activeMetric})`} />

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={current.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="group">
              <circle
                cx={p.x}
                cy={p.y}
                r={p.d.isAnomaly ? '6' : '4'}
                fill={p.d.isAnomaly ? '#ef4444' : current.color}
                stroke="#ffffff"
                strokeWidth="2"
                className={p.d.isAnomaly ? 'animate-pulse' : ''}
              />
              <text
                x={p.x}
                y={svgHeight - 10}
                textAnchor="middle"
                className="text-[9px] font-bold fill-slate-400 dark:fill-slate-500 font-mono"
              >
                {p.d.dateLabel}
              </text>
            </g>
          ))}
        </svg>

        {/* Anomaly Detection Banner if active */}
        {anomalyPoint?.d.isAnomaly && (
          <div className="mt-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-xs text-rose-950 dark:text-rose-100">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-rose-700 dark:text-rose-300">
                Automated Anomaly Alert (Thu 12 Sep):
              </span>{' '}
              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                {anomalyPoint.d.anomalyReason}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
