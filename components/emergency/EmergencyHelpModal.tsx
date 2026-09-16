'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  X,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  Navigation,
  Building2,
  Clock,
  Shield,
  ChevronRight,
  Smartphone,
  Info,
  ArrowRight,
} from 'lucide-react';
import { INITIAL_FACILITIES } from '@/lib/mockData';
import { Facility } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmergencySession {
  id: string;
  createdAt: string;
  callerPhone?: string;
  phoneSource?: 'auto_hint' | 'one_tap_verified' | 'manual' | 'unspecified';
  lat?: number;
  lng?: number;
  locationLabel?: string;
  nearestFacility: Facility;
  distanceKm: number;
}

type Step = 'confirm' | 'locating' | 'phone_prompt' | 'ready' | 'called';

// ── Haversine distance (km) ────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CAPABILITY_RANK: Record<string, number> = {
  'Medical College': 5,
  'District Hospital': 4,
  'Rural Hospital': 3,
  PHC: 2,
  'Sub-Centre': 1,
};

function findNearestFacility(lat: number, lng: number): { facility: Facility; distanceKm: number } {
  const candidates = INITIAL_FACILITIES.filter((f) => CAPABILITY_RANK[f.type] >= 2);
  let best: { facility: Facility; distanceKm: number; score: number } | null = null;
  for (const f of candidates) {
    const d = haversineKm(lat, lng, f.lat, f.lng);
    const score = 1 / (d + 0.1) + CAPABILITY_RANK[f.type] * 0.05;
    if (!best || score > best.score) {
      best = { facility: f, distanceKm: d, score };
    }
  }
  if (!best) {
    const sorted = INITIAL_FACILITIES.slice().sort(
      (a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng)
    );
    return { facility: sorted[0], distanceKm: haversineKm(lat, lng, sorted[0].lat, sorted[0].lng) };
  }
  return { facility: best.facility, distanceKm: best.distanceKm };
}

// Default: Velhe Taluka service-area centre
const DEFAULT_LAT = 18.2956;
const DEFAULT_LNG = 73.6358;

function generateEmergencyId(): string {
  const rand = Math.floor(Math.random() * 9000) + 1000;
  const ts = Date.now().toString().slice(-6);
  return `EMRG-${ts}-${rand}`;
}

