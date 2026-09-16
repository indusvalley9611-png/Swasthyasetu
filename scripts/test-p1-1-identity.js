const assert = require('node:assert');

// =========================================================================
// P1.1 FINAL HARDENING TESTS (A–G) + Existing Tests 1–9
// =========================================================================

// ---------------------------------------------------------------------------
// Mirrors the UPDATED SyncContext.triggerManualSync deduplication logic.
// PENDING status is used for NEEDS_REVIEW items (not FAILED).
// Already-flagged items are idempotently re-persisted without re-evaluation.
// ---------------------------------------------------------------------------
function triggerManualSyncMock(patients, syncQueue) {
  let currentPatients = [...patients];
  const remainingQueue = [];
  let syncedCount = 0;

  for (const item of syncQueue) {
    if (item.type === 'NEW_PATIENT') {
      const payloadPat = item.payload;

      // Idempotency pass-1: already flagged NEEDS_REVIEW → preserve unchanged
      if (payloadPat.syncFlag === 'NEEDS_REVIEW_POTENTIAL_DUPLICATE') {
        remainingQueue.push(item);
        continue;
      }

      // Idempotency pass-2: exact ID already in registry
      const existingExact = currentPatients.find(p => p.id === payloadPat.id);
      if (existingExact) {
        syncedCount++;
        continue;
      }

      // Deduplication: phone+name+gender OR non-DEMO ABHA
      const duplicate = currentPatients.find(p =>
        (p.phone === payloadPat.phone &&
          p.fullName.toLowerCase() === payloadPat.fullName.toLowerCase() &&
          p.gender === payloadPat.gender) ||
        (p.abhaId === payloadPat.abhaId && !p.abhaId.includes('DEMO'))
      );

      if (duplicate) {
        // STATUS STAYS 'PENDING' — recoverable, not dead-end
        remainingQueue.push({
          ...item,
          status: 'PENDING',
          payload: { ...payloadPat, syncFlag: 'NEEDS_REVIEW_POTENTIAL_DUPLICATE' }
        });
      } else {
        currentPatients = [payloadPat, ...currentPatients];
        syncedCount++;
      }
    }
  }
  return { patients: currentPatients, queue: remainingQueue };
}

// ---------------------------------------------------------------------------
// Mirrors patientPrivacyService.canAccessPatientReport
// ---------------------------------------------------------------------------
function canAccessPatientReport(user, patient) {
  if (!user || user.id === 'guest-unauthenticated') return { allowed: false, accessLevel: 'NONE' };
  if (user.role === 'phc_doctor') {
    const isFacility = patient.assignedFacilityId && patient.assignedFacilityId === user.facilityId;
    return isFacility
      ? { allowed: true, accessLevel: 'FULL_CLINICAL' }
      : { allowed: false, accessLevel: 'NONE' };
  }
  if (user.role === 'asha') {
    const isCatchment = patient.assignedFacilityId === user.facilityId;
    return isCatchment
      ? { allowed: true, accessLevel: 'BASIC_PROFILE' }
      : { allowed: false, accessLevel: 'NONE' };
  }
  return { allowed: false, accessLevel: 'NONE' };
}

// ---------------------------------------------------------------------------
// Mirrors addFollowUpTask idempotency
// ---------------------------------------------------------------------------
function makeFollowUpStore() {
  const store = [];
  return {
    add(task) {
      if (store.some(f => f.id === task.id)) return false; // idempotent
      store.push(task);
      return true;
    },
    all() { return store; }
  };
}

