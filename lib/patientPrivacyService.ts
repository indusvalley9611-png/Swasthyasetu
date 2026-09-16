import { Patient, Referral, AuditLogEntry, AccessDecision, UserProfile } from './types';
import { getStoredAuditLogs, saveStoredAuditLogs } from './idbStorage';

/**
 * In-memory fallback for audit logs (e.g. server-side API routes)
 */
const inMemoryAuditLogs: AuditLogEntry[] = [];

/**
 * Determine if a user account is authorized to perform direct patient registration or ABDM linking.
 * Permitted clinical care roles: ASHA, PHC Doctor, Nurse, Specialist Doctor.
 */
export function canRegisterPatient(user: UserProfile | null | undefined): boolean {
  if (!user || user.id === 'guest-unauthenticated') return false;
  const clinicalCareRoles: string[] = ['asha', 'phc_doctor', 'nurse', 'specialist'];
  return clinicalCareRoles.includes(user.role) || (user.permissions && user.permissions.includes('register_patient'));
}

/**
 * Determine if a user can access a patient's protected detailed clinical report.
 * Evaluates: Authenticated User -> Role -> Organization/Facility -> Care Relationship / Authorization -> Permissions.
 */
export function canAccessPatientReport(
  user: UserProfile | null | undefined,
  patient: Patient,
  options?: {
    referrals?: Referral[];
    isEmergency?: boolean;
    emergencyReason?: string;
  }
): AccessDecision {
  // 1. Authenticated User Check
  if (!user || user.id === 'guest-unauthenticated') {
    return {
      allowed: false,
      reason: 'Authentication required. No active session identified.',
      accessLevel: 'NONE',
    };
  }

  // 2. Emergency "Break-Glass" Access Evaluation
  // Must be a recognized clinical role with a documented emergency reason
  if (options?.isEmergency) {
    const reason = options.emergencyReason?.trim();
    if (!reason) {
      return {
        allowed: false,
        reason: 'Emergency Break-Glass Access Denied: Mandatory non-empty reason required for emergency override.',
        accessLevel: 'NONE',
      };
    }
    const isClinician = user.role === 'phc_doctor' || user.role === 'specialist' || user.role === 'nurse';
    if (isClinician) {
      return {
        allowed: true,
        reason: `Emergency Break-Glass Access authorized: "${reason}" (Logged to audit trail). [DEMO SIMULATION - Not production ABDM integration]`,
        accessLevel: 'EMERGENCY_OVERRIDE',
      };
    } else {
      return {
        allowed: false,
        reason: `Emergency Break-Glass Access Denied: Role '${user.role}' lacks clinical authority for emergency override.`,
        accessLevel: 'NONE',
      };
    }
  }

  // 3. Primary Attending Doctor Care Relationship
  if (user.role === 'phc_doctor') {
    // Check if patient is directly assigned to this doctor or registered at this PHC
    const isDirectlyAssigned =
      patient.assignedDoctorId === user.id ||
      (user.assignedPatientIds && user.assignedPatientIds.includes(patient.id));
    const isRegisteredAtFacility =
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId);

    if (isDirectlyAssigned || isRegisteredAtFacility) {
      return {
        allowed: true,
        reason: `Primary attending doctor care relationship established with ${user.name} (${user.facilityName}).`,
        accessLevel: 'FULL_CLINICAL',
      };
    }

    // Check if doctor created an active referral for this patient
    if (options?.referrals) {
      const activeReferral = options.referrals.find(
        (r) =>
          r.patientId === patient.id &&
          (r.referringUserId === user.id || (r.referringFacilityId && r.referringFacilityId === user.facilityId)) &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status)
      );

      if (activeReferral) {
        return {
          allowed: true,
          reason: `Authorized referring doctor for active referral (${activeReferral.tokenCode}).`,
          accessLevel: 'FULL_CLINICAL',
        };
      }
    }

    // Unauthorized Doctor: Belongs to different patient / facility
    const assignedDoctorStr = patient.assignedDoctorName
      ? `Assigned Doctor: ${patient.assignedDoctorName} at ${patient.assignedFacilityName || 'another facility'}`
      : 'Patient is under another medical officer';

    return {
      allowed: false,
      reason: `Access Denied: You are not the assigned doctor and have no active referral care relationship. (${assignedDoctorStr}). Protected clinical records restricted under ABDM Least-Privilege Policy.`,
      accessLevel: 'BASIC_PROFILE',
    };
  }

  // 4. District Specialist / Receiving Clinician
  if (user.role === 'specialist') {
    // Check if patient was directly registered at this specialist's hospital / facility
    const isDirectWalkInAtFacility =
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.assignedDoctorId && patient.assignedDoctorId === user.id) ||
      (patient.registeredByUserId && patient.registeredByUserId === user.id) ||
      false;

    if (isDirectWalkInAtFacility) {
      return {
        allowed: true,
        reason: `Authorized attending specialist: Patient directly registered/presenting at ${user.facilityName}.`,
        accessLevel: 'FULL_CLINICAL',
      };
    }

    // Check if patient has an active referral directed to this specialist's facility
    if (options?.referrals) {
      const activeReferral = options.referrals.find(
        (r) =>
          r.patientId === patient.id &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
          ((r.targetFacilityId && r.targetFacilityId === user.facilityId) ||
            false)
      );

      if (activeReferral) {
        return {
          allowed: true,
          reason: `Authorized receiving specialist at destination facility (${user.facilityName}) for referral token ${activeReferral.tokenCode}.`,
          accessLevel: 'FULL_CLINICAL',
        };
      }
    }

    // If admitted to this specialist's care
    if (patient.activeCareOwner === 'DISTRICT' && user.facilityType === 'District Hospital' && (patient.assignedFacilityId === user.facilityId)) {
      return {
        allowed: true,
        reason: `Authorized specialist: Patient currently admitted under care at ${user.facilityName}.`,
        accessLevel: 'FULL_CLINICAL',
      };
    }

    return {
      allowed: false,
      reason: `Access Denied: ${user.facilityName} does not have an active incoming referral or admission relationship for this patient.`,
      accessLevel: 'BASIC_PROFILE',
    };
  }

  // 5. Staff Nurse (Facility-level care duties)
  if (user.role === 'nurse') {
    const isSameFacility =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      false;

    if (isSameFacility) {
      return {
        allowed: false,
        reason: 'Nurse duty access: Authorized for vitals, basic care and triage. Full historical specialist diagnostic reports restricted.',
        accessLevel: 'CLINICAL_LIMITED',
      };
    }

    return {
      allowed: false,
      reason: 'Access Denied: Patient is registered at a different facility.',
      accessLevel: 'BASIC_PROFILE',
    };
  }

  // 6. Pharmacist (Medicine-related dispensing access only)
  if (user.role === 'pharmacist') {
    const isSameFacility =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      false;

    if (isSameFacility) {
      return {
        allowed: false,
        reason: 'Pharmacist access: Limited to medicine dispensing and prescription requirements. Sensitive clinical notes, diagnoses, and lab investigations are protected.',
        accessLevel: 'MEDICATION_ONLY',
      };
    }

    return {
      allowed: false,
      reason: 'Access Denied: Patient has no medication orders at this facility.',
      accessLevel: 'NONE',
    };
  }

  // 7. ASHA / Field Worker (Community health & screening)
  if (user.role === 'asha') {
    const isCommunityArea =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (user.villageId && patient.villageId && patient.villageId === user.villageId) ||
      false;

    if (isCommunityArea) {
      return {
        allowed: false,
        reason: 'ASHA community worker access: Limited to community screening, vitals capture, and maternal health follow-ups. Full clinical specialist reports are restricted.',
        accessLevel: 'CLINICAL_LIMITED',
      };
    }

    return {
      allowed: false,
      reason: 'Access Denied: Patient is outside your assigned community coverage area.',
      accessLevel: 'BASIC_PROFILE',
    };
  }

  // 8. District Administrative Officer / Resource Coordinator
  if (user.role === 'district_officer') {
    return {
      allowed: false,
      reason: 'District administrative account: Limited to aggregated district monitoring, bed matrix, and resource coordination. Individual medical records restricted under least-privilege data privacy laws.',
      accessLevel: 'NONE',
    };
  }

  // 9. State / National / Administrative Tier
  if (
    user.role === 'state_admin' ||
    user.role === 'national_admin' ||
    user.administrativeLevel === 'state' ||
    user.administrativeLevel === 'national'
  ) {
    return {
      allowed: false,
      reason: 'Administrative level account: Limited to aggregated public health indicators, facility capacity, and outbreak surveillance. Individual medical records restricted under least-privilege data privacy laws.',
      accessLevel: 'NONE',
    };
  }

  return {
    allowed: false,
    reason: 'Access Denied: No authorized clinical role or care relationship identified.',
    accessLevel: 'NONE',
  };
}

