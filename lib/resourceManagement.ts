import { BedResourceType, DrugStockItem, Facility, ResourceStatus, StockTransfer } from './types';
import { isValidCanonicalFacilityId, resolveCanonicalFacility } from './mockData';

export const EXPIRY_WINDOW_DAYS = 90;

export function getAvailableResource(facility: Facility, resource: BedResourceType): number {
  switch (resource) {
    case 'ICU': return Math.max(0, facility.icuBedsTotal - facility.icuBedsOccupied);
    case 'OXYGEN': return Math.max(0, facility.oxygenBedsTotal - facility.oxygenBedsOccupied);
    case 'VENTILATOR': return Math.max(0, facility.ventilatorsTotal - facility.ventilatorsOccupied);
    default: return Math.max(0, facility.totalBeds - facility.occupiedBeds);
  }
}

export function getFacilityStatus(facility: Facility): ResourceStatus {
  const available = getAvailableResource(facility, 'GENERAL');
  const ratio = facility.totalBeds > 0 ? available / facility.totalBeds : 0;
  if (available === 0 || ratio < 0.1) return 'CRITICAL';
  if (ratio < 0.25) return 'LIMITED';
  return 'HEALTHY';
}

export function getMedicineStatus(stock: DrugStockItem): ResourceStatus {
  if (stock.currentStock <= 0 || stock.currentStock < stock.bufferStock * 0.25) return 'CRITICAL';
  if (stock.currentStock < stock.bufferStock) return 'LIMITED';
  return 'HEALTHY';
}

export function getSafeTransferableQuantity(stock: DrugStockItem, transfers: StockTransfer[] = []): number {
  const pendingOutgoing = (transfers || [])
    .filter(t => t.sourceStockId === stock.id && (t.status === 'PENDING_SOURCE_APPROVAL' || t.status === 'PENDING' || t.status === 'APPROVED' || t.status === 'DISPATCHED'))
    .reduce((sum, t) => sum + (t.requestedQuantity || 0), 0);
  const rawSurplus = Math.max(0, stock.currentStock - stock.bufferStock);
  return Math.max(0, rawSurplus - pendingOutgoing);
}

export function isExpiringSoon(expiryDate: string, now = new Date(), windowDays = EXPIRY_WINDOW_DAYS): boolean {
  if (expiryDate === 'N/A') return false;
  const expiry = new Date(`${expiryDate}T23:59:59`);
  const difference = expiry.getTime() - now.getTime();
  return difference >= 0 && difference <= windowDays * 24 * 60 * 60 * 1000;
}

