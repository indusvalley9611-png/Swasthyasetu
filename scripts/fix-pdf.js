const fs = require('fs');

let pdfFile = fs.readFileSync('app/api/patient/[id]/pdf/route.ts', 'utf8');

const helperStr = \import { sessionStore } from '@/lib/authStore';
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
\;

pdfFile = pdfFile.replace("import { canAccessPatientReport, recordAuditLog } from '@/lib/patientPrivacyService';", "import { canAccessPatientReport, recordAuditLog } from '@/lib/patientPrivacyService';\n" + helperStr);

const startStr = "    const userId = request.headers.get('x-user-id') || body.userId;";
const endStr = "    const pdfDoc = await PDFDocument.create();";
const startIndex = pdfFile.indexOf(startStr);
const endIndex = pdfFile.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const newLogic = \
    const isEmergency = request.headers.get('x-emergency-override') === 'true' || body.isEmergency === true;
    const emergencyReason = request.headers.get('x-emergency-reason') || body.emergencyReason || '';

    const user = await getAuthenticatedUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Authentication required. Invalid or missing session.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const decision = canAccessPatientReport(user, patient, { referrals: INITIAL_REFERRALS, isEmergency, emergencyReason });
    if (!decision.allowed) {
      recordAuditLog({
        userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
        administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
        action: 'ACCESS_DENIED', resource: 'Medical Report PDF Export', reason: decision.reason, accessGranted: false,
      });
      return new NextResponse(
        JSON.stringify({ error: 'Access Denied: You do not have permission to download protected medical records.', reason: decision.reason }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    recordAuditLog({
      userId: user.id, userName: user.name, userRole: user.role, userFacility: user.facilityName,
      administrativeLevel: user.administrativeLevel, patientId: patient.id, patientName: patient.fullName, patientAbha: patient.abhaId,
      action: isEmergency ? 'EMERGENCY_ACCESS' : 'VIEW_PATIENT_REPORT', resource: 'Medical Report PDF Export',
      reason: isEmergency ? \\\Emergency Override: \\\\\\ : decision.reason, accessGranted: true,
    });

\;
    pdfFile = pdfFile.substring(0, startIndex) + newLogic + pdfFile.substring(endIndex);
}

pdfFile = pdfFile.replace("const userId = request.headers.get('x-user-id') || url.searchParams.get('userId') || '';", "");
pdfFile = pdfFile.replace("if (userId) headers['x-user-id'] = userId;", "");
pdfFile = pdfFile.replace("body: JSON.stringify({ userId, isEmergency, emergencyReason, abhaId: patientAbha })", "body: JSON.stringify({ isEmergency, emergencyReason, abhaId: patientAbha })");

const getBlockStart = "    const req = new Request('http://localhost', {";
const getBlockEnd = "    return await POST(req, context);";
const newGetBlock = \
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) headers['cookie'] = cookieHeader;
    const req = new Request('http://localhost', {
      method: 'POST',
      headers,
      body: JSON.stringify({ isEmergency, emergencyReason, abhaId: patientAbha }),
    });
    return await POST(req, context);
\;
const getIdx = pdfFile.indexOf(getBlockStart);
const getEndIdx = pdfFile.indexOf(getBlockEnd) + getBlockEnd.length;
if (getIdx !== -1) {
  pdfFile = pdfFile.substring(0, getIdx) + newGetBlock + pdfFile.substring(getEndIdx);
}

fs.writeFileSync('app/api/patient/[id]/pdf/route.ts', pdfFile);
console.log('PDF route updated.');
