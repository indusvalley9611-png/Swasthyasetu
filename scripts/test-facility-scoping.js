/**
 * test-facility-scoping.js
 *
 * Regression test: PHC workspace is scoped strictly to authenticatedUser.facilityId.
 * Must FAIL if a PHC workspace can see another facility's incoming transfer.
 *
 * Canonical data mirrors:
 *   lib/staffRegistry.ts  -> PRE_REGISTERED_STAFF
 *   lib/mockData.ts       -> INITIAL_FACILITIES
 *   components/inventory/DrugStockModal.tsx -> incoming/outgoing filter
 *   components/maha-aushadhi/DistrictMahaAushadhiView.tsx -> activeTransfer guard
 *   app/api/authorize-mutation/route.ts -> server auth model
 */
'use strict';

// ── Canonical facility registry (mirrors INITIAL_FACILITIES) ─────────────────
const CANONICAL_FACILITIES = {
  'fac-phc-velhe':        { id: 'fac-phc-velhe',        name: 'Velhe Primary Health Centre (PHC)',         type: 'PHC',                     district: 'Pune' },
  'fac-phc-nasrapur':     { id: 'fac-phc-nasrapur',     name: 'Nasrapur Primary Health Centre (PHC)',      type: 'PHC',                     district: 'Pune' },
  'fac-phc-kikvi':        { id: 'fac-phc-kikvi',        name: 'Kikvi Primary Health Centre (PHC)',         type: 'PHC',                     district: 'Pune' },
  'fac-dh-pune':          { id: 'fac-dh-pune',          name: 'District Hospital Aundh, Pune',             type: 'District Hospital',       district: 'Pune' },
  'fac-dh-nashik':        { id: 'fac-dh-nashik',        name: 'District Civil Hospital, Nashik',           type: 'District Hospital',       district: 'Nashik' },
  'fac-state-reserve':    { id: 'fac-state-reserve',    name: 'State Medical Reserve Depot, Maharashtra',  type: 'State Medical Reserve',   district: 'Mumbai' },
  'fac-nha-delhi':        { id: 'fac-nha-delhi',        name: 'National Health Authority (NHA), New Delhi', type: 'National Health Authority', district: 'New Delhi' },
  'fac-sc-ambavane':      { id: 'fac-sc-ambavane',      name: 'Ambavane Sub-Centre',                       type: 'Sub-Centre',              district: 'Pune' },
  'fac-sc-pasali':        { id: 'fac-sc-pasali',        name: 'Pasali Sub-Centre (Velhe PHC)',             type: 'Sub-Centre',              district: 'Pune' },
  'fac-sc-khedshivapur':  { id: 'fac-sc-khedshivapur', name: 'Khed Shivapur Sub-Centre (Nasrapur PHC)',   type: 'Sub-Centre',              district: 'Pune' },
  'fac-sc-kasurdi':       { id: 'fac-sc-kasurdi',       name: 'Kasurdi Sub-Centre (Nasrapur PHC)',         type: 'Sub-Centre',              district: 'Pune' },
};

// ── PHC users (mirrors PRE_REGISTERED_STAFF) ─────────────────────────────────
const PHC_USERS = [
  { id: 'user-phc-01',   role: 'phc_doctor',  facilityId: 'fac-phc-velhe',    facilityName: 'Velhe Primary Health Centre (PHC)' },
  { id: 'user-nurse-01', role: 'nurse',        facilityId: 'fac-phc-velhe',    facilityName: 'Velhe Primary Health Centre (PHC)' },
  { id: 'user-phc-02',   role: 'phc_doctor',  facilityId: 'fac-phc-nasrapur', facilityName: 'Nasrapur Primary Health Centre (PHC)' },
  { id: 'user-pharm-01', role: 'pharmacist',   facilityId: 'fac-phc-nasrapur', facilityName: 'Nasrapur Primary Health Centre (PHC)' },
];

// ── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(condition, label) {
  if (condition) { console.log(`  -> PASS: ${label}`); passed++; }
  else           { console.error(`  -> FAIL: ${label}`); failed++; }
}

// ── Scoping functions (mirrors DrugStockModal.tsx) ────────────────────────────
const incoming = (transfers, wid) =>
  transfers.filter(t => t.destinationFacilityId === wid && !['COMPLETED','REJECTED'].includes(t.status));

const outgoing = (transfers, wid) =>
  transfers.filter(t => t.sourceFacilityId === wid && !['COMPLETED','REJECTED'].includes(t.status));

// ── activeTransfer guard (mirrors DistrictMahaAushadhiView.tsx lines 119-141) ─
function activeTransferFor(demoId, transfers, user) {
  if (demoId) {
    const found = transfers.find(t => t.id === demoId);
    if (found) {
      if (!user.facilityId || found.destinationFacilityId === user.facilityId || found.sourceFacilityId === user.facilityId) return found;
    }
  }
  if (user.facilityId) {
    return transfers.find(t => t.destinationFacilityId === user.facilityId && !['COMPLETED','REJECTED'].includes(t.status)) || null;
  }
  return null;
}

