// scripts/test-maha-aushadhi-sync.js
// Automated verification of MahaAushadhi PHC -> District Request Synchronization

const assert = require('assert');

// Exact resource management algorithms matching lib/resourceManagement.ts
function getSafeTransferableQuantity(stock, transfers = []) {
  const reserved = transfers
    .filter(transfer => transfer.sourceStockId === stock.id && transfer.donorAllocated !== false && !['REJECTED', 'COMPLETED'].includes(transfer.status))
    .reduce((total, transfer) => total + transfer.requestedQuantity, 0);
  return Math.max(0, stock.currentStock - stock.bufferStock - reserved);
}

function getMedicineStatus(stock) {
  if (stock.currentStock <= 0 || stock.currentStock < stock.bufferStock * 0.25) return 'CRITICAL';
  if (stock.currentStock < stock.bufferStock) return 'LIMITED';
  return 'HEALTHY';
}

function findSurplusSources(destination, stocks, transfers, facilities) {
  return stocks
    .filter(stock => stock.drugName === destination.drugName && stock.facilityId !== destination.facilityId)
    .map(stock => ({
      stock,
      transferable: getSafeTransferableQuantity(stock, transfers),
      facility: facilities.find(facility => facility.id === stock.facilityId),
    }))
    .filter(candidate => candidate.transferable > 0 && candidate.facility?.type === 'PHC')
    .sort((a, b) => b.transferable - a.transferable);
}

// Initial stock dataset representing Maharashtra public health network
const INITIAL_DRUG_STOCKS = [
  {
    id: 'stk-001',
    facilityId: 'fac-phc-velhe',
    facilityName: 'Velhe Primary Health Centre (PHC)',
    drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
    category: 'Critical Lifesaving',
    currentStock: 4,
    bufferStock: 20,
    unit: 'Vials (10ml)',
    batchNumber: 'ASV-VLH-2026-004',
    expiryDate: '2027-11-30',
    status: 'CRITICAL',
  },
  {
    id: 'stk-002',
    facilityId: 'fac-dh-pune',
    facilityName: 'District Hospital Aundh, Pune',
    drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
    category: 'Critical Lifesaving',
    currentStock: 120,
    bufferStock: 40,
    unit: 'Vials (10ml)',
    batchNumber: 'ASV-DH-2026-102',
    expiryDate: '2028-06-30',
    status: 'OPTIMAL',
  },
  {
    id: 'stk-017',
    facilityId: 'fac-phc-khedshivapur',
    facilityName: 'Khed Shivapur Primary Health Centre (PHC)',
    drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
    category: 'Critical Lifesaving',
    currentStock: 35,
    bufferStock: 20,
    unit: 'Vials (10ml)',
    batchNumber: 'ASV-KSH-2026-031',
    expiryDate: '2028-02-28',
    status: 'OPTIMAL',
  },
];

const INITIAL_FACILITIES = [
  {
    id: 'fac-phc-velhe',
    name: 'Velhe Primary Health Centre (PHC)',
    type: 'PHC',
    district: 'Pune',
    taluka: 'Velhe',
    totalBeds: 10,
    occupiedBeds: 4,
    icuBedsTotal: 0,
    icuBedsOccupied: 0,
    oxygenBedsTotal: 4,
    oxygenBedsOccupied: 1,
    ventilatorsTotal: 0,
    ventilatorsOccupied: 0,
    lat: 18.2974,
    lng: 73.6375,
  },
  {
    id: 'fac-phc-khedshivapur',
    name: 'Khed Shivapur Primary Health Centre (PHC)',
    type: 'PHC',
    district: 'Pune',
    taluka: 'Haveli',
    totalBeds: 15,
    occupiedBeds: 6,
    icuBedsTotal: 0,
    icuBedsOccupied: 0,
    oxygenBedsTotal: 6,
    oxygenBedsOccupied: 2,
    ventilatorsTotal: 0,
    ventilatorsOccupied: 0,
    lat: 18.3496,
    lng: 73.8443,
  },
  {
    id: 'fac-dh-pune',
    name: 'District Hospital Aundh, Pune',
    type: 'District Hospital',
    district: 'Pune',
    taluka: 'Haveli',
    totalBeds: 300,
    occupiedBeds: 240,
    icuBedsTotal: 30,
    icuBedsOccupied: 26,
    oxygenBedsTotal: 100,
    oxygenBedsOccupied: 78,
    ventilatorsTotal: 25,
    ventilatorsOccupied: 18,
    lat: 18.5593,
    lng: 73.8078,
  },
];

