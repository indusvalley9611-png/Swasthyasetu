import { Patient, Referral, OfflineSyncItem, DrugStockItem, Facility } from './types';
import { INITIAL_PATIENTS, INITIAL_REFERRALS, INITIAL_DRUG_STOCKS, INITIAL_FACILITIES } from './mockData';

const DB_NAME = 'swasthyasetu_db';
const DB_VERSION = 1;
const QUEUE_KEY = 'swasthyasetu_sync_queue';
const PATIENTS_KEY = 'swasthyasetu_patients';
const REFERRALS_KEY = 'swasthyasetu_referrals';
const STOCKS_KEY = 'swasthyasetu_stocks';
const FACILITIES_KEY = 'swasthyasetu_facilities';

// Initialize local database with initial seed if empty
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(PATIENTS_KEY)) {
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
  }
  if (!localStorage.getItem(REFERRALS_KEY)) {
    localStorage.setItem(REFERRALS_KEY, JSON.stringify(INITIAL_REFERRALS));
  }
  if (!localStorage.getItem(STOCKS_KEY)) {
    localStorage.setItem(STOCKS_KEY, JSON.stringify(INITIAL_DRUG_STOCKS));
  }
  if (!localStorage.getItem(FACILITIES_KEY)) {
    localStorage.setItem(FACILITIES_KEY, JSON.stringify(INITIAL_FACILITIES));
  }
  if (!localStorage.getItem(QUEUE_KEY)) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  }
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
