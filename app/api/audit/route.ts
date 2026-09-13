import { NextResponse } from 'next/server';
import { getAuditLogs, recordAuditLog } from '@/lib/patientPrivacyService';
import { INITIAL_AUDIT_LOGS } from '@/lib/mockData';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const action = url.searchParams.get('action') || undefined;

    let logs = getAuditLogs({ patientId, userId, action });

    // Fallback to mock logs if storage is empty on server
    if (logs.length === 0 && !patientId && !userId && !action) {
      logs = INITIAL_AUDIT_LOGS;
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = recordAuditLog(body);

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (error: any) {
    console.error('Error recording audit log:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