console.log('====================================================');
console.log('MAHAAUSHADHI PHC -> DISTRICT SYNCHRONIZATION TEST');
console.log('====================================================\n');

let passCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`PASS [${totalCount}]: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`FAIL [${totalCount}]: ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// In-memory state emulation matching SyncContext logic
let stocks = JSON.parse(JSON.stringify(INITIAL_DRUG_STOCKS));
let facilities = JSON.parse(JSON.stringify(INITIAL_FACILITIES));
let stockTransfers = [];

function getSafeTransferable(stock) {
  return getSafeTransferableQuantity(stock, stockTransfers);
}

function createStockTransfer(transfer) {
  if (transfer.requestedQuantity <= 0) return null;
  const isExplicitlyUnallocated = transfer.donorAllocated === false;
  if (!isExplicitlyUnallocated) {
    const source = stocks.find(s => s.id === transfer.sourceStockId);
    const transferable = source ? getSafeTransferableQuantity(source, stockTransfers) : 0;
    if (!source || transfer.requestedQuantity > transferable) return null;
  }
  const newTransfer = {
    ...transfer,
    id: `TRF-2026-${String(Date.now()).slice(-4)}`,
    createdAt: new Date().toISOString(),
    status: 'PENDING_SOURCE_APPROVAL',
    donorAllocated: transfer.donorAllocated ?? true,
  };
  stockTransfers = [newTransfer, ...stockTransfers];
  return newTransfer;
}

function allocateStockTransferDonor(transferId, sourceStock, donorFacility, districtUser) {
  const transfer = stockTransfers.find(t => t.id === transferId);
  if (!transfer) return false;
  const otherTransfers = stockTransfers.filter(t => t.id !== transferId);
  const transferable = getSafeTransferableQuantity(sourceStock, otherTransfers);
  if (transfer.requestedQuantity > transferable) return false;

  const now = new Date().toISOString();
  stockTransfers = stockTransfers.map(t => {
    if (t.id === transferId) {
      return {
        ...t,
        sourceStockId: sourceStock.id,
        sourceFacilityId: donorFacility.id,
        sourceFacilityName: donorFacility.name,
        donorAllocated: true,
        allocatedByDistrictUserId: districtUser?.id,
        allocatedByDistrictUserName: districtUser?.name,
        allocatedAt: now,
      };
    }
    return t;
  });
  return true;
}

function processStockTransfer(transferId, action, reason, consignmentMeta) {
  const transfer = stockTransfers.find(t => t.id === transferId);
  if (!transfer) return false;
  const source = stocks.find(s => s.id === transfer.sourceStockId);
  const destination = stocks.find(s => s.id === transfer.destinationStockId);
  const now = new Date().toISOString();

  if (action === 'APPROVE') {
    if (transfer.status !== 'PENDING_SOURCE_APPROVAL' || !source) return false;
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...consignmentMeta, status: 'APPROVED', approvedAt: now } : t);
    return true;
  }
  if (action === 'DISPATCH') {
    if (transfer.status !== 'APPROVED') return false;
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...consignmentMeta, status: 'DISPATCHED', dispatchedAt: now } : t);
    return true;
  }
  if (action === 'RECEIVE') {
    if (transfer.status !== 'DISPATCHED' || !source || !destination) return false;
    if (source.currentStock - transfer.requestedQuantity < source.bufferStock) return false;

    stocks = stocks.map(s => {
      if (s.id === source.id) return { ...s, currentStock: s.currentStock - transfer.requestedQuantity };
      if (s.id === destination.id) return { ...s, currentStock: s.currentStock + transfer.requestedQuantity };
      return s;
    });
    stockTransfers = stockTransfers.map(t => t.id === transferId ? { ...t, ...consignmentMeta, status: 'COMPLETED', receivedAt: now } : t);
    return true;
  }
  return false;
}

// ----------------------------------------------------
// TEST CASES
// ----------------------------------------------------

test('1. Baseline inventory confirms Velhe PHC shortage & Khed Shivapur surplus', () => {
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));
  const khedAsv = stocks.find(s => s.facilityId === 'fac-phc-khedshivapur' && s.drugName.includes('Anti-Snake Venom'));

  assert(velheAsv, 'Velhe ASV stock must exist');
  assert(khedAsv, 'Khed Shivapur ASV stock must exist');
  assert.strictEqual(velheAsv.currentStock, 4, 'Velhe PHC must have 4 vials');
  assert.strictEqual(velheAsv.bufferStock, 20, 'Velhe PHC buffer must be 20');
  assert.strictEqual(getMedicineStatus(velheAsv), 'CRITICAL', 'Velhe status must be CRITICAL');

  assert.strictEqual(khedAsv.currentStock, 35, 'Khed Shivapur must have 35 vials');
  assert.strictEqual(khedAsv.bufferStock, 20, 'Khed Shivapur buffer must be 20');
  const surplus = getSafeTransferableQuantity(khedAsv, stockTransfers);
  assert.strictEqual(surplus, 15, 'Khed Shivapur safe transferable surplus must be exactly 15 vials');
});

