import assert from 'node:assert';

// Standalone verification of the exact algorithms and business rules in patientPrivacyService.ts

function canAccessPatientReport(user, patient, options) {
  if (!user || user.id === 'guest-unauthenticated') {
    return {
      allowed: false,
      reason: 'Authentication required. No active session identified.',
      accessLevel: 'NONE',
    };
  }

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
        reason: `Emergency Break-Glass Access authorized: "${reason}" (Logged to state audit trail). [DEMO SIMULATION]`,
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

  if (user.role === 'phc_doctor') {
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

    const assignedDoctorStr = patient.assignedDoctorName
      ? `Assigned Doctor: ${patient.assignedDoctorName} at ${patient.assignedFacilityName || 'another facility'}`
      : 'Patient is under another medical officer';

    return {
      allowed: false,
      reason: `Access Denied: You are not the assigned doctor and have no active referral care relationship. (${assignedDoctorStr}). Protected clinical records restricted under ABDM Least-Privilege Policy.`,
      accessLevel: 'BASIC_PROFILE',
    };
  }

  if (user.role === 'specialist') {
    const isDirectWalkInAtFacility =
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.assignedFacilityName && user.facilityName && patient.assignedFacilityName === user.facilityName);

    if (isDirectWalkInAtFacility) {
      return {
        allowed: true,
        reason: `Authorized attending specialist: Patient directly registered/presenting at ${user.facilityName}.`,
        accessLevel: 'FULL_CLINICAL',
      };
    }

    if (options?.referrals) {
      const activeReferral = options.referrals.find(
        (r) =>
          r.patientId === patient.id &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
          ((r.targetFacilityId && r.targetFacilityId === user.facilityId) ||
            (r.targetFacility && user.facilityName && r.targetFacility === user.facilityName))
      );

      if (activeReferral) {
        return {
          allowed: true,
          reason: `Authorized receiving specialist at destination facility (${user.facilityName}) for referral token ${activeReferral.tokenCode}.`,
          accessLevel: 'FULL_CLINICAL',
        };
      }
    }

    if (patient.activeCareOwner === 'DISTRICT' && user.facilityType === 'District Hospital' && (patient.assignedFacilityId === user.facilityId || (patient.assignedFacilityName && user.facilityName && patient.assignedFacilityName === user.facilityName))) {
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

  if (user.role === 'nurse') {
    const isSameFacility =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityName && user.facilityName && patient.assignedFacilityName === user.facilityName);

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

  if (user.role === 'pharmacist') {
    const isSameFacility =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityName && user.facilityName && patient.assignedFacilityName === user.facilityName);

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

  if (user.role === 'asha') {
    const isCommunityArea =
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (user.villageId && patient.villageId && patient.villageId === user.villageId) ||
      (user.village && patient.village && patient.village === user.village);

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

  if (user.role === 'district_officer') {
    return {
      allowed: false,
      reason: 'District administrative account: Limited to aggregated district monitoring, bed matrix, and resource coordination. Individual medical records restricted under least-privilege data privacy laws.',
      accessLevel: 'NONE',
    };
  }

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

function canProcessDistrictReferral(user, referral) {
  if (!user || user.id === 'guest-unauthenticated') {
    return {
      allowed: false,
      reason: 'Authentication required to process referrals.',
      mode: 'DENIED',
    };
  }

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

  if (user.role === 'specialist') {
    const isMatch =
      (referral.targetFacilityId && referral.targetFacilityId === user.facilityId) ||
      (referral.targetFacility && user.facilityName && referral.targetFacility === user.facilityName);

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

function maskPatientForUnauthorizedView(patient, decision) {
  if (decision.allowed) {
    return patient;
  }

  const masked = {
    ...patient,
    phone: patient.phone.length >= 10 ? `${patient.phone.slice(0, 3)}****${patient.phone.slice(-3)}` : '**********',
  };

  if (decision.accessLevel === 'BASIC_PROFILE' || decision.accessLevel === 'NONE') {
    masked.encounters = [];
    masked.chronicConditions = ['[RESTRICTED - AUTHORIZED CLINICIAN ONLY]'];
  } else if (decision.accessLevel === 'MEDICATION_ONLY') {
    masked.encounters = patient.encounters.map((enc) => ({
      ...enc,
      diagnosis: '[PROTECTED CLINICAL DATA]',
      chiefComplaints: ['[PROTECTED]'],
      notes: '[PROTECTED CLINICAL NOTE - PHARMACIST DISPENSING VIEW]',
      labReports: undefined,
    }));
  } else if (decision.accessLevel === 'CLINICAL_LIMITED') {
    masked.encounters = patient.encounters.map((enc) => ({
      ...enc,
      diagnosis: enc.providerRole?.includes('ASHA') ? enc.diagnosis : '[SPECIALIST DIAGNOSIS - RESTRICTED]',
      notes: enc.providerRole?.includes('ASHA') ? enc.notes : '[CLINICAL NOTE RESTRICTED]',
      labReports: undefined,
    }));
  }

  return masked;
}

function filterPatientsForUser(user, patients, referrals) {
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
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (p.assignedFacilityName && user.facilityName && p.assignedFacilityName === user.facilityName)
    );
    return {
      assignedPatients,
      facilityPatients,
      referralPatients: [],
      allPatients: patients,
    };
  }

  if (user.role === 'specialist') {
    const referralPatientIds = new Set(
      (referrals || [])
        .filter(
          (r) =>
            ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
            ((r.targetFacilityId && r.targetFacilityId === user.facilityId) ||
              (r.targetFacility && user.facilityName && r.targetFacility === user.facilityName))
        )
        .map((r) => r.patientId)
    );

    const facilityDirectPatients = patients.filter(
      (p) =>
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.assignedFacilityName && user.facilityName && p.assignedFacilityName === user.facilityName) ||
        referralPatientIds.has(p.id)
    );

    const referralPatients = patients.filter((p) => referralPatientIds.has(p.id));
    return {
      assignedPatients: facilityDirectPatients,
      facilityPatients: facilityDirectPatients,
      referralPatients,
      allPatients: patients,
    };
  }

  if (user.role === 'asha') {
    const communityPatients = patients.filter(
      (p) =>
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (user.villageId && p.villageId && p.villageId === user.villageId) ||
        (user.village && p.village && p.village === user.village)
    );
    return {
      assignedPatients: communityPatients,
      facilityPatients: communityPatients,
      referralPatients: [],
      allPatients: patients,
    };
  }

  if (user.role === 'nurse' || user.role === 'pharmacist') {
    const facilityPatients = patients.filter(
      (p) =>
        (p.assignedFacilityId && p.assignedFacilityId === user.facilityId) ||
        (p.registrationFacilityId && p.registrationFacilityId === user.facilityId) ||
        (p.assignedFacilityName && user.facilityName && p.assignedFacilityName === user.facilityName)
    );
    return {
      assignedPatients: facilityPatients,
      facilityPatients,
      referralPatients: [],
      allPatients: patients,
    };
  }

  if (user.role === 'district_officer') {
    const districtPatients = patients.filter(
      (p) => p.district && user.district && p.district.toLowerCase() === user.district.toLowerCase()
    );
    return {
      assignedPatients: [],
      facilityPatients: districtPatients,
      referralPatients: [],
      allPatients: patients,
    };
  }

  return {
    assignedPatients: [],
    facilityPatients: patients.filter((p) => p.assignedFacilityId === user.facilityId),
    referralPatients: [],
    allPatients: patients,
  };
}

// Staff profiles matching PRE_REGISTERED_STAFF in AuthContext
const doctorA = {
  id: 'user-phc-01',
  name: 'Dr. Rajesh Deshmukh',
  role: 'phc_doctor',
  facilityId: 'fac-phc-velhe',
  facilityName: 'Velhe Primary Health Centre (PHC)',
  administrativeLevel: 'facility',
  assignedPatientIds: ['pat-001', 'pat-002'],
};

const ashaVelhe = {
  id: 'user-asha-01',
  name: 'Smt. Vandana More',
  role: 'asha',
  facilityId: 'fac-sc-ambavane',
  facilityName: 'Ambavane Sub-Centre',
  village: 'Ambavane',
  villageId: 'vil-ambavane',
  administrativeLevel: 'field',
};

const doctorB = {
  id: 'user-phc-02',
  name: 'Dr. Suresh Patil',
  role: 'phc_doctor',
  facilityId: 'fac-phc-nasrapur',
  facilityName: 'Nasrapur Primary Health Centre (PHC)',
  administrativeLevel: 'facility',
  assignedPatientIds: ['pat-003', 'pat-004'],
};

const specialist = {
  id: 'user-spec-01',
  name: 'Dr. Ananya Kulkarni',
  role: 'specialist',
  facilityId: 'fac-dh-pune',
  facilityName: 'District Hospital Aundh, Pune',
  facilityType: 'District Hospital',
  administrativeLevel: 'district',
  assignedPatientIds: [],
};

const nurse = {
  id: 'user-nurse-01',
  name: 'Sister Anita Jagtap',
  role: 'nurse',
  facilityId: 'fac-phc-velhe',
  facilityName: 'Velhe Primary Health Centre (PHC)',
  administrativeLevel: 'facility',
};

const pharmacist = {
  id: 'user-pharm-01',
  name: 'Anand Kadam',
  role: 'pharmacist',
  facilityId: 'fac-phc-velhe',
  facilityName: 'Velhe Primary Health Centre (PHC)',
  administrativeLevel: 'facility',
};

const stateAdmin = {
  id: 'user-admin-01',
  name: 'Dr. Nitin Patil',
  role: 'state_admin',
  facilityId: 'fac-state-reserve',
  facilityName: 'State Medical Reserve Depot, Maharashtra',
  administrativeLevel: 'state',
};

const districtOfficer = {
  id: 'user-dho-01',
  name: 'Dr. Bhagwan Pawar',
  role: 'district_officer',
  facilityId: 'fac-dho-pune',
  facilityName: 'District Health Office, Pune',
  administrativeLevel: 'district',
};

const nationalAdmin = {
  id: 'user-nat-01',
  name: 'Dr. Rajiv Bahl',
  role: 'national_admin',
  facilityId: 'fac-nha-delhi',
  facilityName: 'National Health Authority (NHA), New Delhi',
  administrativeLevel: 'national',
};

// Patients matching INITIAL_PATIENTS in mockData
const p001 = {
  id: 'pat-001',
  fullName: 'Sunita Sanjay More',
  phone: '9876543210',
  assignedDoctorId: 'user-phc-01',
  assignedDoctorName: 'Dr. Rajesh Deshmukh',
  assignedFacilityId: 'fac-phc-velhe',
  assignedFacilityName: 'Velhe Primary Health Centre (PHC)',
  activeReferralId: 'ref-101',
  encounters: [
    { id: 'enc-01', diagnosis: 'Severe Anemia in Pregnancy', notes: 'Urgent referral needed' }
  ],
  chronicConditions: ['Hypertension']
};

const p002 = {
  id: 'pat-002',
  fullName: 'Ramesh Dnyaneshwar Jadhav',
  phone: '9822334455',
  assignedDoctorId: 'user-phc-01',
  assignedDoctorName: 'Dr. Rajesh Deshmukh',
  assignedFacilityId: 'fac-phc-velhe',
  assignedFacilityName: 'Velhe Primary Health Centre (PHC)',
  encounters: [
    { id: 'enc-02', diagnosis: 'Acute Bronchitis', notes: 'Routine follow-up' }
  ],
  chronicConditions: []
};

const p003 = {
  id: 'pat-003',
  fullName: 'Meena Ashok Kamble',
  phone: '9860123456',
  assignedDoctorId: 'user-phc-02',
  assignedDoctorName: 'Dr. Suresh Patil',
  assignedFacilityId: 'fac-phc-nasrapur',
  assignedFacilityName: 'Nasrapur Primary Health Centre (PHC)',
  activeReferralId: 'ref-103',
  encounters: [
    { id: 'enc-03', diagnosis: 'Post-Partum Hemorrhage Risk', notes: 'Referred to Sassoon' }
  ],
  chronicConditions: []
};

const p004 = {
  id: 'pat-004',
  fullName: 'Ganpat Ramchandra Shinde',
  phone: '9890987654',
  assignedDoctorId: 'user-phc-02',
  assignedDoctorName: 'Dr. Suresh Patil',
  assignedFacilityId: 'fac-phc-nasrapur',
  assignedFacilityName: 'Nasrapur Primary Health Centre (PHC)',
  encounters: [
    { id: 'enc-04', diagnosis: 'Type 2 Diabetes Mellitus', notes: 'Glycemic control' }
  ],
  chronicConditions: ['Type 2 Diabetes']
};

const referrals = [
  {
    id: 'ref-101',
    tokenCode: 'MH-PUN-2026-0891',
    patientId: 'pat-001',
    referringFacility: 'Velhe Primary Health Centre (PHC)',
    referringFacilityId: 'fac-phc-velhe',
    referringUserId: 'user-phc-01',
    referringDoctorName: 'Dr. Rajesh Deshmukh',
    targetFacility: 'District Hospital Aundh, Pune',
    targetFacilityId: 'fac-dh-pune',
    status: 'ACCEPTED'
  },
  {
    id: 'ref-103',
    tokenCode: 'MH-PUN-2026-0893',
    patientId: 'pat-003',
    referringFacility: 'Nasrapur Primary Health Centre (PHC)',
    referringFacilityId: 'fac-phc-nasrapur',
    referringUserId: 'user-phc-02',
    referringDoctorName: 'Dr. Suresh Patil',
    targetFacility: 'Sassoon General Hospital, Pune',
    targetFacilityId: 'fac-sassoon-pune',
    status: 'ACCEPTED'
  }
];

console.log('====================================================');
console.log('RUNNING SWASTHYA SETU PATIENT PRIVACY & RBAC TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ [FAIL] ${name}`);
    console.error(err);
  }
}

runTest('Doctor A (Velhe PHC) has FULL access to assigned patients P001 & P002', () => {
  const dec1 = canAccessPatientReport(doctorA, p001, { referrals });
  assert.strictEqual(dec1.allowed, true);
  assert.strictEqual(dec1.accessLevel, 'FULL_CLINICAL');

  const dec2 = canAccessPatientReport(doctorA, p002, { referrals });
  assert.strictEqual(dec2.allowed, true);
  assert.strictEqual(dec2.accessLevel, 'FULL_CLINICAL');
});

runTest('Doctor A (Velhe PHC) is DENIED access to Doctor B patients P003 & P004', () => {
  const dec3 = canAccessPatientReport(doctorA, p003, { referrals });
  assert.strictEqual(dec3.allowed, false);
  assert.strictEqual(dec3.accessLevel, 'BASIC_PROFILE');

  const dec4 = canAccessPatientReport(doctorA, p004, { referrals });
  assert.strictEqual(dec4.allowed, false);
  assert.strictEqual(dec4.accessLevel, 'BASIC_PROFILE');
});

runTest('Doctor B (Nasrapur PHC) has FULL access to assigned patients P003 & P004', () => {
  const dec3 = canAccessPatientReport(doctorB, p003, { referrals });
  assert.strictEqual(dec3.allowed, true);
  assert.strictEqual(dec3.accessLevel, 'FULL_CLINICAL');

  const dec4 = canAccessPatientReport(doctorB, p004, { referrals });
  assert.strictEqual(dec4.allowed, true);
  assert.strictEqual(dec4.accessLevel, 'FULL_CLINICAL');
});

runTest('Doctor B (Nasrapur PHC) is STRICTLY DENIED access to Doctor A patient P001', () => {
  const dec1 = canAccessPatientReport(doctorB, p001, { referrals });
  assert.strictEqual(dec1.allowed, false);
  assert.strictEqual(dec1.accessLevel, 'BASIC_PROFILE');
  assert.match(dec1.reason, /Access Denied/);
  assert.match(dec1.reason, /Dr\. Rajesh Deshmukh/);
});

runTest('Specialist at District Hospital Aundh can access P001 via active referral ref-101', () => {
  const dec1 = canAccessPatientReport(specialist, p001, { referrals });
  assert.strictEqual(dec1.allowed, true);
  assert.strictEqual(dec1.accessLevel, 'FULL_CLINICAL');
  assert.match(dec1.reason, /Authorized receiving specialist/);
});

runTest('Specialist at District Hospital Aundh is DENIED access to P003 referred to Sassoon', () => {
  const dec3 = canAccessPatientReport(specialist, p003, { referrals });
  assert.strictEqual(dec3.allowed, false);
  assert.strictEqual(dec3.accessLevel, 'BASIC_PROFILE');
});

runTest('Emergency Break-Glass allows Doctor B to access P001 with clinical justification', () => {
  const emergencyReason = 'Acute trauma with severe hemorrhagic shock requiring immediate ER resuscitation';
  const decEmergency = canAccessPatientReport(doctorB, p001, {
    referrals,
    isEmergency: true,
    emergencyReason,
  });
  assert.strictEqual(decEmergency.allowed, true);
  assert.strictEqual(decEmergency.accessLevel, 'EMERGENCY_OVERRIDE');
  assert.match(decEmergency.reason, /Emergency Break-Glass Access authorized/);
});

runTest('Emergency Break-Glass fails if emergency reason is empty or whitespace', () => {
  const decEmptyReason = canAccessPatientReport(doctorB, p001, {
    referrals,
    isEmergency: true,
    emergencyReason: '   ',
  });
  assert.strictEqual(decEmptyReason.allowed, false);
});

runTest('Non-clinician (State Admin) CANNOT use break-glass to view individual patient record', () => {
  const decAdmin = canAccessPatientReport(stateAdmin, p001, {
    referrals,
    isEmergency: true,
    emergencyReason: 'Administrative inspection',
  });
  assert.strictEqual(decAdmin.allowed, false);
});

runTest('Masking function redacts phone, clinical encounters, and diagnoses for unauthorized viewer', () => {
  const dec = canAccessPatientReport(doctorB, p001, { referrals });
  const masked = maskPatientForUnauthorizedView(p001, dec);

  assert.notStrictEqual(masked.phone, p001.phone);
  assert(masked.phone.includes('****'), 'Phone must be masked');
  assert.strictEqual(masked.encounters.length, 0, 'Encounters must be redacted');
  assert.strictEqual(masked.chronicConditions[0], '[RESTRICTED - AUTHORIZED CLINICIAN ONLY]');
});

runTest('Pharmacist role receives MEDICATION_ONLY access with masked clinical notes', () => {
  const dec = canAccessPatientReport(pharmacist, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'MEDICATION_ONLY');

  const masked = maskPatientForUnauthorizedView(p001, dec);
  assert(masked.encounters.length > 0, 'Pharmacist can see encounter prescription container');
  assert.strictEqual(masked.encounters[0].diagnosis, '[PROTECTED CLINICAL DATA]');
  assert.strictEqual(masked.encounters[0].notes, '[PROTECTED CLINICAL NOTE - PHARMACIST DISPENSING VIEW]');
});

runTest('Cross-District Hospital Isolation: Gadchiroli DH Specialist CANNOT access Pune Aundh DH referral', () => {
  const gadchiroliSpecialist = {
    id: 'user-spec-gadchiroli',
    name: 'Dr. Ramesh Gedam',
    role: 'specialist',
    facilityId: 'fac-dh-gadchiroli',
    facilityName: 'District Hospital Gadchiroli',
    facilityType: 'District Hospital',
    administrativeLevel: 'district',
  };

  const dec = canAccessPatientReport(gadchiroliSpecialist, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'BASIC_PROFILE');
  assert.match(dec.reason, /does not have an active incoming referral/);
});

runTest('Unauthenticated or Guest session is strictly DENIED report access with accessLevel NONE', () => {
  const decNull = canAccessPatientReport(null, p001, { referrals });
  assert.strictEqual(decNull.allowed, false);
  assert.strictEqual(decNull.accessLevel, 'NONE');

  const guestUser = {
    id: 'guest-unauthenticated',
    name: 'Unauthenticated Session',
    phone: '',
    role: 'asha',
    facilityName: 'Unassigned',
  };
  const decGuest = canAccessPatientReport(guestUser, p001, { referrals });
  assert.strictEqual(decGuest.allowed, false);
  assert.strictEqual(decGuest.accessLevel, 'NONE');
});

runTest('Staff Nurse at same facility receives CLINICAL_LIMITED access with redacted specialist diagnosis', () => {
  const dec = canAccessPatientReport(nurse, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'CLINICAL_LIMITED');

  const masked = maskPatientForUnauthorizedView(p001, dec);
  assert(masked.encounters.length > 0);
  assert.strictEqual(masked.encounters[0].diagnosis, '[SPECIALIST DIAGNOSIS - RESTRICTED]');
  assert.strictEqual(masked.encounters[0].notes, '[CLINICAL NOTE RESTRICTED]');
});

runTest('Staff Nurse at different facility is DENIED and receives BASIC_PROFILE', () => {
  const bhorNurse = {
    id: 'user-nurse-02',
    name: 'Sister Kavita Mane',
    role: 'nurse',
    facilityId: 'fac-rh-bhor',
    facilityName: 'Bhor Rural Hospital (RH)',
  };
  const dec = canAccessPatientReport(bhorNurse, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'BASIC_PROFILE');
});

runTest('District Specialist at Aundh can clinically process referral ref-101 (destination matches Aundh)', () => {
  const res = canProcessDistrictReferral(specialist, referrals[0]);
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.mode, 'CLINICAL_ACTION');
  assert.match(res.reason, /Authorized clinician at designated receiving facility/);
});

