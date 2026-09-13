'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Patient, Referral, Facility, DrugStockItem, OfflineSyncItem, MedicineRequest, ResourceAlert, StockTransfer } from '@/lib/types';
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
  getStoredMedicineRequests,
  saveStoredMedicineRequests,
  getStoredStockTransfers,
  saveStoredStockTransfers,
  getStoredResourceAlerts,
  saveStoredResourceAlerts,
  getSyncQueue,
  addToSyncQueue,
  clearSyncQueue,
} from '@/lib/idbStorage';
import { getSafeTransferableQuantity } from '@/lib/resourceManagement';

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
  medicineRequests: MedicineRequest[];
  stockTransfers: StockTransfer[];
  resourceAlerts: ResourceAlert[];
  toggleSimulatedOffline: () => void;
  triggerManualSync: () => Promise<void>;
  addPatient: (patient: Patient) => void;
  addClinicalEncounter: (patientId: string, encounter: any) => void;
  createReferral: (referral: Referral) => void;
  updateReferralStatus: (referralId: string, status: Referral['status'], updates?: Partial<Referral>) => void;
  updateBedOccupancy: (facilityId: string, field: 'occupiedBeds' | 'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied', delta: number) => void;
  updateDrugStock: (stockId: string, newStock: number) => void;
  createMedicineRequest: (request: Omit<MedicineRequest, 'id' | 'createdAt' | 'status'>) => void;
  createStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => StockTransfer | null;
  processStockTransfer: (transferId: string, action: 'APPROVE' | 'REJECT' | 'DISPATCH' | 'RECEIVE', rejectionReason?: string) => boolean;
  updateResourceAlertStatus: (alertId: string, status: ResourceAlert['status']) => void;
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
  const [medicineRequests, setMedicineRequests] = useState<MedicineRequest[]>([]);
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([]);
  const [resourceAlerts, setResourceAlerts] = useState<ResourceAlert[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize storage on client mount
  useEffect(() => {
    initializeStorage();
    setPatients(getStoredPatients());
    setReferrals(getStoredReferrals());
    setFacilities(getStoredFacilities());
    setStocks(getStoredStocks());
    setMedicineRequests(getStoredMedicineRequests());
    setStockTransfers(getStoredStockTransfers());
    setResourceAlerts(getStoredResourceAlerts());
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
    const patient = patients.find(p => p.id === newRef.patientId);
    if (patient?.activeReferralId) {
      showToast('Patient already has an active referral.');
      return;
    }

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

  const updateBedOccupancy = (
    facilityId: string,
    field: 'occupiedBeds' | 'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied',
    delta: number
  ) => {
    setFacilities(prevFacilities => {
      const updated = prevFacilities.map(f => {
        if (f.name === facilityId || f.id === facilityId) {
          const current = f[field];
          const max = field === 'occupiedBeds' ? f.totalBeds :
                      field === 'icuBedsOccupied' ? f.icuBedsTotal :
                      field === 'ventilatorsOccupied' ? f.ventilatorsTotal : f.oxygenBedsTotal;
          const nextVal = Math.max(0, Math.min(max, current + delta));
          return { ...f, [field]: nextVal };
        }
        return f;
      });
      saveStoredFacilities(updated);
      return updated;
    });
  };

  const updateReferralStatus = (referralId: string, status: Referral['status'], updates?: Partial<Referral>) => {
    const targetRef = referrals.find(r => r.id === referralId);
    if (!targetRef) return;
    
    if (targetRef.status === 'CANCELLED' && status !== 'CANCELLED') {
      showToast('Admission unavailable: This referral has been cancelled by the referring facility.');
      return;
    }
    if (targetRef.status === 'ADMITTED' && status === 'CANCELLED') {
      showToast('Cannot cancel an admitted referral.');
      return;
    }

    let targetPatientId = targetRef.patientId;

    // Bed Management Logic
    if (status === 'ADMITTED' && targetRef.status !== 'ADMITTED') {
      const facilityToUpdate = updates?.targetFacility || targetRef.targetFacility;
      const bedType = updates?.assignedBedType || 'occupiedBeds';
      updateBedOccupancy(facilityToUpdate, bedType, 1);
    } else if ((status === 'COMPLETED' || status === 'ESCALATED') && targetRef.status === 'ADMITTED') {
      const facilityToUpdate = targetRef.targetFacility;
      const bedType = targetRef.assignedBedType || 'occupiedBeds';
      updateBedOccupancy(facilityToUpdate, bedType, -1);
    }

    const updated = referrals.map(r => {
      if (r.id === referralId) {
        const isCancelling = status === 'CANCELLED' && r.status !== 'CANCELLED';
        return {
          ...r,
          ...updates,
          status,
          ...(isCancelling ? {
              cancelledAt: new Date().toISOString(),
              cancelledBy: updates?.cancelledBy || 'Unknown User',
              cancelledByRole: updates?.cancelledByRole || 'Unknown Role',
              cancellationReason: updates?.cancellationReason || 'No reason provided',
              previousStatus: r.status,
          } : {})
        };
      }
      return r;
    });
    setReferrals(updated);
    saveStoredReferrals(updated);

    // If referral is completed or cancelled, remove it as active referral from patient
    const updatedPatients = patients.map(p => {
      if (p.id === targetPatientId) {
        let pUpdates: Partial<Patient> = {};
        if (status === 'ADMITTED') {
          pUpdates.activeCareOwner = (updates?.targetFacility || targetRef.targetFacility).includes('State') || (updates?.targetFacility || targetRef.targetFacility).includes('College') ? 'STATE' : 'DISTRICT';
        }
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          if (p.activeReferralId === referralId) pUpdates.activeReferralId = undefined;
          if (status === 'COMPLETED') pUpdates.activeCareOwner = undefined;
        }
        if (status === 'ESCALATED') {
          pUpdates.activeCareOwner = 'STATE';
        }
        return { ...p, ...pUpdates };
      }
      return p;
    });
    setPatients(updatedPatients);
    saveStoredPatients(updatedPatients);

    showToast(`Referral status updated to ${status}.`);
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

  const createMedicineRequest = (request: Omit<MedicineRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: MedicineRequest = {
      ...request,
      id: `med-req-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };
    const updated = [newRequest, ...medicineRequests];
    setMedicineRequests(updated);
    saveStoredMedicineRequests(updated);
    if (!effectiveOnline) {
      const queued = addToSyncQueue({ type: 'MEDICINE_REQUEST_CREATED', payload: newRequest });
      setSyncQueue(prev => [...prev, queued]);
    }
    showToast(`Demo request ${newRequest.id} created and routed to district supply coordination.`);
  };

  const createStockTransfer = (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>): StockTransfer | null => {
    const source = stocks.find(item => item.id === transfer.sourceStockId);
    const transferable = source ? getSafeTransferableQuantity(source, stockTransfers) : 0;
    if (!source || transfer.requestedQuantity <= 0 || transfer.requestedQuantity > transferable) {
      showToast(`Transfer request rejected. The connected facility can offer up to ${transferable} surplus units while retaining its buffer.`);
      return null;
    }
    const newTransfer: StockTransfer = {
      ...transfer,
      id: `TRF-2026-${String(Date.now()).slice(-4)}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING_SOURCE_APPROVAL',
    };
    const updated = [newTransfer, ...stockTransfers];
    setStockTransfers(updated);
    saveStoredStockTransfers(updated);
    if (!effectiveOnline) {
      const queued = addToSyncQueue({ type: 'STOCK_TRANSFER_CREATED', payload: newTransfer });
      setSyncQueue(prev => [...prev, queued]);
    }
    showToast(`Transfer request ${newTransfer.id} sent to ${newTransfer.sourceFacilityName} for source approval.`);
    return newTransfer;
  };

  const processStockTransfer = (transferId: string, action: 'APPROVE' | 'REJECT' | 'DISPATCH' | 'RECEIVE', rejectionReason?: string) => {
    const transfer = stockTransfers.find(item => item.id === transferId);
    if (!transfer) return false;
    const now = new Date().toISOString();
    const source = stocks.find(item => item.id === transfer.sourceStockId);
    const destination = stocks.find(item => item.id === transfer.destinationStockId);

    if (action === 'APPROVE') {
      const availableAfterOtherReservations = source ? getSafeTransferableQuantity(source, stockTransfers.filter(item => item.id !== transferId)) : 0;
      if (transfer.status !== 'PENDING_SOURCE_APPROVAL' || !source || transfer.requestedQuantity > availableAfterOtherReservations) {
        showToast('Transfer cannot be approved because the source safety reserve is no longer available.');
        return false;
      }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, status: 'APPROVED' as const, approvedAt: now } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated); showToast(`${transferId} approved. Awaiting dispatch.`); return true;
    }
    if (action === 'REJECT') {
      if (transfer.status !== 'PENDING_SOURCE_APPROVAL' || !rejectionReason?.trim()) { showToast('A reason is required to reject a pending transfer.'); return false; }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, status: 'REJECTED' as const, rejectionReason, } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated); showToast(`${transferId} rejected by source PHC.`); return true;
    }
    if (action === 'DISPATCH') {
      if (transfer.status !== 'APPROVED') { showToast('Only an approved transfer can be dispatched.'); return false; }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, status: 'DISPATCHED' as const, dispatchedAt: now } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated); showToast(`${transferId} dispatched. Destination PHC must confirm receipt.`); return true;
    }
    if (transfer.status !== 'DISPATCHED' || !source || !destination || source.currentStock - transfer.requestedQuantity < source.bufferStock) {
      showToast('Transfer receipt could not be completed because its safety validation failed.');
      return false;
    }
    const updatedStocks = stocks.map(item => {
      if (item.id === source.id) return { ...item, currentStock: item.currentStock - transfer.requestedQuantity, status: item.currentStock - transfer.requestedQuantity < item.bufferStock ? 'LOW' as const : 'OPTIMAL' as const };
      if (item.id === destination.id) return { ...item, currentStock: item.currentStock + transfer.requestedQuantity, status: item.currentStock + transfer.requestedQuantity < item.bufferStock ? 'LOW' as const : 'OPTIMAL' as const };
      return item;
    });
    const updatedTransfers = stockTransfers.map(item => item.id === transferId ? { ...item, status: 'COMPLETED' as const, receivedAt: now } : item);
    setStocks(updatedStocks); saveStoredStocks(updatedStocks);
    setStockTransfers(updatedTransfers); saveStoredStockTransfers(updatedTransfers);
    showToast(`${transferId} received. Both PHC inventories and stock status have been updated.`);
    return true;
  };

  const updateResourceAlertStatus = (alertId: string, status: ResourceAlert['status']) => {
    const updated = resourceAlerts.map(alert => alert.id === alertId ? { ...alert, status } : alert);
    setResourceAlerts(updated);
    saveStoredResourceAlerts(updated);
    showToast(`Resource alert marked ${status.toLowerCase()}.`);
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
        medicineRequests,
        stockTransfers,
        resourceAlerts,
        toggleSimulatedOffline,
        triggerManualSync,
        addPatient,
        addClinicalEncounter,
        createReferral,
        updateReferralStatus,
        updateBedOccupancy,
        updateDrugStock,
        createMedicineRequest,
        createStockTransfer,
        processStockTransfer,
        updateResourceAlertStatus,
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
