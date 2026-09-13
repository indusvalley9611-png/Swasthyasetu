import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { INITIAL_PATIENTS, INITIAL_REFERRALS } from '@/lib/mockData';
import { PRE_REGISTERED_STAFF, findUserById } from '@/context/AuthContext';
import { canAccessPatientReport, recordAuditLog } from '@/lib/patientPrivacyService';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const patientId = params.id;
    const body = await request.json().catch(() => ({}));

    // Strict patient resolution by ID or ABHA; do NOT fall back to patient 0
    const patient = INITIAL_PATIENTS.find((p) => p.id === patientId || p.abhaId === patientId);
    if (!patient) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Patient not found with ID: ${patientId}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = request.headers.get('x-user-id') || body.userId;
    const isEmergency =
      request.headers.get('x-emergency-override') === 'true' || body.isEmergency === true;
    const emergencyReason =
      request.headers.get('x-emergency-reason') || body.emergencyReason || '';
    const patientAbha = request.headers.get('x-patient-abha') || body.abhaId;

    // Case A: Citizen Self-Service via ABHA OTP Portal
    if (patientAbha) {
      const normalizedReqAbha = String(patientAbha).replace(/\D/g, '');
      const normalizedPatAbha = patient.abhaId.replace(/\D/g, '');
      if (normalizedReqAbha !== normalizedPatAbha) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Access Denied: ABHA credentials do not match requested patient record.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      recordAuditLog({
        userId: `citizen-${patient.id}`,
        userName: patient.fullName,
        userRole: 'patient' as any,
        userFacility: 'ABDM Citizen Portal',
        administrativeLevel: 'facility',
        patientId: patient.id,
        patientName: patient.fullName,
        patientAbha: patient.abhaId,
        action: 'VIEW_PATIENT_REPORT',
        resource: 'Medical Report PDF Export (ABHA Citizen Portal)',
        reason: 'Authenticated ABHA Citizen Download',
        accessGranted: true,
      });
    } else {
      // Case B: Healthcare Worker Access — MUST provide valid authenticated identity
      if (!userId) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: 'Authentication required. Missing x-user-id header or verified citizen ABHA credential.',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const user = findUserById(userId) || PRE_REGISTERED_STAFF[userId];
      if (!user) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: `User not found in ABDM Healthcare Professional Registry: ${userId}`,
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
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
          resource: 'Medical Report PDF Export',
          reason: decision.reason,
          accessGranted: false,
        });

        return new NextResponse(
          JSON.stringify({
            error: 'Access Denied: You do not have permission to download protected medical records for this patient.',
            reason: decision.reason,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Log authorized PDF download
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
        resource: 'Medical Report PDF Export',
        reason: isEmergency ? `Emergency Override: ${emergencyReason}` : decision.reason,
        accessGranted: true,
      });
    }

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

    page.drawText('GOVERNMENT OF MAHARASHTRA | PUBLIC HEALTH DEPARTMENT', {
      x: margin,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.1, 0.3, 0.6),
    });
    y -= 25;

    page.drawText('SWASTHYA SETU - COMPLETE MEDICAL REPORT', {
      x: margin,
      y,
      size: 16,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    drawText('PATIENT DEMOGRAPHICS', helveticaBold, 14, rgb(0.2, 0.6, 0.6));
    y -= 5;
    drawText('Name: ' + patient.fullName);
    drawText('ABHA Number: ' + patient.abhaId);
    drawText('Age/Gender: ' + patient.age + ' / ' + patient.gender);
    drawText('Blood Group: ' + (patient.bloodGroup || 'N/A'));
    drawText('Phone: ' + patient.phone);
    drawText(
      'Address: ' +
        (patient.village || 'N/A') +
        ', ' +
        (patient.taluka || 'N/A') +
        ', ' +
        (patient.district || 'N/A')
    );
    if (patient.emergencyContact) {
      drawText(
        'Emergency Contact: ' +
          patient.emergencyContact.name +
          ' (' +
          patient.emergencyContact.phone +
          ')'
      );
    }

    y -= 20;

    drawText('CLINICAL PROFILE & HISTORY', helveticaBold, 14, rgb(0.2, 0.6, 0.6));
    y -= 5;

    if (patient.isPregnant) {
      drawText('Pregnancy Status: Positive', helveticaBold, 12, rgb(0.8, 0.2, 0.2));
      drawText('High Risk: ' + (patient.isHighRiskPregnancy ? 'YES' : 'NO'));
    }

    if (patient.chronicConditions && patient.chronicConditions.length > 0) {
      drawText('Chronic Conditions: ' + patient.chronicConditions.join(', '));
    } else {
      drawText('Chronic Conditions: None reported.');
    }

    y -= 20;

    drawText('RECENT ENCOUNTERS & SCREENINGS', helveticaBold, 14, rgb(0.2, 0.6, 0.6));
    y -= 5;

    if (patient.encounters && patient.encounters.length > 0) {
      patient.encounters.slice(0, 3).forEach((enc: any) => {
        drawText('Date: ' + enc.date + ' | Facility: ' + enc.facilityName, helveticaBold, 11);
        drawText('Provider: ' + enc.providerName, helvetica, 11);
        if (enc.chiefComplaints) drawText('Complaints: ' + enc.chiefComplaints, helvetica, 11);
        if (enc.diagnosis) drawText('Diagnosis: ' + enc.diagnosis, helvetica, 11);

        if (enc.vitals) {
          const v = enc.vitals;
          drawText(
            'Vitals: BP ' +
              v.systolicBp +
              '/' +
              v.diastolicBp +
              ' | HR ' +
              v.heartRate +
              ' | SpO2 ' +
              v.spO2 +
              '%',
            helvetica,
            10,
            rgb(0.3, 0.3, 0.3)
          );
        }
        y -= 10;
      });
    } else {
      drawText('No recent encounters on record.');
    }

    y = 50;
    page.drawLine({
      start: { x: margin, y: y + 15 },
      end: { x: width - margin, y: y + 15 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText('Generated by SwasthyaSetu - Maharashtra ABDM Network', {
      x: margin,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText('Date: ' + new Date().toLocaleString('en-IN'), {
      x: width - margin - 150,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const id = params.id;
    const url = new URL(request.url);
    const userId = request.headers.get('x-user-id') || url.searchParams.get('userId') || '';
    const isEmergency =
      request.headers.get('x-emergency-override') === 'true' ||
      url.searchParams.get('isEmergency') === 'true';
    const emergencyReason =
      request.headers.get('x-emergency-reason') ||
      url.searchParams.get('emergencyReason') ||
      '';
    const patientAbha =
      request.headers.get('x-patient-abha') ||
      url.searchParams.get('abhaId') ||
      url.searchParams.get('patientAbha') ||
      '';

    const patient = INITIAL_PATIENTS.find((p) => p.id === id || p.abhaId === id);
    if (!patient) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: `Patient not found with ID: ${id}`,
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (userId) headers['x-user-id'] = userId;
    if (patientAbha) headers['x-patient-abha'] = patientAbha;
    if (isEmergency) {
      headers['x-emergency-override'] = 'true';
      headers['x-emergency-reason'] = emergencyReason;
    }

    const req = new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, isEmergency, emergencyReason, abhaId: patientAbha }),
    });
    return await POST(req, context);
  } catch (error) {
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}
