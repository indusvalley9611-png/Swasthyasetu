export type Role =
  | 'asha'
  | 'phc_doctor'
  | 'specialist'
  | 'district_officer'
  | 'nurse'
  | 'pharmacist';

export type AdministrativeLevel = 'field' | 'facility' | 'district';

export type Permission =
  | 'view_basic_demographics'
  | 'view_clinical_reports'
  | 'edit_clinical_records'
  | 'create_referral'
  | 'manage_admissions'
  | 'view_prescriptions_only'
  | 'view_aggregate_analytics'
  | 'emergency_break_glass'
  | 'register_patient';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  userFacility: string;
  administrativeLevel?: AdministrativeLevel;
  patientId?: string;
  patientName?: string;
  patientAbha?: string;
  action:
    | 'VIEW_PATIENT_REPORT'
    | 'CREATE_REFERRAL'
    | 'UPDATE_PATIENT_RECORD'
    | 'EMERGENCY_ACCESS'
    | 'ACCESS_DENIED'
    | 'DISPENSE_MEDICATION'
    | 'DISCHARGE_PATIENT'
    | 'VIEW_DEMOGRAPHICS'
    | 'TERTIARY_ROUTING_APPROVED'
    | 'INTER_STATE_ESCALATION_APPROVED'
    | 'INTER_DISTRICT_DIVERT'
    | 'STOCK_TRANSFER_AUTHORIZED'
    | 'RRT_DISPATCHED'
    | 'EMERGENCY_DRUG_SOS_RAISED'
    | 'EMERGENCY_DRUG_DISPATCHED'
    | 'EMERGENCY_DRUG_RECEIVED'
    | 'VIEW_REFERRAL_SUMMARY'
    | 'DISTRICT_REFERRAL_COORDINATION'
    | 'REGISTER_PATIENT'
    | 'LINK_PATIENT';
  resource: string;
  reason?: string;
  accessGranted: boolean;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  accessLevel: 'NONE' | 'BASIC_PROFILE' | 'CLINICAL_LIMITED' | 'MEDICATION_ONLY' | 'FULL_CLINICAL' | 'EMERGENCY_OVERRIDE';
}

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  roleTitleEn: string;
  roleTitleMr: string;
  phone: string;
  facilityId: string;
  facilityName: string;
  facilityType: string;
  hfrCode: string; // Health Facility Registry code
  taluka: string;
  district: string;
  state?: string;
  village?: string;
  villageId?: string; // Stable Geographic LGD Code
  registrationNumber: string; // MMC or ASHA ID
  administrativeLevel: AdministrativeLevel;
  assignedPatientIds?: string[];
  permissions: Permission[];
}

export type TriagePriority = 'red' | 'yellow' | 'green';

export interface Vitals {
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  spO2: number;
  respiratoryRate: number;
  temperature: number; // Celsius or Fahrenheit (stored as Celsius)
  bloodGlucose?: number; // mg/dL
  hemoglobin?: number; // g/dL
  consciousLevel: 'alert' | 'voice' | 'pain' | 'unresponsive';
  recordedAt: string;
}

export interface TriageResult {
  score: number;
  priority: TriagePriority;
  reasons: string[];
  recommendedAction: string;
  recommendedFacilityType: 'District Hospital' | 'Rural Hospital / Sub-District' | 'PHC';
}

export interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string; // e.g., '1-0-1'
  durationDays: number;
  instructions: string;
}

export interface LabReport {
  id: string;
  testName: string;
  result: string;
  normalRange: string;
  isAbnormal: boolean;
  date: string;
  labFacility: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  date: string;
  facilityName: string;
  facilityType: 'Sub-Centre' | 'PHC' | 'Rural Hospital' | 'District Hospital';
  providerName: string;
  providerRole: string;
  chiefComplaints: string[];
  diagnosis: string;
  icd10Code?: string;
  vitals: Vitals;
  prescriptions?: PrescriptionItem[];
  labReports?: LabReport[];
  notes: string;
  referralId?: string;
}

export interface Patient {
  id: string;
  abhaId: string; // XX-XXXX-XXXX-XXXX
  abhaAddress: string; // name@abdm
  fullName: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  phone: string;
  village: string;
  villageId?: string;
  taluka: string;
  district: string;
  bloodGroup: string;
  isPregnant?: boolean;
  gestationalWeeks?: number;
  isHighRiskPregnancy?: boolean;
  chronicConditions?: string[];
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  encounters: ClinicalEncounter[];
  activeReferralId?: string;
  activeCareOwner?: string; // e.g. 'DISTRICT', 'PHC'
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedFacilityId?: string;
  assignedFacilityName?: string;
  entryType?: 'COMMUNITY_ASHA' | 'PHC_WALK_IN' | 'DISTRICT_HOSPITAL_WALK_IN';
  registrationFacilityId?: string;
  registrationFacilityName?: string;
  registrationLevel?: AdministrativeLevel;
  registeredByUserId?: string;
  registeredByUserName?: string;
  registeredAt?: string;
}

