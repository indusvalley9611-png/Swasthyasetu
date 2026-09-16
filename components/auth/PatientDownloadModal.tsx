'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  X,
  FileText,
  Download,
  ShieldCheck,
  UserCheck,
  Smartphone,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

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
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [foundPatient, setFoundPatient] = useState<any>(null);

  const isMr = language === 'mr';

  const handleSendOtp = () => {
    setError('');
    const cleanInput = abhaId.trim().replace(/-/g, '');
    const patient = patients.find(
      (p) =>
        p.abhaId === abhaId.trim() ||
        p.abhaId?.replace(/-/g, '') === cleanInput ||
        p.id === abhaId.trim()
    );

    if (!patient) {
      setError(
        isMr
          ? 'अवैध आभा क्रमांक किंवा रुग्ण सापडला नाही. कृपया पुन्हा तपासा.'
          : 'Invalid ABHA Number or patient record not found. Please verify.'
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setFoundPatient(patient);
      setStep(2);
      setLoading(false);
    }, 600);
  };

  const handleVerifyOtp = () => {
    setError('');
    if (otp.trim() !== '123456') {
      setError(
        isMr
          ? 'चुकीचा OTP कोड. चाचणीसाठी 123456 वापरा.'
          : 'Invalid OTP code. Please use 123456 for demo authentication.'
      );
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setStep(3);
      setLoading(false);
    }, 500);
  };

  // Client-side fallback PDF generator if server is offline or unreachable
  const generateClientFallbackPdf = async (patient: any): Promise<Blob> => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 45;
    let y = height - 40;

    page.drawRectangle({
      x: margin,
      y: y - 35,
      width: 505,
      height: 45,
      color: rgb(0.08, 0.2, 0.4),
    });

    page.drawText('GOVERNMENT OF MAHARASHTRA · PUBLIC HEALTH DEPARTMENT', {
      x: margin + 12,
      y: y - 16,
      size: 11,
      font: helveticaBold,
      color: rgb(1, 0.8, 0.4),
    });

    page.drawText('SWASTHYASETU INTEGRATED EHR · CITIZEN RECORD', {
      x: margin + 12,
      y: y - 28,
      size: 9,
      font: helvetica,
      color: rgb(0.9, 0.95, 1),
    });

    y -= 60;
    page.drawText('OFFICIAL ELECTRONIC HEALTH RECORD (EHR)', {
      x: margin,
      y,
      size: 13,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    y -= 25;
    page.drawText(`Patient Name: ${patient.fullName || 'N/A'}`, { x: margin, y, size: 10, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
    page.drawText(`ABHA Number: ${patient.abhaId || 'N/A'}`, { x: margin, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
    page.drawText(`Age / Gender: ${patient.age || 'N/A'} Yrs / ${patient.gender || 'N/A'}`, { x: margin, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    y -= 15;
    page.drawText(`Village: ${patient.village || 'N/A'}, Dist. ${patient.district || 'Pune'}`, { x: margin, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
    page.drawText('Document digitally generated and verified under ABDM standards.', { x: margin, y, size: 8, font: helvetica, color: rgb(0.4, 0.4, 0.4) });

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  };

  const handleDownload = async () => {
    setError('');
    setDownloadSuccess(false);
    setLoading(true);

    try {
      let blob: Blob | null = null;

      try {
        const res = await fetch(`/api/patient/${foundPatient.id}/pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-patient-abha': foundPatient.abhaId,
          },
          body: JSON.stringify({
            ...foundPatient,
            abhaId: foundPatient.abhaId,
          }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/pdf')) {
            const dataBlob = await res.blob();
            if (dataBlob.size > 0) {
              blob = dataBlob;
            }
          }
        }
      } catch (networkErr) {
        console.warn('Backend PDF endpoint unreachable, falling back to local client generator:', networkErr);
      }

      // If backend was not available, run client-side PDF generation fallback
      if (!blob) {
        blob = await generateClientFallbackPdf(foundPatient);
      }

      if (!blob || blob.size === 0) {
        throw new Error('Generated PDF file was empty.');
      }

      // Trigger browser file download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Medical_Report_${foundPatient.abhaId || foundPatient.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
    } catch (err: any) {
      console.error('PDF Download Error:', err);
      setError(
        isMr
          ? 'PDF डाउनलोड करताना त्रुटी आली. कृपया खालील बटण दाबून पुन्हा प्रयत्न करा.'
          : 'Failed to download medical report PDF. Please click Retry below.'
      );
    } finally {
      // Always reset loading back to false so button is never stuck
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="patient-portal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5 text-teal-300" />
            </div>
            <div>
              <h2 id="patient-portal-title" className="font-black text-sm sm:text-base tracking-tight text-white leading-tight">
                {isMr ? 'नागरिक रुग्ण आरोग्य पोर्टल' : 'Citizen Patient Health Portal'}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                ABDM · National Health Authority
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isMr ? 'खिडकी बंद करा' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-slate-50 dark:bg-slate-850">
          
          {/* STEP 1: ENTER ABHA */}
          {step === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UserCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? '१४-अंकी आभा क्रमांक टाका' : 'Enter 14-Digit ABHA ID'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMr
                    ? 'आपल्या अधिकृत इलेक्ट्रॉनिक आरोग्य नोंदी पाहण्यासाठी'
                    : 'Access your official Electronic Health Record (EHR)'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                  {isMr ? 'आभा क्रमांक (ABHA Number)' : '14-Digit ABHA Number'}
                </label>
                <input
                  type="text"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="91-9822-1029-4819"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center tracking-widest bg-white dark:bg-slate-800 shadow-2xs"
                />
                <div className="text-[10px] text-slate-400 text-center mt-1.5 font-mono">
                  Demo: 91-9822-1029-4819 (Priya Kamble)
                </div>
              </div>

              {/* Inline Error Message */}
              {error && (
                <div role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading || !abhaId.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isMr ? 'माहिती शोधत आहे...' : 'Searching Database...'}</span>
                  </>
                ) : (
                  <span>{isMr ? 'SMS द्वारे OTP मिळवा' : 'Get OTP via SMS'}</span>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: VERIFY MOBILE OTP */}
          {step === 2 && foundPatient && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Smartphone className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {isMr ? 'मोबाईल OTP पडताळणी' : 'Verify Mobile OTP'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isMr
                    ? `नोंदणीकृत क्रमांक +91 XXXXXX${foundPatient.phone?.slice(-4) || '9284'} वर पाठवला`
                    : `OTP sent to +91 XXXXXX${foundPatient.phone?.slice(-4) || '9284'}`}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-center">
                  {isMr ? '६-अंकी OTP प्रविष्ट करा' : 'Enter 6-Digit OTP'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-center tracking-[0.4em] font-mono bg-white dark:bg-slate-800 shadow-2xs"
                />
                <div className="text-[10px] text-slate-400 text-center mt-1.5 font-mono">
                  {isMr ? 'चाचणी कोड: 123456 वापरा' : 'Demo mode: Use 123456'}
                </div>
              </div>

              {/* Inline Error Message */}
              {error && (
                <div role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || !otp.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isMr ? 'पडताळणी सुरू आहे...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <span>{isMr ? 'पडताळणी करा व रेकॉर्ड उघडा' : 'Verify & Access Record'}</span>
                )}
              </button>
            </div>
          )}

          {/* STEP 3: AUTHENTICATED & DOWNLOAD PDF */}
          {step === 3 && foundPatient && (
            <div className="space-y-5 text-center animate-in slide-in-from-right-4 py-2">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {isMr ? 'ओळख पडताळणी यशस्वी' : 'Authentication Successful'}
                </h3>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                  {isMr ? `स्वागत आहे, ${foundPatient.fullName}` : `Hello, ${foundPatient.fullName}`}
                </p>
                <div className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-[10px] font-black px-2.5 py-0.5 rounded-md mt-1.5 border border-blue-200 dark:border-blue-800">
                  <span>✓</span>
                  <span>{isMr ? 'ABDM आभा प्रमाणित' : 'ABDM ABHA Verified'}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {isMr ? 'उपलब्ध वैद्यकीय दस्तऐवज' : 'Available Health Document'}
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {isMr ? 'संपूर्ण EHR वैद्यकीय अहवाल' : 'Complete EHR Medical Report'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      PDF Format · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Error Display with Retry */}
              {error && (
                <div role="alert" className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Download Success Confirmation */}
              {downloadSuccess && (
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isMr ? 'PDF यशस्वीरित्या डाउनलोड झाली!' : 'PDF downloaded successfully!'}</span>
                </div>
              )}

              {/* Download / Retry Button (Never stuck on loading, resets properly) */}
              <button
                onClick={handleDownload}
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isMr ? 'सुरक्षित PDF तयार होत आहे...' : 'Generating Secure PDF...'}</span>
                  </>
                ) : error ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>{isMr ? 'पुन्हा प्रयत्न करा (Retry Download)' : 'Retry Download'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>{isMr ? 'EHR PDF डाउनलोड करा' : 'Download EHR PDF'}</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
