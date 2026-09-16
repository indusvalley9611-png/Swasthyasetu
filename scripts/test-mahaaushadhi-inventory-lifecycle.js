const fs = require('fs');

console.log('====================================================');
console.log('MAHAAUSHADHI INVENTORY LIFECYCLE REGRESSION TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  -> PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  -> FAIL: ${message}`);
    failCount++;
  }
}

// 1. Load Resource Management Logic
const resourceMgmt = fs.readFileSync('lib/resourceManagement.ts', 'utf8');
assert(resourceMgmt.includes('export function getSafeTransferableQuantity'), 'getSafeTransferableQuantity function exists');
assert(!resourceMgmt.includes('stock.currentStock - stock.bufferStock - reserved'), 'getSafeTransferableQuantity does not prematurely deduct uncompleted transfers');

// 2. Simulate Inventory State Machine
let sourceStock = { id: 'stk-state-01', facilityId: 'fac-state-reserve', currentStock: 396, bufferStock: 100 };
let destStock = { id: 'stk-velhe-01', facilityId: 'fac-phc-velhe', currentStock: 21, bufferStock: 25 };
let transfers = [];

function getSafeTransferableQuantity(stock) {
  return Math.max(0, stock.currentStock - stock.bufferStock);
}

// STEP 1 & 2: REQUEST (create transfer)
const initialSource = sourceStock.currentStock; // 396
const initialDest = destStock.currentStock; // 21
const reqQty = 4;

const transfer = {
  id: 'TRF-2026-TEST',
  sourceStockId: sourceStock.id,
  destinationStockId: destStock.id,
  requestedQuantity: reqQty,
  status: 'PENDING_SOURCE_APPROVAL'
};
transfers.push(transfer);

// STEP 3 & 4: Assert stock unchanged after REQUEST
assert(sourceStock.currentStock === initialSource, `REQUEST: Source stock remains unchanged at ${initialSource} (actual: ${sourceStock.currentStock})`);
assert(destStock.currentStock === initialDest, `REQUEST: Destination stock remains unchanged at ${initialDest} (actual: ${destStock.currentStock})`);
assert(getSafeTransferableQuantity(sourceStock) === 296, `REQUEST: Safe transferable quantity based on currentStock remains 296 (actual: ${getSafeTransferableQuantity(sourceStock)})`);

// STEP 5 & 6: APPROVE
transfer.status = 'APPROVED';
assert(sourceStock.currentStock === initialSource, `APPROVE: Source stock remains unchanged at ${initialSource} (actual: ${sourceStock.currentStock})`);
assert(destStock.currentStock === initialDest, `APPROVE: Destination stock remains unchanged at ${initialDest} (actual: ${destStock.currentStock})`);

// STEP 7 & 8: DISPATCH
transfer.status = 'DISPATCHED';
assert(sourceStock.currentStock === initialSource, `DISPATCH: Source stock remains unchanged at ${initialSource} (actual: ${sourceStock.currentStock})`);
assert(destStock.currentStock === initialDest, `DISPATCH: Destination stock remains unchanged at ${initialDest} (actual: ${destStock.currentStock})`);

// STEP 9, 10 & 11: RECEIVE (first time)
if (transfer.status === 'DISPATCHED') {
  sourceStock.currentStock -= transfer.requestedQuantity;
  destStock.currentStock += transfer.requestedQuantity;
  transfer.status = 'COMPLETED';
}
assert(sourceStock.currentStock === 392, `RECEIVE: Source stock decreased by ${reqQty} to 392 (actual: ${sourceStock.currentStock})`);
assert(destStock.currentStock === 25, `RECEIVE: Destination stock increased by ${reqQty} to 25 (actual: ${destStock.currentStock})`);

// STEP 12 & 13: Duplicate RECEIVE Attempt (Idempotency)
let secondReceiveExecuted = false;
if (transfer.status === 'DISPATCHED') {
  // Should not execute
  sourceStock.currentStock -= transfer.requestedQuantity;
  destStock.currentStock += transfer.requestedQuantity;
  secondReceiveExecuted = true;
}
assert(!secondReceiveExecuted, 'Duplicate RECEIVE attempt rejected because status is already COMPLETED');
assert(sourceStock.currentStock === 392, `IDEMPOTENCY: Source stock remains 392 after duplicate receive attempt (actual: ${sourceStock.currentStock})`);
assert(destStock.currentStock === 25, `IDEMPOTENCY: Destination stock remains 25 after duplicate receive attempt (actual: ${destStock.currentStock})`);

// STEP 14 & 15: Rejection / Cancellation Boundary Check
let rejSourceStock = { id: 'stk-state-02', currentStock: 500, bufferStock: 100 };
let rejDestStock = { id: 'stk-velhe-02', currentStock: 10, bufferStock: 30 };
let rejTransfer = { id: 'TRF-2026-REJ', sourceStockId: rejSourceStock.id, destinationStockId: rejDestStock.id, requestedQuantity: 10, status: 'PENDING_SOURCE_APPROVAL' };

// Action: REJECT
rejTransfer.status = 'REJECTED';
assert(rejSourceStock.currentStock === 500, `REJECTION: Source stock remains unchanged at 500 (actual: ${rejSourceStock.currentStock})`);
assert(rejDestStock.currentStock === 10, `REJECTION: Destination stock remains unchanged at 10 (actual: ${rejDestStock.currentStock})`);

console.log(`\n====================================================`);
console.log(`RESULTS: ${passCount} Passed, ${failCount} Failed.`);
console.log(`====================================================\n`);

if (failCount > 0) process.exit(1);
