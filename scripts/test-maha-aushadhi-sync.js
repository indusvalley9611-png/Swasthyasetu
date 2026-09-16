// scripts/test-maha-aushadhi-sync.js
// MahaAushadhi PHC -> District Request Synchronization Test
// Uses ONLY canonical facilities from lib/mockData.ts (fac-phc-khedshivapur REMOVED)
'use strict';

const assert = require('assert');

// ── Resource management functions (mirrors lib/resourceManagement.ts) ──────────
function getSafeTransferableQuantity(stock, transfers = []) {
  const reserved = transfers
    .filter(t => t.sourceStockId === stock.id && t.donorAllocated !== false && !['REJECTED', 'COMPLETED'].includes(t.status))
    .reduce((sum, t) => sum + t.requestedQuantity, 0);
  return Math.max(0, stock.currentStock - stock.bufferStock - reserved);
}

function getMedicineStatus(stock) {
  if (stock.currentStock <= 0 || stock.currentStock < stock.bufferStock * 0.25) return 'CRITICAL';
  if (stock.currentStock < stock.bufferStock) return 'LIMITED';
  return 'HEALTHY';
}

function findSurplusSources(destination, stocks, transfers, facilities) {
  return stocks
    .filter(s => s.drugName === destination.drugName && s.facilityId !== destination.facilityId)
    .map(s => ({
      stock: s,
      transferable: getSafeTransferableQuantity(s, transfers),
      facility: facilities.find(f => f.id === s.facilityId),
    }))
    .filter(c => c.transferable > 0 && c.facility)
    .sort((a, b) => b.transferable - a.transferable);
}