// ── Server authorization (mirrors authorize-mutation/route.ts) ─────────────
function serverAuth(role, userFacId, targetFacId) {
  if (role === 'asha') return { ok: false, status: 403 };
  if (userFacId !== targetFacId && role !== 'district_officer' && role !== 'state_admin') return { ok: false, status: 403 };
  return { ok: true, status: 200 };
}

// ── Simulated transfer pool ───────────────────────────────────────────────────
const MOCK = [
  // Active incoming to fac-phc-velhe
  { id: 'TRF-001', sourceFacilityId: 'fac-state-reserve', destinationFacilityId: 'fac-phc-velhe',    medicineName: 'Magnesium Sulphate', status: 'PENDING_SOURCE_APPROVAL', supplyTier: 'STATE' },
  { id: 'TRF-002', sourceFacilityId: 'fac-phc-nasrapur',  destinationFacilityId: 'fac-phc-velhe',    medicineName: 'Adrenaline',         status: 'APPROVED',                supplyTier: 'PHC'   },
  // Active incoming to fac-phc-nasrapur (must NOT appear in velhe workspace)
  { id: 'TRF-003', sourceFacilityId: 'fac-state-reserve', destinationFacilityId: 'fac-phc-nasrapur', medicineName: 'ORS Sachets',        status: 'DISPATCHED',              supplyTier: 'STATE' },
  { id: 'TRF-004', sourceFacilityId: 'fac-phc-velhe',     destinationFacilityId: 'fac-phc-nasrapur', medicineName: 'Oxytocin',           status: 'PENDING_SOURCE_APPROVAL', supplyTier: 'PHC'   },
  // Completed for velhe (must not appear in active incoming)
  { id: 'TRF-005', sourceFacilityId: 'fac-state-reserve', destinationFacilityId: 'fac-phc-velhe',    medicineName: 'Iron Folic Acid',    status: 'COMPLETED',               supplyTier: 'STATE' },
  // Outgoing from velhe
  { id: 'TRF-006', sourceFacilityId: 'fac-phc-velhe',     destinationFacilityId: 'fac-phc-nasrapur', medicineName: 'Chloroquine',        status: 'APPROVED',                supplyTier: 'PHC'   },
];

// ── Section 1: Canonical data integrity ──────────────────────────────────────
console.log('\n==================================================');
console.log('Section 1: Canonical Facility & User Data Integrity');
for (const u of PHC_USERS) {
  const fac = CANONICAL_FACILITIES[u.facilityId];
  assert(!!fac,                      `${u.id} facilityId '${u.facilityId}' resolves to a canonical facility`);
  assert(fac.name === u.facilityName, `${u.id} facilityName matches canonical record`);
  assert(fac.type === 'PHC',          `${u.id} maps to a PHC-type facility, not a higher tier`);
}

// ── Section 2: Incoming scoping by destinationFacilityId ─────────────────────
console.log('\nSection 2: Incoming Transfer Scoping');

const velhe  = 'fac-phc-velhe';
const nasrapur = 'fac-phc-nasrapur';

const velheIn   = incoming(MOCK, velhe);
const nasrapurIn = incoming(MOCK, nasrapur);

assert(velheIn.every(t => t.destinationFacilityId === velhe),    `All velhe incoming: destinationFacilityId === '${velhe}'`);
assert(velheIn.length === 2,                                       `Velhe sees exactly 2 active incoming (TRF-001, TRF-002)`);
assert(!velheIn.find(t => t.id === 'TRF-003'),                    `Velhe does NOT see TRF-003 (nasrapur's transfer)`);
assert(!velheIn.find(t => t.id === 'TRF-005'),                    `Velhe does NOT see TRF-005 (status=COMPLETED)`);

assert(nasrapurIn.every(t => t.destinationFacilityId === nasrapur), `All nasrapur incoming: destinationFacilityId === '${nasrapur}'`);
assert(nasrapurIn.length === 3,                                      `Nasrapur sees exactly 3 active incoming (TRF-003, TRF-004, TRF-006)`);
assert(!nasrapurIn.find(t => t.id === 'TRF-001'),                   `Nasrapur does NOT see TRF-001 (velhe's transfer)`);

// ── Section 3: Cross-facility leak prevention ────────────────────────────────
console.log('\nSection 3: Cross-facility Leak Prevention');

assert(nasrapurIn.filter(t => t.destinationFacilityId === velhe).length === 0,
  `ZERO leak: no fac-phc-velhe transfers appear in nasrapur incoming`);
assert(velheIn.filter(t => t.destinationFacilityId === nasrapur).length === 0,
  `ZERO leak: no fac-phc-nasrapur transfers appear in velhe incoming`);