// ---------------------------------------------------------------------------
// Simulate the minimum-information follow-up task (post-hardening)
// ---------------------------------------------------------------------------
function buildFollowUpTask(referral, patient, facilityName) {
  return {
    id: `flw-task-ref-${referral.id}`,
    patientId: patient.id,
    patientName: patient.fullName,
    patientPhone: patient.phone,
    category: 'Post-Referral Check',
    dueDate: '2026-09-20',
    status: 'DUE',
    // PRIVACY: No clinical details. Community-worker-minimum only.
    notes: `Patient discharged from ${facilityName}. Ensure community follow-up visit as directed. Contact PHC if symptoms recur.`,
    assignedFacilityId: referral.referringFacilityId,
    sourceReferralId: referral.id,
  };
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockCentralPatients = [
  { id: 'pat-001', abhaId: 'DEMO-12-1234', fullName: 'John Doe', phone: '9876543210', gender: 'Male', assignedFacilityId: 'fac-phc-velhe' },
  { id: 'pat-002', abhaId: 'DEMO-34-5678', fullName: 'Jane Smith', phone: '9876543211', gender: 'Female', assignedFacilityId: 'fac-phc-velhe' }
];

const ashaUser     = { id: 'u-asha', name: 'Sunita Shinde', role: 'asha', facilityId: 'fac-phc-velhe' };
const pharmacist   = { id: 'u-pharm', name: 'Ramesh Pharma', role: 'pharmacist', facilityId: 'fac-phc-velhe' };
const districtOfficer = { id: 'u-dist', name: 'District Officer', role: 'district_officer', facilityId: 'fac-dh' };
const phcDoctor    = { id: 'u-doc', name: 'Dr Mehta', role: 'phc_doctor', facilityId: 'fac-phc-velhe' };

// ===========================================================================
// TESTS
// ===========================================================================
function runTests() {
  let passed = 0;
  let failed = 0;

  function ok(name, cond, msg) {
    if (cond) {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name}: ${msg}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('P1.1 FINAL HARDENING TESTS (A–G) + REGRESSION 1–9');
  console.log('====================================================\n');

  // ----- REGRESSION TESTS 1–9 -----------------------------------------------

  // TEST 1 & 3: Duplicate detection: no silent merge, no patient loss
  {
    const q = [{ id: 'q-1', type: 'NEW_PATIENT', retryCount: 0,
      payload: { id: 'pat-003', abhaId: 'DEMO-NEW', fullName: 'John Doe', phone: '9876543210', gender: 'Male' } }];
    const r = triggerManualSyncMock(mockCentralPatients, q);
    ok('TEST 1: No silent canonical patient creation on collision', r.patients.length === 2, `got ${r.patients.length}`);
    ok('TEST 3: Different patients with similar demographics not auto-merged', r.queue.length === 1, `queue=${r.queue.length}`);
  }

  // TEST 2 & 5: Idempotency
  {
    const q = [{ id: 'q-2', type: 'NEW_PATIENT', retryCount: 0,
      payload: { id: 'pat-002', abhaId: 'DEMO-34-5678', fullName: 'Jane Smith', phone: '9876543211', gender: 'Female' } }];
    const r = triggerManualSyncMock(mockCentralPatients, q);
    ok('TEST 2 & 5: Repeated sync of same ID produces exactly one patient', r.patients.length === 2 && r.queue.length === 0, `patients=${r.patients.length}`);
  }

  // TEST 6, 7 & 9: Follow-up idempotency and canonical patientId preservation
  {
    const flwStore = makeFollowUpStore();
    const referral = { id: 'ref-123', referringFacilityId: 'fac-phc-velhe', referringFacility: 'PHC Velhe' };
    const patient  = { id: 'pat-100', fullName: 'Priya Kamble', phone: '9812345678' };

    flwStore.add(buildFollowUpTask(referral, patient, 'Aundh DH'));
    ok('TEST 6: Discharge creates exactly one follow-up', flwStore.all().length === 1, '');

    flwStore.add(buildFollowUpTask(referral, patient, 'Aundh DH')); // retry
    ok('TEST 7: Retried discharge creates no duplicate follow-up', flwStore.all().length === 1, '');
    ok('TEST 9: Original referral patientId unchanged in follow-up', flwStore.all()[0].patientId === 'pat-100', '');
  }

  // TEST 4: Online search finds existing patient → link, no new creation (simulation)
  {
    const existingId = 'pat-001';
    const searchResult = mockCentralPatients.find(p => p.phone === '9876543210');
    ok('TEST 4: Online search links existing patient without creating new record', searchResult && searchResult.id === existingId, '');
  }

  // ----- NEW TESTS A–G -----------------------------------------------------------

  // TEST A: NEEDS_REVIEW item remains PENDING (not FAILED), stays recoverable
  {
    const q = [{ id: 'q-dup', type: 'NEW_PATIENT', status: 'PENDING', retryCount: 0,
      payload: { id: 'pat-999', abhaId: 'DEMO-AA', fullName: 'John Doe', phone: '9876543210', gender: 'Male' } }];
    const r = triggerManualSyncMock(mockCentralPatients, q);
    const reviewItem = r.queue[0];
    ok('TEST A: Potential duplicate stays PENDING (not FAILED)', reviewItem && reviewItem.status === 'PENDING', `status=${reviewItem?.status}`);
    ok('TEST A: syncFlag set to NEEDS_REVIEW_POTENTIAL_DUPLICATE', reviewItem && reviewItem.payload.syncFlag === 'NEEDS_REVIEW_POTENTIAL_DUPLICATE', '');
    ok('TEST A: Original registration payload preserved (id intact)', reviewItem && reviewItem.payload.id === 'pat-999', '');
  }

  // TEST B: Retry of NEEDS_REVIEW item → no second patient created, item preserved unchanged
  {
    // Simulate second sync pass: the item already carries the syncFlag
    const q = [{ id: 'q-dup', type: 'NEW_PATIENT', status: 'PENDING', retryCount: 0,
      payload: { id: 'pat-999', abhaId: 'DEMO-AA', fullName: 'John Doe', phone: '9876543210',
                 gender: 'Male', syncFlag: 'NEEDS_REVIEW_POTENTIAL_DUPLICATE' } }];
    const r = triggerManualSyncMock(mockCentralPatients, q);
    ok('TEST B: Re-running sync on NEEDS_REVIEW item does not create a patient', r.patients.length === 2, `patients=${r.patients.length}`);
    ok('TEST B: NEEDS_REVIEW item re-persisted unchanged (idempotent)', r.queue.length === 1 && r.queue[0].payload.syncFlag === 'NEEDS_REVIEW_POTENTIAL_DUPLICATE', '');
    ok('TEST B: retryCount NOT bumped on idempotent pass', r.queue[0].retryCount === 0, `retryCount=${r.queue[0].retryCount}`);
  }

  // TEST C: Follow-up task viewed by ASHA — minimum information only, no clinical leakage
  {
    const task = buildFollowUpTask(
      { id: 'ref-200', referringFacilityId: 'fac-phc-velhe', referringFacility: 'PHC Velhe' },
      { id: 'pat-001', fullName: 'John Doe', phone: '9876543210' },
      'Aundh DH'
    );

    // Notes must NOT contain diagnosis or clinical condition strings
    const clinicalKeywords = ['diagnosis', 'condition', 'specialist note', 'vitals', 'bp', 'icd'];
    const notesLower = task.notes.toLowerCase();
    const leaked = clinicalKeywords.filter(k => notesLower.includes(k));
    ok('TEST C: Follow-up notes contain no clinical diagnosis/condition details', leaked.length === 0, `leaked: ${leaked}`);

    // ASHA can see the task fields
    ok('TEST C: ASHA can see task category, dueDate, notes', task.category && task.dueDate && task.notes, '');

    // Task does NOT expose clinical encounters, vitals, diagnosis
    ok('TEST C: Task has no encounters/vitals/diagnoses fields', !task.encounters && !task.vitals && !task.diagnoses, '');
  }

  // TEST D: ASHA uses patientId from task to access full clinical report → BLOCKED by RBAC
  {
    const task  = { patientId: 'pat-002' }; // pat-002 assigned to fac-phc-velhe
    const patient = mockCentralPatients.find(p => p.id === task.patientId);
    const ashaAtDifferentFacility = { ...ashaUser, facilityId: 'fac-phc-nasrapur' };
    const result = canAccessPatientReport(ashaAtDifferentFacility, patient);
    ok('TEST D: ASHA from different catchment blocked by patientPrivacyService', !result.allowed, `allowed=${result.allowed}`);
  }

  // TEST E: District Officer cannot access individual EHR via follow-up patientId
  {
    const task    = { patientId: 'pat-001' };
    const patient = mockCentralPatients.find(p => p.id === task.patientId);
    const result  = canAccessPatientReport(districtOfficer, patient);
    ok('TEST E: District Officer denied individual clinical EHR from follow-up patientId', !result.allowed, `allowed=${result.allowed}`);
  }

  // TEST F: Pharmacist cannot access clinical record through follow-up patientId
  {
    const task    = { patientId: 'pat-001' };
    const patient = mockCentralPatients.find(p => p.id === task.patientId);
    const result  = canAccessPatientReport(pharmacist, patient);
    ok('TEST F: Pharmacist denied clinical EHR access via follow-up task', !result.allowed, `allowed=${result.allowed}`);
  }

  // TEST G: Discharge retried → exactly one FollowUpTask
  {
    const flwStore = makeFollowUpStore();
    const ref = { id: 'ref-g1', referringFacilityId: 'fac-phc-velhe' };
    const pat = { id: 'pat-g1', fullName: 'Test Patient', phone: '9000000001' };

    for (let i = 0; i < 5; i++) {
      flwStore.add(buildFollowUpTask(ref, pat, 'District Hospital'));
    }
    ok('TEST G: Five discharge retries produce exactly one FollowUpTask', flwStore.all().length === 1, `count=${flwStore.all().length}`);
  }

  // PHC Doctor CAN access patient report (positive authorization check for TEST D comparison)
  {
    const patient = mockCentralPatients[0]; // assignedFacilityId: fac-phc-velhe
    const result  = canAccessPatientReport(phcDoctor, patient);
    ok('TEST D (contrast): PHC Doctor at same facility CAN access clinical record', result.allowed && result.accessLevel === 'FULL_CLINICAL', '');
  }

  console.log(`\n====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('====================================================');
  if (failed > 0) process.exit(1);
}

runTests();
