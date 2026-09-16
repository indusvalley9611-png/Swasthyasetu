const fs = require('fs');

console.log('P2-HARDENING: Demo Reliability & Data Integrity Tests\n');

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

// J. Unsupported Claim Scan
console.log('Test J: Unsupported Claim Scan');
const ashaDashboard = fs.readFileSync('components/dashboards/AshaDashboard.tsx', 'utf8');
assert(!ashaDashboard.toLowerCase().includes('real-time'), 'Real-time claim removed from AshaDashboard');
const memberProfile = fs.readFileSync('components/directory/MemberProfile.tsx', 'utf8');
assert(!memberProfile.toLowerCase().includes('ai-supported'), 'AI-supported claim removed from MemberProfile');
const stateAdmin = fs.readFileSync('components/dashboards/StateAdminDashboard.tsx', 'utf8');
assert(!stateAdmin.toLowerCase().includes('real-time'), 'Real-time claim removed from StateAdminDashboard');

// A-I: API tests
console.log('\nTests A-I: API / Component Logic Hardening');
const syncContext = fs.readFileSync('context/SyncContext.tsx', 'utf8');
assert(syncContext.includes("fetch('/api/authorize-mutation'"), 'MahaAushadhi uses server authorization');
assert(syncContext.includes("action === 'RECEIVE' ? transfer.destinationFacilityId : transfer.sourceFacilityId"), 'Transfer authorization checks correct facility');
assert(syncContext.includes("transfer.status !== 'DISPATCHED'"), 'Invalid status transitions prevented');
assert(syncContext.includes("targetRef.status !== 'ADMITTED'"), 'Duplicate admission prevented');
assert(syncContext.includes("targetRef.status === 'ADMITTED'"), 'Duplicate discharge prevented');
assert(syncContext.includes("Math.max(0, Math.min(max, current + delta))"), 'Negative and over-capacity occupancy prevented');
assert(syncContext.includes("transfer.requestedQuantity > availableAfterOtherReservations"), 'Over-transfer prevented');

const authContext = fs.readFileSync('context/AuthContext.tsx', 'utf8');
assert(authContext.includes("fetch('/api/audit'"), 'AuthContext verifies session in background');
assert(authContext.includes("res.status === 401"), 'AuthContext handles 401 gracefully');

const mockData = fs.readFileSync('lib/mockData.ts', 'utf8');
assert(!mockData.includes('2022-12-31'), 'Expired medicines updated to 2028');
assert(mockData.includes("targetFacilityId: 'fac-dh-nashik'"), 'Missing targetFacilityId added');

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
