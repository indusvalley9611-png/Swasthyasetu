'use client';

import React, { useState } from 'react';
import { Patient } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  X,
  Stethoscope,
  Send,
  HeartPulse,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface TeleconsultModalProps {
  patient: Patient | null;
  onClose: () => void;
}

export function TeleconsultModal({ patient, onClose }: TeleconsultModalProps) {
  const { language } = useLanguage();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [specialistNotes, setSpecialistNotes] = useState(
    'Patient exhibits severe gestational hypertension. Recommend immediate Labetalol 100mg stat, maintain left lateral tilt, and arrange 108 ALS transfer to District Hospital Aundh for NICU backup.'
  );
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
    {
      sender: 'Dr. Rajesh Deshmukh (Velhe PHC)',
      text: 'Good afternoon Dr. Kulkarni. 34-week patient presented with BP 178/114 and blurred vision. Initiated loading dose MgSO4.',
      time: '14:21',
    },
    {
      sender: 'Dr. Ananya Kulkarni (District Specialist)',
      text: 'Excellent initial stabilization. We have reserved ICU Maternity Bed #04 for her arrival. Keep ALS oxygen flow at 4L/min.',
      time: '14:22',
    },
  ]);
  const [newMsg, setNewMsg] = useState('');

  if (!patient) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages([
      ...chatMessages,
      {
        sender: 'Dr. Rajesh Deshmukh (Velhe PHC)',
        text: newMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span>{language === 'mr' ? 'ई-संजीवनी तज्ज्ञ टेली-कन्सल्टेशन' : 'e-Sanjeevani Specialist Teleconsultation'}</span>
                <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full uppercase font-bold">
                  Live Session
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Velhe PHC &bull; Connected to Dr. Ananya Kulkarni (District Hospital Aundh, Pune)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teleconsult Workspace */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
          {/* Left 7 Cols: Video & Patient Vitals Telemetry */}
          <div className="md:col-span-7 space-y-4">
            {/* Video Window Simulation */}
            <div className="bg-slate-950 rounded-2xl aspect-video relative overflow-hidden flex flex-col justify-between p-4 shadow-inner border border-slate-800">
              <div className="flex justify-between items-start text-white">
                <div className="bg-slate-900/80 px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-bold text-[11px]">Dr. Ananya Kulkarni, MD</span>
                  <span className="text-[10px] text-teal-300">(Chief Specialist)</span>
                </div>
                <div className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  HIGH-RISK CONSULT
                </div>
              </div>

              {/* Center Doctor Avatar Representation */}
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-teal-500 mx-auto flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  AK
                </div>
                <div className="text-slate-300 font-semibold text-xs">
                  District Hospital Aundh Emergency Room
                </div>
              </div>

              {/* Bottom Video Controls */}
              <div className="flex justify-center items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMicOn(!isMicOn)}
                  className={`p-2.5 rounded-full ${
                    isMicOn ? 'bg-slate-800 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-2.5 rounded-full ${
                    isVideoOn ? 'bg-slate-800 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-full flex items-center gap-1.5 shadow"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Consult</span>
                </button>
              </div>
            </div>

            {/* Live Synchronized Vitals Feed */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Patient Telemetry: {patient.fullName} (ABHA: {patient.abhaId})</span>
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Blood Pressure</span>
                  <span className="font-bold text-rose-700 font-mono">178/114 mmHg</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">SpO2 Oxygen</span>
                  <span className="font-bold text-slate-800 font-mono">94%</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                  <span className="font-bold text-slate-800 font-mono">106 bpm</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Gestation</span>
                  <span className="font-bold text-blue-900">34 Weeks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Clinical Chat & Specialist Directives */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-blue-700" />
                <span>Clinical Directives & Inter-Facility Chat</span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-700">
                      <span>{msg.sender}</span>
                      <span className="text-slate-400 font-mono">{msg.time}</span>
                    </div>
                    <p className="text-slate-800 text-[11px] leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Specialist Advisory Note */}
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1 text-amber-950">
              <span className="font-bold text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Specialist Tele-Prescription Recorded:</span>
              </span>
              <p className="text-[11px] text-amber-900 leading-relaxed italic">
                &ldquo;{specialistNotes}&rdquo;
              </p>
            </div>

            {/* Quick Chat Input */}
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type clinical question to specialist..."
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              />
              <button
                type="submit"
                className="p-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Teleconsultation encrypted & recorded under ABDM National Tele-Medicine Guidelines</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg"
          >
            Close Session
          </button>
        </div>
      </div>
    </div>
  );
}
