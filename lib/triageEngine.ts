import { Vitals, TriagePriority, TriageResult } from './types';

/**
 * Algorithmic Triage Engine based on National Early Warning Score (NEWS2)
 * tailored for Indian Rural & District Healthcare escalation.
 * 
 * Priority Matrix:
 * - RED (Critical / Priority 1): Immediate emergency attention / ICU or High Dependency referral.
 * - YELLOW (Urgent / Priority 2): Urgent medical attention required within 2 hours.
 * - GREEN (Routine / Priority 3): Ambulatory care / stable condition.
 */
export function calculateTriageScore(vitals: Partial<Vitals>): TriageResult {
  let score = 0;
  const reasons: string[] = [];

  const {
    systolicBp = 120,
    heartRate = 75,
    spO2 = 98,
    respiratoryRate = 16,
    temperature = 37.0,
    consciousLevel = 'alert',
    bloodGlucose,
    hemoglobin,
  } = vitals;

  // 1. Respiratory Rate
  if (respiratoryRate <= 8) {
    score += 3;
    reasons.push('Severe Bradypnea (RR ≤ 8 /min)');
  } else if (respiratoryRate >= 9 && respiratoryRate <= 11) {
    score += 1;
    reasons.push('Mild Bradypnea (RR 9-11 /min)');
  } else if (respiratoryRate >= 12 && respiratoryRate <= 20) {
    score += 0;
  } else if (respiratoryRate >= 21 && respiratoryRate <= 24) {
    score += 2;
    reasons.push('Tachypnea (RR 21-24 /min)');
  } else if (respiratoryRate >= 25) {
    score += 3;
    reasons.push('Severe Tachypnea (RR ≥ 25 /min)');
  }

  // 2. Oxygen Saturation (SpO2)
  if (spO2 <= 91) {
    score += 3;
    reasons.push(`Critical Hypoxia (SpO2 ${spO2}% ≤ 91%)`);
  } else if (spO2 >= 92 && spO2 <= 93) {
    score += 2;
    reasons.push(`Moderate Hypoxia (SpO2 ${spO2}%)`);
  } else if (spO2 >= 94 && spO2 <= 95) {
    score += 1;
    reasons.push(`Mild Hypoxia (SpO2 ${spO2}%)`);
  }

  // 3. Systolic Blood Pressure
  if (systolicBp <= 90) {
    score += 3;
    reasons.push(`Hypotension / Shock risk (SBP ${systolicBp} mmHg ≤ 90)`);
  } else if (systolicBp >= 91 && systolicBp <= 100) {
    score += 2;
    reasons.push(`Borderline Low Blood Pressure (SBP ${systolicBp} mmHg)`);
  } else if (systolicBp >= 101 && systolicBp <= 110) {
    score += 1;
  } else if (systolicBp >= 111 && systolicBp <= 179) {
    score += 0;
  } else if (systolicBp >= 180) {
    score += 3;
    reasons.push(`Hypertensive Crisis (SBP ${systolicBp} mmHg ≥ 180)`);
  }

  // 4. Pulse / Heart Rate
  if (heartRate <= 40) {
    score += 3;
    reasons.push(`Severe Bradycardia (HR ${heartRate} bpm ≤ 40)`);
  } else if (heartRate >= 41 && heartRate <= 50) {
    score += 1;
    reasons.push(`Mild Bradycardia (HR ${heartRate} bpm)`);
  } else if (heartRate >= 51 && heartRate <= 90) {
    score += 0;
  } else if (heartRate >= 91 && heartRate <= 110) {
    score += 1;
    reasons.push(`Mild Tachycardia (HR ${heartRate} bpm)`);
  } else if (heartRate >= 111 && heartRate <= 130) {
    score += 2;
    reasons.push(`Moderate Tachycardia (HR ${heartRate} bpm)`);
  } else if (heartRate >= 131) {
    score += 3;
    reasons.push(`Severe Tachycardia (HR ${heartRate} bpm ≥ 131)`);
  }

  // 5. Consciousness / AVPU
  if (consciousLevel === 'unresponsive') {
    score += 3;
    reasons.push('Unresponsive (Comatose / GCS low)');
  } else if (consciousLevel === 'pain') {
    score += 3;
    reasons.push('Responsive only to pain');
  } else if (consciousLevel === 'voice') {
    score += 3;
    reasons.push('Altered Mental State (responds only to voice)');
  }

  // 6. Body Temperature (Celsius)
  if (temperature <= 35.0) {
    score += 3;
    reasons.push(`Hypothermia (Temp ${temperature}°C)`);
  } else if (temperature >= 35.1 && temperature <= 36.0) {
    score += 1;
  } else if (temperature >= 36.1 && temperature <= 38.0) {
    score += 0;
  } else if (temperature >= 38.1 && temperature <= 39.0) {
    score += 1;
    reasons.push(`Fever (Temp ${temperature}°C)`);
  } else if (temperature >= 39.1) {
    score += 2;
    reasons.push(`High Pyrexia (Temp ${temperature}°C ≥ 39.1°C)`);
  }

  // 7. Auxiliary: Blood Glucose & Hemoglobin checks
  if (bloodGlucose !== undefined) {
    if (bloodGlucose < 54) {
      score += 3;
      reasons.push(`Severe Hypoglycemia (${bloodGlucose} mg/dL)`);
    } else if (bloodGlucose > 350) {
      score += 2;
      reasons.push(`Severe Hyperglycemia / DKA risk (${bloodGlucose} mg/dL)`);
    }
  }

  if (hemoglobin !== undefined) {
    if (hemoglobin < 7.0) {
      score += 3;
      reasons.push(`Severe Anemia (Hb ${hemoglobin} g/dL - blood transfusion candidate)`);
    } else if (hemoglobin < 9.0) {
      score += 1;
      reasons.push(`Moderate Anemia (Hb ${hemoglobin} g/dL)`);
    }
  }

  // Determine Priority Band
  let priority: TriagePriority = 'green';
  let recommendedAction = 'Routine consultation at PHC / Outpatient clinic.';
  let recommendedFacilityType: 'District Hospital' | 'Rural Hospital / Sub-District' | 'PHC' = 'PHC';

  // Any single parameter with score 3 OR total score >= 7 is RED (Critical)
  const hasExtremeSingleParameter = 
    spO2 <= 91 || 
    systolicBp <= 90 || 
    systolicBp >= 180 || 
    consciousLevel !== 'alert' || 
    respiratoryRate >= 25 || 
    respiratoryRate <= 8 || 
    heartRate <= 40 || 
    heartRate >= 131;

  if (score >= 7 || hasExtremeSingleParameter) {
    priority = 'red';
    recommendedAction = 'IMMEDIATE EMERGENCY ESCALATION. Dispatch ALS Ambulance with Oxygen. Reserve Emergency / ICU bed at District Hospital.';
    recommendedFacilityType = 'District Hospital';
  } else if (score >= 4 || score >= 5) {
    priority = 'yellow';
    recommendedAction = 'URGENT REFERRAL. Patient requires urgent clinical evaluation within 2 hours at Rural / Sub-District Hospital with specialist on duty.';
    recommendedFacilityType = 'Rural Hospital / Sub-District';
  } else {
    priority = 'green';
    recommendedAction = 'STABLE / ROUTINE. Manage at PHC or schedule elective specialist OPD visit.';
    recommendedFacilityType = 'PHC';
  }

  return {
    score,
    priority,
    reasons: reasons.length > 0 ? reasons : ['All primary vitals within normal clinical limits.'],
    recommendedAction,
    recommendedFacilityType,
  };
}