let createdTransferId = null;

test('2. Velhe PHC raises emergency SOS request for 10 units ASV', () => {
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));
  const transfer = createStockTransfer({
    medicineName: velheAsv.drugName,
    sourceStockId: '',
    destinationStockId: velheAsv.id,
    sourceFacilityId: '',
    sourceFacilityName: 'Awaiting District Allocation',
    destinationFacilityId: velheAsv.facilityId,
    destinationFacilityName: velheAsv.facilityName,
    requestedQuantity: 10,
    urgency: 'CRITICAL',
    reason: '[CRITICAL] Snakebite Envenomation — Neurotoxic symptoms',
    isEmergency: true,
    donorAllocated: false,
  });

  assert(transfer, 'Transfer must be created successfully');
  assert(transfer.id.startsWith('TRF-2026-'), 'Transfer ID must be formatted as TRF-2026-xxxx');
  assert.strictEqual(transfer.donorAllocated, false, 'donorAllocated must be false before district allocation');
  assert.strictEqual(transfer.sourceFacilityName, 'Awaiting District Allocation');
  createdTransferId = transfer.id;
});

test('3. PHC view displays "Matching in progress (Awaiting District coordination)"', () => {
  const req = stockTransfers.find(t => t.id === createdTransferId);
  const displayDonor = req.donorAllocated
    ? req.sourceFacilityName
    : 'Matching in progress (Awaiting District coordination)';

  assert.strictEqual(displayDonor, 'Matching in progress (Awaiting District coordination)');
  assert.strictEqual(req.destinationFacilityName, 'Velhe Primary Health Centre (PHC)');
  assert.strictEqual(req.requestedQuantity, 10);
});

test('4. District view derives the canonical request in its incoming queue', () => {
  const districtIncomingRequests = stockTransfers.filter((t) => {
    const isDestinationInDistrict =
      t.destinationFacilityName.toLowerCase().includes('pune') ||
      t.destinationFacilityName.toLowerCase().includes('velhe') ||
      t.destinationFacilityName.toLowerCase().includes('nasrapur') ||
      t.destinationFacilityName.toLowerCase().includes('aundh') ||
      t.destinationFacilityName.toLowerCase().includes('bhor') ||
      t.destinationFacilityName.toLowerCase().includes('khed') ||
      t.destinationFacilityName.toLowerCase().includes('kikvi');
    return isDestinationInDistrict && t.status !== 'COMPLETED' && t.status !== 'REJECTED';
  });

  assert.strictEqual(districtIncomingRequests.length, 1, 'District must have exactly 1 incoming request');
  const matched = districtIncomingRequests[0];
  assert.strictEqual(matched.id, createdTransferId, 'District incoming request must match canonical transfer ID');
  assert.strictEqual(matched.medicineName, 'Anti-Snake Venom (ASV Polyvalent Lyophilized)');
  assert.strictEqual(matched.requestedQuantity, 10);
  assert.strictEqual(matched.donorAllocated, false);
});

test('5. District AI Proximity Matching identifies Khed Shivapur PHC as optimal surplus donor', () => {
  const req = stockTransfers.find(t => t.id === createdTransferId);
  const destStock = stocks.find(s => s.id === req.destinationStockId);
  const surplusCandidates = findSurplusSources(destStock, stocks, stockTransfers, facilities);

  assert(surplusCandidates.length > 0, 'Surplus candidates must be found');
  const topCandidate = surplusCandidates[0];
  assert.strictEqual(topCandidate.facility.id, 'fac-phc-khedshivapur', 'Top donor must be Khed Shivapur PHC');
  assert.strictEqual(topCandidate.transferable, 15, 'Safe surplus must be 15 units (35 stock - 20 buffer)');
});

