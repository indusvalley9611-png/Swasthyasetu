'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { Patient, Vitals } from '@/lib/types';
import {
  PageHeader,
  SectionHeader,
  KPICard,
  StatusBadge,
  AlertBanner,
  EmptyState,
} from '@/components/ui/design-system';
import RapidScreeningModal from '@/components/ehr/RapidScreeningModal';
import {
  Stethoscope,
  Activity,
  UserCheck,
  AlertTriangle,
  Bed,
  PlusCircle,
  Flame,
  Clock,
  HeartPulse,
  UserPlus,
  Building2,
  FileText,
  Search,
} from 'lucide-react';

export interface NurseDashboardProps {
  onOpenNewPatient: () => void;
  onOpenPatientTimeline: (patient: Patient) => void;
  onOpenAbhaCard: (patient: Patient) => void;
  onOpenReferral: (patient: Patient) => void;
}

export function NurseDashboard({
  onOpenNewPatient,
  onOpenPatientTimeline,
  onOpenAbhaCard,
  onOpenReferral,
}: NurseDashboardProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { patients, referrals } = useSync();

  const [selectedPatientForScreening, setSelectedPatientForScreening] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [careFilter, setCareFilter] = useState<'ALL' | 'PENDING_VITALS' | 'HIGH_RISK'>('ALL');

  // Filter patients within this PHC
  const facilityPatients = patients.filter((p) => {
    if (!user?.facilityId && !user?.facilityName) return true;
    return (
      p.assignedFacilityId === user?.facilityId ||
      p.assignedFacilityName === user?.facilityName ||
      p.taluka.toLowerCase() === (user?.taluka || '').toLowerCase()
    );
  });

  const searchedPatients = facilityPatients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.fullName.toLowerCase().includes(q) ||
      p.abhaId.toLowerCase().includes(q) ||
      p.village.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (careFilter === 'HIGH_RISK') {
      return p.isHighRiskPregnancy || (p.chronicConditions && p.chronicConditions.length > 0);
    }
    if (careFilter === 'PENDING_VITALS') {
      return p.encounters.length === 0 || p.encounters[p.encounters.length - 1].date !== new Date().toISOString().split('T')[0];
    }
    return true;
  });

  const highRiskCount = facilityPatients.filter(
    (p) => p.isHighRiskPregnancy || (p.chronicConditions && p.chronicConditions.length > 0)
  ).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-300 pb-16">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title={language === 'mr' ? 'केंद्रातील परिचारिका कार्यकक्ष' : 'In-Facility Nursing & Triage Console'}
        subtitle={language === 'mr' ? 'आरोग्य केंद्र वॉर्ड व प्राथमिक तपासणी' : 'Primary Care Ward & Triage Workflow'}
        facilityContext={user?.facilityName || 'Primary Health Centre'}
        badge={{
          label: language === 'mr' ? 'परिचारिका (GNM)' : 'Staff Nurse (Level 2)',
          level: 'facility',
        }}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewPatient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? '+ रुग्ण नोंदणी' : '+ New Patient'}</span>
            </button>
            <Link
              href="/maha-aushadhi"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-extrabold border border-rose-200 dark:border-rose-800 transition-colors"
              title="MahaAushadhi Emergency Medicine Grid"
            >
              <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>{language === 'mr' ? 'आपत्कालीन औषध' : 'Emergency Drug SOS'}</span>
            </Link>
          </div>
        }
      />

      {/* 2. COMPACT 4-CARD NURSE KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label={language === 'mr' ? 'केंद्रातील रुग्ण' : 'In-Facility Patients'}
          value={facilityPatients.length}
          subtext={language === 'mr' ? 'आजची नोंदणी' : 'Registered at PHC'}
          icon={UserCheck}
          color="blue"
          onClick={() => setCareFilter('ALL')}
        />
        <KPICard
          label={language === 'mr' ? 'तपासणी प्रलंबित' : 'Pending Vitals'}
          value={Math.max(1, facilityPatients.length - 2)}
          subtext={language === 'mr' ? 'तपासणीची प्रतीक्षा' : 'Awaiting Triage / BP'}
          icon={Clock}
          color="amber"
          onClick={() => setCareFilter('PENDING_VITALS')}
        />
        <KPICard
          label={language === 'mr' ? 'अतिधोकादायक रुग्ण' : 'High-Risk Cases'}
          value={highRiskCount}
          subtext={language === 'mr' ? 'HRP माता व तीव्र स्थिती' : 'Flagged for Doctor Review'}
          icon={AlertTriangle}
          color="rose"
          onClick={() => setCareFilter('HIGH_RISK')}
        />
        <KPICard
          label={language === 'mr' ? 'निरीक्षण खाटा' : 'Observation Beds'}
          value="4 / 6"
          subtext={language === 'mr' ? '६७% क्षमता' : '67% Ward Capacity'}
          icon={Bed}
          color="emerald"
        />
      </div>

      {/* 3. PRIMARY OPERATIONAL GRID (30% Ward & Orders / 70% Patient Vitals Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT / TOP: WARD & NURSING ORDERS (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* In-Facility Ward Occupancy */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <SectionHeader
              title={language === 'mr' ? 'वॉर्ड व खाटा स्थिती' : 'Ward Bed Status'}
              count="4 Occupied"
              icon={Bed}
            />

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {language === 'mr' ? 'महिला सामान्य वॉर्ड' : 'Female General Ward'}
                  </span>
                  <span className="text-[11px] text-slate-400">Bed #1, Bed #2 Occupied</span>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  2 / 3 Beds
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {language === 'mr' ? 'पुरुष सामान्य वॉर्ड' : 'Male General Ward'}
                  </span>
                  <span className="text-[11px] text-slate-400">Bed #1 Occupied (Observation)</span>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  1 / 2 Beds
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    {language === 'mr' ? 'प्रसूती कक्ष / प्रसूतीपूर्व खाट' : 'Maternity & Labour Observation'}
                  </span>
                  <span className="text-[11px] text-rose-500 font-semibold">Active ANC Observation</span>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  1 / 1 Full
                </span>
              </div>
            </div>
          </div>

          {/* Active Doctor Nursing Instructions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <SectionHeader
              title={language === 'mr' ? 'वैद्यकीय सूचना व उपचार' : 'Doctor Orders for Execution'}
              count="3 Pending"
              icon={Activity}
            />

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                  <span>Priya Sachin Kamble (24F)</span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold">ANC 34 WEEKS</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Order: Check hourly BP monitoring + Administer Inj. Tetanus Toxoid 0.5ml IM.
                </p>
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/40 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                  <span>Kiran Dattatray More (18M)</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold">POST-REFERRAL</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Order: Check respiratory rate & SpO2. Monitor hydration status.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PATIENT TRIAGE & VITALS QUEUE (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SectionHeader
              title={language === 'mr' ? 'रुग्ण ट्रायज व तपासणी यादी' : 'Patient Triage & Vitals Queue'}
              count={searchedPatients.length}
              icon={Stethoscope}
            />

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
              <button
                onClick={() => setCareFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  careFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All ({facilityPatients.length})
              </button>
              <button
                onClick={() => setCareFilter('PENDING_VITALS')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  careFilter === 'PENDING_VITALS'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setCareFilter('HIGH_RISK')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  careFilter === 'HIGH_RISK'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                High-Risk
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === 'mr' ? 'रुग्णाचे नाव किंवा ABHA द्वारे शोधा...' : 'Search patient by name, ABHA ID, or village...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Patient Queue Table */}
          {searchedPatients.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={language === 'mr' ? 'कोणतेही प्रलंबित रुग्ण नाहीत' : 'No patients match filter'}
              description={language === 'mr' ? 'सध्या तपासणीसाठी कोणतेही रुग्ण रांगेत नाहीत.' : 'All registered patients have had vitals taken or no matches found.'}
            />
          ) : (
            <div className="space-y-1.5">
              {searchedPatients.map((patient) => {
                const isHighRisk = patient.isHighRiskPregnancy || (patient.chronicConditions && patient.chronicConditions.length > 0);
                const needsVitals = patient.encounters.length === 0 ||
                  patient.encounters[patient.encounters.length - 1].date !== new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isHighRisk
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {patient.fullName.charAt(0)}
                    </div>

                    {/* Name + demographics */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{patient.fullName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {patient.age}y · {patient.gender} · {patient.village}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {isHighRisk ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          High-Risk
                        </span>
                      ) : needsVitals ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          Needs Vitals
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Screened
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setSelectedPatientForScreening(patient)}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                        title="Record Vitals"
                      >
                        Record Vitals
                      </button>
                      <button
                        onClick={() => onOpenPatientTimeline(patient)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-colors text-xs cursor-pointer"
                        title="View Patient Care Timeline"
                      >
                        Timeline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Rapid Screening Modal for Nurse Vitals Intake */}
      {selectedPatientForScreening && (
        <RapidScreeningModal
          patient={selectedPatientForScreening}
          onClose={() => setSelectedPatientForScreening(null)}
        />
      )}
    </div>
  );
}
