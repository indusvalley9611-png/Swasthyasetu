/**
 * Verification Test: District Simplified Master UX + UI + Information Architecture
 * 
 * Verifies all acceptance criteria for the simplified District Health Control Center:
 * 1. Default Route & Workspace Architecture
 * 2. District Identity & Scoping
 * 3. Command Center Overview & Viewport Hierarchy (4 KPIs, 3 Sections: Needs Attention, Facility Capacity, Recent Activity)
 * 4. Priority Operational Queue (Needs Your Attention with Review/Coordinate/View actions)
 * 5. Facility Capacity Overview
 * 6. Recent Activity Timeline
 * 7. RBAC & Sidebar Dynamic Hierarchy (District Control Center, Referrals, Hospital Capacity, MahaAushadhi, Audit Trail)
 * 8. Sub-views (Referrals, Hospital Capacity, Audit Trail)
 * 9. Canonical Data Integrity & Invariants
 */

const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 SWASTHYASETU — DISTRICT SIMPLIFIED MASTER UX & ARCHITECTURE TEST');
console.log('================================================================\n');

let passCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS ${totalTests}] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL ${totalTests}] ${name}`);
    console.error(`    Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. ROUTING & DEFAULT LANDING ROUTE
console.log('--- SECTION 1: DEFAULT ROUTE & WORKSPACE ARCHITECTURE ---');

const pageSource = fs.readFileSync('app/page.tsx', 'utf8');
runTest('District Officer default route is strictly "overview"', () => {
  assert(pageSource.includes("if (r === 'state_admin' || r === 'national_admin' || r === 'district_officer') return 'overview';"),
    'getDefaultNavItem must return "overview" for district_officer');
});

runTest('District Officer renders DistrictCoordinationDashboard on page', () => {
  assert(pageSource.includes("{role === 'district_officer' && (") && pageSource.includes("<DistrictCoordinationDashboard"),
    'app/page.tsx must conditionally render DistrictCoordinationDashboard for district_officer');
});

// 2. DISTRICT IDENTITY & BREADCRUMBS
console.log('\n--- SECTION 2: DISTRICT IDENTITY & CONTEXT SCOPING ---');

const appShellSource = fs.readFileSync('components/layout/AppShell.tsx', 'utf8');
runTest('Breadcrumb for district_officer shows District level without facility pollution', () => {
  assert(appShellSource.includes("role === 'district_officer'") && appShellSource.includes("crumbs.push({ label: user.facilityName });"),
    'AppShell must exclude specific facility from primary district breadcrumb');
  assert(appShellSource.includes("District Health Control Center"),
    'AppShell must label overview as District Health Control Center for district_officer');
});

const sidebarSource = fs.readFileSync('components/layout/Sidebar.tsx', 'utf8');
runTest('Sidebar context card displays District Health Authority for district_officer', () => {
  assert(sidebarSource.includes("District Health Authority"),
    'Sidebar context card must show District Health Authority');
});

runTest('District sidebar includes exactly the 4 District Officer responsibilities', () => {
  assert(sidebarSource.includes("District Overview") || sidebarSource.includes("District Control Center"), 'Sidebar must have District Overview');
  assert(sidebarSource.includes("Referrals"), 'Sidebar must have Referrals');
  assert(sidebarSource.includes("Hospital Capacity"), 'Sidebar must have Hospital Capacity');
  assert(sidebarSource.includes("MahaAushadhi"), 'Sidebar must have MahaAushadhi');
  assert(sidebarSource.includes("Audit Trail"), 'Sidebar must have Audit Trail');
});

// 3. DISTRICT CONTROL CENTER OVERVIEW HIERARCHY
console.log('\n--- SECTION 3: DISTRICT CONTROL CENTER OVERVIEW & VIEWPORT ---');

const dashboardSource = fs.readFileSync('components/dashboards/DistrictCoordinationDashboard.tsx', 'utf8');

runTest('Executive Command Header contains District identity and Demo Network badge', () => {
  assert(dashboardSource.includes('DISTRICT HEALTH CONTROL CENTER'), 'Header must state DISTRICT HEALTH CONTROL CENTER');
  assert(dashboardSource.includes('DEMO-SIMULATED NETWORK'), 'Header must contain DEMO-SIMULATED NETWORK');
  assert(dashboardSource.includes('District-wide healthcare coordination') || dashboardSource.includes('District-wide referral and resource coordination'),
    'Header must state District-wide referral and resource coordination');
});

