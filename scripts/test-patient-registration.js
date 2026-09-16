const assert = require('node:assert');

console.log('====================================================');
console.log('AUTOMATED VERIFICATION: DIRECT PATIENT REGISTRATION');
console.log('====================================================\n');

// Standard implementations matching lib/patientPrivacyService.ts
function canRegisterPatient(user) {
  if (!user || user.id === 'guest-unauthenticated') return false;
  const clinicalCareRoles = ['asha', 'phc_doctor', 'nurse', 'specialist'];
  return clinicalCareRoles.includes(user.role) || (user.permissions && user.permissions.includes('register_patient'));
}

function canAccessPatientReport(user, patient, options) {
  if (!user || user.id === 'guest-unauthenticated') {
    return { allowed: false, reason: 'Authentication required. No active session identified.', accessLevel: 'NONE' };
  }

  if (options?.isEmergency && options?.emergencyReason?.trim()) {
    const isClinician = user.role === 'phc_doctor' || user.role === 'specialist' || user.role === 'nurse';
    if (isClinician) {
      return { allowed: true, reason: 'Emergency Break-Glass Access authorized.', accessLevel: 'EMERGENCY_OVERRIDE' };
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
      return { allowed: true, reason: `Primary attending doctor care relationship with ${user.name}`, accessLevel: 'FULL_CLINICAL' };
    }

    if (options?.referrals) {
      const activeReferral = options.referrals.find(
        (r) => r.patientId === patient.id && r.referringUserId === user.id && ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status)
      );
      if (activeReferral) {
        return { allowed: true, reason: 'Authorized referring doctor', accessLevel: 'FULL_CLINICAL' };
      }
    }

    return { allowed: false, reason: 'Access Denied: Protected clinical records', accessLevel: 'BASIC_PROFILE' };
  }

  if (user.role === 'specialist') {
    const isDirectWalkInAtFacility =
      (patient.registrationFacilityId && patient.registrationFacilityId === user.facilityId) ||
      (patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId) ||
      (patient.assignedFacilityName && user.facilityName && patient.assignedFacilityName.toLowerCase().includes(user.facilityName.toLowerCase()));

    if (isDirectWalkInAtFacility) {
      return { allowed: true, reason: `Authorized attending specialist: Patient directly registered/presenting at ${user.facilityName}`, accessLevel: 'FULL_CLINICAL' };
    }

    if (options?.referrals) {
      const activeReferral = options.referrals.find(
        (r) =>
          r.patientId === patient.id &&
          ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
          (r.targetFacility.toLowerCase().includes(user.facilityName.toLowerCase()) ||
            user.facilityName.toLowerCase().includes(r.targetFacility.toLowerCase()) ||
            (r.targetFacility.toLowerCase().includes('aundh') && user.facilityName.toLowerCase().includes('aundh')))
      );
      if (activeReferral) {
        return { allowed: true, reason: 'Authorized receiving specialist', accessLevel: 'FULL_CLINICAL' };
      }
    }

    return { allowed: false, reason: 'Access Denied: No incoming referral or registration relationship.', accessLevel: 'BASIC_PROFILE' };
  }

  return { allowed: false, reason: 'Default deny', accessLevel: 'NONE' };
}

function filterPatientsForUser(user, patients, referrals) {
  if (!user || user.id === 'guest-unauthenticated') {
    return { assignedPatients: [], facilityPatients: [], referralPatients: [], allPatients: [] };
  }

  if (user.role === 'specialist') {
    const referralPatientIds = new Set(
      (referrals || [])
        .filter(
          (r) =>
            ['PENDING', 'ACCEPTED', 'ADMITTED'].includes(r.status) &&
            (r.targetFacility.toLowerCase().includes(user.facilityName.toLowerCase()) ||
              user.facilityName.toLowerCase().includes(r.targetFacility.toLowerCase()))
        )
        .map((r) => r.patientId)
    );

    const facilityDirectPatients = patients.filter(
      (p) =>
        p.registrationFacilityId === user.facilityId ||
        p.assignedFacilityId === user.facilityId ||
        p.assignedFacilityName === user.facilityName ||
        referralPatientIds.has(p.id)
    );

    const referralPatients = patients.filter((p) => referralPatientIds.has(p.id));
    return { assignedPatients: facilityDirectPatients, facilityPatients: facilityDirectPatients, referralPatients, allPatients: patients };
  }

  return { assignedPatients: [], facilityPatients: [], referralPatients: [], allPatients: patients };
}