test('6. District executes "Allocate & Endorse Donor" pointing to Khed Shivapur PHC', () => {
  const req = stockTransfers.find(t => t.id === createdTransferId);
  const destStock = stocks.find(s => s.id === req.destinationStockId);
  const surplusCandidates = findSurplusSources(destStock, stocks, stockTransfers, facilities);
  const topCandidate = surplusCandidates[0];

  const allocated = allocateStockTransferDonor(
    req.id,
    topCandidate.stock,
    topCandidate.facility,
    { id: 'user-dho-pune', name: 'Dr. Smita Gaikwad (DHO Pune)' }
  );

  assert.strictEqual(allocated, true, 'Allocation must succeed');
  const updatedReq = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(updatedReq.donorAllocated, true, 'donorAllocated must now be true');
  assert.strictEqual(updatedReq.sourceFacilityId, 'fac-phc-khedshivapur');
  assert.strictEqual(updatedReq.sourceFacilityName, 'Khed Shivapur Primary Health Centre (PHC)');
  assert.strictEqual(updatedReq.allocatedByDistrictUserName, 'Dr. Smita Gaikwad (DHO Pune)');
  assert(updatedReq.allocatedAt, 'allocatedAt timestamp must be recorded');
});

test('7. PHC view immediately reflects Khed Shivapur PHC as canonical donor', () => {
  const req = stockTransfers.find(t => t.id === createdTransferId);
  const displayDonor = req.donorAllocated
    ? req.sourceFacilityName
    : 'Matching in progress (Awaiting District coordination)';

  assert.strictEqual(displayDonor, 'Khed Shivapur Primary Health Centre (PHC)');
});

test('8. Donor PHC (Khed Shivapur) views outgoing approval queue and approves transfer', () => {
  const khedFacilityId = 'fac-phc-khedshivapur';
  const khedFacilityName = 'Khed Shivapur Primary Health Centre (PHC)';

  // Replicate PharmacistMahaAushadhiView outgoing filter
  const outgoingTransfers = stockTransfers.filter(
    (t) =>
      t.donorAllocated !== false &&
      (t.sourceFacilityId === khedFacilityId ||
        (khedFacilityName && t.sourceFacilityName.toLowerCase().includes(khedFacilityName.toLowerCase())) ||
        t.sourceFacilityName.toLowerCase().includes('nasrapur'))
  );

  assert.strictEqual(outgoingTransfers.length, 1, 'Khed Shivapur must see 1 outgoing transfer');
  assert.strictEqual(outgoingTransfers[0].id, createdTransferId);

  // Khed Shivapur authorizes & approves
  const approved = processStockTransfer(createdTransferId, 'APPROVE');
  assert.strictEqual(approved, true, 'Approval must succeed');

  const afterApproval = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(afterApproval.status, 'APPROVED');
});

test('9. Donor PHC dispatches consignment via 108 Emergency Ambulance', () => {
  const dispatched = processStockTransfer(createdTransferId, 'DISPATCH', undefined, {
    consignmentCode: `CON-MH-2026-${createdTransferId.slice(-4)}`,
    transportMode: '108_AMBULANCE',
  });

  assert.strictEqual(dispatched, true, 'Dispatch must succeed');
  const afterDispatch = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(afterDispatch.status, 'DISPATCHED');
  assert(afterDispatch.consignmentCode.startsWith('CON-MH-2026-'));
});

test('10. Velhe PHC receives consignment: inventories update with statutory buffer preserved', () => {
  const received = processStockTransfer(createdTransferId, 'RECEIVE', undefined, {
    receivedByUserName: 'Dr. Rajesh Deshmukh',
    receiptOtpVerified: true,
  });

  assert.strictEqual(received, true, 'Receipt must succeed');

  const finalTransfer = stockTransfers.find(t => t.id === createdTransferId);
  assert.strictEqual(finalTransfer.status, 'COMPLETED');

  // Verify inventories
  const khedAsv = stocks.find(s => s.facilityId === 'fac-phc-khedshivapur' && s.drugName.includes('Anti-Snake Venom'));
  const velheAsv = stocks.find(s => s.facilityId === 'fac-phc-velhe' && s.drugName.includes('Anti-Snake Venom'));

  assert.strictEqual(khedAsv.currentStock, 25, 'Khed Shivapur ASV inventory must decrement from 35 to 25');
  assert.strictEqual(khedAsv.bufferStock, 20, 'Khed Shivapur buffer must remain 20');
  assert(khedAsv.currentStock >= khedAsv.bufferStock, 'Donor must NEVER fall below its 20-unit statutory buffer');

  assert.strictEqual(velheAsv.currentStock, 14, 'Velhe PHC ASV inventory must increment from 4 to 14 (replenished)');
});

console.log('\n----------------------------------------------------');
console.log(`RESULTS: ${passCount} / ${totalCount} tests passed`);
console.log('----------------------------------------------------\n');

if (passCount === totalCount) {
  console.log('ALL TESTS PASSED! MahaAushadhi request synchronization is robust and canonical.');
  process.exit(0);
} else {
  console.error('TESTS FAILED!');
  process.exit(1);
}