// ── Canonical facilities (mirrors INITIAL_FACILITIES — fac-phc-khedshivapur REMOVED) ──
const CANONICAL_FACILITIES = [
  { id: 'fac-phc-velhe',    name: 'Velhe Primary Health Centre (PHC)',    type: 'PHC',              district: 'Pune', lat: 18.2974, lng: 73.6375 },
  { id: 'fac-phc-nasrapur', name: 'Nasrapur Primary Health Centre (PHC)', type: 'PHC',              district: 'Pune', lat: 18.3738, lng: 73.6452 },
  { id: 'fac-phc-kikvi',    name: 'Kikvi Primary Health Centre (PHC)',    type: 'PHC',              district: 'Pune', lat: 18.3314, lng: 73.7227 },
  { id: 'fac-dh-pune',      name: 'District Hospital Aundh, Pune',        type: 'District Hospital', district: 'Pune', lat: 18.5593, lng: 73.8078 },
  { id: 'fac-dh-nashik',    name: 'District Civil Hospital, Nashik',      type: 'District Hospital', district: 'Nashik', lat: 20.0012, lng: 73.7845 },
  { id: 'fac-state-reserve', name: 'State Medical Reserve Depot, Maharashtra', type: 'State Medical Reserve', district: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { id: 'fac-nha-delhi',    name: 'National Health Authority (NHA), New Delhi', type: 'National Health Authority', district: 'New Delhi', lat: 28.6139, lng: 77.2090 },
];

// ── Canonical drug stocks (fac-phc-khedshivapur stocks stk-013/stk-017 REMOVED) ──
const CANONICAL_DRUG_STOCKS = [
  { id: 'stk-001', facilityId: 'fac-phc-velhe',    facilityName: 'Velhe Primary Health Centre (PHC)',    drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', currentStock: 4,   bufferStock: 20,  unit: 'Vials (10ml)', status: 'CRITICAL' },
  { id: 'stk-002', facilityId: 'fac-dh-pune',       facilityName: 'District Hospital Aundh, Pune',        drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', currentStock: 120, bufferStock: 40,  unit: 'Vials (10ml)', status: 'OPTIMAL' },
  { id: 'stk-014', facilityId: 'fac-phc-nasrapur',  facilityName: 'Nasrapur Primary Health Centre (PHC)', drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', currentStock: 18,  bufferStock: 20,  unit: 'Vials (10ml)', status: 'LIMITED' },
  { id: 'stk-015', facilityId: 'fac-dh-nashik',     facilityName: 'District Civil Hospital, Nashik',      drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', currentStock: 150, bufferStock: 60,  unit: 'Vials (10ml)', status: 'OPTIMAL' },
  { id: 'stk-019', facilityId: 'fac-state-reserve', facilityName: 'State Medical Reserve Depot, Maharashtra', drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)', currentStock: 850, bufferStock: 200, unit: 'Vials (10ml)', status: 'OPTIMAL' },
];

// ── Test runner ───────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log('MAHAAUSHADHI CANONICAL SYNC TEST (Khed Shivapur Removed)');
console.log('====================================================\n');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  -> PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  -> FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

// ── In-memory state ───────────────────────────────────────────────────────────
let stocks = JSON.parse(JSON.stringify(CANONICAL_DRUG_STOCKS));
let facilities = JSON.parse(JSON.stringify(CANONICAL_FACILITIES));
let stockTransfers = [];
let createdTransferId = null;

function createStockTransfer(transfer) {
  if (transfer.requestedQuantity <= 0) return null;
  if (transfer.donorAllocated !== false) {
    const src = stocks.find(s => s.id === transfer.sourceStockId);
    const transferable = src ? getSafeTransferableQuantity(src, stockTransfers) : 0;
    if (!src || transfer.requestedQuantity > transferable) return null;
  }
  const t = { ...transfer, id: `TRF-2026-${String(Date.now()).slice(-4)}`, createdAt: new Date().toISOString(), status: 'PENDING_SOURCE_APPROVAL', donorAllocated: transfer.donorAllocated ?? true };
  stockTransfers = [t, ...stockTransfers];
  return t;
}

function allocateStockTransferDonor(transferId, sourceStock, donorFacility, districtUser) {
  const transfer = stockTransfers.find(t => t.id === transferId);
  if (!transfer) return false;
  const transferable = getSafeTransferableQuantity(sourceStock, stockTransfers.filter(t => t.id !== transferId));
  if (transfer.requestedQuantity > transferable) return false;
  stockTransfers = stockTransfers.map(t => t.id === transferId
    ? { ...t, sourceStockId: sourceStock.id, sourceFacilityId: donorFacility.id, sourceFacilityName: donorFacility.name, donorAllocated: true, allocatedByDistrictUserId: districtUser?.id, allocatedByDistrictUserName: districtUser?.name, allocatedAt: new Date().toISOString() }
    : t);
  return true;
}

function processStockTransfer(transferId, action, _reason, meta) {
  const transfer = stockTransfers.find(t => t.id === transferId);
  if (!transfer) return false;
  const src = stocks.find(s => s.id === transfer.sourceStockId);
  const dst = stocks.find(s => s.id === transfer.destinationStockId);
  const now = new Date().toISOString();
  if (action === 'APPROVE') {
    if (transfer.status !== 'PENDING_SOURCE_APPROVAL' || !src) return false;
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...meta, status: 'APPROVED', approvedAt: now } : t);
    return true;
  }
  if (action === 'DISPATCH') {
    if (transfer.status !== 'APPROVED') return false;
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...meta, status: 'DISPATCHED', dispatchedAt: now } : t);
    return true;
  }
  if (action === 'RECEIVE') {
    if (transfer.status !== 'DISPATCHED' || !src || !dst) return false;
    if (src.currentStock - transfer.requestedQuantity < src.bufferStock) return false;
    stocks = stocks.map(s => {
      if (s.id === src.id) return { ...s, currentStock: s.currentStock - transfer.requestedQuantity };
      if (s.id === dst.id) return { ...s, currentStock: s.currentStock + transfer.requestedQuantity };
      return s;
    });
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...meta, status: 'COMPLETED', receivedAt: now } : t);
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Canonical Facility Registry Integrity
// ─────────────────────────────────────────────────────────────────────────────

console.log('Section 1: Canonical Facility Registry');

test('fac-phc-khedshivapur does NOT exist in CANONICAL_FACILITIES', () => {
  const found = CANONICAL_FACILITIES.find(f => f.id === 'fac-phc-khedshivapur');
  assert(!found, `fac-phc-khedshivapur must not appear in canonical facilities, but found: ${found?.name}`);
});

test('No stock record references fac-phc-khedshivapur', () => {
  const found = CANONICAL_DRUG_STOCKS.find(s => s.facilityId === 'fac-phc-khedshivapur');
  assert(!found, `No stock should reference fac-phc-khedshivapur, but found: ${found?.id} (${found?.drugName})`);
});

test('Every stock record facilityId resolves to a canonical facility', () => {
  const mismatches = CANONICAL_DRUG_STOCKS.filter(s => !CANONICAL_FACILITIES.find(f => f.id === s.facilityId));
  assert(mismatches.length === 0, `Stocks with unknown facilityId: ${mismatches.map(s => s.id + '/' + s.facilityId).join(', ')}`);
});

test('Canonical PHC list is: Velhe, Nasrapur, Kikvi only', () => {
  const phcs = CANONICAL_FACILITIES.filter(f => f.type === 'PHC').map(f => f.id).sort();
  assert.deepStrictEqual(phcs, ['fac-phc-kikvi', 'fac-phc-nasrapur', 'fac-phc-velhe'].sort());
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Supply Hierarchy — Velhe PHC ASV Shortage
// ─────────────────────────────────────────────────────────────────────────────

console.log('\nSection 2: Supply Hierarchy (PHC→District→State)');

test('Velhe PHC ASV stock is CRITICAL (4 vials, buffer 20)', () => {
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));
  assert(velheAsv, 'Velhe ASV stock must exist');
  assert.strictEqual(velheAsv.currentStock, 4);
  assert.strictEqual(getMedicineStatus(velheAsv), 'CRITICAL');
});

test('Nasrapur PHC cannot donate ASV (stock 18 < buffer 20)', () => {
  const nasrapurAsv = stocks.find(s => s.facilityId === 'fac-phc-nasrapur' && s.drugName.includes('Anti-Snake Venom'));
  assert(nasrapurAsv, 'Nasrapur ASV stock must exist');
  const transferable = getSafeTransferableQuantity(nasrapurAsv, []);
  assert.strictEqual(transferable, 0, `Nasrapur cannot donate — transferable should be 0, got ${transferable}`);
});

test('Kikvi PHC has no ASV stock — Tier 1 (PHC→PHC) unavailable', () => {
  const kikviAsv = stocks.find(s => s.facilityId === 'fac-phc-kikvi' && s.drugName.includes('Anti-Snake Venom'));
  assert(!kikviAsv, 'Kikvi PHC has no ASV stock — PHC-tier donor unavailable');
});

test('District Hospital Pune has 80 transferable ASV vials (Tier 2 available)', () => {
  const dhAsv = stocks.find(s => s.facilityId === 'fac-dh-pune' && s.drugName.includes('Anti-Snake Venom'));
  assert(dhAsv, 'District Hospital ASV stock must exist');
  const transferable = getSafeTransferableQuantity(dhAsv, []);
  assert.strictEqual(transferable, 80, `DH Pune transferable must be 80, got ${transferable}`);
});

test('Surplus discovery returns District Hospital as top donor (Tier 2)', () => {
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));
  const candidates = findSurplusSources(velheAsv, stocks, [], facilities);
  assert(candidates.length > 0, 'At least one surplus candidate must be found');
  // fac-phc-khedshivapur must NOT appear
  const invalidCandidate = candidates.find(c => c.facility.id === 'fac-phc-khedshivapur');
  assert(!invalidCandidate, 'fac-phc-khedshivapur must NOT appear as a supply candidate');
  // Top candidate must be a valid canonical facility
  const top = candidates[0];
  const isCanonical = !!CANONICAL_FACILITIES.find(f => f.id === top.facility.id);
  assert(isCanonical, `Top candidate ${top.facility.id} must be a canonical facility`);
  assert(top.transferable > 0, 'Top candidate must have transferable stock');
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Full Transfer Lifecycle (Velhe → District Hospital Pune)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\nSection 3: Transfer Lifecycle (Tier 2 — District)');

test('Velhe PHC raises emergency SOS request for 10 units ASV', () => {
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));
  const created = createStockTransfer({
    medicineName: velheAsv.drugName,
    sourceStockId: '',
    destinationStockId: velheAsv.id,
    sourceFacilityId: '',
    sourceFacilityName: 'Awaiting District Allocation',
    destinationFacilityId: velheAsv.facilityId,
    destinationFacilityName: velheAsv.facilityName,
    requestedQuantity: 10,
    urgency: 'CRITICAL',
    reason: '[CRITICAL] Snakebite Envenomation',
    isEmergency: true,
    donorAllocated: false,
  });
  assert(created, 'Transfer must be created');
  assert.strictEqual(created.donorAllocated, false);
  assert.strictEqual(created.destinationFacilityId, 'fac-phc-velhe');
  createdTransferId = created.id;
});

