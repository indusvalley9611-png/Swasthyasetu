'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Facility } from '@/lib/types';
import {
  HospitalRouteInfo,
  getRankedDistrictHospitals,
  projectGeoToSvg,
  MAHARASHTRA_REGIONS,
  MAHARASHTRA_GEO_BOUNDS,
  getRoadDistanceKm,
  getEstimatedTransitMinutes,
  formatTransitMinutes,
} from '@/lib/maharashtraGisEngine';
import {
  MapPin,
  Navigation,
  Activity,
  Bed,
  Phone,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
  Compass,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Send,
  Zap,
} from 'lucide-react';

interface MaharashtraNetworkMapProps {
  facilities: Facility[];
  initialOriginFacilityId?: string;
  onSelectHospitalForReferral?: (facility: Facility) => void;
  isEmbedded?: boolean;
  requiredSpecialty?: string;
  onClose?: () => void;
}

export function MaharashtraNetworkMap({
  facilities,
  initialOriginFacilityId = 'fac-phc-velhe',
  onSelectHospitalForReferral,
  isEmbedded = false,
  requiredSpecialty: externalSpecialty,
  onClose,
}: MaharashtraNetworkMapProps) {
  // Origin PHC / Facility selection
  const [originId, setOriginId] = useState<string>(initialOriginFacilityId);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(externalSpecialty || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [showAllRoutes, setShowAllRoutes] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Sync external specialty prop if updated
  useEffect(() => {
    if (externalSpecialty) {
      setSelectedSpecialty(externalSpecialty);
    }
  }, [externalSpecialty]);

  // Resolve origin facility
  const originFacility = useMemo(() => {
    return facilities.find((f) => f.id === originId) || facilities.find((f) => f.id === 'fac-phc-velhe') || facilities[0];
  }, [facilities, originId]);

  // Calculate ranked routes from current origin to all District Hospitals in Maharashtra
  const rankedRoutes = useMemo(() => {
    if (!originFacility) return [];
    return getRankedDistrictHospitals(originFacility, facilities, selectedSpecialty || undefined);
  }, [originFacility, facilities, selectedSpecialty]);

  // Filtered routes based on search query
  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return rankedRoutes;
    const q = searchQuery.toLowerCase();
    return rankedRoutes.filter(
      (r) =>
        r.destination.name.toLowerCase().includes(q) ||
        r.destination.district.toLowerCase().includes(q) ||
        r.destination.taluka?.toLowerCase().includes(q) ||
        r.destination.availableSpecialists?.some((s) => s.toLowerCase().includes(q))
    );
  }, [rankedRoutes, searchQuery]);

  // Shortest Route
  const shortestRoute = rankedRoutes[0] || null;

  // Currently focused hospital (clicked or shortest by default)
  const activeHospitalRoute = useMemo(() => {
    if (selectedHospitalId) {
      return rankedRoutes.find((r) => r.destination.id === selectedHospitalId) || shortestRoute;
    }
    return shortestRoute;
  }, [rankedRoutes, selectedHospitalId, shortestRoute]);

  // SVG Dimension Constants
  const SVG_WIDTH = 880;
  const SVG_HEIGHT = 580;

  // Origin Projected Point
  const originPoint = useMemo(() => {
    if (!originFacility) return { x: 200, y: 350 };
    return projectGeoToSvg(originFacility.lat, originFacility.lng, SVG_WIDTH, SVG_HEIGHT, 50);
  }, [originFacility]);

  // List of distinct specialties across facilities
  const specialtyOptions = [
    'Cardiology',
    'Obstetrics & Gynaecology',
    'Pediatrics',
    'Trauma & Emergency Care',
    'Orthopedics',
    'General Surgery',
    'Critical Care',
    'Neurology',
    'Pulmonology',
  ];

  return (
    <div className={`flex flex-col ${isEmbedded ? 'h-[640px]' : 'h-[85vh]'} bg-slate-900 text-slate-100 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative font-sans`}>
      {/* Top Header Bar */}
      <div className="bg-slate-950/80 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-inner">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                Maharashtra Healthcare GIS Network Map
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Live Shortest Route Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Inter-facility road distances, emergency ambulance transit times, and ICU capacity across all 36 Maharashtra districts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Origin PHC Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Origin PHC:</span>
            <select
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                setSelectedHospitalId(null);
              }}
              className="bg-transparent text-white font-bold outline-none cursor-pointer focus:ring-0 text-xs"
            >
              {facilities
                .filter((f) => f.type === 'PHC' || f.type === 'Rural Hospital' || f.type === 'Sub-Centre')
                .map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                    {f.name} ({f.taluka})
                  </option>
                ))}
            </select>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Control & Hospital Matrix, Right GIS Map */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden relative">
        
        {/* Left Column: Hospital Ranking & Direct Referral Controller */}
        <div className="lg:col-span-4 bg-slate-950/60 border-r border-slate-800 flex flex-col h-full overflow-hidden z-10">
          
          {/* Filter / Search Bar */}
          <div className="p-4 border-b border-slate-800/80 space-y-3 bg-slate-900/40">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search hospital or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 font-medium transition-all"
              />
            </div>

            {/* Specialty Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <button
                onClick={() => setSelectedSpecialty('')}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                  selectedSpecialty === ''
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Facilities
              </button>
              {specialtyOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSpecialty(selectedSpecialty === s ? '' : s)}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedSpecialty === s
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Shortest Route Highlight Card */}
          {shortestRoute && (
            <div className="p-4 bg-gradient-to-br from-teal-950/50 via-slate-900/60 to-emerald-950/40 border-b border-teal-900/40 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase border border-emerald-500/30">
                  <Zap className="w-3 h-3 text-emerald-400" /> Optimal Shortest Route
                </span>
                <span className="text-xs font-mono font-bold text-teal-300">
                  {shortestRoute.distanceKm} km • ~{shortestRoute.transitTimeFormatted}
                </span>
              </div>

              <div className="font-bold text-sm text-white truncate">
                {shortestRoute.destination.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{shortestRoute.destination.district} District</span>
                <span>•</span>
                <span className={shortestRoute.hasAvailableIcu ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {shortestRoute.icuAvailableCount} ICU Beds Free
                </span>
              </div>

              {onSelectHospitalForReferral && (
                <button
                  onClick={() => onSelectHospitalForReferral(shortestRoute.destination)}
                  className="mt-3 w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" /> Refer to Shortest Hospital
                </button>
              )}
            </div>
          )}

          {/* Scrollable Ranked Hospitals List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Ranked by Distance from {originFacility?.name} ({filteredRoutes.length})
            </div>

            {filteredRoutes.map((route, idx) => {
              const isSelected = activeHospitalRoute?.destination.id === route.destination.id;
              const isShortest = route.isShortest;

              return (
                <div
                  key={route.destination.id}
                  onClick={() => setSelectedHospitalId(route.destination.id)}
                  onMouseEnter={() => setHoveredHospitalId(route.destination.id)}
                  onMouseLeave={() => setHoveredHospitalId(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-500/80 shadow-md ring-1 ring-teal-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isShortest ? 'bg-emerald-500/20 text-emerald-300 font-extrabold' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="text-xs font-bold text-white truncate">
                          {route.destination.name}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>{route.destination.district}</span>
                        <span>•</span>
                        <span className="font-mono text-teal-300 font-semibold">{route.distanceKm} km</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{route.transitTimeFormatted}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">ICU Beds</div>
                      <div className={`text-xs font-extrabold ${route.icuAvailableCount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {route.icuAvailableCount} Free
                      </div>
                    </div>
                  </div>

                  {/* Specialists Preview */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <div className="text-slate-400 truncate max-w-[200px]">
                      {route.destination.availableSpecialists?.slice(0, 2).join(', ')}
                      {(route.destination.availableSpecialists?.length || 0) > 2 ? ` +${(route.destination.availableSpecialists?.length || 0) - 2} more` : ''}
                    </div>

                    {onSelectHospitalForReferral && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHospitalForReferral(route.destination);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-teal-600 text-slate-300 hover:text-white font-bold rounded-lg transition-all flex items-center gap-1"
                      >
                        Select <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Map Controls Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={showAllRoutes}
                onChange={(e) => setShowAllRoutes(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
              />
              <span className="text-[11px] font-semibold">Show all state route arcs</span>
            </label>

            <button
              onClick={() => {
                setSelectedHospitalId(null);
                setSearchQuery('');
                setSelectedSpecialty('');
              }}
              className="text-[11px] text-teal-400 hover:underline font-bold"
            >
              Reset Map View
            </button>
          </div>
        </div>

        {/* Right Column: High-Tech Maharashtra Interactive Vector GIS Map */}
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative flex items-center justify-center p-4 overflow-hidden select-none">
          
          {/* Subtle Grid Background Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

          {/* Map Title Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2.5 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></div>
              <span>Active Origin: <span className="text-teal-300">{originFacility?.name}</span></span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Lat: {originFacility?.lat}° N, Lng: {originFacility?.lng}° E
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[9px] mb-1">Facility Legend</div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300"></span>
              <span>Origin PHC / Sub-Centre</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-indigo-300"></span>
              <span>District Civil Hospital</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-200"></span>
              <span>Govt Medical College (GMC)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-4 h-0.5 bg-emerald-400"></span>
              <span className="text-emerald-300 font-bold">Shortest Route Line</span>
            </div>
          </div>

          {/* Scalable Vector Graphics GIS Canvas */}
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-full max-h-[560px] drop-shadow-2xl transition-all duration-300"
          >
            <defs>
              {/* Gradient for Shortest Route */}
              <linearGradient id="shortestRouteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="1" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* State Outline & Region Contour Blobs */}
            <g className="opacity-60">
              {MAHARASHTRA_REGIONS.map((region) => {
                const centerPt = projectGeoToSvg(region.center.lat, region.center.lng, SVG_WIDTH, SVG_HEIGHT, 50);
                return (
                  <g key={region.id}>
                    <circle
                      cx={centerPt.x}
                      cy={centerPt.y}
                      r="90"
                      fill={region.color}
                      fillOpacity="0.08"
                      stroke={region.color}
                      strokeOpacity="0.25"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={centerPt.x}
                      y={centerPt.y + 70}
                      fill={region.color}
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      opacity="0.6"
                      className="uppercase tracking-widest pointer-events-none"
                    >
                      {region.name.split(' / ')[0]}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Connecting Route Lines to District Hospitals */}
            <g>
              {rankedRoutes.map((route) => {
                const destPt = projectGeoToSvg(route.destination.lat, route.destination.lng, SVG_WIDTH, SVG_HEIGHT, 50);
                const isShortest = route.isShortest;
                const isSelected = activeHospitalRoute?.destination.id === route.destination.id;

                if (!showAllRoutes && !isShortest && !isSelected) {
                  return null;
                }

                // Midpoint for distance bubble tag
                const midX = (originPoint.x + destPt.x) / 2;
                const midY = (originPoint.y + destPt.y) / 2;

                return (
                  <g key={`route-${route.destination.id}`}>
                    {/* Route Path Line */}
                    <line
                      x1={originPoint.x}
                      y1={originPoint.y}
                      x2={destPt.x}
                      y2={destPt.y}
                      stroke={isShortest ? 'url(#shortestRouteGrad)' : isSelected ? '#38bdf8' : '#475569'}
                      strokeWidth={isShortest ? 3.5 : isSelected ? 2.5 : 1.2}
                      strokeDasharray={isShortest ? '6 3' : isSelected ? '4 2' : '2 2'}
                      className={isShortest ? 'animate-pulse' : ''}
                      filter={isShortest ? 'url(#glow)' : undefined}
                    />

                    {/* Distance & Transit Bubble at Midpoint */}
                    {(isShortest || isSelected) && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-46"
                          y="-13"
                          width="92"
                          height="26"
                          rx="13"
                          fill={isShortest ? '#064e3b' : '#0f172a'}
                          stroke={isShortest ? '#34d399' : '#38bdf8'}
                          strokeWidth="1.5"
                          filter="url(#glow)"
                        />
                        <text
                          x="0"
                          y="4"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {route.distanceKm} km ({route.transitMinutes}m)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Hospital Markers / Pins */}
            <g>
              {rankedRoutes.map((route) => {
                const pt = projectGeoToSvg(route.destination.lat, route.destination.lng, SVG_WIDTH, SVG_HEIGHT, 50);
                const isShortest = route.isShortest;
                const isSelected = activeHospitalRoute?.destination.id === route.destination.id;
                const isHovered = hoveredHospitalId === route.destination.id;
                const isMedicalCollege = route.destination.type === 'Medical College';

                return (
                  <g
                    key={`pin-${route.destination.id}`}
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => setSelectedHospitalId(route.destination.id)}
                    onMouseEnter={() => setHoveredHospitalId(route.destination.id)}
                    onMouseLeave={() => setHoveredHospitalId(null)}
                    className="cursor-pointer group"
                  >
                    {/* Glowing highlight ring if shortest or selected */}
                    {(isShortest || isSelected || isHovered) && (
                      <circle
                        r={isShortest ? 18 : 15}
                        fill={isShortest ? '#10b981' : '#38bdf8'}
                        fillOpacity="0.2"
                        stroke={isShortest ? '#34d399' : '#38bdf8'}
                        strokeWidth="1.5"
                        className="animate-ping"
                      />
                    )}

                    {/* Node Core */}
                    <circle
                      r={isShortest ? 10 : 8}
                      fill={isShortest ? '#10b981' : isMedicalCollege ? '#38bdf8' : '#6366f1'}
                      stroke="#ffffff"
                      strokeWidth="2"
                      filter={isShortest ? 'url(#glow)' : undefined}
                    />

                    {/* Hospital Name Label */}
                    <text
                      x="0"
                      y={isShortest ? 22 : 18}
                      fill="#ffffff"
                      fontSize={isShortest ? '10' : '8.5'}
                      fontWeight={isShortest || isSelected ? 'bold' : 'normal'}
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow-md"
                    >
                      {route.destination.district}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Origin Facility Radar Pulse Marker */}
            <g transform={`translate(${originPoint.x}, ${originPoint.y})`}>
              <circle r="22" fill="#10b981" fillOpacity="0.15" className="animate-ping" />
              <circle r="12" fill="#047857" stroke="#34d399" strokeWidth="2.5" />
              <circle r="4" fill="#ffffff" />
              <text
                x="0"
                y="-16"
                fill="#34d399"
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                className="drop-shadow-md tracking-wider uppercase"
              >
                📍 {originFacility?.name.split(' ')[0]} PHC
              </text>
            </g>
          </svg>

          {/* Active Selected Hospital Floating Detail Card */}
          {activeHospitalRoute && (
            <div className="absolute bottom-4 left-4 z-20 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {activeHospitalRoute.destination.type}
                    </span>
                    {activeHospitalRoute.isShortest && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ⚡ Shortest
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-white mt-1.5 leading-snug">
                    {activeHospitalRoute.destination.name}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Taluka: {activeHospitalRoute.destination.taluka} • District: {activeHospitalRoute.destination.district}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black text-teal-300 font-mono">
                    {activeHospitalRoute.distanceKm} km
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ~{activeHospitalRoute.transitTimeFormatted}
                  </div>
                </div>
              </div>

              {/* Bed & ICU Matrix Snapshot */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center text-xs">
                <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Total Beds</div>
                  <div className="font-bold text-white mt-0.5">
                    {activeHospitalRoute.destination.totalBeds - activeHospitalRoute.destination.occupiedBeds}/{activeHospitalRoute.destination.totalBeds}
                  </div>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">ICU Beds</div>
                  <div className={`font-bold mt-0.5 ${activeHospitalRoute.icuAvailableCount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeHospitalRoute.icuAvailableCount} Free
                  </div>
                </div>
                <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Oxygen Beds</div>
                  <div className="font-bold text-teal-300 mt-0.5">
                    {activeHospitalRoute.destination.oxygenBedsTotal - activeHospitalRoute.destination.oxygenBedsOccupied}
                  </div>
                </div>
              </div>

              {/* Specialists List */}
              <div className="mt-2.5 text-[11px] text-slate-400 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {activeHospitalRoute.destination.availableSpecialists?.join(', ')}
                </span>
              </div>

              {/* Action Button */}
              {onSelectHospitalForReferral && (
                <button
                  onClick={() => onSelectHospitalForReferral(activeHospitalRoute.destination)}
                  className="mt-3 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5" /> Refer Patient to {activeHospitalRoute.destination.name.split(',')[0]}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