runTest('District Specialist at Aundh CANNOT clinically process referral ref-103 (destination: Sassoon)', () => {
  const res = canProcessDistrictReferral(specialist, referrals[1]);
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.mode, 'COORDINATION_ONLY');
  assert.match(res.reason, /Read-only coordination/);
  assert.match(res.reason, /restricted to the destination facility care team/);
});

runTest('District Officer CANNOT clinically process or admit referrals (Coordination Only mode)', () => {
  const res = canProcessDistrictReferral(districtOfficer, referrals[0]);
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.mode, 'COORDINATION_ONLY');
  assert.match(res.reason, /Administrative scope permits referral oversight/);
});

runTest('District Officer is strictly DENIED full patient clinical EHR access (accessLevel: NONE)', () => {
  const dec = canAccessPatientReport(districtOfficer, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'NONE');
  assert.match(dec.reason, /District administrative account/);
});

runTest('National Admin is strictly DENIED individual patient EHR access (accessLevel: NONE)', () => {
  const dec = canAccessPatientReport(nationalAdmin, p001, { referrals });
  assert.strictEqual(dec.allowed, false);
  assert.strictEqual(dec.accessLevel, 'NONE');
  assert.match(dec.reason, /Administrative level account/);
});

runTest('Verification A: ASHA cannot browse another catchment\'s patient directory', () => {
  const allTestPatients = [p001, p002, p003, p004];
  const scoped = filterPatientsForUser(ashaVelhe, allTestPatients);
  const nasrapurPatientIds = ['pat-003', 'pat-004'];
  const hasNasrapur = scoped.assignedPatients.some(p => nasrapurPatientIds.includes(p.id));
  assert.strictEqual(hasNasrapur, false, 'ASHA must not have access to out-of-catchment Nasrapur patients');
});

runTest('Verification B: PHC doctor cannot browse another PHC\'s directory', () => {
  const allTestPatients = [p001, p002, p003, p004];
  const scoped = filterPatientsForUser(doctorA, allTestPatients);
  assert.strictEqual(scoped.facilityPatients.some(p => p.id === 'pat-003' || p.id === 'pat-004'), false, 'Doctor A must not see Nasrapur PHC patients');
});

runTest('Verification C: Referral receiving facility specialist sees authorized referred patient', () => {
  const allTestPatients = [p001, p002, p003, p004];
  const scoped = filterPatientsForUser(specialist, allTestPatients, referrals);
  assert(scoped.facilityPatients.some(p => p.id === 'pat-001'), 'Specialist at Aundh must see referred patient P001');
  assert.strictEqual(scoped.facilityPatients.some(p => p.id === 'pat-003'), false, 'Specialist at Aundh must not see P003 referred to Sassoon');
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
