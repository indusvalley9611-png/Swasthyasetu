import { Facility } from './types';

export interface HospitalRouteInfo {
  destination: Facility;
  distanceKm: number;
  transitMinutes: number;
  transitTimeFormatted: string;
  isShortest: boolean;
  hasAvailableIcu: boolean;
  icuAvailableCount: number;
  totalBedsAvailable: number;
  occupancyRate: number;
  specialtiesAvailable: string[];
  isMatchSpecialty: boolean;
  tierCategory: 'Sub-Centre' | 'PHC' | 'Rural Hospital' | 'District Hospital' | 'Medical College';
}

// 5 Selected Demo Districts (Focus Area for Distance & Multi-Tier Routing)
export const DEMO_DISTRICTS = ['Pune', 'Satara', 'Ahmednagar', 'Solapur', 'Thane'] as const;
export type DemoDistrict = (typeof DEMO_DISTRICTS)[number];

// Bounding box covering Maharashtra state with padding
export const MAHARASHTRA_GEO_BOUNDS = {
  minLat: 15.6,
  maxLat: 22.1,
  minLng: 72.6,
  maxLng: 80.9,
};

// Major Maharashtra District Boundaries & Administrative Regions for SVG background outlines
export const MAHARASHTRA_REGIONS = [
  {
    id: 'konkan',
    name: 'Konkan Division',
    color: '#0284c7', // Sky blue
    districts: ['Mumbai', 'Thane', 'Palghar', 'Raigad', 'Ratnagiri', 'Sindhudurg'],
    center: { lat: 18.5, lng: 73.1 },
  },
  {
    id: 'pune_paschim',
    name: 'Pune & Western Maharashtra',
    color: '#6366f1', // Indigo
    districts: ['Pune', 'Satara', 'Kolhapur', 'Sangli', 'Solapur'],
    center: { lat: 17.8, lng: 74.5 },
  },
  {
    id: 'nashik_khandesh',
    name: 'Nashik & North Maharashtra',
    color: '#0d9488', // Teal
    districts: ['Nashik', 'Ahmednagar', 'Jalgaon', 'Dhule', 'Nandurbar'],
    center: { lat: 20.6, lng: 74.8 },
  },
  {
    id: 'marathwada',
    name: 'Chhatrapati Sambhajinagar / Marathwada',
    color: '#d97706', // Amber
    districts: ['Chhatrapati Sambhajinagar', 'Jalna', 'Parbhani', 'Hingoli', 'Nanded', 'Latur', 'Osmanabad', 'Beed'],
    center: { lat: 19.2, lng: 76.4 },
  },
  {
    id: 'vidarbha',
    name: 'Nagpur & Amravati / Vidarbha',
    color: '#e11d48', // Rose
    districts: ['Nagpur', 'Amravati', 'Akola', 'Yavatmal', 'Buldhana', 'Wardha', 'Chandrapur', 'Gadchiroli', 'Bhandara', 'Gondia'],
    center: { lat: 20.8, lng: 78.8 },
  },
];

/**
 * Calculates straight line Haversine distance in kilometers
 */
export function getHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Calculates realistic road travel distance in km factoring terrain curvature
 */
export function getRoadDistanceKm(origin: Facility, destination: Facility): number {
  const directKm = getHaversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  if (directKm === 0) return 0;
  // Road factor for Maharashtra ghats and state highways (1.25x - 1.32x)
  const roadFactor = 1.28;
  return Math.round(directKm * roadFactor * 10) / 10;
}

/**
 * Formats transit duration into human-readable hours and minutes
 */
export function formatTransitMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (remMin === 0) return `${hrs} hr`;
  return `${hrs} hr ${remMin} min`;
}

/**
 * Estimates emergency ambulance transit time with sirens and traffic weighting
 */
export function getEstimatedTransitMinutes(distanceKm: number, isEmergency = true): number {
  if (distanceKm <= 0) return 5;
  // Average emergency speed in Maharashtra semi-urban/rural routes: ~48-55 km/h
  // Urban / Ghat segments add base dispatch latency of 8-12 min
  const speedKmH = isEmergency ? 48 : 38;
  const travelMin = Math.round((distanceKm / speedKmH) * 60);
  const basePrepMin = isEmergency ? 8 : 15;
  return Math.max(10, travelMin + basePrepMin);
}

/**
 * Converts Geographic Coordinates (Lat, Lng) to SVG Canvas Coordinates (x, y)
 */
