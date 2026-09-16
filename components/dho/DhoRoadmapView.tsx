'use client';

import React from 'react';
import {
  Compass,
  FileCode2,
  ShieldCheck,
  Eye,
  MessageSquare,
  Languages,
  RotateCcw,
  PackageCheck,
  Truck,
  Megaphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export function DhoRoadmapView() {
  const roadmapPillars = [
    {
      id: 'pillar-1',
      title: 'FHIR R4-Shaped Data Models',
      subtitle: 'ABDM HL7 FHIR Compliance',
      icon: FileCode2,
      badge: 'Architecture Planned',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description:
        'Transform all internal patient, encounter, and prescription schemas to strict HL7 FHIR R4 resources (Patient, Encounter, Condition, MedicationRequest, ServiceRequest) with ABDM Milestone 1, 2, 3 verification wrappers.',
      deliverables: [
        'FHIR Resource Serialization Engine for offline JSON blobs',
        'ABDM Health Information Provider (HIP) & User (HIU) Bridge',
        'Standard SNOMED CT and ICD-10 clinical coding mapping',
      ],
    },
    {
      id: 'pillar-2',
      title: 'Enforced Multi-District RBAC Scoping',
      subtitle: 'Tenant Isolation & Inter-District Gateways',
      icon: ShieldCheck,
      badge: 'Security Architecture',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      description:
        'Cryptographic JWT token assertions guaranteeing that district officers cannot view or mutate clinical data outside their assigned LGD District Code, with an authorized inter-district mutual consensus handshake.',
      deliverables: [
        'Multi-tenant database schema with strict RLS (Row Level Security)',
        'District Border Divert protocol for contiguous districts',
        'Cross-district emergency trauma referral handoff',
      ],
    },
    {
      id: 'pillar-3',
      title: 'WCAG 2.1 AA Accessibility & Low-Bandwidth UI',
      subtitle: 'Universal Accessibility for Field Healthcare',
      icon: Eye,
      badge: 'Inclusive Design',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        'Full compliance with WCAG 2.1 Level AA: screen-reader ARIA live regions, 4.5:1 color contrast ratios, keyboard navigation shortcuts for casualty desks, and sub-50KB initial payload for 2G rural edge devices.',
      deliverables: [
        'ARIA Live announcements for real-time emergency triage popups',
        'High-contrast daylight mode for ASHA outdoor tablet use',
        'Full keyboard navigation matrix for clinical casualty operators',
      ],
    },
    {
      id: 'pillar-4',
      title: 'WhatsApp & SMS Field-Worker Escalation Gateway',
      subtitle: 'Direct ASHA / ANM Omnichannel Triggers',
      icon: MessageSquare,
      badge: 'Communication Pipeline',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      description:
        'Automated two-way WhatsApp Business API & CDAC SMS Gateway integration notifying ASHAs instantly when their high-risk pregnant patient or referred infant is admitted or discharged at District Hospital.',
      deliverables: [
        'Automated Marathi/Hindi SMS OTP & case token delivery',
        'WhatsApp bot for ASHA post-discharge follow-up confirmation',
        'Missed-call IVR fallback for offline remote tribal pockets',
      ],
    },
    {
      id: 'pillar-5',
      title: 'Full Multilingual i18n Localization',
      subtitle: 'Deep Language Parity across MH Dialects',
      icon: Languages,
      badge: 'Localization',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      description:
        'Expand beyond Marathi and English to include Hindi and regional tribal dialects (Gondi, Korku, Bhili) across all patient-facing consent forms, discharge summaries, and prescription audio readouts.',
      deliverables: [
        'Complete i18n dictionary for all 11 DHO analytic modules',
        'Voice-assisted vitals recording in regional Marathi dialects',
        'Bilingual printable ABHA cards with QR verification',
      ],
    },
    {
      id: 'pillar-6',
      title: 'Discharge-to-PHC Counter-Referral Loop',
      subtitle: 'Closed-Loop Post-Operative Community Care',
      icon: RotateCcw,
      badge: 'Continuity of Care',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
      description:
        'Upon patient discharge from District Hospital, an automated counter-referral task is generated directly in the local PHC Medical Officer and ASHA queue for 48h, 7-day, and 30-day post-op wound/medication checks.',
      deliverables: [
        'Structured Discharge Summary export with follow-up protocols',
        'Automatic ASHA task scheduler with reminder escalation',
        'Readmission risk scoring algorithm to prevent relapses',
      ],
    },
    {
      id: 'pillar-7',
      title: 'MahaAushadhi Procurement & State Requisition',
      subtitle: 'Automated Drug Warehouse Supply Chain',
      icon: PackageCheck,
      badge: 'Supply Chain Integration',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      description:
        'Direct API linkage with the Government of Maharashtra MahaAushadhi procurement portal for automated purchase orders when district-wide buffer thresholds drop below 15 days of predicted consumption.',
      deliverables: [
        'Automated Purchase Requisition (PR) generation for District Medicals',
        'Batch expiry tracking with auto-redistribution before expiration',
        'Cold-chain temperature telemetry sensor integration',
      ],
    },
    {
      id: 'pillar-8',
      title: 'GPS-Tracked Ambulance Fleet Dispatch (108/102)',
      subtitle: 'Dynamic Emergency Transit Optimization',
      icon: Truck,
      badge: 'Fleet Intelligence',
      badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      description:
        'Live GIS tracking of EMS 108 and Janani Shishu 102 ambulances with dynamic routing to the nearest hospital with available specialist beds and verified blood bank supply.',
      deliverables: [
        'Real-time GPS telemetry overlay on District Hospital map',
        'Automated ETA estimation based on Western Ghats road topography',
        'Pre-arrival vital signs streaming from ambulance to Casualty desk',
      ],
    },
    {
      id: 'pillar-9',
      title: 'Public Health Campaign & Outbreak Tracking',
      subtitle: 'Epidemiological Field Surveillance',
      icon: Megaphone,
      badge: 'Public Health Analytics',
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      description:
        'Macro tracking for Pulse Polio, Mission Indradhanush, NCD hypertension/diabetes screenings, and vector-borne monsoon surveys linked directly to village-level census registers.',
      deliverables: [
        'Village immunization heatmap with dropout identification',
        'NCD population screening registry across PHC sub-centres',
        'Seasonal vector survey logging for DHO epidemic control',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
              <Compass className="w-3 h-3 text-indigo-400" />
              FUTURE ARCHITECTURE ROADMAP
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
              STRATEGIC EVOLUTION (SIH26133)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-1">
            Next-Generation Rural Healthcare Architecture
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Key architectural foundations designed for nationwide scale, FHIR compliance, and deep community integration.
          </p>
        </div>
      </div>

      {/* 9 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roadmapPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs border border-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${pillar.badgeColor}`}>
                    {pillar.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {pillar.title}
                  </h3>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                    {pillar.subtitle}
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>

              {/* Deliverables Checklist */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Core Implementation Milestones:
                </span>
                {pillar.deliverables.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
