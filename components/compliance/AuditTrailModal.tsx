'use client';

import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '@/lib/patientPrivacyService';
import { AuditLogEntry } from '@/lib/types';
import { useLanguage } from '@/context/LanguageContext';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building2,
  Lock,
} from 'lucide-react';

interface AuditTrailModalProps {
  onClose: () => void;
}

export function AuditTrailModal({ onClose }: AuditTrailModalProps) {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const refreshLogs = () => {
    setLogs(getAuditLogs());
  };

  useEffect(() => {
    refreshLogs();

    const handleUpdate = () => {
      refreshLogs();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('swasthyasetu_audit_updated', handleUpdate);
      return () => {
        window.removeEventListener('swasthyasetu_audit_updated', handleUpdate);
      };
    }
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (log.patientName && log.patientName.toLowerCase().includes(q)) ||
      (log.patientAbha && log.patientAbha.toLowerCase().includes(q)) ||
      (log.userName && log.userName.toLowerCase().includes(q)) ||
      (log.userFacility && log.userFacility.toLowerCase().includes(q)) ||
      (log.resource && log.resource.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q));

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>ABDM Security & Access Compliance Audit Trail</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  LIVE REGISTRY
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Immutable electronic audit record of all patient data access events under Maharashtra Health Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Doctor, Patient Name, ABHA ID, or Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              <option value="VIEW_PATIENT_REPORT">View Report</option>
              <option value="ACCESS_DENIED">Access Denied (Violations)</option>
              <option value="EMERGENCY_ACCESS">Emergency Break-Glass</option>
              <option value="CREATE_REFERRAL">Referral Created</option>
            </select>
          </div>
        </div>

        {/* Log Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No audit records matching the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 whitespace-nowrap">Timestamp</th>
                    <th className="p-3 whitespace-nowrap">Staff Member</th>
                    <th className="p-3 whitespace-nowrap">Facility / Level</th>
                    <th className="p-3 whitespace-nowrap">Patient</th>
                    <th className="p-3 whitespace-nowrap">Event / Action</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 whitespace-nowrap">Audit Details / Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => {
                    const isDenied = !log.accessGranted || log.action === 'ACCESS_DENIED';
                    const isEmergency = log.action === 'EMERGENCY_ACCESS';

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                          isDenied
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : isEmergency
                            ? 'bg-amber-50/20 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleDateString()}{' '}
                          <span className="text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{log.userName}</div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">{log.userRole}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[160px]">{log.userFacility}</div>
                          {log.administrativeLevel && (
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {log.administrativeLevel}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{log.patientName || 'Operational Resource'}</div>
                          {log.patientAbha && <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{log.patientAbha}</div>}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isDenied ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-md font-bold text-[10px] border border-rose-300 dark:border-rose-800">
                              <Lock className="w-3 h-3 text-rose-600" /> ACCESS DENIED
                            </span>
                          ) : isEmergency ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md font-extrabold text-[10px] border border-amber-300 dark:border-amber-800">
                              <Flame className="w-3 h-3 text-amber-600" /> EMERGENCY BREAK-GLASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold text-[10px] border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {log.action.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {log.accessGranted ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Blocked
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs text-[11px]">
                          <div className="font-medium truncate" title={log.reason || log.resource}>
                            {log.reason || log.resource}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>ABDM Health Professional Registry (HPR) Audit Policy Compliant</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