export interface DischargeSummary {
  finalDiagnosis: string;
  investigations: string;
  treatmentProvided: string;
  medicines: string;
  patientCondition: string;
  followUpDate: string;
  followUpFacility: string;
  instructions: string;
  warningSigns: string;
  communityFollowUpRequirement: string;
}

export interface Referral {
  id: string;
  tokenCode: string; // e.g., MH-REF-2026-9842
  patientId: string;
  patientName: string;
  patientAbha: string;
  patientAge: number;
  patientGender: string;
  referringFacility: string;
  referringFacilityId: string;
  referringDoctorName: string;
  referringUserId?: string;
  targetFacility: string;
  targetFacilityId: string;
  specialtyRequired: string;
  referralReason: string;
  triagePriority: TriagePriority;
  triageScore: number;
  triageReasons: string[];
  vitalsAtReferral: Vitals;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'ADMITTED' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED' | 'ROUTED_TO_TERTIARY' | 'TRANSFER_APPROVED';
  ambulanceDispatched?: boolean;
  qrPayload: string;
  assignedBed?: string;
  assignedBedType?: 'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied' | 'occupiedBeds';
  cancelledAt?: string;
  cancelledBy?: string;
  cancelledByRole?: string;
  cancellationReason?: string;
  previousStatus?: string;
  dischargeSummary?: DischargeSummary;
  counterReferredTo?: string; // Facility ID or Name
}

export interface Facility {
  id: string;
  name: string;
  type:
    | 'Sub-Centre'
    | 'PHC'
    | 'Rural Hospital'
    | 'District Hospital'
    | 'Medical College';
  taluka: string;
  district: string;
  phone: string;
  totalBeds: number;
  occupiedBeds: number;
  icuBedsTotal: number;
  icuBedsOccupied: number;
  ventilatorsTotal: number;
  ventilatorsOccupied: number;
  oxygenBedsTotal: number;
  oxygenBedsOccupied: number;
  availableSpecialists: string[];
  lat: number;
  lng: number;
  lastUpdated?: string;
}

export type ResourceStatus = 'HEALTHY' | 'LIMITED' | 'CRITICAL';
export type BedResourceType = 'GENERAL' | 'ICU' | 'OXYGEN' | 'VENTILATOR';

export interface DrugStockItem {
  id: string;
  facilityId: string;
  facilityName: string;
  drugName: string;
  category: 'Critical Lifesaving' | 'Maternal Health' | 'Vaccine' | 'General Anti-infective' | 'Emergency Gas';
  currentStock: number;
  bufferStock: number;
  unit: string;
  batchNumber: string;
  expiryDate: string;
  status: 'OPTIMAL' | 'LOW' | 'CRITICAL';
}

export type RequestStatus = 'PENDING' | 'PENDING_SOURCE_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'COMPLETED' | 'REJECTED';

/** One medicine line item within a ReplenishmentRequest. */
export interface ReplenishmentRequestItem {
  /** Stable item ID — never a medicine name. Format: "item-<timestamp>-<index>" */
  id: string;
  /** DrugStockItem.id of the shortage stock at the destination facility */
  stockId: string;
  /** Display name — never used as an identity or ownership key */
  medicineName: string;
  /** Snapshot of currentStock at time of request */
  currentStock: number;
  bufferStock: number;
  requestedQuantity: number;
  unit: string;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  reason: string;
  /** Independent per-item lifecycle status */
  status: RequestStatus;
  /** Populated after district/system allocation */
  sourceFacilityId?: string;
  /** Resolved dynamically from facilities[] — never hard-coded */
  sourceFacilityName?: string;
  supplyTier?: 'PHC' | 'DISTRICT';
  /** Links to a StockTransfer.id for this item */
  transferId?: string;
}

/** Overall status of a parent replenishment request (derived from item statuses). */
export type ReplenishmentOverallStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'REJECTED';

/**
 * Parent Medicine Replenishment Request — contains 1..N line items.
 * Each item independently tracks its own supply source and transfer lifecycle.
 */
