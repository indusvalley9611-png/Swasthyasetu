'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Patient, Referral, Facility, DrugStockItem, OfflineSyncItem } from '@/lib/types';
import {
  initializeStorage,
  getStoredPatients,
  saveStoredPatients,
  getStoredReferrals,
  saveStoredReferrals,
  getStoredFacilities,
  saveStoredFacilities,
  getStoredStocks,
  saveStoredStocks,
  getSyncQueue,
  addToSyncQueue,
  clearSyncQueue,
} from '@/lib/idbStorage';

interface SyncContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  effectiveOnline: boolean;
  isSyncing: boolean;
  syncQueue: OfflineSyncItem[];
  patients: Patient[];
  referrals: Referral[];
  facilities: Facility[];
  stocks: DrugStockItem[];
  toggleSimulatedOffline: () => void;
  triggerManualSync: () => Promise<void>;
  addPatient: (patient: Patient) => void;
  addClinicalEncounter: (patientId: string, encounter: any) => void;
  createReferral: (referral: Referral) => void;
  updateReferralStatus: (referralId: string, status: Referral['status'], assignedBed?: string) => void;
  updateBedOccupancy: (facilityId: string, field: 'occupiedBeds' | 'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied', delta: number) => void;
  updateDrugStock: (stockId: string, newStock: number) => void;
  requestStockTransfer: (drugName: string, requestedAmount: number, targetFacilityName: string) => void;
  toastMessage: string | null;
  clearToast: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stocks, setStocks] = useState<DrugStockItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize storage on client mount
  useEffect(() => {
    initializeStorage();
    setPatients(getStoredPatients());
    setReferrals(getStoredReferrals());
    setFacilities(getStoredFacilities());
    setStocks(getStoredStocks());
    setSyncQueue(getSyncQueue());

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const effectiveOnline = isOnline && !isSimulatedOffline;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  const clearToast = () => setToastMessage(null);

  // Auto-sync when reconnecting online
  const triggerManualSync = useCallback(async () => {
    const queue = getSyncQueue();
    if (queue.length === 0) {
      showToast('All records are already synced with Maharashtra State Health Gateway.');
      return;
    }

    setIsSyncing(true);
    // Simulate server latency for network transmission
    await new Promise((r) => setTimeout(r, 1200));

    clearSyncQueue();
    setSyncQueue([]);
    setIsSyncing(false);
    showToast(`Successfully synced ${queue.length} offline record(s) to State Cloud.`);
  }, []);

  useEffect(() => {
    if (effectiveOnline && syncQueue.length > 0 && !isSyncing) {
      triggerManualSync();
    }
  }, [effectiveOnline, syncQueue.length, isSyncing, triggerManualSync]);

  const toggleSimulatedOffline = () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);
    if (nextState) {
      showToast('Switched to SIMULATED OFFLINE MODE. Changes will be saved locally to IndexedDB outbox.');
    } else {
      showToast('Restored ONLINE CONNECTIVITY. Queued changes will auto-sync.');
    }
  };

  const addPatient = (newPatient: Patient) => {
    const updated = [newPatient, ...patients];
    setPatients(updated);
    saveStoredPatients(updated);

    if (!effectiveOnline) {
      const queued = addToSyncQueue({
        type: 'NEW_PATIENT',
        payload: newPatient,
      });
      setSyncQueue(prev => [...prev, queued]);
      showToast(`Patient registered locally in Offline Outbox (Queue: ${syncQueue.length + 1})`);
    } else {
      showToast(`Patient ${newPatient.fullName} registered & ABHA created on State Registry.`);
    }
  };

  const addClinicalEncounter = (patientId: string, encounter: any) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          encounters: [encounter, ...p.encounters],
        };
      }
      return p;
    });

    setPatients(updated);
    saveStoredPatients(updated);

    if (!effectiveOnline) {
      const queued = addToSyncQueue({
        type: 'PATIENT_SCREENING',
        payload: { patientId, encounter },
      });
      setSyncQueue(prev => [...prev, queued]);
      showToast(`Screening saved offline. Queued for auto-sync.`);
    } else {
      showToast(`Clinical encounter updated on ABDM EHR timeline.`);
    }
  };

  const createReferral = (newRef: Referral) => {
    const updatedRefs = [newRef, ...referrals];
    setReferrals(updatedRefs);
    saveStoredReferrals(updatedRefs);

    // Also update patient activeReferralId
    const updatedPatients = patients.map(p => {
      if (p.id === newRef.patientId) {
        return { ...p, activeReferralId: newRef.id };
      }
      return p;
    });
    setPatients(updatedPatients);
    saveStoredPatients(updatedPatients);

    if (!effectiveOnline) {
      const queued = addToSyncQueue({
        type: 'REFERRAL_CREATED',
        payload: newRef,
      });
      setSyncQueue(prev => [...prev, queued]);
      showToast(`Referral ${newRef.tokenCode} generated offline. QR token is valid.`);
    } else {
      showToast(`Referral ${newRef.tokenCode} generated & transmitted to ${newRef.targetFacility}!`);
    }
  };

  const updateReferralStatus = (referralId: string, status: Referral['status'], assignedBed?: string) => {
    const updated = referrals.map(r => {
      if (r.id === referralId) {
        return {
          ...r,
          status,
          assignedBed: assignedBed || r.assignedBed,
        };
      }
      return r;
    });
    setReferrals(updated);
    saveStoredReferrals(updated);
    showToast(`Referral status updated to ${status}.`);
  };

  const updateBedOccupancy = (
    facilityId: string,
    field: 'occupiedBeds' | 'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied',
    delta: number
  ) => {
    const updated = facilities.map(f => {
      if (f.id === facilityId) {
        const current = f[field];
        const max = field === 'occupiedBeds' ? f.totalBeds :
                    field === 'icuBedsOccupied' ? f.icuBedsTotal :
                    field === 'ventilatorsOccupied' ? f.ventilatorsTotal : f.oxygenBedsTotal;
        const nextVal = Math.max(0, Math.min(max, current + delta));
        return { ...f, [field]: nextVal };
      }
      return f;
    });
    setFacilities(updated);
    saveStoredFacilities(updated);
  };

  const updateDrugStock = (stockId: string, newStock: number) => {
    const updated = stocks.map(s => {
      if (s.id === stockId) {
        const nextStock = Math.max(0, newStock);
        const status: DrugStockItem['status'] = 
          nextStock < s.bufferStock * 0.25 ? 'CRITICAL' :
          nextStock < s.bufferStock * 0.7 ? 'LOW' : 'OPTIMAL';
        return { ...s, currentStock: nextStock, status };
      }
      return s;
    });
    setStocks(updated);
    saveStoredStocks(updated);
    showToast('Stock level updated successfully.');
  };

  const requestStockTransfer = (drugName: string, requestedAmount: number, targetFacilityName: string) => {
    showToast(`Requisition sent: Requested ${requestedAmount} units of ${drugName} from ${targetFacilityName}.`);
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        effectiveOnline,
        isSyncing,
        syncQueue,
        patients,
        referrals,
        facilities,
        stocks,
        toggleSimulatedOffline,
        triggerManualSync,
        addPatient,
        addClinicalEncounter,
        createReferral,
        updateReferralStatus,
        updateBedOccupancy,
        updateDrugStock,
        requestStockTransfer,
        toastMessage,
        clearToast,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
