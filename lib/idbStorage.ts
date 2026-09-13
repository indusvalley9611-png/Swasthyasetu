import { Patient, Referral, OfflineSyncItem, DrugStockItem, Facility, MedicineRequest, ResourceAlert, StockTransfer, AuditLogEntry } from './types';
import { INITIAL_PATIENTS, INITIAL_REFERRALS, INITIAL_DRUG_STOCKS, INITIAL_FACILITIES, INITIAL_MEDICINE_REQUESTS, INITIAL_RESOURCE_ALERTS, INITIAL_STOCK_TRANSFERS, INITIAL_AUDIT_LOGS } from './mockData';

const DB_NAME = 'swasthyasetu_db';
const DB_VERSION = 1;
const QUEUE_KEY = 'swasthyasetu_sync_queue';
const PATIENTS_KEY = 'swasthyasetu_patients';
const REFERRALS_KEY = 'swasthyasetu_referrals';
const STOCKS_KEY = 'swasthyasetu_stocks';
const FACILITIES_KEY = 'swasthyasetu_facilities';
const MEDICINE_REQUESTS_KEY = 'swasthyasetu_medicine_requests';
const STOCK_TRANSFERS_KEY = 'swasthyasetu_stock_transfers';
const RESOURCE_ALERTS_KEY = 'swasthyasetu_resource_alerts';
const AUDIT_LOGS_KEY = 'swasthyasetu_audit_logs';

// Initialize local database with initial seed if empty
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  const existingPatients = getStoredValue<Patient[]>(PATIENTS_KEY, []);
  if (existingPatients.length === 0) {
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
  } else {
    // Merge seed doctor assignments and facilities if missing on existing stored patients
    const updated = existingPatients.map((p) => {
      const seed = INITIAL_PATIENTS.find((s) => s.id === p.id);
      if (seed) {
        return {
          ...p,
          assignedDoctorId: seed.assignedDoctorId,
          assignedDoctorName: seed.assignedDoctorName,
          assignedFacilityId: seed.assignedFacilityId,
          assignedFacilityName: seed.assignedFacilityName,
        };
      }
      return p;
    });
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
  }

  const existingReferrals = getStoredValue<Referral[]>(REFERRALS_KEY, []);
  if (existingReferrals.length === 0) {
    localStorage.setItem(REFERRALS_KEY, JSON.stringify(INITIAL_REFERRALS));
  } else {
    // Merge referring user IDs if missing
    const updatedRefs = existingReferrals.map((r) => {
      const seed = INITIAL_REFERRALS.find((s) => s.id === r.id);
      if (seed && !r.referringUserId) {
        return {
          ...r,
          referringUserId: seed.referringUserId,
        };
      }
      return r;
    });
    const missingSeeds = INITIAL_REFERRALS.filter(seed => !existingReferrals.some(r => r.id === seed.id));
    const mergedRefs = [...updatedRefs, ...missingSeeds];
    localStorage.setItem(REFERRALS_KEY, JSON.stringify(mergedRefs));
  }

  if (!localStorage.getItem(AUDIT_LOGS_KEY)) {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  }
  const existingStocks = getStoredValue<DrugStockItem[]>(STOCKS_KEY, []).map(stock =>
    stock.id === 'stk-009' && stock.currentStock === 6 ? { ...stock, currentStock: 5, status: 'CRITICAL' as const } : stock
  );
  const mergedStocks = [...existingStocks, ...INITIAL_DRUG_STOCKS.filter(seed => !existingStocks.some(item => item.id === seed.id))];
  localStorage.setItem(STOCKS_KEY, JSON.stringify(mergedStocks));
  const existingFacilities = getStoredValue<Facility[]>(FACILITIES_KEY, []);
  const mergedFacilities = [...existingFacilities, ...INITIAL_FACILITIES.filter(seed => !existingFacilities.some(item => item.id === seed.id))];
  localStorage.setItem(FACILITIES_KEY, JSON.stringify(mergedFacilities));
  if (!localStorage.getItem(QUEUE_KEY)) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(MEDICINE_REQUESTS_KEY)) localStorage.setItem(MEDICINE_REQUESTS_KEY, JSON.stringify(INITIAL_MEDICINE_REQUESTS));
  if (!localStorage.getItem(STOCK_TRANSFERS_KEY)) localStorage.setItem(STOCK_TRANSFERS_KEY, JSON.stringify(INITIAL_STOCK_TRANSFERS));
  if (!localStorage.getItem(RESOURCE_ALERTS_KEY)) localStorage.setItem(RESOURCE_ALERTS_KEY, JSON.stringify(INITIAL_RESOURCE_ALERTS));
}