/**
 * Mask sensitive clinical records when the user is not granted full clinical access.
 * Returns a sanitized patient copy where unpermitted fields are removed.
 */
export function maskPatientForUnauthorizedView(patient: Patient, decision: AccessDecision): Patient {
  if (decision.allowed) {
    return patient;
  }

  // Masked clone
  const masked: Patient = {
    ...patient,
    phone: patient.phone.length >= 10 ? `${patient.phone.slice(0, 3)}****${patient.phone.slice(-3)}` : '**********',
    emergencyContact: {
      name: patient.emergencyContact?.name || 'Contact',
      relation: patient.emergencyContact?.relation || 'Family',
      phone: '**********',
    },
  };

  if (decision.accessLevel === 'BASIC_PROFILE' || decision.accessLevel === 'NONE') {
    // Redact all encounters, diagnoses, notes, and lab reports
    masked.encounters = [];
    masked.chronicConditions = ['[RESTRICTED - AUTHORIZED CLINICIAN ONLY]'];
  } else if (decision.accessLevel === 'MEDICATION_ONLY') {
    // Include only prescriptions for dispensing, redact clinical notes and diagnoses
    masked.encounters = patient.encounters.map((enc) => ({
      ...enc,
      diagnosis: '[PROTECTED CLINICAL DATA]',
      chiefComplaints: ['[PROTECTED]'],
      notes: '[PROTECTED CLINICAL NOTE - PHARMACIST DISPENSING VIEW]',
      labReports: undefined,
    }));
    masked.chronicConditions = ['[RESTRICTED]'];
  } else if (decision.accessLevel === 'CLINICAL_LIMITED') {
    // Include vitals, redact detailed specialist notes, sensitive historical diagnoses
    masked.encounters = patient.encounters.map((enc) => ({
      ...enc,
      diagnosis: enc.providerRole?.includes('ASHA') ? enc.diagnosis : '[SPECIALIST DIAGNOSIS - RESTRICTED]',
      notes: enc.providerRole?.includes('ASHA') ? enc.notes : '[CLINICAL NOTE RESTRICTED]',
      labReports: undefined,
    }));
  }

  return masked;
}

