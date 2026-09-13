import assert from 'node:assert';

// Verification of Maha Aushadhi algorithms
function getSafeTransferableQuantity(stock, transfers = []) {
  const reserved = transfers
    .filter(transfer => transfer.sourceStockId === stock.id && !['REJECTED', 'COMPLETED'].includes(transfer.status))
    .reduce((total, transfer) => total + transfer.requestedQuantity, 0);

  const availableAboveBuffer = Math.max(0, stock.currentStock - stock.bufferStock);
  return Math.max(0, availableAboveBuffer - reserved);
}

function getMedicineStatus(stock) {
  if (stock.currentStock < stock.bufferStock * 0.25) return 'CRITICAL';
  if (stock.currentStock < stock.bufferStock * 0.7) return 'LIMITED';
  return 'HEALTHY';
}

console.log('Running Maha Aushadhi Safety Tests...');

const donorStock = {
  id: 'stk-donor',
  facilityId: 'fac-dh-pune',
  facilityName: 'District Hospital Aundh, Pune',
  drugName: 'Anti-Snake Venom (ASV Polyvalent Lyophilized)',
  category: 'Critical Lifesaving',
  currentStock: 120,
  bufferStock: 40,
  unit: 'Vials (10ml)',
  batchNumber: 'ASV-MH-991',
  expiryDate: '2028-06-30',
  status: 'OPTIMAL'
};

// Test 1: Safe transferable calculation
const safeQty = getSafeTransferableQuantity(donorStock, []);
assert.strictEqual(safeQty, 80, 'Donor safe transferable should be 80 (120 - 40)');
console.log('✓ [PASS] Safe transferable calculation correctly protects statutory 40-unit buffer');

// Test 2: Active reservation prevents double-booking
const transfers = [
  { id: 'TRF-1', sourceStockId: 'stk-donor', requestedQuantity: 30, status: 'APPROVED' },
  { id: 'TRF-2', sourceStockId: 'stk-donor', requestedQuantity: 20, status: 'DISPATCHED' },
  { id: 'TRF-3', sourceStockId: 'stk-donor', requestedQuantity: 25, status: 'REJECTED' }, // Should not be reserved
];
const safeRemaining = getSafeTransferableQuantity(donorStock, transfers);
assert.strictEqual(safeRemaining, 30, 'Remaining safe surplus should be 30 (80 - 30 - 20)');
console.log('✓ [PASS] Multi-transfer reservation accounting prevents over-allocation');

// Test 3: Depleted stock returns 0 safe transferable
const depletedStock = { ...donorStock, currentStock: 35 };
const depletedSafe = getSafeTransferableQuantity(depletedStock, []);
assert.strictEqual(depletedSafe, 0, 'Depleted stock must yield 0 transferable units');
console.log('✓ [PASS] Buffer breach protection returns 0 safe transferable units');

// Test 4: Critical status detection
assert.strictEqual(getMedicineStatus({ currentStock: 8, bufferStock: 40 }), 'CRITICAL');
assert.strictEqual(getMedicineStatus({ currentStock: 25, bufferStock: 40 }), 'LIMITED');
assert.strictEqual(getMedicineStatus({ currentStock: 45, bufferStock: 40 }), 'HEALTHY');
console.log('✓ [PASS] Automatic stock threshold classification');

console.log('====================================');
console.log('ALL 4 MAHA AUSHADHI TESTS PASSED');
console.log('====================================');
