'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { PhoneCall, ShieldCheck, HeartPulse } from 'lucide-react';

export function Footer() {
  const { language } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-auto text-xs py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Govt Authority */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <HeartPulse className="w-5 h-5 text-teal-400" />
            <span>{language === 'mr' ? 'स्वास्थ्यसेतू महाराष्ट्र' : 'SwasthyaSetu Maharashtra'}</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            {language === 'mr'
              ? 'उपकेंद्र, प्राथमिक आरोग्य केंद्र, ग्रामीण आणि जिल्हा रुग्णालयांचे एकात्मिक आरोग्य व संदर्भ सेवा व्यासपीठ. सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन.'
              : 'Integrated Public Healthcare & Intelligent Referral System bridging rural sub-centres, PHCs, and district civil hospitals. Government of Maharashtra.'}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-teal-400">
            <ShieldCheck className="w-4 h-4" />
            <span>{language === 'mr' ? 'आयुष्मान भारत डिजिटल मिशन (ABDM) सुसंगत' : 'ABDM & FHIR R4 Compliant Architecture'}</span>
          </div>
        </div>

        {/* Col 2: Emergency Helplines */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
            {language === 'mr' ? 'तातडीच्या रुग्णवाहिका हेल्पलाईन' : 'Emergency & Health Helplines'}
          </h3>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-rose-900/80 text-rose-300 flex items-center justify-center font-bold text-[11px]">
                108
              </span>
              <span>
                <strong>{language === 'mr' ? '१०८ रुग्णवाहिका' : '108 Ambulance'}</strong>: {language === 'mr' ? 'मोफत आपत्कालीन वैद्यकीय सेवा (MEMS)' : 'Free Emergency Medical Service'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-900/80 text-blue-300 flex items-center justify-center font-bold text-[11px]">
                104
              </span>
              <span>
                <strong>{language === 'mr' ? '१०४ आरोग्य सल्ला' : '104 Health Advice'}</strong>: {language === 'mr' ? '२४x७ टेली-कन्सल्टेशन' : '24x7 State Tele-Consultation'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center font-bold text-[11px]">
                102
              </span>
              <span>
                <strong>{language === 'mr' ? '१०२ जननी शिशु' : '102 JSSK'}</strong>: {language === 'mr' ? 'माता व नवजात बालक वाहतूक' : 'Maternal & Infant Transport'}
              </span>
            </div>
          </div>
        </div>

        {/* Col 3: Healthcare Hierarchy */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
            {language === 'mr' ? 'आरोग्य संस्था स्तर' : 'Public Care Tiers'}
          </h3>
          <ul className="space-y-1 text-slate-400 text-xs">
            <li>• {language === 'mr' ? 'उपकेंद्र (Sub-Centre / HWC)' : 'Sub-Centres / Health & Wellness Centres'}</li>
            <li>• {language === 'mr' ? 'प्राथमिक आरोग्य केंद्र (PHC)' : 'Primary Health Centres (PHC)'}</li>
            <li>• {language === 'mr' ? 'ग्रामीण व उपजिल्हा रुग्णालय (RH/SDH)' : 'Rural & Sub-District Hospitals (RH/SDH)'}</li>
            <li>• {language === 'mr' ? 'जिल्हा सामान्य रुग्णालय (District Civil Hospital)' : 'District General Hospitals (Civil)'}</li>
          </ul>
        </div>

        {/* Col 4: Technical & Offline Notice */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold uppercase tracking-wider text-[11px]">
            {language === 'mr' ? 'ऑफलाइन-सक्षम सुरक्षा' : 'Offline Engine & Security'}
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            {language === 'mr'
              ? 'स्थानिक IndexedDB कॅशिंग आणि पार्श्वभूमी सिंकद्वारे दुर्गम ग्रामीण भागात इंटरनेट नसतानाही काम अविरत सुरू राहते.'
              : 'Local IndexedDB storage and automatic reconciliation queue ensures clinical workflows function seamlessly in remote tribal/rural belts without cellular signal.'}
          </p>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
            Version 2.4-MH-PROD • Build 2026.09
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-slate-800 mt-8 pt-4 text-center text-slate-500 text-[11px]">
        © 2026 Public Health Department, Government of Maharashtra (सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन). Designed for Smart India Hackathon & ABDM Rural Deployment.
      </div>
    </footer>
  );
}
