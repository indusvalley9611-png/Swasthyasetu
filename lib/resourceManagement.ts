import { BedResourceType, DrugStockItem, Facility, ResourceStatus, StockTransfer } from './types';

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
  const reserved = transfers
    .filter(transfer => transfer.sourceStockId === stock.id && !['REJECTED', 'COMPLETED'].includes(transfer.status))
    .reduce((total, transfer) => total + transfer.requestedQuantity, 0);
  return Math.max(0, stock.currentStock - stock.bufferStock - reserved);
}

export function findSurplusSources(destination: DrugStockItem, stocks: DrugStockItem[], transfers: StockTransfer[], facilities: Facility[]) {
  return stocks
    .filter(stock => stock.drugName === destination.drugName && stock.facilityId !== destination.facilityId)
    .map(stock => ({ stock, transferable: getSafeTransferableQuantity(stock, transfers), facility: facilities.find(facility => facility.id === stock.facilityId) }))
    .filter(candidate => candidate.transferable > 0 && candidate.facility?.type === 'PHC')
    .sort((a, b) => b.transferable - a.transferable);
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
