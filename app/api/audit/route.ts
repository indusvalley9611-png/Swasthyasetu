import { NextResponse } from 'next/server';
import { getAuditLogs, recordAuditLog } from '@/lib/patientPrivacyService';
import { INITIAL_AUDIT_LOGS } from '@/lib/mockData';
import { sessionStore } from '@/lib/authStore';
import { cookies } from 'next/headers';
import { PRE_REGISTERED_STAFF } from '@/lib/staffRegistry';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('swasthyasetu_session');
  if (!token) return null;
  const session = sessionStore.get(token.value);
  if (!session) return null;
  const user = Object.values(PRE_REGISTERED_STAFF).find(u => u.id === session.userId);
  return user || null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    // Role-based gating: only district officers can view all logs.
    const canViewAll = user.role === 'district_officer';
    
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId') || undefined;
    // If not admin, they can only query their own logs
    const queryUserId = canViewAll ? (url.searchParams.get('userId') || undefined) : user.id;
    const action = url.searchParams.get('action') || undefined;

    let logs = getAuditLogs({ patientId, userId: queryUserId, action });

    if (logs.length === 0 && !patientId && !queryUserId && !action) {
      logs = INITIAL_AUDIT_LOGS;
      if (!canViewAll) {
         logs = logs.filter(l => l.userId === user.id);
      }
    }

    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await request.json();
    
    // Enforce that the user can only log actions for themselves
    if (body.userId && body.userId !== user.id) {
       return NextResponse.json({ success: false, error: 'Cannot forge audit logs for another user.' }, { status: 403 });
    }

    // Override the user details with the authenticated session
    const secureBody = {
      ...body,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userFacility: user.facilityName
    };

    const entry = recordAuditLog(secureBody);
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