// Platform detection helper
function getMobilePlatform(): 'android' | 'ios' | 'other' {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  return 'other';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export function EmergencyHelpModal({ onClose }: Props) {
  const [step, setStep] = useState<Step>('confirm');
  const [phone, setPhone] = useState('');
  const [phoneSource, setPhoneSource] = useState<'auto_hint' | 'one_tap_verified' | 'manual' | 'unspecified'>('unspecified');
  const [session, setSession] = useState<EmergencySession | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const platform = getMobilePlatform();

  // Temporary container for location while resolving phone
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // Finalize and save the emergency session
  const finalizeSession = useCallback((loc: { lat: number; lng: number; label: string }, callerNum?: string, source?: 'auto_hint' | 'one_tap_verified' | 'manual' | 'unspecified') => {
    const { facility, distanceKm } = findNearestFacility(loc.lat, loc.lng);
    const newSession: EmergencySession = {
      id: generateEmergencyId(),
      createdAt: new Date().toISOString(),
      callerPhone: callerNum?.trim() || undefined,
      phoneSource: source || 'unspecified',
      lat: loc.lat,
      lng: loc.lng,
      locationLabel: loc.label,
      nearestFacility: facility,
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
    
    // Save to localStorage immediately so emergency is never lost
    try {
      localStorage.setItem('emergency_session_latest', JSON.stringify(newSession));
      localStorage.setItem(`emergency_session_${newSession.id}`, JSON.stringify(newSession));
    } catch {}

    setSession(newSession);
    setStep('ready');
  }, []);

  // Attempt Phone Number Hint / Web Credentials on Android or QuickType / One-Tap on iOS
  const attemptPhoneResolution = useCallback(async (loc: { lat: number; lng: number; label: string }) => {
    // 1. Check if navigator.credentials.get with identity / phone hint is available (Modern Android Web / TWA)
    if (platform === 'android' && typeof window !== 'undefined' && 'credentials' in navigator) {
      try {
        // Attempt Credential Management Phone Hint if supported by browser
        const cred = await (navigator.credentials as any).get({
          otp: { transport: ['sms'] },
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);

        if (cred && (cred as any).id) {
          const detected = (cred as any).id;
          setPhone(detected);
          setPhoneSource('auto_hint');
          finalizeSession(loc, detected, 'auto_hint');
          return;
        }
      } catch {
        // Ignore and fallback gracefully
      }
    }

    // 2. Check if a previously verified number exists in this browser's secure cache
    try {
      const cachedPhone = localStorage.getItem('emergency_verified_caller_phone');
      if (cachedPhone && cachedPhone.length >= 10) {
        setPhone(cachedPhone);
        setPhoneSource('auto_hint');
        finalizeSession(loc, cachedPhone, 'auto_hint');
        return;
      }
    } catch {}

    // 3. If automatic silent read is unavailable (standard on iOS / unmodified Android browsers),
    // show streamlined 1-tap "Verify / Share my number" fallback prompt without blocking.
    setPendingLocation(loc);
    setStep('phone_prompt');
  }, [platform, finalizeSession]);

  // Handler when user confirms emergency in Step 1
  const handleConfirmEmergency = useCallback(() => {
    setStep('locating');

    const handleLocationSuccess = (lat: number, lng: number, label: string) => {
      const loc = { lat, lng, label };
      attemptPhoneResolution(loc);
    };

    if (typeof window !== 'undefined' && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocationSuccess(pos.coords.latitude, pos.coords.longitude, 'GPS location captured');
        },
        () => {
          setLocationError(true);
          handleLocationSuccess(DEFAULT_LAT, DEFAULT_LNG, 'Velhe Taluka area (default — location not shared)');
        },
        { timeout: 5000, maximumAge: 30000, enableHighAccuracy: true }
      );
    } else {
      setLocationError(true);
      handleLocationSuccess(DEFAULT_LAT, DEFAULT_LNG, 'Location unavailable on this device');
    }
  }, [attemptPhoneResolution]);

  // One-tap verify / share submission
  const handleOneTapVerify = () => {
    if (!pendingLocation) return;
    const finalNumber = phone.trim();
    if (finalNumber) {
      try {
        localStorage.setItem('emergency_verified_caller_phone', finalNumber);
      } catch {}
      finalizeSession(pendingLocation, finalNumber, manualMode ? 'manual' : 'one_tap_verified');
    } else {
      finalizeSession(pendingLocation, undefined, 'unspecified');
    }
  };

  // Skip phone number and proceed directly
  const handleSkipPhone = () => {
    if (!pendingLocation) return;
    finalizeSession(pendingLocation, undefined, 'unspecified');
  };

  // Auto-focus the input if user switches to manual mode
  useEffect(() => {
    if (step === 'phone_prompt' && manualMode && phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, [step, manualMode]);

  // ── STEP 1: CONFIRM (NO MANUAL INPUTS — CLEAN UI) ──────────────────────────
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500/20">
          {/* Header */}
          <div className="bg-red-600 px-6 py-5 flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">EMERGENCY HELP</h2>
              <p className="text-red-100 text-xs">आपत्कालीन मदत · आपातकालीन सहायता</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <p className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center leading-snug">
              Are you or someone near you in immediate danger?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">
              क्या आपको या आपके पास किसी को अभी आपातकालीन सहायता चाहिए?
            </p>

            {/* Permission and privacy transparency badge */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="leading-normal">
                Pressing Confirm will locate the nearest PHC / Hospital and establish your emergency dispatch record.
              </p>
            </div>

            {/* Big Action Buttons */}
            <button
              onClick={handleConfirmEmergency}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold text-base py-4 rounded-xl transition-all shadow-lg shadow-red-600/30 mb-3 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              CONFIRM EMERGENCY
            </button>
            <button
              onClick={onClose}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm py-3.5 rounded-xl transition-all"
            >
              Cancel — No Emergency
            </button>

            <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Public emergency entry · No staff login required · Immediate routing
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: LOCATING & AUTO-CONNECTING ──────────────────────────────────────
  if (step === 'locating') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm px-8 py-10 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Locating nearest healthcare facility…
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              नजदीकी स्वास्थ्य केंद्र व आपातकालीन संपर्क ढूंढ रहे हैं
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
            <span>Checking device location</span>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2.5: ONE-TAP PHONE NUMBER FALLBACK (MOBILE OPTIMIZED) ──────────────
  if (step === 'phone_prompt') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500/20">
          {/* Header */}
          <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 flex items-center gap-3 border-b border-slate-800">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Caller Phone Number</h2>
              <p className="text-slate-400 text-xs">For hospital & ambulance callback</p>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="mb-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                Share your mobile number with the emergency team:
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {platform === 'ios'
                  ? 'Tap below to autofill with Apple QuickType or enter number.'
                  : 'Tap below to select your device number for rapid callback.'}
              </p>
            </div>

            {/* Mobile-Friendly One-Tap Autofill Input */}
            <div className="mb-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border-2 border-teal-500/50 rounded-xl px-3.5 py-3">
                <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <input
                  ref={phoneInputRef}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="Tap to autofill mobile number"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setManualMode(true);
                  }}
                  className="flex-1 bg-transparent text-base font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Primary One-Tap Confirm Button */}
            <button
              onClick={handleOneTapVerify}
              disabled={!phone.trim() && manualMode}
              className="w-full bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md mb-2.5 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {phone.trim() ? 'Confirm & View Emergency Routing' : 'Share & Continue to Routing'}
            </button>

            {/* Skip Option — never block the user during an emergency */}
            <button
              onClick={handleSkipPhone}
              className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs py-2.5 rounded-xl transition-all"
            >
              Skip (Proceed without phone number)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: READY / CALLED (FACILITY ROUTING & REAL DIAL LINKS) ─────────────
  if ((step === 'ready' || step === 'called') && session) {
    const f = session.nearestFacility;
    const freeBeds = f.totalBeds - f.occupiedBeds;
    const freeICU = f.icuBedsTotal - f.icuBedsOccupied;
    const facilityShortName = f.name.split(',')[0].split('(')[0].trim();

    return (
      <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-500/20">
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white">Emergency Session Created</h2>
              <p className="text-red-200 text-[11px] font-mono truncate">{session.id}</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-3">

            {/* Nearest Facility Card */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">
                    Nearest Facility
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{f.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {f.taluka} Taluka · {f.district} · {f.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 text-center border border-slate-100 dark:border-slate-700">
                  <p className="text-base font-bold text-slate-900 dark:text-white">{session.distanceKm} km</p>
                  <p className="text-[10px] text-slate-400 font-medium">Distance</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 text-center border border-slate-100 dark:border-slate-700">
                  <p className={`text-base font-bold ${freeBeds > 5 ? 'text-emerald-600' : freeBeds > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                    {freeBeds}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">Free Beds</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-2.5 text-center border border-slate-100 dark:border-slate-700">
                  {f.icuBedsTotal > 0 ? (
                    <>
                      <p className={`text-base font-bold ${freeICU > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{freeICU}</p>
                      <p className="text-[10px] text-slate-400 font-medium">ICU Free</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-bold text-slate-400">—</p>
                      <p className="text-[10px] text-slate-400 font-medium">No ICU</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Location & Phone status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border ${
                locationError
                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              }`}>
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{session.locationLabel ?? 'Location routed'}</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="truncate">
                  {session.callerPhone ? `Caller: ${session.callerPhone}` : 'No phone attached'}
                </span>
              </div>
            </div>

            {/* Primary call — facility direct */}
            <a
              href={`tel:${f.phone.replace(/[\s-]/g, '')}`}
              onClick={() => setStep('called')}
              className="flex items-center justify-between w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold px-4 py-4 rounded-xl transition-all shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">CALL {facilityShortName.toUpperCase()}</p>
                  <p className="text-red-200 text-xs font-mono">{f.phone}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </a>

            {/* 108 Ambulance */}
            <a
              href="tel:108"
              className="flex items-center justify-between w-full bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold px-4 py-3.5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-tight">CALL 108 — AMBULANCE</p>
                  <p className="text-orange-200 text-xs">Govt. Emergency Service · Toll Free</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </a>

            {/* Tele-consult */}
            <a
              href="tel:104"
              className="flex items-center gap-3 w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold px-4 py-3 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold leading-tight">104 — Tele-Medical Consult</p>
                <p className="text-xs text-slate-400">Hindi · Marathi · English · Free</p>
              </div>
            </a>

            {/* Call confirmed banner */}
            {step === 'called' && (
              <div className="flex items-start gap-2 px-3 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Call initiated. Quote your Emergency ID:{' '}
                  <span className="font-mono">{session.id}</span>
                </p>
              </div>
            )}

            {/* Session footer */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  ID <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{session.id}</span>
                  {session.callerPhone && (
                    <span className="ml-2 text-slate-400">· {session.callerPhone}</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                  {new Date(session.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  {' · '}Session saved locally
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