export interface ReplenishmentRequest {
  /** Format: "REQ-2026-XXXX" */
  id: string;
  /** Authenticated PHC's facilityId — the authoritative workspace identity */
  destinationFacilityId: string;
  /** Resolved dynamically from facilities[] — never hard-coded */
  destinationFacilityName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  createdAt: string;
  overallStatus: ReplenishmentOverallStatus;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  notes?: string;
  /** 1..N medicine line items — no artificial maximum */
  items: ReplenishmentRequestItem[];
}

/**
 * Backward-compatible alias. Existing code referencing MedicineRequest continues to work.
 * New code should use ReplenishmentRequest directly.
 */
export type MedicineRequest = ReplenishmentRequest;

/**
 * Input shape for a single line item when calling createMedicineRequest or createReplenishmentRequest.
 * The id, status, and resolved fields are stamped by the context function.
 */
export interface CreateReplenishmentItemInput {
  stockId: string;
  medicineName: string;
  currentStock: number;
  bufferStock: number;
  requestedQuantity: number;
  unit: string;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  reason: string;
}

export interface StockTransfer {
  id: string;
  medicineName: string;
  sourceStockId: string;
  destinationStockId: string;
  sourceFacilityId: string;
  sourceFacilityName: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  requestedQuantity: number;
  urgency: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  reason: string;
  createdAt: string;
  status: RequestStatus;
  approvedAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  rejectionReason?: string;
  isEmergency?: boolean;
  emergencyIndication?: string;
  requiredByTime?: string;
  transportMode?: '108_AMBULANCE' | 'DISTRICT_MEDICAL_COURIER' | 'POLICE_GREEN_CORRIDOR' | 'FACILITY_TRANSPORT';
  consignmentCode?: string;
  dispatchedByUserName?: string;
  receivedByUserName?: string;
  dispatchOtpVerified?: boolean;
  receiptOtpVerified?: boolean;
  donorAllocated?: boolean;
  allocatedByDistrictUserId?: string;
  allocatedByDistrictUserName?: string;
  allocatedAt?: string;
  supplyTier?: 'PHC' | 'DISTRICT';
  /** Links this transfer to a parent ReplenishmentRequest.id */
  requestId?: string;
  /** Links this transfer to a specific ReplenishmentRequestItem.id within the parent request */
  requestItemId?: string;
}

export interface ResourceAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  resource: string;
  facilityId: string;
  facilityName: string;
  createdAt: string;
  recommendedAction: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface OutbreakData {
  id: string;
  district: string;
  taluka: string;
  diseaseName: 'Dengue' | 'Malaria' | 'Acute Diarrheal Disease' | 'H1N1 Influenza' | 'Leptospirosis' | 'Chikungunya';
  activeCases: number;
  weeklyChangePercent: number;
  riskLevel: 'HIGH' | 'MODERATE' | 'LOW';
  primaryHotspotVillage: string;
  subCentresAffected: number;
  reportedDate: string;
}

export type RrtInterventionStatus = 'DETECTED' | 'UNDER_REVIEW' | 'RRT_DISPATCHED' | 'EN_ROUTE' | 'ON_SITE' | 'CONTAINMENT' | 'RESOLVED';

export interface RrtIntervention {
  id: string;
  outbreakId: string;
  district: string;
  taluka: string;
  diseaseName: string;
  status: RrtInterventionStatus;
  teamLead: string;
  dispatchedAt?: string;
  onSiteAt?: string;
  resolvedAt?: string;
  actionsTaken: string[];
}

export interface OfflineSyncItem {
  id: string;
  timestamp: number;
  type: 'PATIENT_SCREENING' | 'NEW_PATIENT' | 'REFERRAL_CREATED' | 'VITALS_UPDATE' | 'MEDICINE_REQUEST_CREATED' | 'STOCK_TRANSFER_CREATED';
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  payload: any;
  retryCount: number;
}

export interface FollowUpTask {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  category: 'Maternal ANC' | 'Child Immunization' | 'Hypertension Review' | 'Post-Referral Check';
  dueDate: string;
  status: 'DUE' | 'OVERDUE' | 'COMPLETED';
  notes: string;
  assignedAshaName: string;
  assignedFacilityId?: string;
  sourceReferralId?: string;
  createdByUserId?: string;
  createdAt?: string;
}

export interface TeleconsultSession {
  id: string;
  patientId: string;
  patientName: string;
  phcDoctorName: string;
  specialistName: string;
  specialty: string;
  chiefComplaint: string;
  scheduledTime: string;
  status: 'ACTIVE' | 'WAITING' | 'COMPLETED';
  recommendations?: string;
}

export interface PredictiveForecast {
  facilityName: string;
  forecastDay: string;
  expectedOpdLoad: number;
  expectedEmergencyAdmissions: number;
  predictedBedStrainPercent: number;
  riskAlert?: string;
}

