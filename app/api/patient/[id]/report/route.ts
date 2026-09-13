import { NextResponse } from 'next/server';
import { INITIAL_PATIENTS, INITIAL_REFERRALS } from '@/lib/mockData';
import { PRE_REGISTERED_STAFF, findUserById } from '@/context/AuthContext';
import {
  canAccessPatientReport,
  maskPatientForUnauthorizedView,
  recordAuditLog,
} from '@/lib/patientPrivacyService';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = params.id;

    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || url.searchParams.get('userId');
    const isEmergency =
      request.headers.get('x-emergency-override') === 'true' ||
      url.searchParams.get('isEmergency') === 'true';
    const emergencyReason =
      request.headers.get('x-emergency-reason') ||
      url.searchParams.get('emergencyReason') ||
      '';

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Missing x-user-id header or userId parameter.',
        },
        { status: 401 }
      );
    }

    const user = findUserById(userId) || PRE_REGISTERED_STAFF[userId];
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `User not found in ABDM Healthcare Professional Registry: ${userId}`,
        },
        { status: 401 }
      );
    }

    const patient = INITIAL_PATIENTS.find(
      (p) => p.id === patientId || p.abhaId === patientId
    );

    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient not found with ID: ${patientId}` },
        { status: 404 }
      );
    }

    const decision = canAccessPatientReport(user, patient, {
      referrals: INITIAL_REFERRALS,
      isEmergency,
      emergencyReason,
    });

    if (!decision.allowed) {
      // Record failed access attempt in audit log
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED',
        resource: 'Protected Medical Report API',
        reason: decision.reason,
        accessGranted: false,
      });

      return NextResponse.json(
        {
          success: false,
          allowed: false,
          error: 'Access Denied: Protected Clinical Record Under ABDM Least-Privilege Policy',
          decision,
          maskedPatient: maskPatientForUnauthorizedView(patient, decision),
        },
        { status: 403 }
      );
    }

    // Record authorized access attempt
    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT',
      resource: 'Protected Medical Report API',
      reason: isEmergency ? `Emergency Override: ${emergencyReason}` : decision.reason,
      accessGranted: true,
    });

    return NextResponse.json({
      success: true,
      allowed: true,
      decision,
      patient,
    });
  } catch (error: any) {
    console.error('Error fetching patient report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const body = await request.json().catch(() => ({}));

    const userId = request.headers.get('x-user-id') || body.userId;
    const isEmergency =
      request.headers.get('x-emergency-override') === 'true' ||
      body.isEmergency === true;
    const emergencyReason =
      request.headers.get('x-emergency-reason') ||
      body.emergencyReason ||
      '';

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Missing x-user-id header or userId parameter.',
        },
        { status: 401 }
      );
    }

    const user = findUserById(userId) || PRE_REGISTERED_STAFF[userId];
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: `User not found in ABDM Healthcare Professional Registry: ${userId}`,
        },
        { status: 401 }
      );
    }

    const patient = INITIAL_PATIENTS.find(
      (p) => p.id === patientId || p.abhaId === patientId
    );

    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient not found with ID: ${patientId}` },
        { status: 404 }
      );
    }

    const decision = canAccessPatientReport(user, patient, {
      referrals: INITIAL_REFERRALS,
      isEmergency,
      emergencyReason,
    });

    if (!decision.allowed) {
      recordAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED',
        resource: 'Protected Medical Report API',
        reason: decision.reason,
        accessGranted: false,
      });

      return NextResponse.json(
        {
          success: false,
          allowed: false,
          error: 'Access Denied: Protected Clinical Record Under ABDM Least-Privilege Policy',
          decision,
          maskedPatient: maskPatientForUnauthorizedView(patient, decision),
        },
        { status: 403 }
      );
    }

    recordAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel,
      patientId: patient.id,
      patientName: patient.fullName,
      patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT',
      resource: 'Protected Medical Report API',
      reason: isEmergency ? `Emergency Override: ${emergencyReason}` : decision.reason,
      accessGranted: true,
    });

    return NextResponse.json({
      success: true,
      allowed: true,
      decision,
      patient,
    });
  } catch (error: any) {
    console.error('Error fetching patient report:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