/**
 * Filter patient list for a specific worker's primary operational scope.
 */
export function filterPatientsForUser(
  user: UserProfile | null | undefined,
  patients: Patient[],
  referrals?: Referral[]
): {
  assignedPatients: Patient[];
  facilityPatients: Patient[];
  referralPatients: Patient[];
  allPatients: Patient[];
} {
  if (!user || user.id === 'guest-unauthenticated') {
    return { assignedPatients: [], facilityPatients: [], referralPatients: [], allPatients: [] };
  }

  if (user.role === 'phc_doctor') {
    const assignedPatients = patients.filter(
      (p) =>
        p.assignedDoctorId === user.id ||
        (user.assignedPatientIds && user.assignedPatientIds.includes(p.id)) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId)
    );
    const facilityPatients = patients.filter(
      (p) =>
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId)
    );
    return {
      assignedPatients,
      facilityPatients,
      referralPatients: [],
      allPatients: Array.from(new Set([...assignedPatients, ...facilityPatients])),
    };
  }

  if (user.role === 'specialist') {
    const referralPatientIds = new Set(
      (referrals || [])
        .filter(
          (r) =>
            ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
            r.targetFacilityId === user.facilityId
        )
        .map((r) => r.patientId)
    );

    const facilityDirectPatients = patients.filter(
      (p) =>
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.assignedFacilityName && user.facilityName && p.assignedFacilityName === user.facilityName) ||
        (p.registeredByUserId && p.registeredByUserId === user.id) ||
        (p.assignedDoctorId && p.assignedDoctorId === user.id) ||
        referralPatientIds.has(p.id)
    );

    const referralPatients = patients.filter((p) => referralPatientIds.has(p.id));
    return {
      assignedPatients: facilityDirectPatients,
      facilityPatients: facilityDirectPatients,
      referralPatients,
      allPatients: facilityDirectPatients,
    };
  }

  if (user.role === 'asha') {
    const communityPatients = patients.filter(
      (p) =>
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (user.villageId && p.villageId && p.villageId === user.villageId)
    );
    return {
      assignedPatients: communityPatients,
      facilityPatients: communityPatients,
      referralPatients: [],
      allPatients: communityPatients,
    };
  }

  if (user.role === 'nurse' || user.role === 'pharmacist') {
    const facilityPatients = patients.filter(
      (p) =>
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId)
    );
    return {
      assignedPatients: facilityPatients,
      facilityPatients,
      referralPatients: [],
      allPatients: facilityPatients, // No longer leaking all global patients
    };
  }

  if (user.role === 'district_officer' || user.role === 'state_admin' || user.role === 'national_admin') {
    // Only return metadata-level non-clinical aggregated access, or scoped district patients
    // LIMITATION: 'districtId' does not exist in the data model. Using string matching as a fallback.
    const districtPatients = patients.filter(
      (p) => p.district && user.district && p.district === user.district
    );
    // National/State admin might need larger scope for dashboards, but individual PII records should be limited.
    // For this prototype, we limit direct patient list exposure even for admins unless explicitly searched.
    return {
      assignedPatients: [],
      facilityPatients: user.role === 'district_officer' ? districtPatients : [],
      referralPatients: [],
      allPatients: user.role === 'district_officer' ? districtPatients : [],
    };
  }

  const defaultFacilityPatients = patients.filter((p) => p.assignedFacilityId === user.facilityId);
  return {
    assignedPatients: [],
    facilityPatients: defaultFacilityPatients,
    referralPatients: [],
    allPatients: defaultFacilityPatients,
  };
}

