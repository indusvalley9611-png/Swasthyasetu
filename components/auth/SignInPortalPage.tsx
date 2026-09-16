'use client';

import React from 'react';
import { Role } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users,
  Stethoscope,
  Building2,
  HeartPulse,
  Languages,
  Moon,
  Sun,
  Phone,
  ArrowLeft,
  AlertTriangle,
  User,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface SignInPortalPageProps {
  onSelectRole: (role: Role | 'patient') => void;
  onOpenEmergency: () => void;
  onNavigateToPitch?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function SignInPortalPage({
  onSelectRole,
  onOpenEmergency,
  onNavigateToPitch,
  isDarkMode,
  onToggleDarkMode,
}: SignInPortalPageProps) {
  const { language, toggleLanguage } = useLanguage();
  const isMr = language === 'mr';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* ── 1. MINIMAL HEADER (Small brand header, no tagline/stats/badges, language toggle) ── */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-40 shadow-xs">
        
        {/* Left: Brand Identity Lockup + Optional Back to Overview Link */}
        <div className="flex items-center gap-4">
          {onNavigateToPitch && (
            <button
              onClick={onNavigateToPitch}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title={isMr ? 'माहिती पृष्ठावर परत जा' : 'Back to Overview'}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMr ? 'माहिती पृष्ठ' : 'Overview'}</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-xs shrink-0 shadow-xs">
              <HeartPulse className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
                Swasthya<span className="text-orange-500">Setu</span> / स्वास्थ्य<span className="text-emerald-500">सेतू</span>
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold leading-none mt-1">
                {isMr ? 'शासकीय आरोग्य पोर्टल प्रवेश' : 'Government Health Portal Gateway'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Theme & Neutral Language Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Neutral Language Selector: EN | मर */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Switch Language / भाषा बदला"
          >
            <Languages className="w-3.5 h-3.5 text-orange-500" />
            <span className="tracking-wide text-xs">
              <span className={!isMr ? 'text-slate-900 dark:text-white font-black' : 'text-slate-400 font-medium'}>EN</span>
              <span className="text-slate-400 mx-1">|</span>
              <span className={isMr ? 'text-slate-900 dark:text-white font-black' : 'text-slate-400 font-medium'}>मर</span>
            </span>
          </button>
        </div>
      </header>

      {/* ── 2. MAIN SIGN IN AREA (Minimal, fast, role selection in <10 seconds) ── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex flex-col justify-center space-y-6">
        
        {/* Section Title */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {isMr ? 'आरोग्य कार्यक्षेत्र निवडा' : 'Select Healthcare Workspace'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isMr
              ? 'आपल्या अधिकृत कार्यक्षेत्रावर क्लिक करून पडताळणी पूर्ण करा.'
              : 'Choose your authorized operational level to verify and sign in.'}
          </p>
        </div>

        {/* ── 4 ROLE WORKSPACE CARDS GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: ASHA / Sub-Centre (Orange) */}
          <button
            onClick={() => onSelectRole('asha')}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-orange-200 dark:border-orange-950/80 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-xl transition-all duration-200 text-left flex flex-col justify-between gap-4 cursor-pointer group scale-100 hover:scale-[1.01]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300">
                  {isMr ? 'उपकेंद्र व फील्ड' : 'SUB-CENTRE & FIELD'}
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'आशा सेविका व समुदाय आरोग्य' : 'ASHA & Community Health'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'गाव आरोग्य सर्वेक्षण, NCD तपासणी व ऑफलाईन संदर्भ सेवा.'
                    : 'Village population health surveys, NCD screening, and offline referrals.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
              <span>{isMr ? 'आशा पोर्टलमध्ये प्रवेश करा' : 'Sign in to ASHA Portal'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 2: PHC Team (Blue) */}
          <button
            onClick={() => onSelectRole('phc_doctor')}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-950/80 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all duration-200 text-left flex flex-col justify-between gap-4 cursor-pointer group scale-100 hover:scale-[1.01]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                  {isMr ? 'प्राथमिक आरोग्य केंद्र' : 'PRIMARY HEALTH CENTRE'}
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'प्राथमिक आरोग्य केंद्र (PHC Team)' : 'Primary Health Centre (PHC Team)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'वैद्यकीय अधिकारी, आरोग्य अधिकारी, परिचारिका व औषधनिर्माते.'
                    : 'Medical Officers, Community Health Officers, Nurses, and Pharmacists.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
              <span>{isMr ? 'PHC कार्यक्षेत्रात प्रवेश करा' : 'Sign in to PHC Workspace'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 3: District Hospital & Specialists (Purple) */}
          <button
            onClick={() => onSelectRole('specialist')}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-200 dark:border-purple-950/80 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl transition-all duration-200 text-left flex flex-col justify-between gap-4 cursor-pointer group scale-100 hover:scale-[1.01]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                  {isMr ? 'जिल्हा रुग्णालय' : 'DISTRICT HOSPITAL'}
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'जिल्हा रुग्णालय व तज्ज्ञ विभाग' : 'District Hospital & Specialists'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'तज्ज्ञ डॉक्टर, कॅज्युअल्टी ट्रायज, ICU खाट आरक्षण व आपत्कालीन कक्ष.'
                    : 'Specialist clinicians, casualty triage, ICU admissions, and emergency care.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>{isMr ? 'तज्ज्ञ विभागात प्रवेश करा' : 'Sign in to Specialist Desk'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card 4: DHO Command Center (Indigo) */}
          <button
            onClick={() => onSelectRole('district_officer')}
            className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-950/80 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl transition-all duration-200 text-left flex flex-col justify-between gap-4 cursor-pointer group scale-100 hover:scale-[1.01]"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  {isMr ? 'जिल्हा नियंत्रण कक्ष' : 'DISTRICT CONTROL'}
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'जिल्हा आरोग्य अधिकारी (DHO Command)' : 'District Health Officer (DHO Command)'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {isMr
                    ? 'जिल्हा आरोग्य नियंत्रण, महाऔषधी साठा पुनर्वितरण व जीआयएस ट्रॅकिंग.'
                    : 'District health officer, MahaAushadhi supply redistribution, and GIS tracking.'}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>{isMr ? 'DHO नियंत्रण कक्षात प्रवेश करा' : 'Sign in to DHO Command'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* ── CITIZEN & EMERGENCY BOTTOM ROW ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Citizen ABHA OTP Access */}
          <button
            onClick={() => onSelectRole('patient')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  {isMr ? 'नागरिक रुग्ण आरोग्य पोर्टल (आभा OTP)' : 'Citizen Patient Health Portal (ABHA OTP)'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMr ? 'वैयक्तिक आरोग्य नोंदी व संदर्भ टोकन डाउनलोड करा.' : 'Download personal EHR records and referral tokens.'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* 108 Emergency SOS Help */}
          <div className="p-4 rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200 truncate">
                  {isMr ? '१०८ तातडीची वैद्यकीय मदत' : '108 Emergency Medical SOS'}
                </h4>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 truncate">
                  {isMr ? 'रुग्ण व कुटुंबियांसाठी तात्काळ आपत्कालीन मार्गदर्शन.' : 'Instant emergency assistance for patients & families.'}
                </p>
              </div>
            </div>
            <button
              onClick={onOpenEmergency}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{isMr ? 'मदत मिळवा' : 'GET HELP'}</span>
            </button>
          </div>

        </div>

        {/* ── ONE-LINE COMPLIANCE FOOTER (No full badge row) ── */}
        <div className="pt-4 text-center border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {isMr
                ? 'केवळ अधिकृत आरोग्य कर्मचारी. माहिती तंत्रज्ञान कायदा २००० व ABDM मानकांनुसार नियंत्रित.'
                : 'Authorized personnel only. Governed under IT Act 2000 §43A & ABDM Health Facility Registry (HFR) standards.'}
            </span>
          </p>
        </div>

      </main>
    </div>
  );
}
