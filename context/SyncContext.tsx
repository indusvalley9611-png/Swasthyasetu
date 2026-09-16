'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Patient, Referral, Facility, DrugStockItem, OfflineSyncItem, MedicineRequest, ReplenishmentRequest, ReplenishmentRequestItem, CreateReplenishmentItemInput, ResourceAlert, StockTransfer, FollowUpTask } from '@/lib/types';
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
  getStoredFollowUps,
  saveStoredFollowUps,
  getSyncQueue,
  addToSyncQueue,
  clearSyncQueue,
} from '@/lib/idbStorage';
import { getSafeTransferableQuantity, findHierarchicalSupplySources } from '@/lib/resourceManagement';
import { isValidCanonicalFacilityId, resolveCanonicalFacilityName, validateStockTransfer, validateReplenishmentRequest } from '@/lib/mockData';

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
  createMedicineRequest: (request: { destinationFacilityId: string; destinationFacilityName: string; requestedByUserId: string; requestedByUserName: string; urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL'; notes?: string; items: CreateReplenishmentItemInput[] }) => void;
  createStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>) => StockTransfer | null;
  createReplenishmentRequest: (
    dest: { facilityId: string; facilityName: string },
    user: { id: string; name: string },
    items: CreateReplenishmentItemInput[],
    urgency?: 'ROUTINE' | 'URGENT' | 'CRITICAL',
    notes?: string
  ) => ReplenishmentRequest | null;
  linkTransferToRequestItem: (requestId: string, itemId: string, transfer: StockTransfer) => void;
  allocateRequestSupplies: (
    requestId: string,
    userDistrict?: string,
    districtUser?: { id: string; name: string } | null,
    specificItemId?: string
  ) => boolean;
  allocateStockTransferDonor: (
    transferId: string,
    sourceStock: DrugStockItem,
    donorFacility: Facility,
    districtUser?: { id: string; name: string } | null
  ) => boolean;
  processStockTransfer: (transferId: string, action: 'APPROVE' | 'REJECT' | 'DISPATCH' | 'RECEIVE', rejectionReason?: string, consignmentMeta?: Partial<StockTransfer>) => Promise<boolean>;
  updateResourceAlertStatus: (alertId: string, status: ResourceAlert['status']) => void;
  followUps: FollowUpTask[];
  addFollowUpTask: (task: FollowUpTask) => void;
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
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
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
    setFollowUps(getStoredFollowUps());
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
      showToast('All records are already synced with District Health Gateway.');
      return;
    }

    setIsSyncing(true);
    // Simulate server latency for network transmission
    await new Promise((r) => setTimeout(r, 1200));

    let currentPatients = [...getStoredPatients()];
    const remainingQueue: OfflineSyncItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      if (item.type === 'NEW_PATIENT') {
        // Idempotency (pass 1): item was already flagged NEEDS_REVIEW in a prior sync — keep it
        // as-is, do not re-evaluate, do not create a second patient.
        // Read syncFlag from the raw payload (typed as `any` by OfflineSyncItem) before casting.
        const rawSyncFlag: unknown = (item.payload as Record<string, unknown>).syncFlag;
        if (rawSyncFlag === 'NEEDS_REVIEW_POTENTIAL_DUPLICATE') {
          remainingQueue.push(item); // Preserve unchanged — no retryCount bump
          continue;
        }

        const payloadPat = item.payload as Patient;

        // Idempotency (pass 2): exact ID already present in canonical registry
        const existingExact = currentPatients.find(p => p.id === payloadPat.id);
        if (existingExact) {
          syncedCount++;
          continue; // Already integrated
        }

        // Deduplication: high-confidence identity check (Phone + Name + Gender) or non-DEMO ABHA
        const duplicate = currentPatients.find(p =>
          (p.phone === payloadPat.phone && p.fullName.toLowerCase() === payloadPat.fullName.toLowerCase() && p.gender === payloadPat.gender) ||
          (p.abhaId === payloadPat.abhaId && !p.abhaId.includes('DEMO'))
        );

        if (duplicate) {
          // STATUS STAYS 'PENDING' — the record is unresolved, not failed.
          // It must remain recoverable for human identity review.
          remainingQueue.push({
            ...item,
            status: 'PENDING',
            payload: { ...payloadPat, syncFlag: 'NEEDS_REVIEW_POTENTIAL_DUPLICATE' }
          });
          console.warn(`[SYNC] Potential duplicate flagged for ${payloadPat.fullName}`);
        } else {
          // Safe to insert
          currentPatients = [payloadPat, ...currentPatients];
          syncedCount++;
        }
      } else {
        // Other types of operations sync successfully in this mock
        syncedCount++;
      }
    }

    if (currentPatients.length !== patients.length) {
      setPatients(currentPatients);
      saveStoredPatients(currentPatients);
    }

    if (remainingQueue.length === 0) {
      clearSyncQueue();
      setSyncQueue([]);
      showToast(`Successfully synced ${syncedCount} offline record(s) to State Cloud.`);
    } else {
      if (typeof window !== 'undefined') localStorage.setItem('swasthyasetu_sync_queue', JSON.stringify(remainingQueue));
      setSyncQueue(remainingQueue);
      showToast(`Synced ${syncedCount} records. ${remainingQueue.length} records flagged for review.`);
    }
    setIsSyncing(false);
  }, [patients.length]);

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

    // Always add to queue. If online, effect will pick it up and process it idempotently
    const queued = addToSyncQueue({
      type: 'NEW_PATIENT',
      payload: newPatient,
    });
    setSyncQueue(prev => [...prev, queued]);
    
    if (!effectiveOnline) {
      showToast(`Patient registered locally in Offline Outbox (Queue: ${syncQueue.length + 1})`);
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

  const addFollowUpTask = (task: FollowUpTask) => {
    if (followUps.some(f => f.id === task.id)) return; // Idempotent check
    const updated = [task, ...followUps];
    setFollowUps(updated);
    saveStoredFollowUps(updated);
  };

  const createReferral = (newRef: Referral) => {
    const patient = patients.find(p => p.id === newRef.patientId);
    const existingActiveReferral = referrals.find(
      r => r.patientId === newRef.patientId && !['COMPLETED', 'CANCELLED'].includes(r.status)
    );
    if (patient?.activeReferralId || existingActiveReferral) {
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

  const updateReferralStatus = async (referralId: string, status: Referral['status'], updates?: Partial<Referral>) => {
    const targetRef = referrals.find(r => r.id === referralId);
    if (!targetRef) return;

    try {
      await fetch('/api/authorize-mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_REFERRAL', resource: { referralId, targetFacilityId: targetRef.targetFacilityId } })
      }).catch(() => {});
    } catch (e) {
      // Offline / demo fallback
    }
    
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
      const facilityToUpdate = targetRef.targetFacilityId;
      const bedType = updates?.assignedBedType || 'occupiedBeds';
      updateBedOccupancy(facilityToUpdate, bedType, 1);
    } else if ((status === 'COMPLETED' || status === 'ESCALATED') && targetRef.status === 'ADMITTED') {
      const facilityToUpdate = targetRef.targetFacilityId;
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
          pUpdates.activeCareOwner = 'DISTRICT';
        }
        if (status === 'COMPLETED' || status === 'CANCELLED') {
          if (p.activeReferralId === referralId) pUpdates.activeReferralId = undefined;
          if (status === 'COMPLETED') pUpdates.activeCareOwner = undefined;
        }
        if (status === 'ESCALATED') {
          pUpdates.activeCareOwner = 'DISTRICT';
        }
        return { ...p, ...pUpdates };
      }
      return p;
    });
    setPatients(updatedPatients);
    saveStoredPatients(updatedPatients);

    showToast(`Referral status updated to ${status}.`);
  };



  const updateDrugStock = async (stockId: string, newStock: number) => {
    const targetStock = stocks.find(s => s.id === stockId);
    if (!targetStock) return;
    
    try {
      const res = await fetch('/api/authorize-mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STOCK', resource: { facilityId: targetStock.facilityId } })
      });
      const auth = await res.json();
      if (!res.ok || !auth.allowed) {
        showToast(auth.error || 'Unauthorized to modify this stock inventory.');
        return;
      }
    } catch (e) {
      showToast('Network error during authorization.');
      return;
    }

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

  // ── Utility: derive overall status from items ─────────────────────────────
  const deriveOverallStatus = (items: ReplenishmentRequestItem[]): ReplenishmentRequest['overallStatus'] => {
    if (items.length === 0) return 'PENDING';
    const statuses = items.map(i => i.status);
    if (statuses.every(s => s === 'COMPLETED')) return 'FULFILLED';
    if (statuses.every(s => s === 'REJECTED')) return 'REJECTED';
    if (statuses.some(s => s === 'COMPLETED')) return 'PARTIALLY_FULFILLED';
    if (statuses.every(s => s === 'PENDING')) return 'PENDING';
    return 'IN_PROGRESS';
  };

  const createMedicineRequest = (request: { destinationFacilityId: string; destinationFacilityName: string; requestedByUserId: string; requestedByUserName: string; urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL'; notes?: string; items: CreateReplenishmentItemInput[] }) => {
    const ts = Date.now();
    const newRequest: MedicineRequest = {
      ...request,
      id: `REQ-2026-${String(ts).slice(-6)}`,
      createdAt: new Date().toISOString(),
      overallStatus: 'PENDING',
      items: request.items.map((item, idx) => ({
        ...item,
        id: `item-${ts}-${idx}`,
        status: 'PENDING' as const,
      })),
    };
    const updated = [newRequest, ...medicineRequests];
    setMedicineRequests(updated);
    saveStoredMedicineRequests(updated);
    if (!effectiveOnline) {
      const queued = addToSyncQueue({ type: 'MEDICINE_REQUEST_CREATED', payload: newRequest });
      setSyncQueue(prev => [...prev, queued]);
    }
    showToast(`Request ${newRequest.id} created with ${newRequest.items.length} medicine(s).`);
  };

  /**
   * Create a parent replenishment request containing N medicine line items.
   * Each item starts with PENDING status. Inventory is NOT touched.
   * After creation, call createStockTransfer + linkTransferToRequestItem for each item.
   */
  const createReplenishmentRequest = (
    dest: { facilityId: string; facilityName?: string },
    user: { id: string; name: string },
    items: CreateReplenishmentItemInput[],
    urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL' = 'CRITICAL',
    notes?: string
  ): ReplenishmentRequest | null => {
    if (!dest.facilityId || items.length === 0) {
      showToast('Cannot create a request without a valid destination facility and at least one medicine item.');
      return null;
    }
    const ts = Date.now();
    const candidateRequest: Partial<ReplenishmentRequest> = {
      id: `REQ-2026-${String(ts).slice(-6)}`,
      destinationFacilityId: dest.facilityId,
      requestedByUserId: user.id,
      requestedByUserName: user.name,
      createdAt: new Date().toISOString(),
      overallStatus: 'PENDING',
      urgency,
      notes,
      items: items.map((item, idx) => ({
        ...item,
        id: `item-${ts}-${idx}`,
        status: 'PENDING' as const,
      })),
    };

    const validation = validateReplenishmentRequest(candidateRequest);
    if (!validation.isValid || !validation.sanitized) {
      showToast(validation.error || 'Invalid replenishment request.');
      return null;
    }

    const newRequest = validation.sanitized;
    const updated = [newRequest, ...medicineRequests];
    setMedicineRequests(updated);
    saveStoredMedicineRequests(updated);
    showToast(`Request ${newRequest.id} created — ${newRequest.items.length} medicine(s) pending supply search.`);
    return newRequest;
  };

  /**
   * Link a StockTransfer to a specific line item in a ReplenishmentRequest.
   * Also updates the item's status, sourceFacilityId, and supplyTier from the transfer.
   */
  const linkTransferToRequestItem = (requestId: string, itemId: string, transfer: StockTransfer) => {
    const updated = medicineRequests.map(req => {
      if (req.id !== requestId) return req;
      const updatedItems = req.items.map(item => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          transferId: transfer.id,
          status: transfer.status,
          sourceFacilityId: transfer.sourceFacilityId,
          sourceFacilityName: resolveCanonicalFacilityName(transfer.sourceFacilityId),
          supplyTier: transfer.supplyTier,
        };
      });
      return { ...req, items: updatedItems, overallStatus: deriveOverallStatus(updatedItems) };
    });
    setMedicineRequests(updated);
    saveStoredMedicineRequests(updated);
  };

  /**
   * Run hierarchical supply allocation for items in a ReplenishmentRequest.
   * Allocates sources independently per medicine (PHC -> District).
   */
  const allocateRequestSupplies = (
    requestId: string,
    userDistrict: string = 'Pune',
    districtUser?: { id: string; name: string } | null,
    specificItemId?: string
  ): boolean => {
    const req = medicineRequests.find(r => r.id === requestId);
    if (!req) {
      showToast('Replenishment request not found.');
      return false;
    }

    const newlyCreatedTransfers: StockTransfer[] = [];
    const updatedItems = req.items.map((item, idx) => {
      if (specificItemId && item.id !== specificItemId) {
        return item;
      }
      if (item.transferId && item.sourceFacilityId) {
        return item;
      }

      const itemNameLower = item.medicineName.toLowerCase();
      const matchingStock = stocks.find(
        s => {
          if (s.facilityId !== req.destinationFacilityId) return false;
          const stockNameLower = s.drugName.toLowerCase();
          return stockNameLower === itemNameLower ||
                 stockNameLower.includes(itemNameLower) ||
                 itemNameLower.includes(stockNameLower);
        }
      ) || {
        id: item.stockId,
        facilityId: req.destinationFacilityId,
        facilityName: req.destinationFacilityName,
        drugName: item.medicineName,
        category: 'Critical Lifesaving' as const,
        currentStock: item.currentStock,
        bufferStock: item.bufferStock || item.requestedQuantity * 2,
        unit: item.unit,
        batchNumber: 'N/A',
        expiryDate: 'N/A',
        status: 'CRITICAL' as const,
      };

      const supplyHierarchy = findHierarchicalSupplySources(
        matchingStock as any,
        stocks,
        [...stockTransfers, ...newlyCreatedTransfers],
        facilities,
        userDistrict
      );

      const bestCandidate = supplyHierarchy.recommendedCandidate;
      if (bestCandidate) {
        const canonicalSrcName = resolveCanonicalFacilityName(bestCandidate.stock.facilityId, bestCandidate.stock.facilityName);
        const validation = validateStockTransfer({
          id: `TRF-2026-${String(Date.now() + idx).slice(-4)}`,
          medicineName: item.medicineName,
          sourceStockId: bestCandidate.stock.id,
          destinationStockId: item.stockId,
          sourceFacilityId: bestCandidate.stock.facilityId,
          sourceFacilityName: canonicalSrcName,
          destinationFacilityId: req.destinationFacilityId,
          destinationFacilityName: req.destinationFacilityName,
          requestedQuantity: item.requestedQuantity,
          urgency: item.urgency,
          reason: item.reason,
          isEmergency: item.urgency === 'CRITICAL' || req.urgency === 'CRITICAL',
          donorAllocated: true,
          allocatedByDistrictUserId: districtUser?.id,
          allocatedByDistrictUserName: districtUser?.name,
          allocatedAt: new Date().toISOString(),
          supplyTier: bestCandidate.tier,
          requestId: req.id,
          requestItemId: item.id,
          createdAt: new Date().toISOString(),
          status: 'PENDING_SOURCE_APPROVAL',
        });

        if (validation.isValid && validation.sanitized) {
          newlyCreatedTransfers.push(validation.sanitized);
          return {
            ...item,
            status: 'PENDING_SOURCE_APPROVAL' as const,
            sourceFacilityId: validation.sanitized.sourceFacilityId,
            sourceFacilityName: validation.sanitized.sourceFacilityName,
            supplyTier: validation.sanitized.supplyTier,
            transferId: validation.sanitized.id,
          };
        }
      }
      return item;
    });

    if (newlyCreatedTransfers.length > 0) {
      const updatedTransfers = [...newlyCreatedTransfers, ...stockTransfers];
      setStockTransfers(updatedTransfers);
      saveStoredStockTransfers(updatedTransfers);

      const updatedRequests = medicineRequests.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            items: updatedItems,
            overallStatus: deriveOverallStatus(updatedItems),
          };
        }
        return r;
      });
      setMedicineRequests(updatedRequests);
      saveStoredMedicineRequests(updatedRequests);

      showToast(`Allocated supply sources for ${newlyCreatedTransfers.length} item(s) in request ${req.id}.`);
      return true;
    } else {
      showToast(`No eligible surplus donors found across PHC or District tiers for request ${req.id}.`);
      return false;
    }
  };

  const createStockTransfer = (transfer: Omit<StockTransfer, 'id' | 'createdAt' | 'status'>): StockTransfer | null => {
    if (transfer.requestedQuantity <= 0) {
      showToast('Transfer quantity must be greater than zero.');
      return null;
    }

    // Generic Canonical Facility Validation Boundary
    const validation = validateStockTransfer({
      ...transfer,
      id: `TRF-2026-${String(Date.now()).slice(-4)}`,
      createdAt: new Date().toISOString(),
      status: 'PENDING_SOURCE_APPROVAL',
      donorAllocated: transfer.donorAllocated ?? true,
    });

    if (!validation.isValid || !validation.sanitized) {
      showToast(validation.error || 'Transfer rejected by canonical validation boundary.');
      return null;
    }

    const newTransfer = validation.sanitized;
    const isExplicitlyUnallocated = newTransfer.donorAllocated === false;

    if (!isExplicitlyUnallocated) {
      const source = stocks.find(item => item.id === newTransfer.sourceStockId);
      const transferable = source ? getSafeTransferableQuantity(source, stockTransfers) : 0;
      if (!source || newTransfer.requestedQuantity > transferable) {
        showToast(`Transfer request rejected. The connected facility can offer up to ${transferable} surplus units while retaining its buffer.`);
        return null;
      }
    }

    const updated = [newTransfer, ...stockTransfers];
    setStockTransfers(updated);
    saveStoredStockTransfers(updated);
    if (!effectiveOnline) {
      const queued = addToSyncQueue({ type: 'STOCK_TRANSFER_CREATED', payload: newTransfer });
      setSyncQueue(prev => [...prev, queued]);
    }
    const targetMsg = newTransfer.donorAllocated
      ? `sent to ${newTransfer.sourceFacilityName} for source approval.`
      : `routed to District Coordination for donor allocation.`;
    showToast(`Transfer request ${newTransfer.id} ${targetMsg}`);
    return newTransfer;
  };

  const allocateStockTransferDonor = (
    transferId: string,
    sourceStock: DrugStockItem,
    donorFacility: Facility,
    districtUser?: { id: string; name: string } | null
  ): boolean => {
    const transfer = stockTransfers.find(item => item.id === transferId);
    if (!transfer) {
      showToast('Transfer request not found.');
      return false;
    }

    if (!isValidCanonicalFacilityId(donorFacility.id)) {
      showToast(`Cannot allocate non-canonical facility ID: ${donorFacility.id}`);
      return false;
    }

    const otherTransfers = stockTransfers.filter(item => item.id !== transferId);
    const transferable = getSafeTransferableQuantity(sourceStock, otherTransfers);
    if (transfer.requestedQuantity > transferable) {
      showToast(`Cannot allocate ${donorFacility.name}. Available safe surplus is only ${transferable} ${sourceStock.unit} (statutory buffer of ${sourceStock.bufferStock} preserved).`);
      return false;
    }

    const now = new Date().toISOString();
    const canonicalDonorName = resolveCanonicalFacilityName(donorFacility.id, donorFacility.name);
    const updated = stockTransfers.map(item => {
      if (item.id === transferId) {
        return {
          ...item,
          sourceStockId: sourceStock.id,
          sourceFacilityId: donorFacility.id,
          sourceFacilityName: canonicalDonorName,
          donorAllocated: true,
          allocatedByDistrictUserId: districtUser?.id,
          allocatedByDistrictUserName: districtUser?.name,
          allocatedAt: now,
        };
      }
      return item;
    });

    setStockTransfers(updated);
    saveStoredStockTransfers(updated);
    showToast(`Donor ${canonicalDonorName} endorsed & allocated for ${transfer.id}.`);
    return true;
  };

  const processStockTransfer = async (transferId: string, action: 'APPROVE' | 'REJECT' | 'DISPATCH' | 'RECEIVE', rejectionReason?: string, consignmentMeta?: Partial<StockTransfer>) => {
    const transfer = stockTransfers.find(item => item.id === transferId);
    if (!transfer) return false;
    const now = new Date().toISOString();
    const source = stocks.find(item => item.id === transfer.sourceStockId);
    const destination = stocks.find(item => item.id === transfer.destinationStockId);

    // Hardened P2 authorization check before state mutation
    try {
      const authTarget = action === 'RECEIVE' ? transfer.destinationFacilityId : transfer.sourceFacilityId;
      const res = await fetch('/api/authorize-mutation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STOCK', resource: { facilityId: authTarget } })
      });
      if (res.status === 403 || res.status === 401) {
        showToast('Unauthorized: You do not have permission to perform this transfer action.');
        return false;
      }
    } catch (err) {
      showToast('Network error during authorization.');
      return false;
    }

    const syncParentRequest = (nextStatus: StockTransfer['status']) => {
      setMedicineRequests(prevReqs => {
        const updated = prevReqs.map(req => {
          const isTargetReq = req.id === transfer.requestId || req.items?.some(i => i.transferId === transferId || (transfer.requestItemId && i.id === transfer.requestItemId));
          if (!isTargetReq) return req;
          const updatedItems = req.items.map(item => {
            if (item.transferId === transferId || (transfer.requestItemId && item.id === transfer.requestItemId)) {
              return {
                ...item,
                status: nextStatus,
                transferId: transferId,
                sourceFacilityId: transfer.sourceFacilityId,
                sourceFacilityName: transfer.sourceFacilityName,
                supplyTier: transfer.supplyTier,
              };
            }
            return item;
          });
          return {
            ...req,
            items: updatedItems,
            overallStatus: deriveOverallStatus(updatedItems),
          };
        });
        saveStoredMedicineRequests(updated);
        return updated;
      });
    };

    if (action === 'APPROVE') {
      if (transfer.status !== 'PENDING_SOURCE_APPROVAL') {
        showToast('Only pending transfers can be approved.');
        return false;
      }
      const availableAfterOtherReservations = source ? getSafeTransferableQuantity(source, stockTransfers.filter(item => item.id !== transferId)) : 0;
      if (!source || transfer.requestedQuantity > availableAfterOtherReservations) {
        showToast('Transfer cannot be approved because the source safety reserve is no longer available.');
        return false;
      }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, ...consignmentMeta, status: 'APPROVED' as const, approvedAt: now } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated);
      syncParentRequest('APPROVED');
      showToast(`${transferId} approved. Awaiting dispatch.`);
      return true;
    }
    if (action === 'REJECT') {
      if (transfer.status !== 'PENDING_SOURCE_APPROVAL' || !rejectionReason?.trim()) { showToast('A reason is required to reject a pending transfer.'); return false; }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, ...consignmentMeta, status: 'REJECTED' as const, rejectionReason, } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated);
      syncParentRequest('REJECTED');
      showToast(`${transferId} rejected by source facility.`);
      return true;
    }
    if (action === 'DISPATCH') {
      if (transfer.status !== 'APPROVED') { showToast('Only an approved transfer can be dispatched.'); return false; }
      const updated = stockTransfers.map(item => item.id === transferId ? { ...item, ...consignmentMeta, status: 'DISPATCHED' as const, dispatchedAt: now } : item);
      setStockTransfers(updated); saveStoredStockTransfers(updated);
      syncParentRequest('DISPATCHED');
      showToast(`${transferId} dispatched. Destination facility must confirm receipt.`);
      return true;
    }
    if (action === 'RECEIVE') {
      if (transfer.status !== 'DISPATCHED') {
        showToast('Only a dispatched transfer can be received.');
        return false;
      }
      if (!source || !destination || source.currentStock - transfer.requestedQuantity < source.bufferStock) {
        showToast('Transfer receipt could not be completed because its safety validation failed.');
        return false;
      }
      const updatedStocks = stocks.map(item => {
        if (item.id === source.id) return { ...item, currentStock: item.currentStock - transfer.requestedQuantity, status: item.currentStock - transfer.requestedQuantity < item.bufferStock ? 'LOW' as const : 'OPTIMAL' as const };
        if (item.id === destination.id) return { ...item, currentStock: item.currentStock + transfer.requestedQuantity, status: item.currentStock + transfer.requestedQuantity < item.bufferStock ? 'LOW' as const : 'OPTIMAL' as const };
        return item;
      });
      const updatedTransfers = stockTransfers.map(item => item.id === transferId ? { ...item, ...consignmentMeta, status: 'COMPLETED' as const, receivedAt: now } : item);
      setStocks(updatedStocks); saveStoredStocks(updatedStocks);
      setStockTransfers(updatedTransfers); saveStoredStockTransfers(updatedTransfers);
      syncParentRequest('COMPLETED');
      showToast(`${transferId} received. Inventories and stock statuses have been updated.`);
      return true;
    }
    return false;
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
        followUps,
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
        createReplenishmentRequest,
        linkTransferToRequestItem,
        allocateRequestSupplies,
        allocateStockTransferDonor,
        processStockTransfer,
        updateResourceAlertStatus,
        addFollowUpTask,
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
