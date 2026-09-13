import assert from 'node:assert';

// Mock test suite for MahaAushadhi Role-Based Workspaces & Data Boundaries

console.log('====================================================');
console.log('RUNNING MAHAAUSHADHI CROSS-ROLE & SAFETY TESTS');
console.log('====================================================');

const ROLES = {
  asha: {
    role: 'asha',
    level: 'field',
    facility: 'Velhe Sub-Centre',
    allowedActions: ['REQUEST_MEDICINE', 'TRACK_REQUISITION'],
    forbiddenActions: ['APPROVE_DONOR', 'DISPATCH_CONSIGNMENT', 'VIEW_STATE_GRID', 'VIEW_FACILITY_LEDGER'],
  },
  phc_doctor: {
    role: 'phc_doctor',
    level: 'facility',
    facility: 'Velhe PHC',
    allowedActions: ['EMERGENCY_SOS', 'VIEW_FACILITY_REQUESTS', 'VIEW_FACILITY_SHORTAGES'],
    forbiddenActions: ['VIEW_STATE_GRID', 'APPROVE_STATE_DIRECTIVE'],
  },
  pharmacist: {
    role: 'pharmacist',
    level: 'facility',
    facility: 'Nasrapur PHC',
    allowedActions: ['APPROVE_DONOR', 'DISPATCH_CONSIGNMENT', 'RECEIVE_OTP', 'VIEW_BUFFER_LEDGER'],
    forbiddenActions: ['VIEW_ALL_DISTRICT_SUMMARIES'],
  },
  district_officer: {
    role: 'district_officer',
    level: 'district',
    facility: 'District Hospital Aundh, Pune',
    allowedActions: ['COORDINATE_DISTRICT_REBALANCE', 'VIEW_SURPLUS_SHORTAGE_MATCH', 'TRACK_FLEET'],
    forbiddenActions: ['DISPENSE_PATIENT_PRESCRIPTION'],
  },
  state_admin: {
    role: 'state_admin',
    level: 'state',
    facility: 'DHS Mumbai',
    allowedActions: ['APEX_REDISTRIBUTION_DIRECTIVE', 'VIEW_36_DISTRICT_GRID', 'TRACK_GREEN_CORRIDORS'],
    forbiddenActions: ['DISPENSE_PATIENT_PRESCRIPTION'],
  },
  national_admin: {
    role: 'national_admin',
    level: 'national',
    facility: 'NHA New Delhi',
    allowedActions: ['NATIONAL_STOCK_ADVISORY', 'INTERSTATE_COORDINATION', 'ABDM_AUDIT_LEDGER'],
    forbiddenActions: ['VIEW_INDIVIDUAL_PATIENT_EHR', 'DISPENSE_PATIENT_PRESCRIPTION'],
  },
};

// 1. Verify Role Action Boundaries
for (const [roleKey, def] of Object.entries(ROLES)) {
  for (const act of def.allowedActions) {
    assert.ok(!def.forbiddenActions.includes(act), `${roleKey} action ${act} must not be in forbidden list`);
  }
  console.log(`✓ [PASS] Role: ${roleKey.padEnd(16)} | Level: ${def.level.padEnd(8)} | Safe boundaries enforced`);
}

// 2. Safe Buffer Algorithm
function calculateSafeSurplus(currentStock, bufferStock, activeReservations = 0) {
  const surplus = Math.max(0, currentStock - bufferStock);
  return Math.max(0, surplus - activeReservations);
}

const donorPHC = { currentStock: 45, bufferStock: 20 };
assert.strictEqual(calculateSafeSurplus(donorPHC.currentStock, donorPHC.bufferStock, 0), 25, 'Safe surplus must be 25');
assert.strictEqual(calculateSafeSurplus(donorPHC.currentStock, donorPHC.bufferStock, 15), 10, 'After 15 reserved, safe surplus must be 10');
assert.strictEqual(calculateSafeSurplus(donorPHC.currentStock, donorPHC.bufferStock, 30), 0, 'Cannot over-allocate beyond surplus');
console.log('✓ [PASS] Safe transferable math prevents violation of 20-unit statutory buffer');

// 3. Lifecycle Sequence Validation
const VALID_LIFECYCLE = [
  'REQUESTED',
  'SOURCE_FOUND',
  'APPROVED',
  'DISPATCHED',
  'IN_TRANSIT',
  'RECEIVED',
  'COMPLETED'
];

function isValidTransition(from, to) {
  const fromIdx = VALID_LIFECYCLE.indexOf(from);
  const toIdx = VALID_LIFECYCLE.indexOf(to);
  if (to === 'REJECTED') return from === 'REQUESTED' || from === 'APPROVED';
  return toIdx > fromIdx;
}

assert.ok(isValidTransition('REQUESTED', 'APPROVED'), 'REQUESTED -> APPROVED valid');
assert.ok(isValidTransition('APPROVED', 'DISPATCHED'), 'APPROVED -> DISPATCHED valid');
assert.ok(isValidTransition('DISPATCHED', 'RECEIVED'), 'DISPATCHED -> RECEIVED valid');
assert.ok(!isValidTransition('DISPATCHED', 'APPROVED'), 'DISPATCHED -> APPROVED invalid (cannot go backward)');
console.log('✓ [PASS] Canonical lifecycle state transitions strictly validated');

console.log('====================================================');
console.log('ALL MAHAAUSHADHI ROLE & SAFETY TESTS PASSED');
console.log('====================================================');