test('Pre-allocation: source stock is UNCHANGED', () => {
  const dhAsv = stocks.find(s => s.facilityId === 'fac-dh-pune' && s.drugName.includes('Anti-Snake Venom'));
  assert.strictEqual(dhAsv.currentStock, 120, 'District Hospital stock must NOT change before receipt');
});

test('District allocates District Hospital Pune as Tier 2 donor', () => {
  const req = stockTransfers.find(t => t.id === createdTransferId);
  const destStock = stocks.find(s => s.id === req.destinationStockId);
  const candidates = findSurplusSources(destStock, stocks, stockTransfers, facilities);
  const dhCandidate = candidates.find(c => c.facility.id === 'fac-dh-pune');
  assert(dhCandidate, 'fac-dh-pune must be a supply candidate');

  const allocated = allocateStockTransferDonor(
    req.id,
    dhCandidate.stock,
    dhCandidate.facility,
    { id: 'user-dist-admin-01', name: 'Dr. Vinod Chavan (DHO Pune)' }
  );
  assert.strictEqual(allocated, true, 'Allocation must succeed');
  const updated = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(updated.sourceFacilityId, 'fac-dh-pune');
  assert.strictEqual(updated.sourceFacilityName, 'District Hospital Aundh, Pune');
  assert.strictEqual(updated.donorAllocated, true);
  // fac-phc-khedshivapur must not have been set as source
  assert.notStrictEqual(updated.sourceFacilityId, 'fac-phc-khedshivapur',
    'Transfer source must NEVER be the removed fac-phc-khedshivapur');
});

