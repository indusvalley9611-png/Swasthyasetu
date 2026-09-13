'use client';

import React, { useState } from 'react';
import { Patient, Vitals } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import { useSync } from '@/context/SyncContext';
import { HeartPulse, AlertTriangle, FileCheck, Mic, X } from 'lucide-react';

interface RapidScreeningModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function RapidScreeningModal({ patient, onClose }: RapidScreeningModalProps) {
  const { language, t } = useLanguage();
  const { addClinicalEncounter } = useSync();

  const [systolicBp, setSystolicBp] = useState<number>(120);
  const [diastolicBp, setDiastolicBp] = useState<number>(80);
  const [spO2, setSpO2] = useState<number>(98);
  const [heartRate, setHeartRate] = useState<number>(76);
  const [bloodGlucose, setBloodGlucose] = useState<number>(100);
  const [hemoglobin, setHemoglobin] = useState<number>(11.5);
  const [chiefComplaints, setChiefComplaints] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [dictationLang, setDictationLang] = useState<'mr-IN' | 'hi-IN' | 'en-IN'>('mr-IN');

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    setIsRecording(true);
    // Mock dictation for UI purposes
    setTimeout(() => {
      setChiefComplaints(prev => prev + (prev ? " " : "") + (language === 'mr' ? 'डोकेदुखी आणि ताप' : 'Headache and fever'));
      setIsRecording(false);
    }, 2000);
  };

  const handleSaveScreening = (e: React.FormEvent) => {
    e.preventDefault();

    const newVitals: Vitals = {
      systolicBp,
      diastolicBp,
      heartRate,
      spO2,
      respiratoryRate: 18,
      temperature: 37.0,
      bloodGlucose,
      hemoglobin,
      consciousLevel: 'alert',
      recordedAt: new Date().toISOString(),
    };

    addClinicalEncounter(patient.id, {
      id: 'enc-' + Date.now(),
      date: new Date().toISOString(),
      type: 'Routine Checkup',
      vitals: newVitals,
      notes: chiefComplaints,
      diagnoses: []
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest flex items-center gap-2">
              <HeartPulse className="w-4 h-4" />
              Rapid Screening Form
            </h2>
            <div className="font-bold text-slate-900 dark:text-white mt-1 text-lg">{patient.fullName}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">ABHA: {patient.abhaId}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="p-6 overflow-y-auto">
          <form id="screening-form" onSubmit={handleSaveScreening} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  Systolic BP (mmHg)
                </label>
                <input
                  type="number"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 ${
                    systolicBp >= 140 
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 focus:ring-rose-500' 
                      : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  Diastolic BP (mmHg)
                </label>
                <input
                  type="number"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  SpO2 Oxygen (%)
                </label>
                <input
                  type="number"
                  value={spO2}
                  onChange={(e) => setSpO2(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 ${
                    spO2 < 94 
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 focus:ring-rose-500' 
                      : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  Pulse Rate (bpm)
                </label>
                <input
                  type="number"
                  value={heartRate}
                  onChange={(e) => setHeartRate(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  Hemoglobin (g/dL)
                </label>
                <input
                  type="number"
                  value={hemoglobin}
                  onChange={(e) => setHemoglobin(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  className={`w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 ${
                    hemoglobin < 9.0 
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-900 dark:text-rose-200 focus:ring-rose-500' 
                      : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5 uppercase tracking-wide">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  value={bloodGlucose}
                  onChange={(e) => setBloodGlucose(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-bold font-mono transition-colors focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 mt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                  Chief Symptoms
                </label>
                <div className="flex items-center gap-1.5">
                  <select 
                    value={dictationLang}
                    onChange={(e) => setDictationLang(e.target.value as any)}
                    className="text-[10px] border border-slate-300 dark:border-slate-600 rounded px-1.5 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 outline-none focus:border-teal-500"
                  >
                    <option value="mr-IN">Marathi</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="en-IN">English</option>
                  </select>
                  
                  <button
                    type="button"
                    onClick={startDictation}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border transition-colors font-bold ${
                      isRecording 
                        ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 animate-pulse' 
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Mic className={`w-3 h-3 ${isRecording ? 'text-rose-600 dark:text-rose-400' : ''}`} />
                    <span>{isRecording ? 'Listening...' : 'Voice Type'}</span>
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                placeholder="Type or speak symptoms..."
                className={`w-full px-3 py-3 border rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 ${
                  isRecording 
                    ? 'border-rose-400 dark:border-rose-500 ring-2 ring-rose-200 dark:ring-rose-900/50 dark:bg-slate-800 dark:text-white' 
                    : 'border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-teal-500'
                }`}
              />
            </div>

            {/* Risk Warnings */}
            {(systolicBp >= 140 || hemoglobin < 9.0 || spO2 < 94) && (
              <div className="bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 p-4 rounded-xl text-xs font-medium border border-rose-300 dark:border-rose-700/50 flex items-start gap-3 mt-4">
                <AlertTriangle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1 text-sm">High-Risk Indicator Detected:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {systolicBp >= 140 && <li>High Blood Pressure (Hypertension Risk)</li>}
                    {hemoglobin < 9.0 && <li>Severe Anemia risk</li>}
                    {spO2 < 94 && <li>Low Oxygen Saturation</li>}
                  </ul>
                  <p className="mt-2 text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider text-[10px]">Recommend Immediate Action / Referral</p>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="screening-form"
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition-all flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" />
            Save Vitals
          </button>
        </div>

      </div>
    </div>
  );
}
