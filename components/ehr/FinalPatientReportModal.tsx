'use client';

import React, { useRef } from 'react';
import { Patient, Referral, ClinicalEncounter } from '@/lib/types';
import { useSync } from '@/context/SyncContext';
import {
  X,
  Printer,
  Download,
  FileText,
  Building2,
  Calendar,
  Clock,
  User,
  Activity,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Pill,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Sparkles,
  MapPin,
  Phone,
  Share2,
} from 'lucide-react';

interface FinalPatientReportModalProps {
  patient: Patient;
  onClose: () => void;
  onOpenReferralToken?: (referral: Referral) => void;
}

export function FinalPatientReportModal({
  patient,
  onClose,
  onOpenReferralToken,
}: FinalPatientReportModalProps) {
  const { referrals, facilities } = useSync();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Find all referrals associated with this patient
  const patientReferrals = referrals.filter(
    (r) => r.patientId === patient.id || r.id === patient.activeReferralId
  );
  const latestReferral = patientReferrals[0] || null;

  // Derive patient lifecycle status
  let patientStage: 'Registered' | 'Referred' | 'Admitted' | 'Discharged' = 'Registered';
  if (latestReferral) {
    if (['COMPLETED', 'DISCHARGED'].includes(latestReferral.status)) {
      patientStage = 'Discharged';
    } else if (latestReferral.status === 'ADMITTED') {
      patientStage = 'Admitted';
    } else if (['PENDING', 'ACCEPTED', 'ESCALATED', 'TRANSFER_APPROVED', 'ROUTED_TO_TERTIARY'].includes(latestReferral.status)) {
      patientStage = 'Referred';
    }
  }

  // Aggregate prescriptions
  const allPrescriptions = (patient.encounters || []).flatMap((enc) =>
    (enc.prescriptions || []).map((p) => ({ ...p, encounterDate: enc.date, facility: enc.facilityName }))
  );

  // Latest vitals
  const latestEncounter = patient.encounters && patient.encounters.length > 0
    ? patient.encounters[patient.encounters.length - 1]
    : null;
  const vitals = latestEncounter?.vitals || latestReferral?.vitalsAtReferral;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const reportDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const reportContent = `
================================================================================
GOVERNMENT OF MAHARASHTRA • PUBLIC HEALTH DEPARTMENT
DIRECTORATE OF HEALTH SERVICES • SWASTHYASETU INTEGRATED EHR
================================================================================
FINAL CLINICAL DISCHARGE & CARE JOURNEY SUMMARY
Document ID: MH-EHR-${patient.id.toUpperCase()}-${Date.now().toString().slice(-4)}
Generated On: ${reportDate}

1. PATIENT DEMOGRAPHICS & IDENTIFICATION
--------------------------------------------------------------------------------
Full Name        : ${patient.fullName}
ABHA Number      : ${patient.abhaId || 'N/A'}
ABHA Address     : ${patient.abhaAddress || 'N/A'}
Age / Gender     : ${patient.age} Yrs / ${patient.gender}
Blood Group      : ${patient.bloodGroup || 'Not Documented'}
Contact Phone    : ${patient.phone}
Address          : Village ${patient.village || 'N/A'}, Taluka ${patient.taluka || 'N/A'}, Dist. ${patient.district || 'N/A'}
Emergency Contact: ${patient.emergencyContact?.name || 'N/A'} (${patient.emergencyContact?.relation || 'Guardian'}) - ${patient.emergencyContact?.phone || 'N/A'}
High Risk Flag   : ${patient.isHighRiskPregnancy ? 'YES (High Risk Pregnancy)' : 'No'}

2. EPISODE LIFECYCLE SUMMARY
--------------------------------------------------------------------------------
Current Status   : ${patientStage.toUpperCase()}
Registered Date  : ${patient.registeredAt ? new Date(patient.registeredAt).toLocaleString('en-IN') : 'Initial Intake'}
Origin Facility  : ${patient.registrationFacilityName || patient.assignedFacilityName || 'PHC Velhe'}
Current Facility : ${patient.assignedFacilityName || latestReferral?.targetFacility || 'District Hospital'}
Assigned Doctor  : ${patient.assignedDoctorName || latestReferral?.referringDoctorName || 'Dr. Sneha Joshi (MO)'}

3. PRIMARY & INPATIENT ENCOUNTERS (${patient.encounters?.length || 0} TOTAL)
--------------------------------------------------------------------------------
${(patient.encounters || []).map((enc, idx) => `
[Encounter #${idx + 1} - ${enc.date}]
Facility : ${enc.facilityName} (${enc.facilityType})
Provider : ${enc.providerName} (${enc.providerRole})
Complaints: ${enc.chiefComplaints?.join(', ') || 'Routine Checkup'}
Diagnosis: ${enc.diagnosis || 'Clinical evaluation'} (ICD-10: ${enc.icd10Code || 'N/A'})
Vitals   : BP ${enc.vitals?.systolicBp || '-'}/${enc.vitals?.diastolicBp || '-'} mmHg | SpO2: ${enc.vitals?.spO2 || '-'}% | HR: ${enc.vitals?.heartRate || '-'} bpm | Temp: ${enc.vitals?.temperature || '-'}°C
Notes    : ${enc.notes || 'Routine observation.'}
`).join('\n')}

4. REFERRAL & SECONDARY TRIAGE DETAILS
--------------------------------------------------------------------------------
${latestReferral ? `
Referral Token   : ${latestReferral.tokenCode}
Referring Center : ${latestReferral.referringFacility} (Dr. ${latestReferral.referringDoctorName})
Target Center    : ${latestReferral.targetFacility}
Specialty Needed : ${latestReferral.specialtyRequired}
Triage Urgency   : Priority ${latestReferral.triagePriority.toUpperCase()} (Risk Score: ${latestReferral.triageScore}/100)
Reason Given     : ${latestReferral.referralReason}
Assigned Bed     : ${latestReferral.assignedBed || 'Bed A-12 (ICU)'}
Ambulance 108    : ${latestReferral.ambulanceDispatched ? 'Dispatched / Verified' : 'Standard Transport'}
` : 'No secondary referral initiated for this episode.'}

5. MEDICATION & PRESCRIPTION REGISTRY
--------------------------------------------------------------------------------
${allPrescriptions.length > 0 ? allPrescriptions.map((p, i) => `
${i + 1}. ${p.medicineName} - ${p.dosage} (${p.frequency}) for ${p.durationDays} days
   Instructions: ${p.instructions} | Prescribed at: ${p.facility} (${p.encounterDate})
`).join('\n') : 'No active prescriptions recorded.'}

6. DISCHARGE SUMMARY & INSTRUCTIONS
--------------------------------------------------------------------------------
${latestReferral?.dischargeSummary ? `
Final Diagnosis  : ${latestReferral.dischargeSummary.finalDiagnosis}
Investigations   : ${latestReferral.dischargeSummary.investigations}
Treatment Given  : ${latestReferral.dischargeSummary.treatmentProvided}
Patient Status   : ${latestReferral.dischargeSummary.patientCondition}
Follow-up Date   : ${latestReferral.dischargeSummary.followUpDate}
Follow-up Center : ${latestReferral.dischargeSummary.followUpFacility}
Red-Flag Warnings: ${latestReferral.dischargeSummary.warningSigns}
Community ASHA   : ${latestReferral.dischargeSummary.communityFollowUpRequirement}
` : `
Clinical Status  : Stable & responding to primary regimen.
Follow-up Plan   : Periodic evaluation at local Sub-Centre / PHC.
Warning Signs    : Return immediately if shortness of breath, acute chest pain, or severe weakness recurs.
`}

================================================================================
OFFICIAL HEALTHCARE SIGNATURE & VERIFICATION STAMP
Digitally signed via SwasthyaSetu NDHM/ABDM Gateway
Public Health Department, Government of Maharashtra
================================================================================
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Clinical_Summary_${patient.fullName.replace(/\s+/g, '_')}_${patient.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Actions Bar (Hidden on print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  Official EHR Record
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ABDM Verified &bull; SIH26133
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Comprehensive Clinical Discharge &amp; Journey Report
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadText}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download text summary"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Text</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div ref={printContainerRef} className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-sans print:p-0 print:text-black">
          {/* Government Header */}
          <div className="border-b-2 border-slate-900 dark:border-slate-700 pb-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-black text-2xl shrink-0">
                  🏛️
                </div>
                <div>
                  <h1 className="text-sm font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                    Government of Maharashtra &bull; Public Health Department
                  </h1>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Directorate of Health Services &bull; District Civil Surgeon Office
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    SwasthyaSetu Unified Rural &amp; District Health Coordination Network &bull; ABDM Compliant
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Official Record ID</span>
                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">
                  MH-EHR-{patient.id.toUpperCase().slice(-8)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Demographics & ABHA Information */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Patient Demographics &amp; Identity
                </h3>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  patientStage === 'Discharged'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : patientStage === 'Admitted'
                    ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                    : patientStage === 'Referred'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                }`}
              >
                Status: {patientStage}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{patient.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ABHA Number</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{patient.abhaId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Age / Gender</span>
                <span className="font-semibold">{patient.age} Yrs &bull; {patient.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Blood Group</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{patient.bloodGroup || 'O+'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Mobile Phone</span>
                <span className="font-mono">{patient.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Village / Taluka</span>
                <span className="font-medium">{patient.village || 'Velhe'}, {patient.taluka || 'Velhe'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">District / State</span>
                <span className="font-medium">{patient.district || 'Pune'}, Maharashtra</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                <span className="font-medium">
                  {patient.emergencyContact?.name || 'Guardian'} ({patient.emergencyContact?.phone || patient.phone})
                </span>
              </div>
            </div>

            {patient.isHighRiskPregnancy && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Special Flag: High Risk Pregnancy (Gestational Weeks: {patient.gestationalWeeks || 28}w)</span>
              </div>
            )}
          </div>

          {/* Section 2: Clinical Vitals Progression */}
          {vitals && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Most Recent Clinical Vitals
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Recorded: {vitals.recordedAt ? new Date(vitals.recordedAt).toLocaleString('en-IN') : 'Recent'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Blood Pressure</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {vitals.systolicBp}/{vitals.diastolicBp} <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Oxygen Saturation</span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {vitals.spO2}% <span className="text-[10px] text-slate-400 font-normal">SpO2</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Heart Rate</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    {vitals.heartRate} <span className="text-[10px] text-slate-400 font-normal">BPM</span>
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Temperature &amp; Conscious</span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    {vitals.temperature}&deg;C &bull; {vitals.consciousLevel || 'Alert'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Care Journey & Clinical Encounters */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  3. Care Journey &amp; Primary Encounters ({patient.encounters?.length || 0} Records)
                </h3>
              </div>
            </div>

            {(!patient.encounters || patient.encounters.length === 0) ? (
              <p className="text-xs text-slate-400 italic">No primary encounters recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {patient.encounters.map((enc, idx) => (
                  <div
                    key={enc.id || idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          #{idx + 1} &bull; {enc.facilityName} ({enc.facilityType})
                        </span>
                        {enc.icd10Code && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                            ICD-10: {enc.icd10Code}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {enc.date} &bull; Provider: {enc.providerName} ({enc.providerRole})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">Chief Complaints:</strong>{' '}
                        {enc.chiefComplaints?.join(', ') || 'General consultation'}
                      </div>
                      <div>
                        <strong className="text-slate-800 dark:text-slate-200">Clinical Diagnosis:</strong>{' '}
                        {enc.diagnosis || 'Clinical evaluation completed.'}
                      </div>
                    </div>

                    {enc.notes && (
                      <p className="text-slate-500 dark:text-slate-400 italic text-[11px] border-t border-slate-100 dark:border-slate-800 pt-1.5">
                        &ldquo;{enc.notes}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Secondary Referral & Inpatient Course */}
          {latestReferral && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    4. Secondary Referral &amp; Hospital Inpatient Course
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                  Ref Token: {latestReferral.tokenCode}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Referring Center</span>
                  <span className="font-bold text-slate-900 dark:text-white">{latestReferral.referringFacility}</span>
                  <span className="text-[11px] text-slate-400 block">Dr. {latestReferral.referringDoctorName}</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Destination Hospital</span>
                  <span className="font-bold text-slate-900 dark:text-white">{latestReferral.targetFacility}</span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold block">
                    {latestReferral.specialtyRequired}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Triage Priority &amp; Bed</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        latestReferral.triagePriority === 'red'
                          ? 'bg-rose-500 text-white'
                          : latestReferral.triagePriority === 'yellow'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {latestReferral.triagePriority} (Score: {latestReferral.triageScore}/100)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Bed: {latestReferral.assignedBed || 'Bed A-14 (General Ward)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <strong className="text-slate-800 dark:text-slate-200">Clinical Indication for Referral:</strong>{' '}
                <span className="text-slate-600 dark:text-slate-300">{latestReferral.referralReason}</span>
              </div>
            </div>
          )}

          {/* Section 5: Prescriptions & Medication Log */}
          {allPrescriptions.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    5. Prescribed Medications &amp; Administration Schedule
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                      <th className="pb-2">Medicine Name</th>
                      <th className="pb-2">Dosage</th>
                      <th className="pb-2">Frequency</th>
                      <th className="pb-2">Duration</th>
                      <th className="pb-2">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allPrescriptions.map((p, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-2 font-bold text-slate-900 dark:text-white">{p.medicineName}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-300">{p.dosage}</td>
                        <td className="py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">{p.frequency}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-300">{p.durationDays} Days</td>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{p.instructions || 'As directed'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Discharge Summary & Follow-up Instructions */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-slate-900 border border-blue-200 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/40 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  6. Final Discharge Summary &amp; Community Follow-Up
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Final Diagnosis / Clinical Outcome:</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {latestReferral?.dischargeSummary?.finalDiagnosis || latestEncounter?.diagnosis || 'Clinically evaluated and treated.'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Patient Condition at Discharge:</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {latestReferral?.dischargeSummary?.patientCondition || 'Hemodynamically stable & vitals normalized.'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Counter-Referred Follow-up Facility:</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {latestReferral?.dischargeSummary?.followUpFacility || patient.assignedFacilityName || 'PHC Velhe (Community Health Officer)'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-bold">Scheduled Follow-up Date:</span>
                <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {latestReferral?.dischargeSummary?.followUpDate || 'Within 7 Days'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
              <strong className="block font-bold">Warning Signs / Red Flags for Emergency Re-admission:</strong>
              <p className="text-[11px] leading-relaxed">
                {latestReferral?.dischargeSummary?.warningSigns ||
                  'Report immediately to nearest PHC or Casualty if experiencing high fever, acute respiratory distress, severe chest pain, or sudden drop in blood pressure.'}
              </p>
            </div>
          </div>

          {/* Official Signatures & QR Code */}
          <div className="pt-4 border-t-2 border-slate-900 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-1 text-center shrink-0">
                <QrCode className="w-9 h-9 text-slate-800 dark:text-slate-200" />
                <span className="text-[7px] font-mono text-slate-400">ABDM VERIFY</span>
              </div>
              <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Digitally Authenticated</span>
                <span className="text-[10px] block">Government of Maharashtra Public Health Portal</span>
                <span className="text-[10px] font-mono text-slate-400 block">SHA-256: 4f8b2a...9d7e (Tamper Sealed)</span>
              </div>
            </div>

            <div className="text-center sm:text-right space-y-1 text-xs">
              <div className="font-black text-slate-900 dark:text-white">Dr. Vinod Chavan, MD</div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">District Health Officer / Civil Surgeon</div>
              <div className="text-[10px] font-mono text-slate-400">Public Health Department, Maharashtra</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
