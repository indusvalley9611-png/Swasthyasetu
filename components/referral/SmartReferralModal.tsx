'use client';
import React, { useState, useMemo } from 'react';
import { Patient, Referral, Facility } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { recordAuditLog } from '@/lib/patientPrivacyService';
import {
  getRankedReferralFacilities,
  DEMO_DISTRICTS,
  HospitalRouteInfo,
  getRoadDistanceKm,
  getEstimatedTransitMinutes,
  formatTransitMinutes,
} from '@/lib/maharashtraGisEngine';
import { MaharashtraNetworkMap } from '../maps/MaharashtraNetworkMap';
import {
  X, Send, Activity, AlertTriangle, CheckCircle2, ChevronRight,
  Stethoscope, Clock, ShieldCheck, MapPin, Navigation, Compass,
  Bed, ArrowRight, Zap, Building2, Eye, Layers, Filter
} from 'lucide-react';

interface SmartReferralModalProps {
  patient: Patient;
  onClose: () => void;
  onReferralCreated: (referral: Referral) => void;
}

export function SmartReferralModal({
  patient,
  onClose,
  onReferralCreated,
}: SmartReferralModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { referrals, facilities, createReferral } = useSync();

  const existingActiveReferral = referrals.find(
    r => r.patientId === patient.id && !['COMPLETED', 'CANCELLED'].includes(r.status)
  ) || (patient.activeReferralId ? referrals.find(r => r.id === patient.activeReferralId && !['COMPLETED', 'CANCELLED'].includes(r.status)) : null);

  const [step, setStep] = useState<1 | 2>(1);
  const [showGisMapModal, setShowGisMapModal] = useState<boolean>(false);
  const [tierFilter, setTierFilter] = useState<'all' | 'Sub-Centre' | 'PHC' | 'Rural Hospital' | 'District Hospital' | 'Medical College'>('all');

  const [selectedSpecialty, setSelectedSpecialty] = useState(
    patient.gender === 'Female' && patient.isHighRiskPregnancy ? 'Obstetrics & Gynaecology' : 'General Medicine'
  );

  // Determine referring facility
  const originFacility = useMemo(() => {
    return facilities.find(f => f.id === user?.facilityId) ||
      facilities.find(f => f.name.toLowerCase().includes(user?.facilityName?.toLowerCase() || '')) ||
      facilities.find(f => f.id === 'fac-phc-velhe') ||
      facilities[0];
  }, [facilities, user]);

  // Calculate ranked referral facilities across all 3 tiers (Sub-Centre, PHC, Hospitals) in the 5 demo districts
  const rankedFacilities = useMemo(() => {
    if (!originFacility) return [];
    return getRankedReferralFacilities(originFacility, facilities, {
      requiredSpecialty: selectedSpecialty,
      limitToDemoDistricts: true,
    });
  }, [originFacility, facilities, selectedSpecialty]);

  // Filter by active tier filter if set
  const displayedFacilities = useMemo(() => {
    if (tierFilter === 'all') return rankedFacilities;
    return rankedFacilities.filter((r) => r.tierCategory === tierFilter);
  }, [rankedFacilities, tierFilter]);

  const defaultFacility = rankedFacilities[0]?.destination;

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(defaultFacility?.id || 'fac-phc-nasrapur');
  const [priority, setPriority] = useState<'routine' | 'high'>(patient.isHighRiskPregnancy ? 'high' : 'routine');
  const [reason, setReason] = useState(
    patient.isHighRiskPregnancy ? 'High risk pregnancy with severe anemia. Needs immediate secondary care observation.' : ''
  );

  // Selected Target Facility details
  const targetFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId) || defaultFacility || facilities[0];
  }, [facilities, selectedFacilityId, defaultFacility]);

  // Target facility road stats
  const targetFacilityStats = useMemo(() => {
    if (!originFacility || !targetFacility) return { distanceKm: 12, transitFormatted: '20 min', isShortest: true };
    const dist = getRoadDistanceKm(originFacility, targetFacility);
    const transitMin = getEstimatedTransitMinutes(dist, true);
    const isShortest = rankedFacilities[0]?.destination.id === targetFacility.id;
    return {
      distanceKm: dist,
      transitFormatted: formatTransitMinutes(transitMin),
      isShortest,
    };
  }, [originFacility, targetFacility, rankedFacilities]);

  if (existingActiveReferral) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                Referred
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-base">Active Referral In Progress</h3>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Patient:</span>
              <span className="font-bold text-slate-900 dark:text-white">{patient.fullName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">ABHA ID:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{patient.abhaId}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Referral Token:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{existingActiveReferral.tokenCode || existingActiveReferral.id}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Target Facility:</span>
              <span className="font-bold text-slate-900 dark:text-white">{existingActiveReferral.targetFacility}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Specialty:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{existingActiveReferral.specialtyRequired}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-extrabold text-[10px] uppercase">
                {existingActiveReferral.status}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            This patient already has an active referral. The system prevents duplicate active referrals for the same patient.
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const getTierBadge = (type: string) => {
    switch (type) {
      case 'Sub-Centre':
        return { label: 'Sub-Centre', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
      case 'PHC':
        return { label: 'PHC', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800' };
      case 'Rural Hospital':
        return { label: 'Rural Hospital', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
      case 'Medical College':
        return { label: 'Medical College (Apex)', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' };
      default:
        return { label: 'District Hospital', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800' };
    }
  };

  const handleSubmit = () => {
    const selectedFacName = targetFacility?.name || 'District Hospital Aundh, Pune';
    const refId = 'REF-' + Date.now().toString().slice(-6);
    const tokenCode = 'MH-REF-' + Date.now().toString().slice(-4);
    const createdAt = new Date().toISOString();

    const payloadObj = {
      type: 'SWASTHYASETU_REFERRAL',
      tokenCode,
      referralId: refId,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      patientAge: patient.age,
      patientGender: patient.gender,
      referringFacility: user?.facilityName || originFacility?.name || 'Velhe Primary Health Centre (PHC)',
      referringFacilityId: user?.facilityId || originFacility?.id || 'fac-phc-velhe',
      referringDoctorName: user?.name || 'Dr. Rajesh Deshmukh',
      targetFacility: selectedFacName,
      targetFacilityId: targetFacility?.id || 'fac-dh-pune',
      specialtyRequired: selectedSpecialty,
      triagePriority: (priority === 'high' ? 'red' : 'green') as 'red' | 'yellow' | 'green',
      triageScore: priority === 'high' ? 8 : 2,
      referralReason: reason || 'Specialist Evaluation & Inpatient Management',
      createdAt,
    };

    const newRef: Referral = {
      id: refId,
      tokenCode,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      patientAge: patient.age,
      patientGender: patient.gender,
      referringFacility: user?.facilityName || originFacility?.name || 'Velhe Primary Health Centre (PHC)',
      referringFacilityId: user?.facilityId || originFacility?.id || 'fac-phc-velhe',
      referringDoctorName: user?.name || 'Dr. Rajesh Deshmukh',
      referringUserId: user?.id || 'user-phc-01',
      targetFacility: selectedFacName,
      targetFacilityId: targetFacility?.id || 'fac-dh-pune',
      specialtyRequired: selectedSpecialty,
      triagePriority: (priority === 'high' ? 'red' : 'green') as 'red' | 'yellow' | 'green',
      triageScore: priority === 'high' ? 8 : 2,
      triageReasons: patient.isHighRiskPregnancy ? ['High-Risk Maternal Alert', 'Severe Anemia Protocol'] : [],
      vitalsAtReferral: patient.encounters[0]?.vitals || {
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 75,
        spO2: 98,
        respiratoryRate: 16,
        temperature: 37.0,
        consciousLevel: 'alert',
        recordedAt: createdAt,
      },
      qrPayload: JSON.stringify(payloadObj),
      referralReason: reason || 'Specialist Evaluation & Inpatient Management',
      status: 'PENDING',
      createdAt,
    };
    createReferral(newRef);

    recordAuditLog({
      userId: user?.id || 'user-phc-01',
      userName: user?.name || 'Dr. Rajesh Deshmukh',
      userRole: user?.role || 'phc_doctor',
      userFacility: user?.facilityName || 'Velhe Primary Health Centre (PHC)',
      administrativeLevel: user?.administrativeLevel || 'facility',
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      action: 'CREATE_REFERRAL',
      resource: 'Referral Token ' + newRef.tokenCode + ' to ' + selectedFacName + ' (' + targetFacilityStats.distanceKm + ' km)',
      accessGranted: true,
      reason: 'Clinical Referral Created: ' + selectedSpecialty + ' - ' + (reason || 'Specialist Evaluation'),
    });

    onReferralCreated(newRef);
    onClose();
  };

  const badge = getTierBadge(targetFacility?.type || 'PHC');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/40 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Create Smart Clinical Referral</h2>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Patient: <span className="text-slate-800 dark:text-slate-100">{patient.fullName}</span> ({patient.age}y, {patient.gender}) • ABHA: <span className="font-mono">{patient.abhaId}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-center items-center relative bg-white dark:bg-slate-900">
          <div className="w-full max-w-sm flex justify-between">
            {[
              { num: 1, label: 'Tier & Shortest Distance' },
              { num: 2, label: 'Review & Dispatch' }
            ].map(s => {
              const isActive = step === s.num;
              const isPast = step > s.num;
              return (
                <div key={s.num} className="relative z-10 flex flex-col items-center gap-1 bg-white dark:bg-slate-900 px-2">
                  <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all " + 
                    (isActive ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200' : 
                     isPast ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-600 text-teal-600' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400')}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <div className={"text-[10px] font-bold uppercase tracking-widest " + (isActive || isPast ? 'text-teal-900 dark:text-teal-200' : 'text-slate-400')}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800/50">
          
          {/* STEP 1: Details & Distance Map */}
          {step === 1 && (
            <div className="max-w-3xl mx-auto space-y-5 animate-in slide-in-from-right-8 duration-300">
              
              {patient.isHighRiskPregnancy && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-rose-900 dark:text-rose-200">High-Risk Pregnancy Flagged (Gestational Week {patient.gestationalWeeks})</div>
                    <div className="text-xs text-rose-700 dark:text-rose-400 font-medium mt-0.5">
                      System automatically prioritizes facilities with active OB-GYN and NICU capability on emergency duty.
                    </div>
                  </div>
                </div>
              )}

              {/* Destination Facility Card with GIS Map Trigger */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Healthcare Facility Routing (5 Demo Districts)</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Covering registered Sub-Centres, PHCs, and Hospitals across Pune, Satara, Ahmednagar, Solapur, and Thane.
                      </p>
                    </div>
                  </div>

                  {/* Interactive GIS Map Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowGisMapModal(true)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/60 text-teal-700 dark:text-teal-300 font-bold text-xs hover:bg-teal-100 dark:hover:bg-teal-800/40 transition-all shadow-sm cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    📍 View on GIS Map
                  </button>
                </div>

                {/* Tier Filter Quick Switcher */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Tier:
                  </span>
                  {[
                    { id: 'all', label: 'All Tiers (' + rankedFacilities.length + ')' },
                    { id: 'Sub-Centre', label: 'Sub-Centres (' + rankedFacilities.filter(r => r.tierCategory === 'Sub-Centre').length + ')' },
                    { id: 'PHC', label: 'PHCs (' + rankedFacilities.filter(r => r.tierCategory === 'PHC').length + ')' },
                    { id: 'Rural Hospital', label: 'Rural Hospitals (' + rankedFacilities.filter(r => r.tierCategory === 'Rural Hospital').length + ')' },
                    { id: 'District Hospital', label: 'District Hospitals (' + rankedFacilities.filter(r => r.tierCategory === 'District Hospital').length + ')' },
                    { id: 'Medical College', label: 'Medical Colleges (' + rankedFacilities.filter(r => r.tierCategory === 'Medical College').length + ')' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTierFilter(t.id as any);
                        const list = t.id === 'all' ? rankedFacilities : rankedFacilities.filter(r => r.tierCategory === t.id);
                        if (list.length > 0 && !list.some(r => r.destination.id === selectedFacilityId)) {
                          setSelectedFacilityId(list[0].destination.id);
                        }
                      }}
                      className={'px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ' + (
                        tierFilter === t.id
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Ranked Shortest Hospital / Facility Card */}
                {targetFacility && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50/60 via-slate-50 to-blue-50/40 dark:from-teal-950/30 dark:via-slate-900 dark:to-blue-950/20 border border-teal-200 dark:border-teal-900/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={'text-[10px] font-black uppercase px-2 py-0.5 rounded border ' + badge.color}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                          {targetFacilityStats.isShortest ? '⚡ Nearest Appropriate Facility' : 'Selected Facility'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {targetFacilityStats.distanceKm} km from {originFacility?.name.split(' ')[0]}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          (~{targetFacilityStats.transitFormatted} transit)
                        </span>
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {targetFacility.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {targetFacility.taluka} Taluka, {targetFacility.district} District • {targetFacility.totalBeds - targetFacility.occupiedBeds} Free Beds {targetFacility.icuBedsTotal > 0 ? '• ' + (targetFacility.icuBedsTotal - targetFacility.icuBedsOccupied) + ' ICU Available' : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Emergency Helpline</div>
                      <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {targetFacility.phone || '+91-20-27280300'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Facility & Specialty Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Target Healthcare Facility (Sorted by Road Distance)
                    </label>
                    <select
                      value={selectedFacilityId}
                      onChange={(e) => setSelectedFacilityId(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 bg-slate-50"
                    >
                      {displayedFacilities.map((r, i) => (
                        <option key={r.destination.id} value={r.destination.id}>
                          {i === 0 ? '⚡ ' : ''}[{r.tierCategory}] {r.destination.name} — {r.destination.district} ({r.distanceKm} km, {r.transitTimeFormatted})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                      Required Medical Specialty
                    </label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 bg-slate-50"
                    >
                      <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology (Maternal/NICU)</option>
                      <option value="Cardiology">Cardiology / Emergency Cardiac Care</option>
                      <option value="General Medicine">General Medicine</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Trauma & Emergency Care">Trauma & Emergency Care</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="General Surgery">General Surgery</option>
                    </select>
                  </div>
                </div>

                {/* Urgency Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Clinical Urgency</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPriority('high')}
                      className={"flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer " + (priority === 'high' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Critical / Red Priority (Immediate Triage)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('routine')}
                      className={"flex-1 py-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer " + (priority === 'routine' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50')}
                    >
                      <Clock className="w-4 h-4 text-blue-600" /> Routine / Elective Referral
                    </button>
                  </div>
                </div>

                {/* Referral Reason */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                    Clinical Referral Notes & Chief Complaints
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe patient symptoms, vitals observations, and reason for specialist escalation..."
                    rows={3}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none dark:bg-slate-800 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 cursor-pointer"
                >
                  Proceed to Final Confirmation <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Confirmation & Route Audit */}
          {step === 2 && (
            <div className="max-w-xl mx-auto space-y-5 text-center animate-in slide-in-from-right-8 duration-300 py-4">
              <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Confirm & Route Referral</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                  Referral token will be registered on the ABDM network and routed directly to {targetFacility?.name}.
                </p>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl text-left space-y-2.5 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Patient</span>
                  <span className="font-bold text-slate-900 dark:text-white">{patient.fullName} (ABHA: {patient.abhaId})</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Referring Facility</span>
                  <span className="font-bold text-slate-900 dark:text-white">{originFacility?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Target Facility</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">[{targetFacility?.type}] {targetFacility?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Distance & Transit</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {targetFacilityStats.distanceKm} km (~{targetFacilityStats.transitFormatted})
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Specialty Required</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedSpecialty}</span>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase">Priority</span>
                  <span className={"font-bold px-2 py-0.5 rounded " + (priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400')}>
                    {priority === 'high' ? 'CRITICAL / EMERGENCY' : 'ROUTINE'}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Dispatch Referral to {targetFacility?.name.split(',')[0]}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fullscreen Maharashtra Network GIS Map Modal */}
      {showGisMapModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="max-w-6xl w-full h-[88vh] rounded-3xl overflow-hidden shadow-2xl">
            <MaharashtraNetworkMap
              facilities={facilities}
              initialOriginFacilityId={originFacility?.id || 'fac-phc-velhe'}
              requiredSpecialty={selectedSpecialty}
              onSelectHospitalForReferral={(fac) => {
                setSelectedFacilityId(fac.id);
                setShowGisMapModal(false);
              }}
              onClose={() => setShowGisMapModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