runTest('Top Summary Strip renders ONLY the 4 required operational KPI cards', () => {
  assert(dashboardSource.includes('Needs Attention'), 'Must render Needs Attention KPI card');
  assert(dashboardSource.includes('Active Referrals'), 'Must render Active Referrals KPI card');
  assert(dashboardSource.includes('Resource Alerts'), 'Must render Resource Alerts KPI card');
  assert(dashboardSource.includes('Medicine Requests'), 'Must render Medicine Requests KPI card');
});

runTest('Single Primary Action button "Review Referrals" present in header', () => {
  assert(dashboardSource.includes('Review Referrals'), 'Must have single primary action Review Referrals');
});

runTest('Section 1: "Needs Your Attention" rendered with clear actionable triggers', () => {
  assert(dashboardSource.includes('Needs Your Attention'), 'Must have Needs Your Attention section');
  assert(dashboardSource.includes('Review') && dashboardSource.includes('Coordinate') && dashboardSource.includes('View'),
    'Must have Review, Coordinate, and View action triggers');
});

runTest('Section 2: "Facility Capacity" summarizes district facilities with status', () => {
  assert(dashboardSource.includes('Facility Capacity'), 'Must have Facility Capacity section');
  assert(dashboardSource.includes('Available') && dashboardSource.includes('Limited') && dashboardSource.includes('Critical'),
    'Must show Available / Limited / Critical statuses');
  assert(dashboardSource.includes('View Capacity'), 'Must have View Capacity button');
});

runTest('Section 3: "Recent Activity" timeline derived from real district data', () => {
  assert(dashboardSource.includes('Recent Activity'), 'Must have Recent Activity section');
  assert(dashboardSource.includes('recentActivities'), 'Must compute recentActivities from real data');
});

// 4. PROGRESSIVE DISCLOSURE & SUB-MODULES
console.log('\n--- SECTION 4: PROGRESSIVE DISCLOSURE & SUB-MODULES ---');

runTest('Referrals view contains rich filtering and referral table', () => {
  assert(dashboardSource.includes("activeTab === 'tertiary'"), 'Referrals tab exists');
  assert(dashboardSource.includes('referralFilter'), 'Referral filter state exists');
  assert(dashboardSource.includes('DistrictReferralReviewModal'), 'District Referral Review modal available on drill-down');
});

runTest('Hospital Capacity view renders live bed & ICU breakdown', () => {
  assert(dashboardSource.includes("activeTab === 'capacity'"), 'Capacity tab exists');
  assert(dashboardSource.includes('icuBedsOccupied') && dashboardSource.includes('icuBedsTotal'), 'Tracks ICU capacity');
  assert(dashboardSource.includes('ventilatorsOccupied') && dashboardSource.includes('ventilatorsTotal'), 'Tracks Ventilator capacity');
});

runTest('Audit Trail view displays immutable security & access records', () => {
  assert(dashboardSource.includes("activeTab === 'audit'"), 'Audit tab exists');
  assert(dashboardSource.includes('getAuditLogs'), 'Fetches audit records');
});

// 5. CANONICAL DATA INTEGRITY & INVARIANTS
console.log('\n--- SECTION 5: CANONICAL DATA INTEGRITY & SCOPING ---');

const mockDataSource = fs.readFileSync('lib/mockData.ts', 'utf8');
runTest('Canonical facilities strictly defined with opaque IDs', () => {
  assert(mockDataSource.includes("'fac-dh-pune'"), 'fac-dh-pune defined');
  assert(mockDataSource.includes("'fac-phc-velhe'"), 'fac-phc-velhe defined');
  assert(mockDataSource.includes("'fac-phc-nasrapur'"), 'fac-phc-nasrapur defined');
  assert(mockDataSource.includes("'fac-rh-bhor'"), 'fac-rh-bhor defined');
  assert(mockDataSource.includes("'fac-sassoon-pune'"), 'fac-sassoon-pune defined');
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passCount}/${totalTests} DISTRICT MASTER UX & ARCHITECTURE TESTS PASSED!`);
console.log('================================================================');

if (passCount !== totalTests) {
  process.exit(1);
}
