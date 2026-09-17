'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Siren,
  Phone,
  ShieldCheck,
  Languages,
  Moon,
  Sun,
  Download,
  ChevronRight,
  HeartPulse,
  Users,
  ArrowRight,
} from 'lucide-react';

interface MobileEntryPageProps {
  onOpenEmergency: () => void;
  onNavigateToSignIn: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export function MobileEntryPage({
  onOpenEmergency,
  onNavigateToSignIn,
  isDarkMode,
  onToggleDarkMode,
}: MobileEntryPageProps) {
  const { language, toggleLanguage } = useLanguage();
  const isMr = language === 'mr';

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check if stored globally
    if (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) {
      setInstallPrompt((window as any).deferredPwaPrompt);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      setIsInstalling(true);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setInstallPrompt(null);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Fallback instructions for iOS / Chrome
      alert(
        isMr
          ? 'तुमच्या फोनच्या होम स्क्रीनवर ॲप जोडण्यासाठी: ब्राउझरच्या शेअर किंवा तीन ठिपक्यांच्या मेनूवर टॅप करा आणि "Add to Home Screen / होम स्क्रीनवर जोडा" निवडा.'
          : 'To add SwasthyaSetu to your Home Screen: Tap your browser share or menu button (⋮) and select "Add to Home Screen".'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-rose-500 selection:text-white">
      
      {/* ── 1. MOBILE APP TOP BAR (Clean Light & Dark Header) ── */}
      <header className="px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-rose-950/30 shrink-0">
            <HeartPulse className="w-4.5 h-4.5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white block leading-none">
              Swasthya<span className="text-emerald-600 dark:text-emerald-400">Setu</span>
            </span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase block mt-0.5">
              {isMr ? 'महाराष्ट्र सार्वजनिक आरोग्य' : 'Maharashtra Public Health'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle theme"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="भाषा बदला / Change Language"
          >
            <Languages className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-black">
              {isMr ? 'मराठी' : 'EN'}
            </span>
          </button>
        </div>
      </header>

      {/* ── 2. MAIN 2-OPTION ACTION HUB ── */}
      <main className="flex-1 flex flex-col justify-center px-4 py-5 max-w-md mx-auto w-full space-y-4">
        
        {/* PWA "Add to Home Screen" Download Banner */}
        {!isInstalled && (
          <div className="rounded-2xl p-3.5 bg-emerald-50 dark:bg-gradient-to-r dark:from-emerald-950/70 dark:via-teal-950/50 dark:to-slate-900 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between gap-3 shadow-md transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-500/30 shadow-xs">
                <Download className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                  {isMr ? 'होम स्क्रीनवर ॲप जोडा' : 'Install SwasthyaSetu App'}
                </p>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300/80 truncate font-medium">
                  {isMr ? '१-टॅप आपत्कालीन व ऑफलाइन प्रवेश' : '1-Tap Offline & Emergency Access'}
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400 active:scale-95 text-white dark:text-slate-950 font-black text-xs shadow-md transition-all shrink-0 cursor-pointer"
            >
              {isInstalling ? '...' : (isMr ? 'डाऊनलोड' : 'Install')}
            </button>
          </div>
        )}

        {/* ═══ OPTION 1: EMERGENCY SOS (TOP, PROMINENT, HIGH URGENCY) ═══ */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 rounded-3xl blur-xs opacity-70 group-hover:opacity-100 transition duration-300 animate-pulse" />
          
          <div className="relative rounded-2xl bg-gradient-to-b from-rose-50 via-red-50/80 to-amber-50/40 dark:from-rose-950/95 dark:via-red-950/90 dark:to-slate-900 border-2 border-rose-500 dark:border-rose-500/80 p-5 shadow-xl flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Siren className="w-3.5 h-3.5 animate-bounce" />
                  <span>{isMr ? 'आपत्कालीन सेवा' : 'Immediate SOS'}</span>
                </div>
                <span className="text-xs font-mono font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-700/50">
                  Dial 108
                </span>
              </div>

              <h2 className="text-xl font-black text-rose-950 dark:text-white leading-tight">
                {isMr ? '१०८ तातडीची वैद्यकीय मदत' : '108 Emergency Medical SOS'}
              </h2>

              <p className="text-xs text-rose-900/80 dark:text-rose-200/80 mt-1.5 leading-relaxed font-medium">
                {isMr
                  ? 'अतितातडीची रुग्णवाहिका, जवळचे रुग्णालय बेड शोधणे व इमर्जन्सी ट्रायज'
                  : 'Instant ambulance dispatch, nearest hospital capacity & GPS-tracked emergency response.'}
              </p>
            </div>

            <button
              onClick={onOpenEmergency}
              className="mt-5 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-98 text-white font-black text-sm tracking-wide shadow-lg shadow-rose-900/40 dark:shadow-rose-900/70 flex items-center justify-center gap-2 cursor-pointer transition-transform"
            >
              <Phone className="w-4.5 h-4.5" />
              <span>{isMr ? 'आपत्कालीन मदत सुरू करा' : 'Trigger Emergency SOS (108)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ═══ OPTION 2: SIGN IN & PATIENT EHR PORTAL (PAGE 2) ═══ */}
        <div className="rounded-2xl bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-lg flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{isMr ? 'शासकीय पोर्टल' : 'Healthcare Gateway'}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                ABDM Enabled
              </span>
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
              {isMr ? 'आरोग्य कर्मचारी व रुग्ण प्रवेश' : 'Healthcare Staff & Patient Sign In'}
            </h2>

            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {isMr
                ? 'आशा सेविका, वैद्यकीय अधिकारी, तज्ज्ञ डॉक्टर, जिल्हा अधिकारी व नागरिकांचे आभा (ABHA) ईएचआर रेकॉर्ड्स.'
                : 'ASHA workers, PHC doctors, Specialists, DHO, Nurses, Pharmacists & Citizen ABHA health records.'}
            </p>
          </div>

          <button
            onClick={onNavigateToSignIn}
            className="mt-5 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white font-black text-xs tracking-wide shadow-md shadow-emerald-950/20 dark:shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-transform"
          >
            <Users className="w-4 h-4" />
            <span>{isMr ? 'लॉगिन व ईएचआर पोर्टल उघडा' : 'Sign In & Access EHR Records'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      {/* ── 3. FOOTER TRUST STRIP ── */}
      <footer className="px-4 py-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 text-center transition-colors">
        <div className="flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
          <span>Public Health Department &bull; Govt of Maharashtra</span>
        </div>
      </footer>

    </div>
  );
}