export function getStoredPatients(): Patient[] {
  if (typeof window === 'undefined') return INITIAL_PATIENTS;
  try {
    const raw = localStorage.getItem(PATIENTS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PATIENTS;
  } catch {
    return INITIAL_PATIENTS;
  }
}

export function saveStoredPatients(patients: Patient[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function getStoredReferrals(): Referral[] {
  if (typeof window === 'undefined') return INITIAL_REFERRALS;
  try {
    const raw = localStorage.getItem(REFERRALS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_REFERRALS;
  } catch {
    return INITIAL_REFERRALS;
  }
}

export function saveStoredReferrals(referrals: Referral[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFERRALS_KEY, JSON.stringify(referrals));
}

export function getStoredStocks(): DrugStockItem[] {
  if (typeof window === 'undefined') return INITIAL_DRUG_STOCKS;
  try {
    const raw = localStorage.getItem(STOCKS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_DRUG_STOCKS;
  } catch {
    return INITIAL_DRUG_STOCKS;
  }
}

export function saveStoredStocks(stocks: DrugStockItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

export function getStoredFacilities(): Facility[] {
  if (typeof window === 'undefined') return INITIAL_FACILITIES;
  try {
    const raw = localStorage.getItem(FACILITIES_KEY);
    return raw ? JSON.parse(raw) : INITIAL_FACILITIES;
  } catch {
    return INITIAL_FACILITIES;
  }
}

export function saveStoredFacilities(facilities: Facility[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FACILITIES_KEY, JSON.stringify(facilities));
}

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export const getStoredMedicineRequests = () => getStoredValue<MedicineRequest[]>(MEDICINE_REQUESTS_KEY, INITIAL_MEDICINE_REQUESTS);
export const saveStoredMedicineRequests = (items: MedicineRequest[]) => { if (typeof window !== 'undefined') localStorage.setItem(MEDICINE_REQUESTS_KEY, JSON.stringify(items)); };
export const getStoredStockTransfers = () => getStoredValue<StockTransfer[]>(STOCK_TRANSFERS_KEY, INITIAL_STOCK_TRANSFERS);
export const saveStoredStockTransfers = (items: StockTransfer[]) => { if (typeof window !== 'undefined') localStorage.setItem(STOCK_TRANSFERS_KEY, JSON.stringify(items)); };
export const getStoredResourceAlerts = () => getStoredValue<ResourceAlert[]>(RESOURCE_ALERTS_KEY, INITIAL_RESOURCE_ALERTS);
export const saveStoredResourceAlerts = (items: ResourceAlert[]) => { if (typeof window !== 'undefined') localStorage.setItem(RESOURCE_ALERTS_KEY, JSON.stringify(items)); };
export const getStoredAuditLogs = () => getStoredValue<AuditLogEntry[]>(AUDIT_LOGS_KEY, INITIAL_AUDIT_LOGS);
export const saveStoredAuditLogs = (items: AuditLogEntry[]) => { if (typeof window !== 'undefined') localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(items)); };

export function getSyncQueue(): OfflineSyncItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToSyncQueue(item: Omit<OfflineSyncItem, 'id' | 'timestamp' | 'status' | 'retryCount'>): OfflineSyncItem {
  const currentQueue = getSyncQueue();
  const newItem: OfflineSyncItem = {
    ...item,
    id: 'queue-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: Date.now(),
    status: 'PENDING',
    retryCount: 0,
  };
  currentQueue.push(newItem);
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
  }
  return newItem;
}

export function clearSyncQueue() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  }
}

export function removeFromSyncQueue(id: string) {
  const currentQueue = getSyncQueue().filter(q => q.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(currentQueue));
  }
}

// Generate ABHA ID in official format: XX-XXXX-XXXX-XXXX
export function generateRandomAbhaId(): string {
  const part1 = Math.floor(10 + Math.random() * 89);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  const part3 = Math.floor(1000 + Math.random() * 9000);
  const part4 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}-${part3}-${part4}`;
}

// Generate Referral Token in official MH-REF-YYYY-XXXX format
export function generateReferralToken(): string {
  const year = 2026;
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MH-REF-${year}-${num}`;
}