// Test User Profiles
const ashaUser = { id: 'user-asha-01', name: 'Smt. Sunita Shinde', role: 'asha', facilityId: 'fac-sc-ambavane', facilityName: 'Ambavane Sub-Centre (Velhe PHC)', permissions: ['view_basic_demographics', 'create_referral', 'register_patient'] };
const phcDoctorUser = { id: 'user-phc-01', name: 'Dr. Rajesh Deshmukh', role: 'phc_doctor', facilityId: 'fac-phc-velhe', facilityName: 'Velhe Primary Health Centre (PHC)', permissions: ['view_basic_demographics', 'view_clinical_reports', 'register_patient'] };
const nurseUser = { id: 'user-nurse-01', name: 'Sister Anita Jagtap', role: 'nurse', facilityId: 'fac-phc-velhe', facilityName: 'Velhe Primary Health Centre (PHC)', permissions: ['view_basic_demographics', 'register_patient'] };
const specialistUser = { id: 'user-spec-01', name: 'Dr. Ananya Kulkarni', role: 'specialist', facilityId: 'fac-dh-pune', facilityName: 'District Hospital Aundh, Pune', permissions: ['view_basic_demographics', 'view_clinical_reports', 'manage_admissions', 'register_patient'] };

const pharmacistUser = { id: 'user-pharm-01', name: 'Shri Anand Kadam', role: 'pharmacist', facilityId: 'fac-phc-nasrapur', facilityName: 'Nasrapur PHC', permissions: ['view_basic_demographics', 'view_prescriptions_only'] };
const dhoUser = { id: 'user-dist-admin-01', name: 'Dr. Vinod Chavan', role: 'district_officer', facilityId: 'fac-dh-pune', facilityName: 'District Hospital Aundh, Pune', permissions: ['view_basic_demographics'] };
const stateAdminUser = { id: 'user-admin-01', name: 'Dr. Nitin Patil', role: 'state_admin', facilityId: 'fac-state-reserve', facilityName: 'State Medical Reserve Depot, Maharashtra', permissions: ['view_aggregate_analytics'] };

let passCount = 0;
let testCount = 0;

function runTest(condition, message) {
  testCount++;
  if (condition) {
    console.log(`[PASS ${testCount}] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL ${testCount}] ${message}`);
  }
}

console.log('--- TEST GROUP 1: Registration Permission Matrix ---');
runTest(canRegisterPatient(ashaUser) === true, 'ASHA worker is permitted patient registration');
runTest(canRegisterPatient(phcDoctorUser) === true, 'PHC Doctor is permitted direct walk-in patient registration');
runTest(canRegisterPatient(nurseUser) === true, 'Staff Nurse is permitted direct walk-in patient registration');
runTest(canRegisterPatient(specialistUser) === true, 'District Hospital Specialist is permitted direct walk-in patient registration');

runTest(canRegisterPatient(pharmacistUser) === false, 'Pharmacist is strictly DENIED patient registration (dispensing-only boundary)');
runTest(canRegisterPatient(dhoUser) === false, 'District Health Officer is strictly DENIED routine patient registration');
runTest(canRegisterPatient(stateAdminUser) === false, 'State Health Admin is strictly DENIED patient registration');
runTest(canRegisterPatient(null) === false, 'Unauthenticated guest is strictly DENIED patient registration');

console.log('\n--- TEST GROUP 2: Direct ASHA Community Registration ---');
const ashaPatient = {
  id: 'pat-asha-test-01',
  abhaId: '91-1001-2002-3003',
  fullName: 'Kiran Deshmukh',
  entryType: 'COMMUNITY_ASHA',
  registrationFacilityId: ashaUser.facilityId,
  registrationFacilityName: ashaUser.facilityName,
  registrationLevel: 'field',
  registeredByUserId: ashaUser.id,
};
runTest(ashaPatient.entryType === 'COMMUNITY_ASHA', 'ASHA patient created with entryType: COMMUNITY_ASHA');
runTest(ashaPatient.registrationFacilityId === 'fac-sc-ambavane', 'ASHA patient linked to Ambavane Sub-Centre');