/**
 * Record an audit log entry for patient record interactions.
 */
export function recordAuditLog(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
  };

  inMemoryAuditLogs.unshift(newEntry);

  if (typeof window !== 'undefined') {
    const stored = getStoredAuditLogs();
    const updated = [newEntry, ...stored].slice(0, 200); // Keep latest 200
    saveStoredAuditLogs(updated);

    // Dispatch custom event so components update immediately
    try {
      window.dispatchEvent(new CustomEvent('swasthyasetu_audit_updated', { detail: newEntry }));
    } catch {
      // Ignore
    }
  }

  return newEntry;
}

/**
 * Retrieve audit logs, filtered by patient or user.
 */
export function getAuditLogs(filter?: {
  patientId?: string;
  userId?: string;
  action?: string;
}): AuditLogEntry[] {
  let logs: AuditLogEntry[] = [];
  if (typeof window !== 'undefined') {
    logs = getStoredAuditLogs();
  } else {
    logs = inMemoryAuditLogs;
  }

  if (!filter) return logs;

  return logs.filter((log) => {
    if (filter.patientId && log.patientId !== filter.patientId) return false;
    if (filter.userId && log.userId !== filter.userId) return false;
    if (filter.action && log.action !== filter.action) return false;
    return true;
  });
}

/**
 * Determine if an authenticated user has clinical authority to process, admit, escalate, or discharge a referral.
 * District specialists are strictly limited to referrals where their facility matches the destination facility.
 * External district hospital cases can only be viewed in read-only referral coordination mode.
 */
export function canProcessDistrictReferral(
  user: UserProfile | null | undefined,
  referral: Referral
): { allowed: boolean; reason: string; mode: 'CLINICAL_ACTION' | 'COORDINATION_ONLY' | 'DENIED' } {
  if (!user || user.id === 'guest-unauthenticated') {
    return {
      allowed: false,
      reason: 'Authentication required to process referrals.',
      mode: 'DENIED',
    };
  }

  // Administrative / non-clinical roles can never take clinical actions
  if (
    user.role === 'district_officer' ||
    user.role === 'state_admin' ||
    user.role === 'national_admin' ||
    user.role === 'pharmacist'
  ) {
    return {
      allowed: false,
      reason: 'Administrative scope permits referral oversight and coordination only. Clinical admission, bed allocation, and treatment actions require authorized clinician credentials.',
      mode: 'COORDINATION_ONLY',
    };
  }

  // Specialist / Clinician role
  if (user.role === 'specialist') {
    const isMatch =
      (referral.targetFacilityId && referral.targetFacilityId === user.facilityId) ||
      false;

    if (isMatch) {
      return {
        allowed: true,
        reason: `Authorized clinician at designated receiving facility (${user.facilityName}).`,
        mode: 'CLINICAL_ACTION',
      };
    }

    return {
      allowed: false,
      reason: `Read-only coordination: This referral is directed to ${referral.targetFacility}. Clinical admission, bed allocation, and treatment actions are restricted to the destination facility care team.`,
      mode: 'COORDINATION_ONLY',
    };
  }

  // Referring doctor can cancel or track their own referrals
  if (user.role === 'phc_doctor' && (referral.referringUserId === user.id || (referral.referringFacilityId && referral.referringFacilityId === user.facilityId))) {
    return {
      allowed: true,
      reason: 'Originating referring doctor.',
      mode: 'CLINICAL_ACTION',
    };
  }

  return {
    allowed: false,
    reason: 'Clinical treatment actions are restricted to authorized receiving care-team members.',
    mode: 'COORDINATION_ONLY',
  };
}