export function projectGeoToSvg(
  lat: number,
  lng: number,
  svgWidth = 800,
  svgHeight = 550,
  padding = 40
): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = MAHARASHTRA_GEO_BOUNDS;
  const usableWidth = svgWidth - padding * 2;
  const usableHeight = svgHeight - padding * 2;

  // Clamp values inside bounds
  const clampedLat = Math.min(Math.max(lat, minLat), maxLat);
  const clampedLng = Math.min(Math.max(lng, minLng), maxLng);

  const xNorm = (clampedLng - minLng) / (maxLng - minLng);
  const yNorm = (maxLat - clampedLat) / (maxLat - minLat); // Inverted for SVG Y-down axis

  return {
    x: Math.round(padding + xNorm * usableWidth),
    y: Math.round(padding + yNorm * usableHeight),
  };
}

export interface RankedFacilityOptions {
  requiredSpecialty?: string;
  allowedDistricts?: readonly string[] | string[];
  tierFilter?: 'all' | 'Sub-Centre' | 'PHC' | 'Rural Hospital' | 'District Hospital' | 'Medical College';
  limitToDemoDistricts?: boolean;
}

/**
 * Ranks all registered Maharashtra healthcare facilities (Sub-Centres, PHCs, Rural Hospitals, District Hospitals, Medical Colleges)
 * relative to an origin facility, limited to the 5 demo districts (Pune, Satara, Ahmednagar, Solapur, Thane).
 */
export function getRankedReferralFacilities(
  origin: Facility,
  allFacilities: Facility[],
  options?: RankedFacilityOptions
): HospitalRouteInfo[] {
  const {
    requiredSpecialty,
    allowedDistricts = DEMO_DISTRICTS,
    tierFilter = 'all',
    limitToDemoDistricts = true,
  } = options || {};

  const referralTargets = allFacilities.filter((f) => {
    if (!f || !f.id || !f.name || f.id === origin.id) return false;
    if (limitToDemoDistricts && allowedDistricts && !allowedDistricts.includes(f.district)) {
      return false;
    }
    if (tierFilter !== 'all' && f.type !== tierFilter) {
      return false;
    }
    return true;
  });

  const routes: HospitalRouteInfo[] = referralTargets.map((dest) => {
    const distKm = getRoadDistanceKm(origin, dest);
    const transitMin = getEstimatedTransitMinutes(distKm, true);
    const icuAvail = Math.max(0, (dest.icuBedsTotal || 0) - (dest.icuBedsOccupied || 0));
    const totalAvail = Math.max(0, (dest.totalBeds || 0) - (dest.occupiedBeds || 0));
    const occupancyRate = dest.totalBeds ? Math.round((dest.occupiedBeds / dest.totalBeds) * 100) : 0;
    const specialties = dest.availableSpecialists || [];

    const isMatchSpecialty = !requiredSpecialty
      ? true
      : specialties.some((s) => s.toLowerCase().includes(requiredSpecialty.toLowerCase()) || requiredSpecialty.toLowerCase().includes(s.toLowerCase()));

    const tierCategory: HospitalRouteInfo['tierCategory'] =
      dest.type === 'Sub-Centre' ? 'Sub-Centre' :
      dest.type === 'PHC' ? 'PHC' :
      dest.type === 'Rural Hospital' ? 'Rural Hospital' :
      dest.type === 'Medical College' ? 'Medical College' : 'District Hospital';

    return {
      destination: dest,
      distanceKm: distKm,
      transitMinutes: transitMin,
      transitTimeFormatted: formatTransitMinutes(transitMin),
      isShortest: false,
      hasAvailableIcu: icuAvail > 0,
      icuAvailableCount: icuAvail,
      totalBedsAvailable: totalAvail,
      occupancyRate,
      specialtiesAvailable: specialties,
      isMatchSpecialty,
      tierCategory,
    };
  });

  // Sort primarily by distance in ascending order
  routes.sort((a, b) => {
    if (requiredSpecialty) {
      if (a.isMatchSpecialty && !b.isMatchSpecialty) return -1;
      if (!a.isMatchSpecialty && b.isMatchSpecialty) return 1;
    }
    return a.distanceKm - b.distanceKm;
  });

  // Flag the shortest route
  if (routes.length > 0) {
    routes[0].isShortest = true;
  }

  return routes;
}

/**
 * Backward compatibility alias for legacy callers
 */
export function getRankedDistrictHospitals(
  origin: Facility,
  allFacilities: Facility[],
  requiredSpecialty?: string
): HospitalRouteInfo[] {
  return getRankedReferralFacilities(origin, allFacilities, {
    requiredSpecialty,
    limitToDemoDistricts: true,
  });
}