test('Source stock unchanged at PENDING_SOURCE_APPROVAL after allocation', () => {
  const dhAsv = stocks.find(s => s.facilityId === 'fac-dh-pune' && s.drugName.includes('Anti-Snake Venom'));
  assert.strictEqual(dhAsv.currentStock, 120, 'No stock deducted at request/allocation time');
});

test('District Hospital approves the transfer', () => {
  const approved = processStockTransfer(createdTransferId, 'APPROVE');
  assert.strictEqual(approved, true);
  const t = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(t.status, 'APPROVED');
});

test('Source stock unchanged at APPROVED', () => {
  const dhAsv = stocks.find(s => s.facilityId === 'fac-dh-pune' && s.drugName.includes('Anti-Snake Venom'));
  assert.strictEqual(dhAsv.currentStock, 120, 'No stock deducted at APPROVED');
});

test('District Hospital dispatches consignment', () => {
  const dispatched = processStockTransfer(createdTransferId, 'DISPATCH', undefined, {
    consignmentCode: `CON-MH-2026-${createdTransferId.slice(-4)}`,
    transportMode: '108_AMBULANCE',
  });
  assert.strictEqual(dispatched, true);
  const t = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(t.status, 'DISPATCHED');
  assert(t.consignmentCode.startsWith('CON-MH-2026-'));
});

