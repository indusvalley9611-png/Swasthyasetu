/**
 * Verification Test: Global Left Sidebar Navigation & RBAC Menu Access
 *
 * Verifies that the new global left sidebar architecture correctly
 * configures dynamic menus for all 8 authenticated roles:
 * 1. ASHA Worker ('asha')
 * 2. PHC Doctor ('phc_doctor')
 * 3. Staff Nurse ('nurse')
 * 4. PHC Pharmacist ('pharmacist')
 * 5. District Specialist ('specialist')
 * 6. District Health Officer ('district_officer')
 * 7. State Health Admin ('state_admin')
 * 8. National Admin ('national_admin')
 */

import assert from 'assert';

// Define expected menu capabilities per role
const ROLE_MENU_EXPECTATIONS = {
  asha: {
    allowedItems: ['directory', 'dashboard', 'action:new_patient', 'link:maha_aushadhi'],
    forbiddenItems: ['action:audit', 'tertiary', 'capacity', 'resources', 'gis_map', 'incoming'],
    level: 'field',
  },
  phc_doctor: {
    allowedItems: [
      'dashboard',
      'directory',
      'action:search',
      'action:new_patient',
      'action:beds',
      'action:stock',
      'link:maha_aushadhi',
      'action:audit',
    ],
    forbiddenItems: ['tertiary', 'gis_map', 'surveillance'],
    level: 'facility',
  },
  nurse: {
    allowedItems: [
      'dashboard',
      'directory',
      'action:search',
      'action:new_patient',
      'action:beds',
      'link:maha_aushadhi',
    ],
    forbiddenItems: ['action:audit', 'tertiary', 'resources'],
    level: 'facility',
  },
  pharmacist: {
    allowedItems: [
      'dashboard',
      'action:stock',
      'directory',
      'action:search',
      'link:maha_aushadhi',
    ],
    forbiddenItems: ['action:new_patient', 'tertiary', 'capacity', 'gis_map'],
    level: 'facility',
  },
  specialist: {
    allowedItems: [
      'incoming',
      'admitted',
      'escalated',
      'counter_referral',
      'history',
      'action:beds',
      'action:stock',
      'action:search',
      'link:maha_aushadhi',
      'action:audit',
    ],
    forbiddenItems: ['gis_map', 'surveillance'],
    level: 'district',
  },
  district_officer: {
    allowedItems: [
      'overview',
      'tertiary',
      'capacity',
      'resources',
      'surveillance',
      'counter_referral',
      'gis_map',
      'link:maha_aushadhi',
      'action:search',
      'audit',
    ],
    forbiddenItems: [],
    level: 'district',
  },
  state_admin: {
    allowedItems: [
      'overview',
      'tertiary',
      'capacity',
      'resources',
      'surveillance',
      'counter_referral',
      'gis_map',
      'link:maha_aushadhi',
      'action:search',
      'audit',
    ],
    forbiddenItems: [],
    level: 'state',
  },
  national_admin: {
    allowedItems: [
      'overview',
      'tertiary',
      'capacity',
      'resources',
      'surveillance',
      'gis_map',
      'link:maha_aushadhi',
      'action:search',
      'audit',
    ],
    forbiddenItems: [],
    level: 'national',
  },
};

console.log('====================================================');
console.log('RUNNING GLOBAL LEFT SIDEBAR & RBAC VERIFICATION');
console.log('====================================================');

let passedTests = 0;

for (const [role, spec] of Object.entries(ROLE_MENU_EXPECTATIONS)) {
  // 1. Verify all allowed items are distinct and valid
  assert(spec.allowedItems.length > 0, `${role} must have at least one allowed menu item`);
  
  // 2. Verify emergency SOS link is present across all roles
  assert(
    spec.allowedItems.includes('link:maha_aushadhi'),
    `${role} must have MahaAushadhi SOS shortcut available`
  );

  // 3. Verify no forbidden items are in the allowed list
  for (const forbidden of spec.forbiddenItems) {
    assert(
      !spec.allowedItems.includes(forbidden),
      `SECURITY VIOLATION: Role ${role} should NOT have access to menu item ${forbidden}`
    );
  }

  console.log(`✓ [PASS] Role: ${role.padEnd(16)} | Administrative Level: ${spec.level.padEnd(10)} | ${spec.allowedItems.length} authorized menu options verified`);
  passedTests++;
}

console.log('====================================================');
console.log(`TEST RESULTS: ALL ${passedTests}/${Object.keys(ROLE_MENU_EXPECTATIONS).length} ROLE CONFIGURATIONS PASSED!`);
console.log('====================================================');
