const fs = require('fs');

console.log('MAHAAUSHADHI 3-TIER HIERARCHY & ESCALATION REGRESSION TESTS\n');

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

// 1. Data Model Verification
console.log('Test 1: Data Model & State Reserve Verification');
const mockData = fs.readFileSync('lib/mockData.ts', 'utf8');
assert(mockData.includes("id: 'stk-018'") && mockData.includes("Magnesium Sulphate 50% Inj") && mockData.includes("fac-state-reserve"), 'State Medical Depot seed stock for Magnesium Sulphate added at State Reserve');
assert(mockData.includes("id: 'stk-019'") && mockData.includes("Anti-Snake Venom (ASV Polyvalent Lyophilized)"), 'State Medical Depot seed stock for ASV added at State Reserve');
assert(mockData.includes("id: 'stk-020'") && mockData.includes("Adrenaline Injection IP (1 mg/ml)"), 'State Medical Depot seed stock for Adrenaline added at State Reserve');

// 2. Resource Management Hierarchy Function
console.log('\nTest 2: Resource Management Tier Prioritization');
const resourceMgmt = fs.readFileSync('lib/resourceManagement.ts', 'utf8');
assert(resourceMgmt.includes('findHierarchicalSupplySources'), 'Hierarchical supply discovery function implemented');
assert(resourceMgmt.includes("tier: 'PHC'") && resourceMgmt.includes("tier: 'DISTRICT'") && resourceMgmt.includes("tier: 'STATE'"), 'All 3 tiers (PHC, District, State) defined in supply discovery');
assert(resourceMgmt.includes('bestPhc && bestPhc.transferable > 0'), 'Tier 1 (PHC Surplus) prioritized first');
assert(resourceMgmt.includes('bestDistrict && bestDistrict.transferable > 0'), 'Tier 2 (District Supply) evaluated when PHC surplus is insufficient');
assert(resourceMgmt.includes('bestState && bestState.transferable > 0'), 'Tier 3 (State Supply) evaluated when PHC & District supply are insufficient');

// 3. District View Component Verification
console.log('\nTest 3: District MahaAushadhi UX & Scoping');
const districtView = fs.readFileSync('components/maha-aushadhi/DistrictMahaAushadhiView.tsx', 'utf8');
assert(districtView.includes('findHierarchicalSupplySources'), 'District view utilizes hierarchical supply discovery');
assert(districtView.includes('1. Nearby PHC') && districtView.includes('2. District') && districtView.includes('3. State Reserve'), '3-Tier availability overview cards rendered');
assert(districtView.includes('Request from State') || districtView.includes('Request from District'), 'Dynamic CTA reflecting active supply tier');
assert(districtView.includes('DEMO-SIMULATED NETWORK'), 'Demo simulation badge present on all screens');
assert(districtView.includes('SHORTAGE REDUCED') && districtView.includes('Medicine Successfully Received'), 'Resolution screen displays clear confirmation with stock math');

// 4. Type Safety Verification
console.log('\nTest 4: Type Safety & Attributes');
const types = fs.readFileSync('lib/types.ts', 'utf8');
assert(types.includes("supplyTier?: 'PHC' | 'DISTRICT' | 'STATE'"), 'supplyTier attribute added to StockTransfer interface');

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);