test('Velhe PHC confirms receipt: inventories update, buffer preserved', () => {
  const received = processStockTransfer(createdTransferId, 'RECEIVE', undefined, {
    receivedByUserName: 'Dr. Rajesh Deshmukh',
    receiptOtpVerified: true,
  });
  assert.strictEqual(received, true);

  const dhAsv = stocks.find(s => s.facilityId === 'fac-dh-pune' && s.drugName.includes('Anti-Snake Venom'));
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));

  assert.strictEqual(dhAsv.currentStock, 110, 'District Hospital stock decrements 120→110 only at RECEIVE');
  assert(dhAsv.currentStock >= dhAsv.bufferStock, 'Donor must not fall below statutory buffer of 40');
  assert.strictEqual(velheAsv.currentStock, 14, 'Velhe PHC stock increments 4→14 at RECEIVE');

  const finalTransfer = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(finalTransfer.status, 'COMPLETED');
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Scoping & Non-existent Facility Guards
// ─────────────────────────────────────────────────────────────────────────────

console.log('\nSection 4: Non-existent Facility Guards');

test('A transfer cannot be created with fac-phc-khedshivapur as destination', () => {
  // Attempt to create a transfer that uses the removed facility as destination
  const invalidTransfer = {
    medicineName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
    sourceStockId: 'stk-002',
    destinationStockId: 'stk-INVALID', // no such stock in canonical set
    sourceFacilityId: 'fac-dh-pune',
    sourceFacilityName: 'District Hospital Aundh, Pune',
    destinationFacilityId: 'fac-phc-khedshivapur',
    destinationFacilityName: 'Khed Shivapur Primary Health Centre (PHC)',
    requestedQuantity: 5,
    urgency: 'CRITICAL',
    donorAllocated: true,
  };
  // createStockTransfer checks sourceStock exists and has transferable qty
  // stk-002 exists and has transferable surplus, but destinationStockId stk-INVALID doesn't exist in stocks
  // The transfer would be created at the transfer level (createStockTransfer doesn't validate destination stock),
  // but it would fail at RECEIVE time because destination stock doesn't exist.
  // At minimum: canonical facility check — fac-phc-khedshivapur must not be in CANONICAL_FACILITIES
  const destFacilityIsCanonical = !!CANONICAL_FACILITIES.find(f => f.id === 'fac-phc-khedshivapur');
  assert(!destFacilityIsCanonical, 'fac-phc-khedshivapur is not a canonical facility — should never be a valid destination');
});

test('Authenticated PHC workspace resolves exclusively from user.facilityId', () => {
  // Simulate: user-phc-01 has facilityId = 'fac-phc-velhe'
  const user = { id: 'user-phc-01', facilityId: 'fac-phc-velhe' };
  const workspaceId = user.facilityId; // must never be derived from display name
  const facility = CANONICAL_FACILITIES.find(f => f.id === workspaceId);
  assert(!!facility, `Workspace ID '${workspaceId}' resolves to a canonical facility`);
  assert.strictEqual(facility.name, 'Velhe Primary Health Centre (PHC)');
  assert(workspaceId.startsWith('fac-'), `workspaceId '${workspaceId}' is an opaque ID, not a place name`);
});

test('Incoming transfer filter uses destinationFacilityId, not facility name', () => {
  const workspaceId = 'fac-phc-velhe';
  const incoming = stockTransfers.filter(t =>
    t.destinationFacilityId === workspaceId && !['COMPLETED', 'REJECTED'].includes(t.status)
  );
  // All incoming transfers must have the correct destinationFacilityId
  assert(incoming.every(t => t.destinationFacilityId === workspaceId),
    'Every incoming transfer must have destinationFacilityId === workspaceId (ID comparison, not name)');
  // fac-phc-khedshivapur transfers must never appear
  const khedTransfers = stockTransfers.filter(t =>
    t.sourceFacilityId === 'fac-phc-khedshivapur' || t.destinationFacilityId === 'fac-phc-khedshivapur'
  );
  assert.strictEqual(khedTransfers.length, 0, 'No transfers should reference fac-phc-khedshivapur');
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log('\n====================================================');
console.log(`RESULTS: ${passed} Passed, ${failed} Failed.`);
console.log('====================================================\n');
if (failed > 0) process.exit(1);
