'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Referral, Patient } from '@/lib/types';
import {
  QrCode,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Stethoscope,
  HeartPulse,
  User,
  ArrowRight,
  ShieldCheck,
  Camera,
  Upload,
  Clock,
  XCircle,
} from 'lucide-react';

interface DistrictQRScannerModalProps {
  hospitalName: string;
  referrals: Referral[];
  patients: Patient[];
  onClose: () => void;
  onSelectReferral: (referral: Referral) => void;
}

export function DistrictQRScannerModal({
  hospitalName,
  referrals,
  patients,
  onClose,
  onSelectReferral,
}: DistrictQRScannerModalProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [scannedResult, setScannedResult] = useState<Referral | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Parse and validate raw QR payload or token string
  const processInput = (raw: string) => {
    setValidationError('');
    setScannedResult(null);

    const trimmed = raw.trim();
    if (!trimmed) {
      setValidationError('Please enter or scan a valid referral token.');
      return;
    }

    let searchToken = trimmed;
    let parsedId = '';

    // Check if input is a JSON string from the QR code
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.tokenCode) searchToken = parsed.tokenCode;
        else if (parsed.token) searchToken = parsed.token;
        else if (parsed.token_code) searchToken = parsed.token_code;

        if (parsed.referralId) parsedId = parsed.referralId;
        else if (parsed.id) parsedId = parsed.id;
      } catch {
        // Fall back to direct search
      }
    }

    // Check if input is a URL (e.g. https://.../verify/MH-REF-XXXX)
    if (searchToken.includes('/verify/')) {
      const parts = searchToken.split('/verify/');
      if (parts[1]) searchToken = parts[1].trim();
    }

    const cleanToken = searchToken.toUpperCase();

    // Look up in canonical referrals list
    const found = referrals.find((r) => {
      const code = (r.tokenCode || '').toUpperCase();
      const id = (r.id || '').toUpperCase();
      const patientAbha = (r.patientAbha || '').toUpperCase();
      const patientName = (r.patientName || '').toUpperCase();

      return (
        code === cleanToken ||
        id === cleanToken ||
        (parsedId && (id === parsedId.toUpperCase() || code === parsedId.toUpperCase())) ||
        (cleanToken.length >= 6 && code.includes(cleanToken)) ||
        (cleanToken.length >= 6 && cleanToken.includes(code)) ||
        (cleanToken.length > 4 && patientAbha === cleanToken)
      );
    });

    if (!found) {
      setValidationError(`No active referral record found matching "${trimmed}". Verify with referring facility or search by patient name.`);
      return;
    }

    if (found.status === 'CANCELLED') {
      setValidationError(`Referral #${found.tokenCode} for ${found.patientName} was CANCELLED by referring facility (${found.referringFacility}). Admission cannot proceed.`);
      return;
    }

    setScannedResult(found);
  };

  const handleStartCamera = async () => {
    setValidationError('');
    setIsScanning(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setIsScanning(false);
        setValidationError('Camera hardware or permissions not accessible. Use manual token search below.');
      }
    } catch {
      setIsScanning(false);
      setValidationError('Camera access was denied or is unavailable. You can enter or paste the token code below.');
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        
        {/* Header */}
        <header className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-4 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/30 border border-blue-400/30">
              <QrCode className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Casualty QR Pass &amp; Token Verification
              </h3>
              <p className="text-[11px] text-slate-300">
                {hospitalName} &bull; Fast-Track Casualty Intake Desk
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Camera Scanner View */}
          {isScanning ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex flex-col items-center justify-center border-2 border-teal-500 shadow-inner">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-dashed border-teal-400/70 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                <span className="text-xs bg-slate-900/80 text-teal-300 px-3 py-1 rounded-full font-bold">
                  Align QR Code inside box
                </span>
              </div>
              <button
                onClick={handleStopCamera}
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
              >
                Close Camera
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartCamera}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Open Barcode / QR Camera</span>
              </button>
            </div>
          )}

          {/* Token Code Input Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
              Enter / Paste Referral Token Code or Scanned QR Payload
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      processInput(tokenInput);
                    }
                  }}
                  placeholder="e.g. MH-REF-1709 or paste JSON payload"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => processInput(tokenInput)}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Token</span>
              </button>
            </div>
          </div>

          {/* Quick Clickable Chips of Current Pending Referrals */}
          {referrals.filter(r => r.status === 'PENDING').length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Live Active Inbound Tokens (Click to Auto-Fill &amp; Verify):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {referrals.filter(r => r.status === 'PENDING').slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setTokenInput(r.tokenCode);
                      processInput(r.tokenCode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold hover:bg-blue-100 transition-colors"
                  >
                    #{r.tokenCode} ({r.patientName.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-800 dark:text-rose-300">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{validationError}</p>
            </div>
          )}

          {/* Scanned & Verified Referral Card */}
          {scannedResult && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/60 shadow-lg space-y-4 animate-in fade-in zoom-in-95">
              
              {/* Verification Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  TOKEN VERIFIED &bull; OFFICIAL SWASTHYASETU PASS
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  #{scannedResult.tokenCode}
                </span>
              </div>

              {/* Patient & Clinical Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Patient Full Name</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {scannedResult.patientName} ({scannedResult.patientAge}y &bull; {scannedResult.patientGender})
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 block font-mono text-[11px] mt-0.5">
                    ABHA: {scannedResult.patientAbha}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Referring Facility</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    {scannedResult.referringFacility}
                  </span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Dr: {scannedResult.referringDoctorName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Required Specialty</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {scannedResult.specialtyRequired}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Triage Priority</span>
                  <span className={`font-black uppercase ${
                    scannedResult.triagePriority === 'red' ? 'text-rose-600' : 'text-amber-600'
                  }`}>
                    {scannedResult.triagePriority.toUpperCase()} (Score: {scannedResult.triageScore})
                  </span>
                </div>

                <div className="sm:col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase block">Referral Clinical Reason</span>
                  <p className="text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    {scannedResult.referralReason}
                  </p>
                </div>
              </div>

              {/* Action: Open in Specialist Review / Admission */}
              <button
                onClick={() => {
                  handleStopCamera();
                  onSelectReferral(scannedResult);
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-101"
              >
                <span>Fast-Track Intake &bull; Open Referral Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
