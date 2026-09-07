export type Role = 'asha' | 'phc_doctor' | 'specialist' | 'state_admin';

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
  targetFacility: string;
  specialtyRequired: string;
  referralReason: string;
  triagePriority: TriagePriority;
  triageScore: number;
  triageReasons: string[];
  vitalsAtReferral: Vitals;
  referringDoctorName: string;
  createdAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'ADMITTED' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
  ambulanceDispatched?: boolean;
  qrPayload: string;
  assignedBed?: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'Sub-Centre' | 'PHC' | 'Rural Hospital' | 'District Hospital' | 'Medical College';
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
}

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

export interface OfflineSyncItem {
  id: string;
  timestamp: number;
  type: 'PATIENT_SCREENING' | 'NEW_PATIENT' | 'REFERRAL_CREATED' | 'VITALS_UPDATE';
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

