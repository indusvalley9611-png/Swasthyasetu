import { NextResponse } from 'next/server';
import { INITIAL_PATIENTS, INITIAL_REFERRALS } from '@/lib/mockData';
import { PRE_REGISTERED_STAFF } from '@/lib/staffRegistry';
import { canAccessPatientReport, maskPatientForUnauthorizedView, recordAuditLog } from '@/lib/patientPrivacyService';
import { sessionStore } from '@/lib/authStore';
import { cookies } from 'next/headers';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('swasthyasetu_session');
  if (!token) return null;
  const session = sessionStore.get(token.value);
  if (!session) return null;
  const user = Object.values(PRE_REGISTERED_STAFF).find(u => u.id === session.userId);
  return user || null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const url = new URL(request.url);
    const isEmergency = request.headers.get('x-emergency-override') === 'true' || url.searchParams.get('isEmergency') === 'true';
    const emergencyReason = request.headers.get('x-emergency-reason') || url.searchParams.get('emergencyReason') || '';

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required. Invalid or missing session.' }, { status: 401 });
    }

    const patient = INITIAL_PATIENTS.find((p) => p.id === patientId || p.abhaId === patientId);
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const decision = canAccessPatientReport(user, patient, { referrals: INITIAL_REFERRALS, isEmergency, emergencyReason });

    if (!decision.allowed) {
      recordAuditLog({
        userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED', resource: 'Protected Medical Report API', reason: decision.reason, accessGranted: false,
      });
      return NextResponse.json({ success: false, allowed: false, error: 'Access Denied', decision, maskedPatient: maskPatientForUnauthorizedView(patient, decision) }, { status: 403 });
    }

    recordAuditLog({
      userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT', resource: 'Protected Medical Report API', reason: decision.reason, accessGranted: true,
    });

    return NextResponse.json({ success: true, allowed: true, decision, patient });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const body = await request.json().catch(() => ({}));
    
    const isEmergency = request.headers.get('x-emergency-override') === 'true' || body.isEmergency === true;
    const emergencyReason = request.headers.get('x-emergency-reason') || body.emergencyReason || '';

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required. Invalid or missing session.' }, { status: 401 });
    }

    const patient = INITIAL_PATIENTS.find((p) => p.id === patientId || p.abhaId === patientId);
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const decision = canAccessPatientReport(user, patient, { referrals: INITIAL_REFERRALS, isEmergency, emergencyReason });

    if (!decision.allowed) {
      recordAuditLog({
        userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED', resource: 'Protected Medical Report API', reason: decision.reason, accessGranted: false,
      });
      return NextResponse.json({ success: false, allowed: false, error: 'Access Denied', decision, maskedPatient: maskPatientForUnauthorizedView(patient, decision) }, { status: 403 });
    }

    recordAuditLog({
      userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT', resource: 'Protected Medical Report API', reason: decision.reason, accessGranted: true,
    });

    return NextResponse.json({ success: true, allowed: true, decision, patient });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
