const fs = require('fs');
let file = fs.readFileSync('lib/patientPrivacyService.ts', 'utf8');

file = file.replace(/\(patient\.assignedFacilityName && user\.facilityName && patient\.assignedFacilityName === user\.facilityName\)/g, "false");
file = file.replace(/\(r\.targetFacility && user\.facilityName && r\.targetFacility === user\.facilityName\)/g, "false");
file = file.replace(/\(user\.village && patient\.village && patient\.village === user\.village\)/g, "false");
file = file.replace(/\|\| \(p\.district && user\.district && p\.district\.toLowerCase\(\) === user\.district\.toLowerCase\(\)\)/g, "");
file = file.replace(/\(referral\.targetFacility && user\.facilityName && referral\.targetFacility === user\.facilityName\)/g, "false");

// For cases where we just OR'd it with false, let's clean it up so we don't have dangling || false
file = file.replace(/ \|\| false/g, "");
file = file.replace(/false \|\| /g, "");

fs.writeFileSync('lib/patientPrivacyService.ts', file);
console.log('Cleaned string matching in privacy service');
