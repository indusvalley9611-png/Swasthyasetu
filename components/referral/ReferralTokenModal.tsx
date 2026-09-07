'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Referral } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  Printer,
  QrCode,
  ShieldCheck,
  Ambulance,
  AlertOctagon,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface ReferralTokenModalProps {
  referral: Referral | null;
  onClose: () => void;
}

export function ReferralTokenModal({ referral, onClose }: ReferralTokenModalProps) {
  const { language, t } = useLanguage();
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (referral) {
      QRCode.toDataURL(referral.qrPayload || referral.tokenCode, {
        width: 220,
        margin: 1,
        color: {
          dark: referral.triagePriority === 'red' ? '#881337' : '#0f172a',
          light: '#ffffff',
        },
      })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [referral]);

  if (!referral) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm">
              {language === 'mr' ? 'डिजिटल रेफरल टोकन व आपत्कालीन पावती' : 'Digital Referral Token & Admission Pass'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Slip Content */}
        <div className="p-6 bg-slate-50 space-y-4">
          <div className="bg-white p-5 rounded-xl border-2 border-slate-300 shadow-md space-y-4">
            {/* Top Bar with Triage Color */}
            <div
              className={`px-4 py-2 rounded-lg text-white flex justify-between items-center shadow-xs ${
                referral.triagePriority === 'red'
                  ? 'bg-rose-700'
                  : referral.triagePriority === 'yellow'
                  ? 'bg-amber-600'
                  : 'bg-emerald-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5" />
                <span className="font-extrabold uppercase text-xs tracking-wider">
                  {referral.triagePriority === 'red'
                    ? t('triageRed')
                    : referral.triagePriority === 'yellow'
                    ? t('triageYellow')
                    : t('triageGreen')}
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                Score: {referral.triageScore}
              </span>
            </div>

            {/* Token Code & Hospital Bypass Notice */}
            <div className="text-center space-y-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {language === 'mr' ? 'रेफरल टोकन क्रमांक' : 'OFFICIAL REFERRAL TOKEN'}
              </div>
              <div className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                {referral.tokenCode}
              </div>
              <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-md border border-teal-200 inline-block">
                ⚡ {t('bypassDeskMsg')}
              </div>
            </div>

            {/* Scannable QR Code */}
            <div className="flex justify-center py-2">
              {qrUrl ? (
                <div className="p-2 bg-white rounded-xl border-2 border-slate-800 shadow-inner">
                  <img src={qrUrl} alt="Referral Token QR" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Patient & Facility Summary */}
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'mr' ? 'रुग्णाचे नाव' : 'Patient'}:</span>
                <span className="font-bold text-slate-900">{referral.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ABHA ID:</span>
                <span className="font-mono font-semibold text-slate-800">{referral.patientAbha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'mr' ? 'रेफर करणारी संस्था' : 'From'}:</span>
                <span className="font-medium text-slate-800">{referral.referringFacility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'mr' ? 'गंतव्य रुग्णालय' : 'Target Hospital'}:</span>
                <span className="font-bold text-blue-900">{referral.targetFacility}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === 'mr' ? 'तज्ज्ञ विभाग' : 'Specialty'}:</span>
                <span className="font-bold text-teal-800">{referral.specialtyRequired}</span>
              </div>
              {referral.assignedBed && (
                <div className="flex justify-between bg-blue-100/70 p-1 rounded text-blue-900 font-bold">
                  <span>Reserved Bed:</span>
                  <span>{referral.assignedBed}</span>
                </div>
              )}
            </div>

            {/* Doctor Signature & Timestamp */}
            <div className="text-[11px] text-slate-600 flex justify-between items-center pt-2 border-t border-slate-200">
              <div>
                <span className="block text-slate-400 text-[9px] uppercase">Referring Medical Officer</span>
                <span className="font-semibold text-slate-800">{referral.referringDoctorName}</span>
              </div>
              <div className="text-right">
                <span className="block text-slate-400 text-[9px] uppercase">Timestamp</span>
                <span className="font-mono text-slate-700">{new Date(referral.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {language === 'mr' ? 'पूर्ण झाले' : 'Done'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-lg shadow transition-colors"
          >
            <Printer className="w-4 h-4 text-teal-300" />
            <span>{language === 'mr' ? 'पावती प्रिंट करा' : 'Print Slip'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
