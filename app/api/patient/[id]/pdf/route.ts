import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { INITIAL_PATIENTS, INITIAL_REFERRALS } from '@/lib/mockData';
import { PRE_REGISTERED_STAFF } from '@/lib/staffRegistry';
import { canAccessPatientReport, recordAuditLog } from '@/lib/patientPrivacyService';
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

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const body = await request.json().catch(() => ({}));

    const patient = INITIAL_PATIENTS.find((p) => p.id === patientId || p.abhaId === patientId);
    if (!patient) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Patient not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const isEmergency = request.headers.get('x-emergency-override') === 'true' || body.isEmergency === true;
    const emergencyReason = request.headers.get('x-emergency-reason') || body.emergencyReason || '';

    const user = await getAuthenticatedUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ success: false, error: 'Authentication required. Invalid or missing session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const decision = canAccessPatientReport(user, patient, { referrals: INITIAL_REFERRALS, isEmergency, emergencyReason });

    if (!decision.allowed) {
      recordAuditLog({
        userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED', resource: 'Medical Report PDF Export', reason: decision.reason, accessGranted: false,
      });
      return new NextResponse(JSON.stringify({ error: 'Access Denied', reason: decision.reason }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    recordAuditLog({
      userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT', resource: 'Medical Report PDF Export',
      reason: isEmergency ? 'Emergency Override' : decision.reason, accessGranted: true,
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    let y = height - margin;

    const drawText = (text: string, font = helvetica, size = 12, color = rgb(0, 0, 0)) => {
      page.drawText(text, { x: margin, y, size, font, color });
      y -= size + 5;
    };

    page.drawText('GOVERNMENT OF MAHARASHTRA | PUBLIC HEALTH DEPARTMENT', { x: margin, y, size: 14, font: helveticaBold, color: rgb(0.1, 0.3, 0.6) });
    y -= 25;
    page.drawText('SWASTHYA SETU - COMPLETE MEDICAL REPORT', { x: margin, y, size: 16, font: helveticaBold, color: rgb(0, 0, 0) });
    y -= 40;
    drawText('PATIENT DEMOGRAPHICS', helveticaBold, 14, rgb(0.2, 0.6, 0.6));
    y -= 5;
    drawText('Name: ' + patient.fullName);
    drawText('ABHA Number: ' + patient.abhaId);
    drawText('Age/Gender: ' + patient.age + ' / ' + patient.gender);
    drawText('Phone: ' + patient.phone);
    y -= 20;

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Medical_Report_' + patient.abhaId + '.pdf"',
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const url = new URL(request.url);
    const isEmergency = request.headers.get('x-emergency-override') === 'true' || url.searchParams.get('isEmergency') === 'true';
    const emergencyReason = request.headers.get('x-emergency-reason') || url.searchParams.get('emergencyReason') || '';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) headers['cookie'] = cookieHeader;
    if (isEmergency) {
      headers['x-emergency-override'] = 'true';
      headers['x-emergency-reason'] = emergencyReason;
    }

    const req = new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify({ isEmergency, emergencyReason }),
    });
    return await POST(req, context);
  } catch (error) {
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}
