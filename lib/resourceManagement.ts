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
  return Math.max(0, stock.currentStock - stock.bufferStock);
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
  tier: 'PHC' | 'DISTRICT';
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
  phcAvailableUnits: number;
  districtAvailableUnits: number;
  escalatedToDistrict: boolean;
}

export function findHierarchicalSupplySources(
  destination: DrugStockItem,
  stocks: DrugStockItem[],
  transfers: StockTransfer[],
  facilities: Facility[],
  userDistrict = 'Pune'
): HierarchicalSupplyResult {
  const destFacility = resolveCanonicalFacility(destination.facilityId) || facilities.find(f => f.id === destination.facilityId && isValidCanonicalFacilityId(f.id));

  // Matching drug stocks excluding destination itself — strictly valid canonical facilities only
  // Use case-insensitive fuzzy matching: either name contains the other (handles user-typed vs canonical names)
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
  });

  // Sort available candidates by proximity or quantity
  phcCandidates.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
    return b.transferable - a.transferable;
  });
  districtCandidates.sort((a, b) => b.transferable - a.transferable);

  const phcAvailableUnits = phcCandidates.reduce((sum, c) => sum + c.transferable, 0);
  const districtAvailableUnits = districtCandidates.reduce((sum, c) => sum + c.transferable, 0);

  // Hierarchy prioritization logic: PHC Priority 1 -> District Priority 2
  let recommendedCandidate: SupplyCandidate | null = null;
  let escalatedToDistrict = false;

  const bestPhc = phcCandidates.find(c => c.isAvailable);
  const bestDistrict = districtCandidates.find(c => c.isAvailable);

  if (bestPhc && bestPhc.transferable > 0) {
    recommendedCandidate = bestPhc;
  } else if (bestDistrict && bestDistrict.transferable > 0) {
    recommendedCandidate = bestDistrict;
    escalatedToDistrict = true;
  }

  return {
    recommendedCandidate,
    phcCandidates,
    districtCandidates,
    phcAvailableUnits,
    districtAvailableUnits,
    escalatedToDistrict,
  };
}
