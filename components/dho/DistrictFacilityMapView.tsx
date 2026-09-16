'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Facility, DrugStockItem, Referral, Patient } from '@/lib/types';
import { computeDistrictHealthScorecards } from '@/lib/dhoIntelligenceEngine';
import { getMedicineStatus } from '@/lib/resourceManagement';
import {
  MapPin,
  Building2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Pill,
  Bed,
  Users,
  Compass,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface DistrictFacilityMapViewProps {
  districtName: string;
  facilities: Facility[];
  stocks: DrugStockItem[];
  referrals: Referral[];
  patients?: Patient[];
  onOpenScorecard?: (facilityId: string) => void;
  onOpenReferralsTab?: () => void;
  onOpenCapacityTab?: () => void;
}

export function DistrictFacilityMapView({
  districtName,
  facilities,
  stocks,
  referrals,
  patients = [],
  onOpenScorecard,
  onOpenReferralsTab,
  onOpenCapacityTab,
}: DistrictFacilityMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const polylinesGroupRef = useRef<any>(null);

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'CRITICAL' | 'MODERATE' | 'HEALTHY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReferralFlowLines, setShowReferralFlowLines] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Compute facility health scorecards using existing engine
  const scorecards = useMemo(() => {
    return computeDistrictHealthScorecards(facilities, stocks, referrals);
  }, [facilities, stocks, referrals]);

  const scorecardMap = useMemo(() => {
    const map = new Map<string, typeof scorecards[0]>();
    scorecards.forEach((sc) => map.set(sc.facilityId, sc));
    return map;
  }, [scorecards]);

  // Compute facility status based on scorecard composite score
  const getFacilityStatus = (facility: Facility) => {
    const sc = scorecardMap.get(facility.id);
    if (!sc) {
      const occPct = facility.totalBeds > 0 ? (facility.occupiedBeds / facility.totalBeds) * 100 : 0;
      if (occPct >= 85) return 'CRITICAL';
      if (occPct >= 65) return 'MODERATE';
      return 'HEALTHY';
    }

    if (sc.compositeScore >= 80) return 'HEALTHY';
    if (sc.compositeScore >= 65) return 'MODERATE';
    return 'CRITICAL';
  };

  // Facilities with computed status and valid coordinates
  const facilityDataList = useMemo(() => {
    return facilities
      .filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lng))
      .map((f) => {
        const sc = scorecardMap.get(f.id);
        const status = getFacilityStatus(f);
        const facStocks = stocks.filter((s) => s.facilityId === f.id);
        const criticalStocks = facStocks.filter((s) => getMedicineStatus(s) === 'CRITICAL');
        const limitedStocks = facStocks.filter((s) => getMedicineStatus(s) === 'LIMITED');

        const activeUrgentReferrals = referrals.filter((r) => {
          const isMatching = r.referringFacilityId === f.id || r.targetFacilityId === f.id;
          const isUrgent = r.triagePriority === 'red' || r.triagePriority === 'yellow';
          const isActive = r.status === 'PENDING' || r.status === 'ACCEPTED' || r.status === 'ROUTED_TO_TERTIARY';
          return isMatching && isUrgent && isActive;
        });

        return {
          facility: f,
          scorecard: sc,
          status,
          totalDrugs: facStocks.length,
          criticalDrugsCount: criticalStocks.length,
          limitedDrugsCount: limitedStocks.length,
          activeUrgentReferrals,
        };
      });
  }, [facilities, scorecardMap, stocks, referrals]);

  // Filtered facility list
  const filteredFacilities = useMemo(() => {
    return facilityDataList.filter((item) => {
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.facility.name.toLowerCase().includes(q) ||
          item.facility.taluka.toLowerCase().includes(q) ||
          item.facility.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facilityDataList, filterStatus, searchQuery]);

  // Active referral transit lines between district facilities
  const activeReferralFlows = useMemo(() => {
    const flows: Array<{
      referral: Referral;
      originFac: Facility;
      targetFac: Facility;
      priority: 'red' | 'yellow' | 'green';
    }> = [];

    referrals.forEach((ref) => {
      if (ref.status !== 'PENDING' && ref.status !== 'ACCEPTED' && ref.status !== 'ROUTED_TO_TERTIARY') return;

      const origin = facilities.find(
        (f) =>
          f.id === ref.referringFacilityId ||
          (ref.referringFacility && f.name.toLowerCase().includes(ref.referringFacility.toLowerCase()))
      );

      const target = facilities.find(
        (f) =>
          f.id === ref.targetFacilityId ||
          (ref.targetFacility && f.name.toLowerCase().includes(ref.targetFacility.toLowerCase()))
      );

      if (origin && target && origin.id !== target.id) {
        if (Number.isFinite(origin.lat) && Number.isFinite(origin.lng) && Number.isFinite(target.lat) && Number.isFinite(target.lng)) {
          flows.push({
            referral: ref,
            originFac: origin,
            targetFac: target,
            priority: ref.triagePriority || 'yellow',
          });
        }
      }
    });

    return flows;
  }, [referrals, facilities]);

  // Selected facility detailed snapshot
  const selectedFacilitySnapshot = useMemo(() => {
    if (!selectedFacilityId) return null;
    return facilityDataList.find((item) => item.facility.id === selectedFacilityId) || null;
  }, [selectedFacilityId, facilityDataList]);

  // Status Summary Metrics
  const summaryCounts = useMemo(() => {
    let healthy = 0;
    let moderate = 0;
    let critical = 0;
    facilityDataList.forEach((item) => {
      if (item.status === 'HEALTHY') healthy++;
      else if (item.status === 'MODERATE') moderate++;
      else if (item.status === 'CRITICAL') critical++;
    });
    return {
      total: facilityDataList.length,
      healthy,
      moderate,
      critical,
      activeFlows: activeReferralFlows.length,
    };
  }, [facilityDataList, activeReferralFlows]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    // Dynamically import Leaflet to avoid SSR window errors
    import('leaflet').then((L) => {
      if (!isSubscribed || !mapContainerRef.current) return;

      // Fix default Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Cleanup existing map instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Default center: Pune / Nashik coordinates or average of facilities
      let centerLat = 18.5204;
      let centerLng = 73.8567;

      if (facilityDataList.length > 0) {
        const sumLat = facilityDataList.reduce((acc, item) => acc + item.facility.lat, 0);
        const sumLng = facilityDataList.reduce((acc, item) => acc + item.facility.lng, 0);
        centerLat = sumLat / facilityDataList.length;
        centerLng = sumLng / facilityDataList.length;
      }

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // OpenStreetMap Tile Layer (Self-contained, no external API keys)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SwasthyaSetu Health GIS',
        maxZoom: 18,
      }).addTo(map);

      // Layer groups for markers and referral flow polylines
      const markersGroup = L.layerGroup().addTo(map);
      const polylinesGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = markersGroup;
      polylinesGroupRef.current = polylinesGroup;

      setMapLoaded(true);
    });

    return () => {
      isSubscribed = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Referral Lines when facilities / status / selection change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !markersGroupRef.current || !polylinesGroupRef.current) return;

    import('leaflet').then((L) => {
      const markersGroup = markersGroupRef.current;
      const polylinesGroup = polylinesGroupRef.current;
      const map = mapInstanceRef.current;

      markersGroup.clearLayers();
      polylinesGroup.clearLayers();

      const bounds = L.latLngBounds([]);

      // 1. Plot Referral Flow Lines (Visual indicator for cases moving between facilities)
      if (showReferralFlowLines) {
        activeReferralFlows.forEach((flow) => {
          const color = flow.priority === 'red' ? '#ef4444' : flow.priority === 'yellow' ? '#f59e0b' : '#10b981';
          const polyline = L.polyline(
            [
              [flow.originFac.lat, flow.originFac.lng],
              [flow.targetFac.lat, flow.targetFac.lng],
            ],
            {
              color,
              weight: 3,
              opacity: 0.8,
              dashArray: '8, 6',
            }
          );

          polyline.bindTooltip(
            `<div class="text-xs font-sans">
              <div class="font-bold text-slate-900">${flow.referral.patientName} (${flow.priority.toUpperCase()})</div>
              <div class="text-slate-600">${flow.originFac.name.split(',')[0]} &rarr; ${flow.targetFac.name.split(',')[0]}</div>
              <div class="text-[10px] text-slate-500 italic mt-0.5">Visual referral transit indicator</div>
            </div>`,
            { sticky: true }
          );

          polyline.addTo(polylinesGroup);
        });
      }

      // 2. Plot Facility Markers
      filteredFacilities.forEach((item) => {
        const { facility, status, scorecard } = item;
        const isSelected = selectedFacilityId === facility.id;

        // Color coding matching existing PHC Rankings / Scorecard
        const markerColor =
          status === 'HEALTHY' ? '#10b981' : status === 'MODERATE' ? '#f59e0b' : '#ef4444';
        const borderColor =
          status === 'HEALTHY' ? '#047857' : status === 'MODERATE' ? '#b45309' : '#b91c1c';

        const isDistrictHospital =
          facility.type === 'District Hospital' || facility.type === 'Medical College';

        const iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
            ${
              status === 'CRITICAL'
                ? `<div class="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping"></div>`
                : ''
            }
            <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-110 ${
              isSelected ? 'ring-4 ring-blue-500 scale-125' : ''
            }" style="background-color: ${markerColor}; border: 2.5px solid #ffffff;">
              <span style="color: #ffffff; font-size: 13px; font-weight: 900;">
                ${isDistrictHospital ? '🏥' : '🩺'}
              </span>
            </div>
            <div class="absolute -bottom-5 px-1.5 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-bold whitespace-nowrap shadow border border-slate-700 pointer-events-none">
              ${facility.taluka || facility.name.split(' ')[0]} (${scorecard ? scorecard.compositeScore : '--'})
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-facility-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([facility.lat, facility.lng], { icon: customIcon });

        marker.on('click', () => {
          setSelectedFacilityId(facility.id);
        });

        // Hover tooltip
        marker.bindTooltip(
          `<div class="text-xs font-sans p-1">
            <div class="font-bold text-slate-900">${facility.name}</div>
            <div class="text-[11px] text-slate-600 font-medium">${facility.type} • ${facility.taluka}</div>
            <div class="mt-1 flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${
                status === 'HEALTHY'
                  ? 'bg-emerald-100 text-emerald-800'
                  : status === 'MODERATE'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }">Status: ${status}</span>
              <span class="text-slate-500 font-bold text-[10px]">Score: ${scorecard?.compositeScore || 'N/A'}/100</span>
            </div>
          </div>`,
          { direction: 'top', offset: [0, -10] }
        );

        marker.addTo(markersGroup);
        bounds.extend([facility.lat, facility.lng]);
      });

      // Fit map to markers bounds if valid
      if (filteredFacilities.length > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    });
  }, [filteredFacilities, selectedFacilityId, activeReferralFlows, showReferralFlowLines, mapLoaded]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  District Healthcare Facility GIS Map
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {districtName} District
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live spatial tracking of primary health centres, rural hospitals, and district hospitals with integrated scorecard status and referral movement.
              </p>
            </div>
          </div>

          {/* KPI Mini Pills */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <span className="text-slate-400 mr-1">Total:</span>
              <strong className="font-bold text-slate-900 dark:text-white">{summaryCounts.total}</strong>
            </div>
            <button
              onClick={() => setFilterStatus(filterStatus === 'HEALTHY' ? 'ALL' : 'HEALTHY')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                filterStatus === 'HEALTHY'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Healthy ({summaryCounts.healthy})</span>
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'MODERATE' ? 'ALL' : 'MODERATE')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                filterStatus === 'MODERATE'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Moderate ({summaryCounts.moderate})</span>
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                filterStatus === 'CRITICAL'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Critical ({summaryCounts.critical})</span>
            </button>
          </div>
        </div>

        {/* Search & Flow Lines Toggle Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facility name, taluka, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={showReferralFlowLines}
                onChange={(e) => setShowReferralFlowLines(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0"
              />
              <span>Show Active Referral Transit Lines ({summaryCounts.activeFlows} active)</span>
            </label>

            {filterStatus !== 'ALL' && (
              <button
                onClick={() => setFilterStatus('ALL')}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map + Facility Detail Snapshot Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Map Container (Leaflet OSM) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg relative min-h-[560px] flex flex-col">
          <div ref={mapContainerRef} className="w-full h-full min-h-[560px] z-10"></div>

          {/* Visual Indicator Disclaimer Note */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] text-slate-300 shadow flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>Referral lines indicate active clinical transit between facilities (straight-line visualization).</span>
          </div>
        </div>

        {/* Right Sidebar: Selected Facility Live Snapshot */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-lg flex flex-col justify-between space-y-4">
          {selectedFacilitySnapshot ? (
            <div className="space-y-4 overflow-y-auto max-h-[540px] pr-1">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                    selectedFacilitySnapshot.status === 'HEALTHY'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : selectedFacilitySnapshot.status === 'MODERATE'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  }`}>
                    {selectedFacilitySnapshot.status} STATUS
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                    Taluka: {selectedFacilitySnapshot.facility.taluka}
                  </span>
                </div>

                <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {selectedFacilitySnapshot.facility.name}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {selectedFacilitySnapshot.facility.type} • Phone: {selectedFacilitySnapshot.facility.phone}
                </div>
              </div>

              {/* Scorecard Summary Pill */}
              {selectedFacilitySnapshot.scorecard && (
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400 uppercase text-[10px]">District Health Scorecard</span>
                    <span className={`text-sm font-black ${
                      selectedFacilitySnapshot.scorecard.compositeScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : selectedFacilitySnapshot.scorecard.compositeScore >= 65
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {selectedFacilitySnapshot.scorecard.compositeScore}/100 (Rank #{selectedFacilitySnapshot.scorecard.rank})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-400 font-semibold text-[9px] uppercase">Drug Stock Score</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedFacilitySnapshot.scorecard.metrics.stockAdequacyScore}%
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-400 font-semibold text-[9px] uppercase">Bed Safety Score</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedFacilitySnapshot.scorecard.metrics.bedSafetyScore}%
                      </div>
                    </div>
                  </div>

                  {selectedFacilitySnapshot.scorecard.rootCauses.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-xl border border-rose-200 dark:border-rose-900/40">
                      <div className="font-bold mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" /> Root Cause Flags:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                        {selectedFacilitySnapshot.scorecard.rootCauses.map((rc, idx) => (
                          <li key={idx}>{rc}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Bed & ICU Capacity Snapshot */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-blue-600" /> Bed Availability Snapshot
                  </span>
                  <span className="font-mono text-[11px]">
                    {selectedFacilitySnapshot.facility.totalBeds - selectedFacilitySnapshot.facility.occupiedBeds} free / {selectedFacilitySnapshot.facility.totalBeds} total
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (selectedFacilitySnapshot.facility.occupiedBeds / selectedFacilitySnapshot.facility.totalBeds) >= 0.85
                        ? 'bg-rose-500'
                        : (selectedFacilitySnapshot.facility.occupiedBeds / selectedFacilitySnapshot.facility.totalBeds) >= 0.65
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (selectedFacilitySnapshot.facility.occupiedBeds / (selectedFacilitySnapshot.facility.totalBeds || 1)) * 100)}%`,
                    }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">General</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedFacilitySnapshot.facility.totalBeds - selectedFacilitySnapshot.facility.occupiedBeds} free
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">ICU Beds</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedFacilitySnapshot.facility.icuBedsTotal - selectedFacilitySnapshot.facility.icuBedsOccupied} free
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Oxygen Beds</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedFacilitySnapshot.facility.oxygenBedsTotal - selectedFacilitySnapshot.facility.oxygenBedsOccupied} free
                    </div>
                  </div>
                </div>
              </div>

              {/* Medicine Stock Snapshot from MahaAushadhi */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-rose-600" /> MahaAushadhi Stock
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {selectedFacilitySnapshot.totalDrugs} Monitored Items
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-lg font-bold flex-1 text-center ${
                    selectedFacilitySnapshot.criticalDrugsCount > 0
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}>
                    {selectedFacilitySnapshot.criticalDrugsCount} Critical Deficits
                  </span>
                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold flex-1 text-center">
                    {selectedFacilitySnapshot.limitedDrugsCount} Limited Buffers
                  </span>
                </div>
              </div>

              {/* Active Urgent Referrals Involving Facility */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-purple-600" /> Active Urgent Referrals ({selectedFacilitySnapshot.activeUrgentReferrals.length})
                  </span>
                </div>

                {selectedFacilitySnapshot.activeUrgentReferrals.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-xs text-slate-400">
                    No active urgent referrals in transit for this facility.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedFacilitySnapshot.activeUrgentReferrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-0.5"
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-900 dark:text-white truncate">{ref.patientName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-extrabold ${
                            ref.triagePriority === 'red' ? 'bg-rose-100 text-rose-800 border border-rose-200' : ref.triagePriority === 'yellow' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {ref.triagePriority}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {ref.referringFacility} &rarr; {ref.targetFacility}
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-300 italic truncate">
                          Reason: {ref.referralReason}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Specialists on Duty */}
              {selectedFacilitySnapshot.facility.availableSpecialists && selectedFacilitySnapshot.facility.availableSpecialists.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Specialties Available
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedFacilitySnapshot.facility.availableSpecialists.map((sp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[10px] font-medium"
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <Compass className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                  Select a Facility on the Map
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Click any facility marker on the map to inspect its real-time bed capacity, MahaAushadhi medicine stock, health scorecard, and urgent referrals.
                </p>
              </div>
            </div>
          )}

          {/* Drilldown Navigation Buttons (Read-only linking) */}
          {selectedFacilitySnapshot && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              {onOpenScorecard && selectedFacilitySnapshot.scorecard && (
                <button
                  onClick={() => onOpenScorecard(selectedFacilitySnapshot.facility.id)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Scorecard Diagnosis</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenCapacityTab && (
                <button
                  onClick={onOpenCapacityTab}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Capacity
                </button>
              )}
              {onOpenReferralsTab && (
                <button
                  onClick={onOpenReferralsTab}
                  className="py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                >
                  Referrals
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
