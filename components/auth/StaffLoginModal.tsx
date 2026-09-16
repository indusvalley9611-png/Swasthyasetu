'use client';

import React, { useState } from 'react';
import { useAuth, PRE_REGISTERED_STAFF } from '@/context/AuthContext';
import { Role } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  ShieldCheck,
  Phone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  UserCheck,
  Send,
  Lock,
} from 'lucide-react';

interface StaffLoginModalProps {
  onClose: () => void;
  initialRole?: Role;
}

export type StaffTier = 'asha' | 'phc' | 'district' | 'state' | 'national';

export function StaffLoginModal({ onClose, initialRole }: StaffLoginModalProps) {
  const { sendOtp, verifyOtp, user } = useAuth();
  const { language } = useLanguage();

  const allStaff = Object.values(PRE_REGISTERED_STAFF);

  const getInitialTier = (r?: Role): StaffTier => {
    if (!r) return 'phc';
    if (r === 'asha') return 'asha';
    if (r === 'phc_doctor' || r === 'nurse' || r === 'pharmacist') return 'phc';
    if (r === 'specialist' || r === 'district_officer') return 'district';
    if (r === 'state_admin') return 'state';
    if (r === 'national_admin') return 'national';
    return 'phc';
  };

  const activeTier: StaffTier = getInitialTier(initialRole);

  const filterStaffByTier = (tier: StaffTier) => {
    switch (tier) {
      case 'asha':
        return allStaff.filter((s) => s.role === 'asha');
      case 'phc':
        if (initialRole === 'nurse') return allStaff.filter((s) => s.role === 'nurse');
        if (initialRole === 'pharmacist') return allStaff.filter((s) => s.role === 'pharmacist');
        return allStaff.filter((s) => s.role === 'phc_doctor' || s.role === 'nurse' || s.role === 'pharmacist');
      case 'district':
        if (initialRole === 'district_officer') return allStaff.filter((s) => s.role === 'district_officer');
        if (initialRole === 'specialist') return allStaff.filter((s) => s.role === 'specialist');
        return allStaff.filter((s) => s.role === 'district_officer' || s.role === 'specialist');
      case 'state':
        return allStaff.filter((s) => s.role === 'state_admin');
      case 'national':
        return allStaff.filter((s) => s.role === 'national_admin');
      default:
        return allStaff.filter((s) => s.role === 'phc_doctor');
    }
  };

  const staffList = filterStaffByTier(activeTier);

  // Initial staff selection: matches initialRole if supplied, or first in current tier
  const initialStaff =
    (initialRole ? allStaff.find((s) => s.role === initialRole) : null) ||
    staffList[0] ||
    allStaff[0];

  const [phone, setPhone] = useState(initialStaff?.phone || '9822019284');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
  const [errorMessage, setErrorMessage] = useState('');
  const [simulatedSms, setSimulatedSms] = useState<{ phone: string; otp: string } | null>(null);

  const handleSelectStaff = (selectedPhone: string) => {
    setPhone(selectedPhone);
    setErrorMessage('');
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!phone || phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    const result = await sendOtp(phone.trim());
    if (result.success) {
      const generatedCode = result.otp || '123456';
      setSimulatedSms({ phone: phone.trim(), otp: generatedCode });
      setStep('OTP');
      setOtp(generatedCode);
    } else {
      setErrorMessage(result.error || 'Failed to send OTP.');
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
      setErrorMessage(result.error || 'Invalid OTP code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Top Maharashtra Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-sm">
                {activeTier === 'asha'
                  ? (language === 'mr' ? 'आशा सेविका पडताळणी व प्रवेश' : 'ASHA / Sub-Centre Portal Login')
                  : activeTier === 'phc'
                  ? (language === 'mr' ? 'प्राथमिक आरोग्य केंद्र (PHC) कर्मचारी प्रवेश' : 'PHC Medical Officer & Staff Login')
                  : activeTier === 'district'
                  ? (initialRole === 'district_officer'
                      ? (language === 'mr' ? 'जिल्हा आरोग्य अधिकारी व प्रशासन (DHO) प्रवेश' : 'District Health Authority (DHO) Login')
                      : (language === 'mr' ? 'जिल्हा रुग्णालय तज्ज्ञ व कॅज्युअल्टी प्रवेश' : 'District Hospital Specialist Team Login'))
                  : activeTier === 'state'
                  ? (language === 'mr' ? 'राज्य आरोग्य प्राधिकरण (DHS) प्रवेश' : 'State Health Directorate Login (DHS Maharashtra)')
                  : activeTier === 'national'
                  ? (language === 'mr' ? 'राष्ट्रीय आरोग्य प्राधिकरण (NHA) प्रवेश' : 'National Health Authority Login (NHA / MoHFW)')
                  : (language === 'mr' ? 'आरोग्य कर्मचारी पडताळणी व प्रवेश' : 'MahaArogya Staff Verification & Login')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {activeTier === 'state'
                  ? 'State Medical Reserve Depot & DHS, Maharashtra • ABDM HPR Gateway'
                  : activeTier === 'national'
                  ? 'National Health Authority (NHA) & MoHFW, New Delhi • Apex Mission Control'
                  : activeTier === 'district'
                  ? 'Pune District Health Office & District Hospital Network'
                  : activeTier === 'phc'
                  ? 'Velhe PHC & Nasrapur PHC Catchment Areas'
                  : 'Velhe & Nasrapur Field & Sub-Centre Network'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Simulated SMS Alert Banner when OTP is sent */}
          {simulatedSms && step === 'OTP' && (
            <div 
              onClick={() => setOtp(simulatedSms.otp)}
              className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-xl p-3.5 space-y-1 text-emerald-950 dark:text-emerald-100 animate-in slide-in-from-top-2 shadow-xs cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-all"
              title="Click to insert OTP"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>SIMULATED GOVT SMS GATEWAY</span>
                </span>
                <span className="font-mono">Govt of Maharashtra / NHA</span>
              </div>
              <p className="text-xs font-mono">
                &ldquo;Your MahaArogya Portal OTP is{' '}
                <strong className="text-emerald-900 dark:text-emerald-200 font-extrabold text-sm underline">{simulatedSms.otp}</strong>. Valid for
                10 mins. Do not share this OTP.&rdquo;
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5">
                ⚡ Click to auto-fill OTP code
              </p>
            </div>
          )}

          {step === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-100 mb-1">
                  Registered Government Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-500 dark:text-slate-400 font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Staff Profile Selection Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {activeTier === 'state'
                      ? (language === 'mr' ? 'राज्य आरोग्य अधिकारी निवडा:' : 'Select State Directorate Officer:')
                      : activeTier === 'national'
                      ? (language === 'mr' ? 'राष्ट्रीय आरोग्य अधिकारी निवडा:' : 'Select National Health Official:')
                      : activeTier === 'district'
                      ? (language === 'mr' ? 'जिल्हा रुग्णालय कर्मचारी निवडा:' : 'Select District Hospital Staff:')
                      : activeTier === 'phc'
                      ? (language === 'mr' ? 'प्राथमिक आरोग्य केंद्र (PHC) कर्मचारी निवडा:' : 'Select PHC Staff Member:')
                      : (language === 'mr' ? 'आशा सेविका निवडा:' : 'Select ASHA Field Worker:')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {language === 'mr' ? 'खाते निवडण्यासाठी क्लिक करा' : 'Click card to select account'}
                  </span>
                </div>

                {/* Account Cards Grid */}
                <div className={`grid ${staffList.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2 max-h-64 overflow-y-auto pr-1`}>
                  {staffList.map((stf) => {
                    const isSelected = phone === stf.phone;
                    const levelLabel =
                      stf.administrativeLevel === 'national'
                        ? 'National Level'
                        : stf.administrativeLevel === 'state'
                        ? 'State Level'
                        : stf.administrativeLevel === 'district'
                        ? 'District Level'
                        : stf.administrativeLevel === 'field' || stf.role === 'asha'
                        ? 'ASHA / Field Level'
                        : 'PHC Level';

                    const levelBadgeColor =
                      stf.administrativeLevel === 'national'
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200'
                        : stf.administrativeLevel === 'state'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200'
                        : stf.administrativeLevel === 'district'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                        : stf.administrativeLevel === 'field' || stf.role === 'asha'
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                        : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200';

                    return (
                      <div
                        key={stf.phone}
                        onClick={() => handleSelectStaff(stf.phone)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {stf.name}
                          </div>
                          <span
                            className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded border shrink-0 ${levelBadgeColor}`}
                          >
                            {levelLabel}
                          </span>
                        </div>
                        <div className="text-[10px] text-blue-800 dark:text-blue-300 font-semibold truncate">
                          {language === 'mr' ? stf.roleTitleMr : stf.roleTitleEn}
                        </div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{stf.facilityName}</span>
                        </div>
                        <div className="text-[9px] text-slate-600 dark:text-slate-400 truncate flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="font-medium text-slate-500 truncate max-w-[120px]">
                            {stf.district ? `${stf.district}, ${stf.state || 'MH'}` : stf.state || 'MH'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectStaff(stf.phone);
                            }}
                            className={`px-2 py-0.5 rounded font-bold text-[9px] transition-colors shrink-0 shadow-xs ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white'
                            }`}
                            title="Select this staff member"
                          >
                            {language === 'mr' ? 'निवडा' : 'Select'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-teal-300" />
                <span>Send ABDM OTP (ओटीपी पाठवा)</span>
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-100">
                  Enter 6-Digit One-Time Password (OTP)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sent to registered number <strong>+91 {phone}</strong>
                </p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 749201"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-mono font-black px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl focus:border-blue-600 focus:outline-hidden dark:bg-slate-800 dark:text-white"
                />
              </div>

              {errorMessage && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="w-1/3 py-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl font-semibold text-slate-700 dark:text-slate-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verify & Login (प्रवेश करा)</span>
                </button>
              </div>
            </form>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-6 space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Identity Verified & Facility Bound Successfully!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Logging you into the Maharashtra Health Gateway...
              </p>
            </div>
          )}

          {/* ABDM Security Notice */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              Tied to National Health Authority (NHA) & Health Facility Registry (HFR) standards.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
