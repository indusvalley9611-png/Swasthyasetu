import assert from 'assert';

// Test Triage Logic
function calculateTriageScore(vitals) {
  let score = 0;
  const reasons = [];

  const {
    systolicBp = 120,
    heartRate = 75,
    spO2 = 98,
    respiratoryRate = 16,
    temperature = 37.0,
    consciousLevel = 'alert',
  } = vitals;

  if (respiratoryRate <= 8) { score += 3; reasons.push('Severe Bradypnea'); }
  else if (respiratoryRate >= 25) { score += 3; reasons.push('Severe Tachypnea'); }
  else if (respiratoryRate >= 21) { score += 2; reasons.push('Tachypnea'); }

  if (spO2 <= 91) { score += 3; reasons.push('Critical Hypoxia'); }
  else if (spO2 <= 93) { score += 2; reasons.push('Moderate Hypoxia'); }
  else if (spO2 <= 95) { score += 1; reasons.push('Mild Hypoxia'); }

  if (systolicBp <= 90) { score += 3; reasons.push('Hypotension / Shock'); }
  else if (systolicBp >= 180) { score += 3; reasons.push('Hypertensive Crisis'); }

  if (heartRate <= 40) { score += 3; reasons.push('Severe Bradycardia'); }
  else if (heartRate >= 131) { score += 3; reasons.push('Severe Tachycardia'); }
  else if (heartRate >= 111) { score += 2; reasons.push('Moderate Tachycardia'); }

  if (consciousLevel !== 'alert') { score += 3; reasons.push('Altered Consciousness'); }

  const hasExtreme = spO2 <= 91 || systolicBp <= 90 || systolicBp >= 180 || consciousLevel !== 'alert' || respiratoryRate >= 25;
  let priority = 'green';
  if (score >= 7 || hasExtreme) {
    priority = 'red';
  } else if (score >= 4) {
    priority = 'yellow';
  }

  return { score, priority, reasons };
}

// Test 1: Normal vitals
const normal = calculateTriageScore({
  systolicBp: 120,
  diastolicBp: 80,
  heartRate: 72,
  spO2: 98,
  respiratoryRate: 16,
  consciousLevel: 'alert'
});
console.log('Test 1 (Normal):', normal);
assert.strictEqual(normal.priority, 'green');
assert.strictEqual(normal.score, 0);

// Test 2: Critical STEMI / Shock vitals
const critical = calculateTriageScore({
  systolicBp: 88,
  diastolicBp: 56,
  heartRate: 120,
  spO2: 89,
  respiratoryRate: 26,
  consciousLevel: 'alert'
});
console.log('Test 2 (Critical Shock):', critical);
assert.strictEqual(critical.priority, 'red');
assert(critical.score >= 7);

// Test 3: Urgent Dengue Fever vitals
const urgent = calculateTriageScore({
  systolicBp: 110,
  diastolicBp: 70,
  heartRate: 115,
  spO2: 93,
  respiratoryRate: 22,
  consciousLevel: 'alert'
});
console.log('Test 3 (Urgent):', urgent);
assert.strictEqual(urgent.priority, 'yellow');
assert(urgent.score >= 4);

// Test 4: ABHA ID format validation
const abhaPattern = /^\d{2}-\d{4}-\d{4}-\d{4}$/;
const sampleAbha = '91-4829-1049-3821';
assert(abhaPattern.test(sampleAbha), 'Sample ABHA matches format');

console.log('\nAll Algorithmic Triage & Health Standard Tests PASSED!');