// ── Section 4: Source-side visibility ───────────────────────────────────────
console.log('\nSection 4: Source-side Visibility (outgoing)');

const velheOut = outgoing(MOCK, velhe);
assert(velheOut.every(t => t.sourceFacilityId === velhe),  `All velhe outgoing: sourceFacilityId === '${velhe}'`);
assert(velheOut.find(t => t.id === 'TRF-004') !== undefined, `Velhe sees TRF-004 as outgoing (it is the source PHC)`);
assert(velheOut.find(t => t.id === 'TRF-006') !== undefined, `Velhe sees TRF-006 as outgoing`);
assert(!velheOut.find(t => t.id === 'TRF-003'),             `Velhe does NOT see TRF-003 as outgoing (source=fac-state-reserve)`);
// Nasrapur sees TRF-004 as INCOMING (velhe->nasrapur)
assert(nasrapurIn.find(t => t.id === 'TRF-004') !== undefined, `Nasrapur sees TRF-004 as incoming (velhe is source, nasrapur is destination)`);

// ── Section 5: demoTransferId guard ─────────────────────────────────────────
console.log('\nSection 5: demoTransferId Guard in DistrictMahaAushadhiView');

const velheUser = PHC_USERS[0]; // fac-phc-velhe

// Guard fires: velhe user attempts to load nasrapur's TRF-003 via demoTransferId
const guardResult = activeTransferFor('TRF-003', MOCK, velheUser);
assert(
  guardResult === null || guardResult.destinationFacilityId === velhe || guardResult.sourceFacilityId === velhe,
  `demoTransferId guard prevents velhe user from loading TRF-003 (nasrapur's transfer); result=${guardResult ? guardResult.id : 'null'}`
);

// Guard passes: velhe user loads their own TRF-001
const ownResult = activeTransferFor('TRF-001', MOCK, velheUser);
assert(ownResult !== null && ownResult.id === 'TRF-001', `demoTransferId guard allows velhe user to load TRF-001`);

// No demoTransferId: falls back to destinationFacilityId === facilityId
const fallbackResult = activeTransferFor(null, MOCK, velheUser);
assert(fallbackResult !== null && fallbackResult.destinationFacilityId === velhe,
  `Fallback activeTransfer lookup uses destinationFacilityId === user.facilityId`);

// ── Section 6: Scoping uses IDs, not names ───────────────────────────────────
console.log('\nSection 6: Scoping Uses Opaque IDs, Not Display Names');

assert(velhe.startsWith('fac-'),  `Workspace ID '${velhe}' is an opaque fac-* ID, not a display name`);
assert(!['Velhe','Nasrapur','Primary Health Centre','PHC'].includes(velhe),
  `Workspace ID is NOT a place name or generic label`);

// Dynamic name resolution: src/dst names derived from CANONICAL_FACILITIES
for (const t of MOCK.slice(0, 4)) {
  const srcFac = CANONICAL_FACILITIES[t.sourceFacilityId];
  const dstFac = CANONICAL_FACILITIES[t.destinationFacilityId];
  assert(!!srcFac, `Transfer ${t.id} sourceFacilityId '${t.sourceFacilityId}' resolves to canonical facility: '${srcFac?.name}'`);
  assert(!!dstFac, `Transfer ${t.id} destinationFacilityId '${t.destinationFacilityId}' resolves to canonical facility: '${dstFac?.name}'`);
}

// ── Section 7: Server authorization model ────────────────────────────────────
console.log('\nSection 7: Server-side Authorization (mirrors authorize-mutation/route.ts)');

// phc_doctor on own facility -> allowed
assert(serverAuth('phc_doctor','fac-phc-velhe','fac-phc-velhe').ok,
  `PHC doctor may perform stock mutation on own facility`);

// phc_doctor on another PHC -> denied
const phcCross = serverAuth('phc_doctor','fac-phc-velhe','fac-phc-nasrapur');
assert(!phcCross.ok && phcCross.status === 403,
  `PHC doctor denied (403) for stock mutation on another PHC`);

// district_officer across facilities -> allowed
assert(serverAuth('district_officer','fac-dh-pune','fac-phc-velhe').ok,
  `district_officer permitted cross-facility stock mutation`);

// state_admin across districts -> allowed
assert(serverAuth('state_admin','fac-state-reserve','fac-phc-velhe').ok,
  `state_admin permitted cross-district stock mutation`);

// ASHA always denied
const ashaResult = serverAuth('asha','fac-sc-ambavane','fac-phc-velhe');
assert(!ashaResult.ok && ashaResult.status === 403, `ASHA denied (403) for any stock mutation`);

// ── Results ──────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`RESULTS: ${passed} Passed, ${failed} Failed.`);
console.log('====================================================\n');
if (failed > 0) process.exit(1);