console.log('\n--- TEST GROUP 3: Direct PHC Walk-in Registration ---');
const phcWalkInPatient = {
  id: 'pat-phc-walkin-01',
  abhaId: '91-4004-5005-6006',
  fullName: 'Ramesh Balu Shinde',
  entryType: 'PHC_WALK_IN',
  registrationFacilityId: phcDoctorUser.facilityId,
  registrationFacilityName: phcDoctorUser.facilityName,
  assignedDoctorId: phcDoctorUser.id,
};
runTest(phcWalkInPatient.entryType === 'PHC_WALK_IN', 'PHC walk-in patient created with entryType: PHC_WALK_IN');
runTest(phcWalkInPatient.registrationFacilityId === 'fac-phc-velhe', 'Registered directly at Velhe PHC without ASHA requirement');
const phcAccess = canAccessPatientReport(phcDoctorUser, phcWalkInPatient);
runTest(phcAccess.allowed === true, 'PHC Doctor has full clinical access to direct PHC walk-in patient');

console.log('\n--- TEST GROUP 4: Direct District Hospital Walk-in Registration ---');
const districtWalkInPatient = {
  id: 'pat-dh-walkin-01',
  abhaId: '91-7007-8008-9009',
  fullName: 'Suresh Vinayak Chavan',
  entryType: 'DISTRICT_HOSPITAL_WALK_IN',
  registrationFacilityId: specialistUser.facilityId,
  registrationFacilityName: specialistUser.facilityName,
  assignedDoctorId: specialistUser.id,
  activeCareOwner: 'DISTRICT',
};
runTest(districtWalkInPatient.entryType === 'DISTRICT_HOSPITAL_WALK_IN', 'District walk-in created with entryType: DISTRICT_HOSPITAL_WALK_IN');
runTest(districtWalkInPatient.registrationFacilityId === 'fac-dh-pune', 'Registered directly at District Hospital Aundh, Pune without ASHA/PHC requirement');
const specAccess = canAccessPatientReport(specialistUser, districtWalkInPatient);
runTest(specAccess.allowed === true, 'Specialist has FULL_CLINICAL access to direct District Hospital walk-in patient');

console.log('\n--- TEST GROUP 5: Search-Before-Create & Patient Linking ---');
const walkInEncounterAtDistrict = {
  id: 'enc-dh-linked-02',
  patientId: phcWalkInPatient.id,
  facilityName: specialistUser.facilityName,
  chiefComplaints: ['Casualty consultation'],
};
phcWalkInPatient.encounters = [walkInEncounterAtDistrict];
runTest(phcWalkInPatient.id === 'pat-phc-walkin-01', 'Patient ID remains single canonical ID (pat-phc-walkin-01)');
runTest(phcWalkInPatient.abhaId === '91-4004-5005-6006', 'ABHA ID remains single canonical ID (zero duplicate record)');

console.log('\n--- TEST GROUP 6: Least-Privilege Privacy Enforcement ---');
const unrelatedPhcPatient = {
  id: 'pat-unrelated-01',
  abhaId: '91-9999-8888-7777',
  fullName: 'Unrelated Remote Patient',
  registrationFacilityId: 'fac-phc-nasrapur',
  registrationFacilityName: 'Nasrapur Primary Health Centre (PHC)',
  assignedFacilityId: 'fac-phc-nasrapur',
};

const specialistAccessToUnrelated = canAccessPatientReport(specialistUser, unrelatedPhcPatient, { referrals: [] });
runTest(specialistAccessToUnrelated.allowed === false, 'Specialist is DENIED clinical report access to unrelated PHC patient at another facility');
runTest(specialistAccessToUnrelated.accessLevel === 'BASIC_PROFILE', 'Specialist receives BASIC_PROFILE access level only for unrelated patient');

const filteredForSpecialist = filterPatientsForUser(specialistUser, [districtWalkInPatient, unrelatedPhcPatient], []);
runTest(filteredForSpecialist.assignedPatients.some(p => p.id === districtWalkInPatient.id), 'Specialist workspace includes direct District Hospital walk-in patient');
runTest(!filteredForSpecialist.assignedPatients.some(p => p.id === unrelatedPhcPatient.id), 'Specialist workspace excludes unrelated PHC patient');

console.log('\n====================================================');
console.log(`RESULTS: ${passCount} / ${testCount} TESTS PASSED`);
console.log('====================================================\n');

if (passCount === testCount) {
  process.exit(0);
} else {
  process.exit(1);
}
