import React, { useState, useEffect } from 'react';
import { Referral, Patient, DischargeSummary } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { canProcessDistrictReferral, recordAuditLog } from '@/lib/patientPrivacyService';
import {
  Building2,
  FileText,
  CheckCircle2,
  Activity,
  ArrowRight,
  XCircle,
  BrainCircuit,
  ShieldAlert,
  ShieldCheck,
  Lock,
  MapPin,
  Stethoscope,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface SpecialistTreatmentModalProps {
  referral: Referral;
  patient: Patient;
  onClose: () => void;
  updateReferralStatus: (id: string, status: Referral['status'], updates?: Partial<Referral>) => void;
}

export function SpecialistTreatmentModal({ referral, patient, onClose, updateReferralStatus }: SpecialistTreatmentModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  
  const authDecision = canProcessDistrictReferral(user, referral);
  const isAuthorized = authDecision.allowed;

  // Log coordination view when viewing an external referral in read-only mode
  useEffect(() => {
    if (user && referral && !isAuthorized) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'DISTRICT_REFERRAL_COORDINATION',
        resource: `Referral Token ${referral.tokenCode || referral.id}`,
        reason: `District Coordination View (Read-Only): ${authDecision.reason}`,
        accessGranted: true,
      });
    }
  }, [user?.id, referral.id, isAuthorized]);

  const [activeAction, setActiveAction] = useState<'NONE' | 'ADMIT' | 'ESCALATE' | 'DISCHARGE'>('NONE');

  // Admit form state
  const [bedType, setBedType] = useState<'icuBedsOccupied' | 'ventilatorsOccupied' | 'oxygenBedsOccupied' | 'occupiedBeds'>('occupiedBeds');

  // Escalate form state
  const [targetStateFacility, setTargetStateFacility] = useState('Sassoon General Hospital & BJMC');

  // Discharge form state
  const [dischargeData, setDischargeData] = useState({
    finalDiagnosis: '',
    investigations: '',
    treatmentProvided: '',
    medicines: '',
    patientCondition: 'Stable',
    followUpDate: '',
    followUpFacility: patient.encounters?.[0]?.facilityName || 'Nearest PHC',
    instructions: '',
    warningSigns: '',
    communityFollowUpRequirement: 'Yes',
  });

  const handleStatusChange = (newStatus: Referral['status'], updates?: Partial<Referral>) => {
    if (!isAuthorized) return; // Deny-by-default for cross-facility modification

    if (user) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: newStatus === 'ADMITTED' ? 'UPDATE_PATIENT_RECORD' : newStatus === 'COMPLETED' ? 'DISCHARGE_PATIENT' : 'VIEW_PATIENT_REPORT',
        resource: `Referral Token ${referral.tokenCode || referral.id}`,
        reason: `Specialist at ${user.facilityName} updated referral status to ${newStatus}`,
        accessGranted: true,
      });
    }

    updateReferralStatus(referral.id, newStatus, updates);
    onClose();
  };

  const handleAdmit = () => {
    handleStatusChange('ADMITTED', { assignedBedType: bedType });
  };

  const handleEscalate = () => {
    handleStatusChange('ESCALATED', { targetFacility: targetStateFacility });
  };

  const { addFollowUpTask } = useSync();

  const handleDischarge = () => {
    handleStatusChange('COMPLETED', {
      dischargeSummary: dischargeData,
      counterReferredTo: dischargeData.followUpFacility
    });

    if (user) {
      addFollowUpTask({
        id: `flw-task-ref-${referral.id}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientPhone: patient.phone,
        category: 'Post-Referral Check',
        dueDate: dischargeData.followUpDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'DUE',
        // PRIVACY: notes contain ONLY the minimum task instruction for the community care worker.
        // Clinical details (diagnosis, specialist notes, vitals, history) are intentionally
        // excluded. Authorized workers must use patient authorization to access clinical records.
        notes: `Patient discharged from ${user.facilityName}. Ensure community follow-up visit as directed. Contact PHC if symptoms recur.`,
        assignedAshaName: 'Assigned Community Health Worker',
        assignedFacilityId: referral.referringFacilityId,
        sourceReferralId: referral.id,
        createdByUserId: user.id,
        createdAt: new Date().toISOString(),
      });
      
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'CREATE_REFERRAL', // Using existing audit enum mapping
        resource: `FollowUpTask for ${referral.referringFacility}`,
        reason: 'Generated automated counter-referral post-discharge',
        accessGranted: true,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold">
              {isAuthorized ? `Process Referral: ${referral.tokenCode || referral.id}` : `Referral Summary: ${referral.tokenCode || referral.id}`}
            </h3>
            {!isAuthorized && (
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Coordination Only
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{patient.fullName} ({patient.age} {patient.gender})</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">ABHA: {patient.abhaId}</div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  referral.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                  referral.status === 'ADMITTED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  referral.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                  referral.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                  'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {referral.status}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Reason for Referral</div>
              <div className="text-sm text-slate-700 dark:text-slate-300 font-medium">"{referral.referralReason}"</div>
            </div>
          </div>

          {referral.status === 'CANCELLED' ? (
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 rounded-xl p-4 mt-2">
              <h4 className="text-rose-700 dark:text-rose-400 font-black text-sm flex items-center gap-2 mb-2">
                🔴 REFERRAL CANCELLED
              </h4>
              <p className="text-rose-600 dark:text-rose-300 text-xs font-medium mb-4">
                This referral was cancelled by {referral.referringFacility}.
              </p>
            </div>
          ) : !isAuthorized ? (
            <div className="space-y-4">
              {/* Security Alert Banner */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      Read-Only District Referral Coordination
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      {authDecision.reason}
                    </p>
                    <div className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-1.5 font-medium">
                      Under ABDM Least-Privilege Policy, clinical admission, ICU bed allocation, and treatment orders are restricted to the designated destination care team.
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Coordination Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Referral Coordination Parameters
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Referral ID / Token</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{referral.tokenCode || referral.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Origin Facility</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {referral.referringFacility}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Designated Destination</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-500" /> {referral.targetFacility}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Specialty Required</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3 text-indigo-500" /> {referral.specialtyRequired}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Triage Priority</span>
                    <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded ${referral.triagePriority === 'red' ? 'bg-rose-100 text-rose-700 border border-rose-200' : referral.triagePriority === 'yellow' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {referral.triagePriority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Current Status</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{referral.status}</span>
                  </div>
                </div>
              </div>

              {/* Redacted EHR Protection Notice */}
              <div className="p-3.5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200">
                  <Lock className="w-4 h-4 text-rose-500" />
                  <span className="font-medium">Complete Longitudinal EHR, Consultation Notes & Prescriptions</span>
                </div>
                <span className="font-bold text-rose-700 dark:text-rose-400 text-[10px] uppercase tracking-wider">
                  Restricted to Care Team
                </span>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition text-sm"
                >
                  Close Coordination Summary
                </button>
              </div>
            </div>
          ) : activeAction === 'NONE' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Action Notes (Optional)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add clinical notes before updating status..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-800 dark:text-white"></textarea>
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Available Actions</label>
                <div className="grid grid-cols-1 gap-3">
                  {(referral.status === 'PENDING') && (
                    <>
                      <button onClick={() => handleStatusChange('ACCEPTED')} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Accept Referral</button>
                      <button onClick={() => handleStatusChange('CANCELLED')} className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition flex items-center justify-center gap-2"><XCircle className="w-5 h-5" /> Reject Referral</button>
                    </>
                  )}
                  {(referral.status === 'ACCEPTED') && (
                    <>
                      <button onClick={() => setActiveAction('ADMIT')} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"><Building2 className="w-5 h-5" /> Admit Patient</button>
                      <button onClick={() => setActiveAction('ESCALATE')} className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl border border-purple-200 transition flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" /> Escalate</button>
                    </>
                  )}
                  {referral.status === 'ADMITTED' && (
                    <>
                      <button onClick={() => setActiveAction('ESCALATE')} className="w-full py-3 mb-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl border border-purple-200 transition flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" /> Escalate</button>
                      <button onClick={() => setActiveAction('DISCHARGE')} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow transition flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Discharge & Counter-Referral</button>
                    </>
                  )}
                  {referral.status === 'COMPLETED' && <div className="text-center p-3 text-sm text-slate-500 font-medium bg-slate-50 dark:bg-slate-800 rounded-xl">This referral has been completed.</div>}
                </div>
              </div>
            </>
          ) : activeAction === 'ADMIT' ? (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white">Bed Allocation</h4>
              <div>
                <label className="block text-sm font-semibold mb-2">Select Bed Type to Allocate</label>
                <select value={bedType} onChange={e => setBedType(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white">
                  <option value="occupiedBeds">General Ward Bed</option>
                  <option value="icuBedsOccupied">ICU Bed</option>
                  <option value="ventilatorsOccupied">Ventilator Bed</option>
                  <option value="oxygenBedsOccupied">Oxygen Bed</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveAction('NONE')} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-semibold">Cancel</button>
                <button onClick={handleAdmit} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold">Confirm Admission</button>
              </div>
            </div>
          ) : activeAction === 'ESCALATE' ? (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800/50">
                <h4 className="text-purple-800 dark:text-purple-300 font-black text-sm flex items-center gap-2 mb-2"><BrainCircuit className="w-5 h-5" /> AI-ASSISTED ROUTING</h4>
                <p className="text-xs text-purple-700/80 mb-3">Based on {patient.fullName}'s triage priority, ICU availability, and distance, here are the recommended facilities:</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-700 cursor-pointer">
                    <input type="radio" name="facility" value="Sassoon General Hospital & BJMC" checked={targetStateFacility === 'Sassoon General Hospital & BJMC'} onChange={e => setTargetStateFacility(e.target.value)} className="mt-1" />
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Sassoon General Hospital & BJMC (Recommended)</div>
                      <div className="text-[10px] text-slate-500 mt-1">✓ ICU capacity available ✓ Required tertiary capability ✓ Appropriate escalation level</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input type="radio" name="facility" value="State Cardiac Centre" checked={targetStateFacility === 'State Cardiac Centre'} onChange={e => setTargetStateFacility(e.target.value)} className="mt-1" />
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">State Cardiac Centre</div>
                      <div className="text-[10px] text-slate-500 mt-1">✓ Cardiology available ⚠️ Limited Ventilator capacity</div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveAction('NONE')} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-semibold">Cancel</button>
                <button onClick={handleEscalate} className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-bold">Confirm Escalation</button>
              </div>
            </div>
          ) : activeAction === 'DISCHARGE' ? (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white">Discharge Summary & Counter-Referral</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><label className="block text-xs font-bold mb-1">Final Diagnosis</label><input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.finalDiagnosis} onChange={e => setDischargeData({...dischargeData, finalDiagnosis: e.target.value})} /></div>
                <div><label className="block text-xs font-bold mb-1">Patient Condition</label><input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.patientCondition} onChange={e => setDischargeData({...dischargeData, patientCondition: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Treatment Provided</label><textarea className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.treatmentProvided} onChange={e => setDischargeData({...dischargeData, treatmentProvided: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Medicines</label><textarea className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.medicines} onChange={e => setDischargeData({...dischargeData, medicines: e.target.value})} /></div>
                <div><label className="block text-xs font-bold mb-1">Follow-up Date</label><input type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.followUpDate} onChange={e => setDischargeData({...dischargeData, followUpDate: e.target.value})} /></div>
                <div><label className="block text-xs font-bold mb-1">Counter-Referral Facility</label><input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.followUpFacility} onChange={e => setDischargeData({...dischargeData, followUpFacility: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold mb-1">Warning Signs (for ASHA/PHC)</label><input type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800" value={dischargeData.warningSigns} onChange={e => setDischargeData({...dischargeData, warningSigns: e.target.value})} /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveAction('NONE')} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg font-semibold">Cancel</button>
                <button onClick={handleDischarge} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold">Complete & Send Counter-Referral</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
