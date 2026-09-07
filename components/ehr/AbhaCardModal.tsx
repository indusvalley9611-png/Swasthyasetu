'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { X, Printer, ShieldCheck, Download, Heart } from 'lucide-react';

interface AbhaCardModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export function AbhaCardModal({ patient, onClose }: AbhaCardModalProps) {
  const { language } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (patient) {
      // If we are on localhost, we use the IP address of the machine so scanning with a phone works if they are on the same wifi.
      // But since we can't reliably guess the IP in the browser, we just use window.location.origin.
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const payload = `${baseUrl}/api/patient/${patient.id}/pdf`;
      QRCode.toDataURL(payload, { width: 160, margin: 1 })
        .then(setQrDataUrl)
        .catch((err) => console.error(err));
    }
  }, [patient]);

  if (!patient) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center print-hide">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-sm">
              {language === 'mr' ? 'आयुष्मान भारत डिजिटल आरोग्य ओळखपत्र (ABHA)' : 'ABDM Digital Health Card'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The Official ABHA Card Surface */}
        <div className="p-6 bg-slate-50 flex justify-center print-section">
          <div className="w-full max-w-[360px] bg-white rounded-xl shadow-lg border-2 border-slate-300 overflow-hidden relative">
            
            {/* Subtle Watermark Background */}
            <div 
              className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-center bg-no-repeat bg-contain"
              style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/e/e4/Spinning_Ashoka_Chakra.gif")' }}
            />
            
            {/* Top Tricolor Strip */}
            <div className="relative z-10 h-2 bg-gradient-to-r from-orange-500 via-white to-green-600 border-b border-slate-200" />

            <div className="relative z-10">
              {/* National Health Authority Banner */}
              <div className="px-4 py-2 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 flex justify-between items-center">
                <div>
                  <div className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                    {language === 'mr' ? 'राष्ट्रीय आरोग्य प्राधिकरण' : 'NATIONAL HEALTH AUTHORITY'}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {language === 'mr' ? 'भारत सरकार व महाराष्ट्र शासन' : 'Govt of India & Govt of Maharashtra'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-extrabold text-blue-900 tracking-tight">ABHA</span>
                  <div className="text-[8px] text-teal-700 font-semibold">आभा कार्ड</div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {/* Silhouette / Photo */}
                  <div className="w-16 h-20 bg-slate-200 rounded border border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs shrink-0">
                    <span className="font-bold text-slate-700 text-lg">
                      {patient.fullName.charAt(0)}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1">PHOTO</span>
                  </div>

                  {/* Patient Primary Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 leading-snug">
                      {patient.fullName}
                    </div>
                    <div className="text-xs text-slate-600">
                      <span className="font-medium">{patient.gender}</span> • {patient.age} Yrs
                    </div>
                    <div className="text-xs text-slate-700 font-medium">
                      {language === 'mr' ? 'रक्तगट' : 'Blood'}: <span className="text-rose-700 font-bold">{patient.bloodGroup}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {patient.village}, {patient.taluka}, {patient.district}
                    </div>
                  </div>
                </div>

                {/* ABHA Number & QR Code */}
                <div className="bg-blue-50/90 backdrop-blur-xs rounded-lg p-3 border border-blue-200 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-blue-900">
                      {language === 'mr' ? 'आभा क्रमांक (ABHA Number)' : 'ABHA Number'}
                    </div>
                    <div className="text-base font-mono font-extrabold text-blue-950 tracking-wider">
                      {patient.abhaId}
                    </div>
                    <div className="text-[11px] font-mono text-teal-800 font-medium">
                      {patient.abhaAddress}
                    </div>
                  </div>

                  {/* QR Code */}
                  {qrDataUrl && (
                    <a 
                      href={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/patient/${patient.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white p-1 rounded border border-slate-200 shrink-0 hover:ring-2 hover:ring-teal-500 transition-all cursor-pointer block"
                      title="Click to download Medical Report PDF or scan with phone"
                    >
                      <img src={qrDataUrl} alt="ABHA QR Code" className="w-16 h-16" />
                    </a>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="text-[11px] text-slate-600 flex justify-between items-center pt-1 border-t border-slate-100">
                  <span>
                    {language === 'mr' ? 'आपत्कालीन संपर्क' : 'Emergency'}: {patient.emergencyContact.name} ({patient.emergencyContact.relation})
                  </span>
                  <span className="font-mono font-bold text-slate-800">{patient.emergencyContact.phone}</span>
                </div>
              </div>

              {/* Bottom Govt Seal Line */}
              <div className="bg-slate-100/90 backdrop-blur-xs px-4 py-1.5 border-t border-slate-200 text-center text-[9px] text-slate-500 flex justify-between items-center">
                <span>{language === 'mr' ? 'सार्वजनिक आरोग्य विभाग' : 'MahaArogya Network'}</span>
                <span>108 / 104 Helpline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 print-hide">
          <div className="text-[10px] text-slate-500 font-medium">
            Scan QR code with camera or scanner to verify patient identity.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {language === 'mr' ? 'बंद करा' : 'Close'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow transition-colors"
            >
              <Printer className="w-4 h-4 text-teal-300" />
              <span>{language === 'mr' ? 'प्रिंट करा' : 'Print Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