export function getDistanceKm(origin: Facility, destination: Facility): number | null {
  if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) return null;
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(origin.lat)) * Math.cos(toRadians(destination.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export interface SupplyCandidate {
  tier: 'PHC' | 'DISTRICT' | 'STATE' | 'NATIONAL';
  tierLabel: string;
  badgeColor: string;
  stock: DrugStockItem;
  facility: Facility | undefined;
  distanceKm: number | null;
  transferable: number;
  isAvailable: boolean;
}

export interface HierarchicalSupplyResult {
  recommendedCandidate: SupplyCandidate | null;
  phcCandidates: SupplyCandidate[];
  districtCandidates: SupplyCandidate[];
  stateCandidates?: SupplyCandidate[];
  phcAvailableUnits: number;
  districtAvailableUnits: number;
  stateAvailableUnits?: number;
  escalatedToDistrict: boolean;
  escalatedToState?: boolean;
}

export function findHierarchicalSupplySources(
  destination: DrugStockItem,
  stocks: DrugStockItem[],
  transfers: StockTransfer[],
  facilities: Facility[],
  userDistrict = 'Pune',
  requestedQuantity: number = 1
): HierarchicalSupplyResult {
  const destFacility = resolveCanonicalFacility(destination.facilityId) || facilities.find(f => f.id === destination.facilityId && isValidCanonicalFacilityId(f.id));

  // Matching drug stocks excluding destination itself — strictly valid canonical facilities only
  // Use case-insensitive fuzzy matching: either name contains the other
  const destDrugLower = destination.drugName.toLowerCase();
  const matchingStocks = stocks.filter(
    s => {
      if (s.facilityId === destination.facilityId) return false;
      if (!isValidCanonicalFacilityId(s.facilityId)) return false;
      const srcDrugLower = s.drugName.toLowerCase();
      return srcDrugLower === destDrugLower ||
             srcDrugLower.includes(destDrugLower) ||
             destDrugLower.includes(srcDrugLower);
    }
  );

  const phcCandidates: SupplyCandidate[] = [];
  const districtCandidates: SupplyCandidate[] = [];
  const stateCandidates: SupplyCandidate[] = [];

  matchingStocks.forEach(stock => {
    const facility = resolveCanonicalFacility(stock.facilityId) || facilities.find(f => f.id === stock.facilityId);
    if (!facility || !isValidCanonicalFacilityId(facility.id)) return;

    const transferable = getSafeTransferableQuantity(stock, transfers);
    const distanceKm = destFacility ? getDistanceKm(facility, destFacility) : null;
    const isSameDistrict = facility.district.toLowerCase() === userDistrict.toLowerCase();

    // 1. Level 1: PHC / Rural Hospital in same district
    if (facility && (facility.type === 'PHC' || facility.type === 'Rural Hospital') && isSameDistrict) {
      phcCandidates.push({
        tier: 'PHC',
        tierLabel: 'Facility Surplus',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
        stock,
        facility,
        distanceKm,
        transferable,
        isAvailable: transferable > 0,
      });
    }
    // 2. Level 2: District Hospital / Sub-District in same district
    else if (facility && (facility.type === 'District Hospital' || facility.type === 'Medical College') && isSameDistrict) {
      districtCandidates.push({
        tier: 'DISTRICT',
        tierLabel: 'District Supply',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
        stock,
        facility,
        distanceKm,
        transferable,
        isAvailable: transferable > 0,
      });
    }
    // 3. Level 3: State Medical Reserve Depot / Tertiary Centres
    else if (facility && ((facility.type as string) === 'State Medical Reserve' || stock.facilityId === 'fac-state-reserve' || (facility.type as string) === 'Tertiary Hospital')) {
      stateCandidates.push({
        tier: 'STATE',
        tierLabel: 'State Reserve',
        badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
        stock,
        facility,
        distanceKm,
        transferable,
        isAvailable: transferable > 0,
      });
    }
  });

  // Sort available candidates by proximity and surplus quantity
  phcCandidates.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return b.transferable - a.transferable;
  });
  districtCandidates.sort((a, b) => b.transferable - a.transferable);
  stateCandidates.sort((a, b) => b.transferable - a.transferable);

  const phcAvailableUnits = phcCandidates.reduce((sum, c) => sum + c.transferable, 0);
  const districtAvailableUnits = districtCandidates.reduce((sum, c) => sum + c.transferable, 0);
  const stateAvailableUnits = stateCandidates.reduce((sum, c) => sum + c.transferable, 0);

  // Smart Hierarchy Prioritization:
  // 1. Prefer PHC that can fulfill requested quantity safely without buffer breach
  // 2. If PHC has insufficient surplus for requested amount, escalate to District Hospital
  // 3. If District has insufficient surplus, escalate to State Reserve
  // 4. Otherwise, pick best available candidate with positive surplus
  let recommendedCandidate: SupplyCandidate | null = null;
  let escalatedToDistrict = false;
  let escalatedToState = false;

  const phcCanFulfill = phcCandidates.find(c => c.isAvailable && c.transferable >= requestedQuantity);
  const distCanFulfill = districtCandidates.find(c => c.isAvailable && c.transferable >= requestedQuantity);
  const stateCanFulfill = stateCandidates.find(c => c.isAvailable && c.transferable >= requestedQuantity);

  const bestPhc = phcCandidates.find(c => c.isAvailable);
  const bestDistrict = districtCandidates.find(c => c.isAvailable);
  const bestState = stateCandidates.find(c => c.isAvailable);

  if (phcCanFulfill) {
    recommendedCandidate = phcCanFulfill;
  } else if (distCanFulfill) {
    recommendedCandidate = distCanFulfill;
    escalatedToDistrict = true;
  } else if (stateCanFulfill) {
    recommendedCandidate = stateCanFulfill;
    escalatedToDistrict = true;
    escalatedToState = true;
  } else if (bestPhc && bestPhc.transferable > 0) {
    recommendedCandidate = bestPhc;
  } else if (bestDistrict && bestDistrict.transferable > 0) {
    recommendedCandidate = bestDistrict;
    escalatedToDistrict = true;
  } else if (bestState && bestState.transferable > 0) {
    recommendedCandidate = bestState;
    escalatedToDistrict = true;
    escalatedToState = true;
  }

  return {
    recommendedCandidate,
    phcCandidates,
    districtCandidates,
    stateCandidates,
    phcAvailableUnits,
    districtAvailableUnits,
    stateAvailableUnits,
    escalatedToDistrict,
    escalatedToState,
  };
}

export type TriageUrgencyLevel = 'CRITICAL' | 'URGENT' | 'NORMAL';

export interface TriageUrgencyMeta {
  level: TriageUrgencyLevel;
  label: string;
  badgeBg: string;
  badgeSoft: string;
  cardBorder: string;
  cardBg: string;
  textAccent: string;
  ctaBg: string;
  dotColor: string;
}

/**
 * Single source of truth for referral and patient triage colors:
 * CRITICAL (red) -> RED
 * URGENT (yellow/amber) -> ORANGE/AMBER
 * NORMAL (green/routine) -> GREEN/EMERALD
 */
export function getTriageUrgencyMeta(triagePriority?: string, urgency?: string): TriageUrgencyMeta {
  const p = (triagePriority || urgency || '').toLowerCase();

  if (p === 'red' || p === 'critical' || p === 'high' || p === 'emergency') {
    return {
      level: 'CRITICAL',
      label: 'CRITICAL',
      badgeBg: 'bg-rose-600 text-white font-extrabold',
      badgeSoft: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-extrabold',
      cardBorder: 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-600',
      cardBg: 'bg-rose-50/40 dark:bg-rose-950/20',
      textAccent: 'text-rose-600 dark:text-rose-400',
      ctaBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
      dotColor: 'bg-rose-500',
    };
  }

  if (p === 'yellow' || p === 'urgent' || p === 'medium' || p === 'moderate') {
    return {
      level: 'URGENT',
      label: 'URGENT',
      badgeBg: 'bg-amber-500 text-slate-950 font-black',
      badgeSoft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-extrabold',
      cardBorder: 'border-amber-200 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600',
      cardBg: 'bg-amber-50/40 dark:bg-amber-950/20',
      textAccent: 'text-amber-600 dark:text-amber-400',
      ctaBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
      dotColor: 'bg-amber-500',
    };
  }

  // Normal / Green / Routine
  return {
    level: 'NORMAL',
    label: 'NORMAL',
    badgeBg: 'bg-emerald-600 text-white font-extrabold',
    badgeSoft: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-extrabold',
    cardBorder: 'border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600',
    cardBg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
    ctaBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    dotColor: 'bg-emerald-500',
  };
}
