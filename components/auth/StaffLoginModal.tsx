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

export function StaffLoginModal({ onClose, initialRole }: StaffLoginModalProps) {
  const { sendOtp, verifyOtp, user } = useAuth();
  const { language } = useLanguage();

  const allStaff = Object.values(PRE_REGISTERED_STAFF);
  const staffList = initialRole ? allStaff.filter(s => s.role === initialRole) : allStaff;
  const initialStaff = initialRole ? allStaff.find(s => s.role === initialRole) : allStaff[1];
  
  const [phone, setPhone] = useState(initialStaff?.phone || '9422018374');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'SUCCESS'>('PHONE');
  const [errorMessage, setErrorMessage] = useState('');
  const [simulatedSms, setSimulatedSms] = useState<{ phone: string; otp: string } | null>(null);



  const handleSelectStaff = (selectedPhone: string) => {
    setPhone(selectedPhone);
    setErrorMessage('');
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const result = sendOtp(phone);
    if (result.success) {
      setSimulatedSms({ phone, otp: result.otp || '123456' });
      setStep('OTP');
      setOtp(result.otp || '123456'); // Pre-fill for demonstration convenience
    } else {
      setErrorMessage(result.error || 'Failed to send OTP.');
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const result = verifyOtp(phone, otp);
    if (result.success) {
      setStep('SUCCESS');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(result.error || 'Invalid OTP code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Top Maharashtra Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-sm">
                {language === 'mr' ? 'आरोग्य कर्मचारी पडताळणी व प्रवेश' : 'MahaArogya Staff Verification & Login'}
              </h3>
              <p className="text-[11px] text-slate-400">
                ABDM Healthcare Professional Registry (HPR) Gateway
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
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 space-y-1 text-emerald-950 animate-in slide-in-from-top-2 shadow-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  <span>SIMULATED GOVT SMS GATEWAY</span>
                </span>
                <span className="font-mono">Govt of Maharashtra</span>
              </div>
              <p className="text-xs font-mono">
                &ldquo;Your MahaArogya Portal OTP is{' '}
                <strong className="text-emerald-900 font-extrabold text-sm">{simulatedSms.otp}</strong>. Valid for
                10 mins. Do not share this OTP.&rdquo;
              </p>
            </div>
          )}

          {step === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Registered Government Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-500 font-mono">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pre-Registered Demo Staff Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Pre-Registered Staff Member to Auto-Fill:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {staffList.map((stf) => (
                    <button
                      type="button"
                      key={stf.phone}
                      onClick={() => handleSelectStaff(stf.phone)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        phone === stf.phone
                          ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-100 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="font-bold text-slate-900 truncate">{stf.name}</div>
                      <div className="text-[10px] text-blue-900 font-semibold">{stf.roleTitleEn}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        📞 +91 {stf.phone}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">
                        {stf.facilityName}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <KeyRound className="w-4 h-4 text-teal-300" />
                <span>Send Government OTP (ओटीपी पाठवा)</span>
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-800">
                  Enter 6-Digit One-Time Password (OTP)
                </label>
                <p className="text-[11px] text-slate-500">
                  Sent to registered number <strong>+91 {phone}</strong>
                </p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 749201"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-mono font-black px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="w-1/3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700"
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
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                Identity Verified & Facility Bound Successfully!
              </h4>
              <p className="text-xs text-slate-600">
                Logging you into the Maharashtra Health Gateway...
              </p>
            </div>
          )}

          {/* ABDM Security Notice */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-500">
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
