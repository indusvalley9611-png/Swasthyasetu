'use client';
import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { X, FileText, Download, ShieldCheck, UserCheck, Smartphone } from 'lucide-react';

interface PatientDownloadModalProps {
  onClose: () => void;
}

export function PatientDownloadModal({ onClose }: PatientDownloadModalProps) {
  const { language } = useLanguage();
  const { patients } = useSync();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [abhaId, setAbhaId] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundPatient, setFoundPatient] = useState<any>(null);

  const handleSendOtp = () => {
    setError('');
    // First try the format they typed, then try removing dashes
    const patient = patients.find(p => p.abhaId === abhaId || p.abhaId.replace(/-/g, '') === abhaId.replace(/-/g, ''));
    
    if (!patient) {
      setError(language === 'mr' ? 'अवैध आभा क्रमांक' : 'Invalid ABHA Number or not found.');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setFoundPatient(patient);
      setStep(2);
      setLoading(false);
    }, 1000);
  };

  const handleVerifyOtp = () => {
    setError('');
    if (otp !== '123456') {
      setError(language === 'mr' ? 'चुकीचा OTP' : 'Invalid OTP. Use 123456.');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 800);
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/patient/' + foundPatient.id + '/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foundPatient)
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Medical_Report_' + foundPatient.abhaId + '.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert('Error downloading PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="font-black text-lg tracking-tight">Patient Portal Access</h2>
          </div>
          <button onClick={onClose} className="relative z-10 text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50">
          
          {step === 1 && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enter ABHA ID</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Access your official Electronic Health Record</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">14-Digit ABHA Number</label>
                <input 
                  type="text" 
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="91-XXXX-XXXX-XXXX"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-lg font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 text-center tracking-widest dark:bg-slate-800"
                />
              </div>

              {error && <div className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800 text-center">{error}</div>}

              <button 
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Searching Database...' : 'Get OTP via SMS'}
              </button>
            </div>
          )}

          {step === 2 && foundPatient && (
            <div className="space-y-5 animate-in slide-in-from-right-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verify Mobile</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">OTP sent to +91 XXXXXX{foundPatient.phone.slice(-4)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 text-center">Enter 6-Digit OTP</label>
                <input 
                  type="text" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-2xl font-black text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 text-center tracking-[0.5em] dark:bg-slate-800"
                />
                <div className="text-[10px] text-slate-400 text-center mt-2">Demo mode: Use 123456</div>
              </div>

              {error && <div className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-200 dark:border-rose-800 text-center">{error}</div>}

              <button 
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Access Record'}
              </button>
            </div>
          )}

          {step === 3 && foundPatient && (
            <div className="space-y-6 text-center animate-in slide-in-from-right-4 py-4">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Authentication Successful</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Hello, {foundPatient.fullName}</p>
                <div className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-bold px-2 py-1 rounded mt-2 uppercase tracking-widest">
                  ABHA Verified
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm text-left">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Available Document</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-950 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-100">Complete EHR Medical Report</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">PDF Format &middot; {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDownload}
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-transform active:scale-95 flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>Generating Secure PDF...</>
                ) : (
                  <><Download className="w-5 h-5" /> Download EHR PDF</>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

