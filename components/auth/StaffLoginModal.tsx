'use client';

import React, { useState } from 'react';
import { useAuth, PRE_REGISTERED_STAFF } from '@/context/AuthContext';
import { Role, UserProfile } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users,
  Stethoscope,
  HeartPulse,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Languages,
  ArrowRight,
  Smartphone,
  Check,
} from 'lucide-react';

interface StaffLoginModalProps {
  onClose: () => void;
  initialRole?: Role;
}

export type StaffTier = 'asha' | 'phc' | 'specialist' | 'district_officer';

export function StaffLoginModal({ onClose, initialRole }: StaffLoginModalProps) {
  const { sendOtp, verifyOtp } = useAuth();
  const { language, toggleLanguage } = useLanguage();

  const isMr = language === 'mr';

  // Determine active portal tier based on the initial role
  const getActiveTier = (r?: Role): StaffTier => {
    if (!r) return 'phc';
    if (r === 'asha') return 'asha';
    if (r === 'specialist') return 'specialist';
    if (r === 'district_officer') return 'district_officer';
    return 'phc';
  };

  const activeTier = getActiveTier(initialRole);
  const allStaff: UserProfile[] = Object.values(PRE_REGISTERED_STAFF);

  // Filter staff by role tier
  const filterStaff = (tier: StaffTier): UserProfile[] => {
    switch (tier) {
      case 'asha':
        return allStaff.filter((s) => s.role === 'asha');
      case 'phc':
        if (initialRole === 'nurse') return allStaff.filter((s) => s.role === 'nurse');
        if (initialRole === 'pharmacist') return allStaff.filter((s) => s.role === 'pharmacist');
        return allStaff.filter((s) => s.role === 'phc_doctor' || s.role === 'nurse' || s.role === 'pharmacist');
      case 'specialist':
        return allStaff.filter((s) => s.role === 'specialist');
      case 'district_officer':
        return allStaff.filter((s) => s.role === 'district_officer');
      default:
        return allStaff.filter((s) => s.role === 'phc_doctor');
    }
  };

  const staffList = filterStaff(activeTier);

  // Initial staff selection
  const initialStaff =
    (initialRole ? allStaff.find((s) => s.role === initialRole) : null) ||
    staffList[0] ||
    allStaff[0];

  const [phone, setPhone] = useState(initialStaff?.phone || '9822019284');
  const [showPhone, setShowPhone] = useState(false);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
  const [errorMessage, setErrorMessage] = useState('');
  const [simulatedSms, setSimulatedSms] = useState<{ phone: string; otp: string } | null>(null);

  // Role visual and copy configuration (Pillar 7)
  const roleConfig = {
    asha: {
      accent: 'orange',
      icon: Users,
      badgeEn: 'SUB-CENTRE & FIELD',
      badgeMr: 'उपकेंद्र व फील्ड',
      titleEn: 'ASHA & Community Health Portal Login',
      titleMr: 'आशा सेविका व समुदाय आरोग्य पोर्टल प्रवेश',
      facilityNameEn: 'Ambavane & Pasali Sub-Centres',
      facilityNameMr: 'आंबवणे व पासली उपकेंद्र',
      subEn: 'Velhe & Nasrapur Field & Sub-Centre Network',
      subMr: 'वेल्हे व नसरापूर उपकेंद्रे आणि वाड्या-वस्त्या',
      bgHeader: 'bg-slate-900',
      iconBg: 'bg-orange-600',
      iconText: 'text-orange-400',
      ringColor: 'focus:ring-orange-500',
      selectedCard: 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-500 ring-2 ring-orange-500/20 shadow-sm',
      selectedBtn: 'bg-orange-600 text-white font-black shadow-xs',
      submitBtn: 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20',
      statusList: [
        { en: '● Synced · Just now', mr: '● सिंक: नुकतेच', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
        { en: '● Offline DB · Ready', mr: '● ऑफलाईन DB: सज्ज', color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800' },
        { en: '● Active · 3m ago', mr: '● सक्रिय: ३ मि. पूर्वी', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800' },
        { en: '● Queue: 0 pending', mr: '● रांग: ० प्रलंबित', color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
      ],
    },
    phc: {
      accent: 'blue',
      icon: Stethoscope,
      badgeEn: 'PRIMARY HEALTH CENTRE',
      badgeMr: 'प्राथमिक आरोग्य केंद्र',
      titleEn: 'Primary Health Centre (PHC) Login',
      titleMr: 'प्राथमिक आरोग्य केंद्र (PHC) कर्मचारी प्रवेश',
      facilityNameEn: 'Velhe & Nasrapur Primary Health Centres',
      facilityNameMr: 'वेल्हे व नसरापूर प्राथमिक आरोग्य केंद्र',
      subEn: 'Velhe PHC & Nasrapur PHC Catchment Areas',
      subMr: 'वेल्हे प्रा.आ.के. व नसरापूर प्रा.आ.के. कार्यक्षेत्र',
      bgHeader: 'bg-slate-900',
      iconBg: 'bg-blue-600',
      iconText: 'text-blue-400',
      ringColor: 'focus:ring-blue-500',
      selectedCard: 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-sm',
      selectedBtn: 'bg-blue-600 text-white font-black shadow-xs',
      submitBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20',
      statusList: [
        { en: '● OPD Live · Synced', mr: '● OPD थेट: समक्रमित', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
        { en: '● Active · 2m ago', mr: '● सक्रिय: २ मि. पूर्वी', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800' },
        { en: '● Stock: Optimal', mr: '● साठा: समाधानकारक', color: 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800' },
        { en: '● Duty Active', mr: '● कर्तव्यावर हजर', color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
      ],
    },
    specialist: {
      accent: 'purple',
      icon: HeartPulse,
      badgeEn: 'DISTRICT HOSPITAL',
      badgeMr: 'जिल्हा रुग्णालय',
      titleEn: 'District Hospital & Specialist Login',
      titleMr: 'जिल्हा रुग्णालय तज्ज्ञ व कॅज्युअल्टी प्रवेश',
      facilityNameEn: 'District Hospital Aundh, Pune',
      facilityNameMr: 'औंध जिल्हा रुग्णालय, पुणे',
      subEn: 'District Hospital Aundh & Specialist Casualty Network',
      subMr: 'औंध जिल्हा रुग्णालय व तज्ज्ञ अपघात विभाग नेटवर्क',
      bgHeader: 'bg-slate-900',
      iconBg: 'bg-purple-600',
      iconText: 'text-purple-400',
      ringColor: 'focus:ring-purple-500',
      selectedCard: 'bg-purple-50/80 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20 shadow-sm',
      selectedBtn: 'bg-purple-600 text-white font-black shadow-xs',
      submitBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20',
      statusList: [
        { en: '● Casualty Desk · Live', mr: '● अपघात विभाग: थेट', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
        { en: '● ICU Grid · Linked', mr: '● ICU ग्रीड: संलग्न', color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
        { en: '● On Call · Ready', mr: '● ऑन कॉल: सज्ज', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800' },
        { en: '● Active · 5m ago', mr: '● सक्रिय: ५ मि. पूर्वी', color: 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800' },
      ],
    },
    district_officer: {
      accent: 'indigo',
      icon: Building2,
      badgeEn: 'DISTRICT CONTROL',
      badgeMr: 'जिल्हा नियंत्रण कक्ष',
      titleEn: 'District Health Officer (DHO Command) Login',
      titleMr: 'जिल्हा आरोग्य अधिकारी (DHO कमांड) प्रवेश',
      facilityNameEn: 'Pune District Health Office & Command Center',
      facilityNameMr: 'पुणे जिल्हा आरोग्य नियंत्रण व समन्वय कक्ष',
      subEn: 'Pune District Health Control & Resource Coordination Center',
      subMr: 'पुणे जिल्हा आरोग्य नियंत्रण व संसाधन समन्वय केंद्र',
      bgHeader: 'bg-slate-900',
      iconBg: 'bg-indigo-600',
      iconText: 'text-indigo-400',
      ringColor: 'focus:ring-indigo-500',
      selectedCard: 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm',
      selectedBtn: 'bg-indigo-600 text-white font-black shadow-xs',
      submitBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20',
      statusList: [
        { en: '● District Grid · Live', mr: '● जिल्हा ग्रीड: थेट', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' },
        { en: '● Supply Command · Synced', mr: '● पुरवठा नियंत्रण: सिंक', color: 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800' },
        { en: '● Active · 1m ago', mr: '● सक्रिय: १ मि. पूर्वी', color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800' },
        { en: '● System Admin', mr: '● सिस्टीम प्रशासक', color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800' },
      ],
    },
  }[activeTier];

  const CurrentIcon = roleConfig.icon;

  // Mask phone helper (Pillar 3)
  const maskPhone = (num: string) => {
    if (!num || num.length < 4) return num;
    const start = num.slice(0, 2);
    const end = num.slice(-2);
    return `${start}•••• ••${end}`;
  };

  const selectedStaffMember = staffList.find((s) => s.phone === phone) || staffList[0];
  const currentFacilityName = isMr ? roleConfig.facilityNameMr : roleConfig.facilityNameEn;

  const handleSelectStaff = (selectedPhone: string) => {
    setPhone(selectedPhone);
    setErrorMessage('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!phone || phone.trim().length < 10) {
      setErrorMessage(
        isMr
          ? 'कृपया वैध १०-अंकी मोबाईल क्रमांक प्रविष्ट करा.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }
    const result = await sendOtp(phone.trim());
    if (result.success) {
      const generatedCode = result.otp || '123456';
      setSimulatedSms({ phone: phone.trim(), otp: generatedCode });
      setStep('OTP');
      setOtp(generatedCode);
    } else {
      setErrorMessage(
        result.error || (isMr ? 'OTP पाठवण्यात अयशस्वी.' : 'Failed to send OTP.')
      );
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const codeToVerify = otp.trim() || simulatedSms?.otp || '123456';
    const result = await verifyOtp(phone.trim(), codeToVerify);
    if (result.success) {
      setStep('SUCCESS');
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setErrorMessage(
        result.error || (isMr ? 'अवैध OTP कोड.' : 'Invalid OTP code.')
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* ── 1. MODAL HEADER (Same layout, role-accented, neutral language toggle, bilingual brandmark) ── */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl ${roleConfig.iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}>
              <CurrentIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="modal-title" className="font-black text-sm sm:text-base text-white truncate">
                  {isMr ? roleConfig.titleMr : roleConfig.titleEn}
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.2 rounded bg-slate-800 text-slate-300 font-bold hidden sm:inline">
                  SwasthyaSetu / स्वास्थ्यसेतू
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {isMr ? roleConfig.subMr : roleConfig.subEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Neutral Language Selector (Pillar 1) */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title={isMr ? 'भाषा बदला' : 'Switch Language'}
            >
              <Languages className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] tracking-wide">
                <span className={!isMr ? 'text-white font-black' : 'text-slate-400 font-medium'}>EN</span>
                <span className="text-slate-600 mx-0.5">|</span>
                <span className={isMr ? 'text-white font-black' : 'text-slate-400 font-medium'}>मर</span>
              </span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={isMr ? 'खिडकी बंद करा' : 'Close login modal'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-xs">

          {/* ── 2. SHARED-DEVICE SPEC CLARIFICATION (Pillar 2) ── */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              {isMr ? (
                <>
                  <strong>{currentFacilityName}</strong> येथे नोंदणीकृत. आपले प्रोफाईल निवडा आणि पडताळणी करा.
                </>
              ) : (
                <>
                  Registered to <strong>{currentFacilityName}</strong>. Select your profile, then verify.
                </>
              )}
            </p>
          </div>

          {/* ── SIMULATED SMS NOTIFICATION GATEWAY (When OTP Sent) ── */}
          {simulatedSms && step === 'OTP' && (
            <div 
              onClick={() => setOtp(simulatedSms.otp)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setOtp(simulatedSms.otp);
              }}
              className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600 rounded-2xl p-3.5 space-y-1 text-emerald-950 dark:text-emerald-100 animate-in slide-in-from-top-2 shadow-xs cursor-pointer hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              title={isMr ? 'OTP कोड स्वयंचलित भरण्यासाठी क्लिक करा' : 'Click to auto-fill OTP'}
            >
              <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{isMr ? 'शासकीय SMS गेटवे (चाचणी)' : 'SIMULATED GOVT SMS GATEWAY'}</span>
                </span>
                <span className="font-mono text-[10px]">MH-GOVT-AUTH</span>
              </div>
              <p className="text-xs font-mono font-medium pt-0.5">
                {isMr ? (
                  <>
                    &ldquo;आपला स्वास्थ्यसेतू पोर्टल OTP{' '}
                    <strong className="text-emerald-900 dark:text-emerald-200 font-black text-sm underline">{simulatedSms.otp}</strong>{' '}
                    आहे. १० मिनिटांसाठी वैध. कोणाशीही शेअर करू नका.&rdquo;
                  </>
                ) : (
                  <>
                    &ldquo;Your SwasthyaSetu Portal OTP is{' '}
                    <strong className="text-emerald-900 dark:text-emerald-200 font-black text-sm underline">{simulatedSms.otp}</strong>. Valid for
                    10 mins. Do not share this OTP.&rdquo;
                  </>
                )}
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold pt-0.5 flex items-center gap-1">
                <span>⚡</span>
                <span>{isMr ? 'OTP कोड भरण्यासाठी येथे क्लिक करा' : 'Click to auto-fill OTP code'}</span>
              </p>
            </div>
          )}

          {/* ── STEP 1: PHONE NUMBER & PROFILE SELECTION ── */}
          {step === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              
              {/* Phone Input with Default Masking & Show Toggle (Pillar 3) */}
              <div>
                <label htmlFor="phone-input" className="block font-bold text-slate-800 dark:text-slate-200 mb-1 text-xs">
                  {isMr ? 'नोंदणीकृत शासकीय मोबाईल क्रमांक' : 'Registered Government Mobile Number'}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 font-bold text-slate-600 dark:text-slate-400 font-mono text-xs select-none">
                    +91
                  </span>
                  <input
                    id="phone-input"
                    type="text"
                    required
                    maxLength={showPhone ? 10 : 15}
                    value={showPhone ? phone : maskPhone(phone)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPhone(val);
                    }}
                    onFocus={() => {
                      if (!showPhone) setShowPhone(true);
                    }}
                    className={`w-full pl-12 pr-20 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:ring-2 ${roleConfig.ringColor} focus:outline-hidden bg-white dark:bg-slate-800 dark:text-white shadow-2xs`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPhone(!showPhone)}
                    className="absolute right-2 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title={showPhone ? (isMr ? 'क्रमांक लपवा' : 'Hide phone number') : (isMr ? 'क्रमांक दाखवा' : 'Show phone number')}
                  >
                    {showPhone ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>{isMr ? 'लपवा' : 'Hide'}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>{isMr ? 'दाखवा' : 'Show'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Staff Profile Cards Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {isMr ? 'आपले प्रोफाईल निवडा:' : 'Select Your Staff Profile:'}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {isMr ? 'निवडण्यासाठी कार्डवर क्लिक करा' : 'Click card to select profile'}
                  </span>
                </div>

                <div className={`grid ${staffList.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2.5 max-h-56 overflow-y-auto pr-1`}>
                  {staffList.map((stf, idx) => {
                    const isSelected = phone === stf.phone;
                    const statusChip = roleConfig.statusList[idx % roleConfig.statusList.length];

                    return (
                      <div
                        key={stf.id || stf.phone}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => handleSelectStaff(stf.phone)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectStaff(stf.phone);
                          }
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer focus:ring-2 ${roleConfig.ringColor} focus:outline-hidden hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? roleConfig.selectedCard
                            : 'bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-400 shadow-2xs'
                        }`}
                      >
                        {/* Name & Meaningful Live Status Badge (Pillar 5) */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="font-black text-slate-900 dark:text-white text-xs truncate">
                            {stf.name}
                          </div>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${statusChip.color}`}
                          >
                            {isMr ? statusChip.mr : statusChip.en}
                          </span>
                        </div>

                        {/* Role Title */}
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                          {isMr ? stf.roleTitleMr : stf.roleTitleEn}
                        </div>

                        {/* Facility & Village Context */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {stf.facilityName}
                        </div>

                        {/* Bottom Row: Masked Mobile + Non-Disabled Active Select Button (Pillars 3 & 4) */}
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-700/80">
                          <span className="font-mono font-medium text-slate-500 dark:text-slate-400">
                            +91 {showPhone ? stf.phone : maskPhone(stf.phone)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectStaff(stf.phone);
                            }}
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                              isSelected
                                ? roleConfig.selectedBtn
                                : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 shadow-2xs'
                            }`}
                          >
                            {isSelected ? (isMr ? '✓ निवडले' : '✓ Selected') : (isMr ? 'निवडा' : 'Select')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div role="alert" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Button (Single Language Only, Pillar 1) */}
              <button
                type="submit"
                className={`w-full py-3 ${roleConfig.submitBtn} font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer`}
              >
                <KeyRound className="w-4 h-4" />
                <span>{isMr ? 'ABDM पडताळणी कोड (OTP) पाठवा' : 'Send ABDM Verification OTP'}</span>
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP VERIFICATION ── */}
          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <label htmlFor="otp-input" className="block font-black text-slate-900 dark:text-white text-sm">
                  {isMr ? '६-अंकी पडताळणी कोड (OTP) प्रविष्ट करा' : 'Enter 6-Digit Verification OTP'}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isMr ? (
                    <>
                      नोंदणीकृत क्रमांक <strong>+91 {showPhone ? phone : maskPhone(phone)}</strong> वर पाठवला
                    </>
                  ) : (
                    <>
                      Sent to registered mobile <strong>+91 {showPhone ? phone : maskPhone(phone)}</strong>
                    </>
                  )}
                </p>
                <div className="pt-2 max-w-xs mx-auto">
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={`w-full text-center tracking-[0.3em] text-xl font-mono font-black px-4 py-3 border-2 border-slate-300 dark:border-slate-700 rounded-2xl focus:border-${roleConfig.accent}-600 focus:ring-2 focus:ring-${roleConfig.accent}-500/20 focus:outline-hidden bg-white dark:bg-slate-800 dark:text-white shadow-xs`}
                  />
                </div>
              </div>

              {errorMessage && (
                <div role="alert" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-3 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="w-1/3 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  {isMr ? 'मागे जा' : 'Back'}
                </button>
                <button
                  type="submit"
                  className={`w-2/3 py-2.5 ${roleConfig.submitBtn} font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer`}
                >
                  <Lock className="w-4 h-4" />
                  <span>{isMr ? 'पडताळणी करा व प्रवेश करा' : 'Verify & Sign In'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: SUCCESS STATE ── */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                {isMr ? 'ओळख पडताळली व खाते यशस्वीरित्या जोडले गेले!' : 'Identity Verified & Facility Bound Successfully!'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {isMr ? 'आपल्या अधिकृत आरोग्य डॅशबोर्डवर नेले जात आहे...' : 'Redirecting to your authorized health workspace...'}
              </p>
            </div>
          )}

          {/* ── ABDM / HFR SECURITY FOOTER ── */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {isMr
                  ? 'ABDM आरोग्य सुविधा नोंदवही (HFR) मानकांनुसार संरक्षित.'
                  : 'Protected under ABDM Health Facility Registry (HFR) standards.'}
              </span>
            </div>
            <span className="font-mono text-slate-400">IT Act 2000 §43A</span>
          </div>

        </div>
      </div>
    </div>
  );
}
