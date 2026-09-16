import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/authStore';
import { cookies } from 'next/headers';
import { PRE_REGISTERED_STAFF } from '@/lib/staffRegistry';
import { resolveCanonicalFacility, isValidCanonicalFacilityId } from '@/lib/mockData';
import { recordAuditLog } from '@/lib/patientPrivacyService';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('swasthyasetu_session');
  if (!token) return null;
  const session = sessionStore.get(token.value);
  if (!session) return null;
  const user = Object.values(PRE_REGISTERED_STAFF).find(u => u.id === session.userId);
  return user || null;
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, resource } = body;

    if (action === 'UPDATE_REFERRAL') {
      const { referralId, targetFacilityId } = resource || {};
      
      // Strict facility check for clinical workers
      if (['specialist', 'phc_doctor', 'nurse'].includes(user.role)) {
         if (targetFacilityId !== user.facilityId) {
            recordAuditLog({
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              userFacility: user.facilityName,
              action: 'ACCESS_DENIED',
              resource: `REFERRAL:${referralId || targetFacilityId}`,
              reason: `Unauthorized referral modification attempt on foreign facility ${targetFacilityId}`,
              accessGranted: false,
            });
            return NextResponse.json({ success: false, error: 'Cannot modify referral assigned to another facility' }, { status: 403 });
         }
      }
      return NextResponse.json({ success: true, allowed: true, user });
    }

    if (action === 'UPDATE_STOCK') {
      if (user.role === 'asha') {
        recordAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          userFacility: user.facilityName,
          action: 'ACCESS_DENIED',
          resource: `MEDICINE_STOCK:${resource?.facilityId || 'UNKNOWN'}`,
          reason: 'ASHA workers are not authorized for medicine supply management',
          accessGranted: false,
        });
        return NextResponse.json({ success: false, error: 'ASHA workers are not authorized for medicine supply management' }, { status: 403 });
      }

      const { facilityId } = resource || {};
      const targetFac = resolveCanonicalFacility(facilityId);

      // District Officer: Must be constrained to their own district
      if (user.role === 'district_officer') {
        if (!targetFac || targetFac.district.toLowerCase() !== (user.district || '').toLowerCase()) {
          recordAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            userFacility: user.facilityName,
            action: 'ACCESS_DENIED',
            resource: `MEDICINE_STOCK:${facilityId}`,
            reason: `District Officer (${user.district}) attempted unauthorized stock mutation on foreign district facility (${targetFac?.district || 'Unknown'})`,
            accessGranted: false,
          });
          return NextResponse.json({ 
            success: false, 
            error: `Unauthorized: District officer can only coordinate facilities within ${user.district} district` 
          }, { status: 403 });
        }
      }

      // Facility-level workers: Must match own facility
      if (['phc_doctor', 'nurse', 'pharmacist', 'specialist'].includes(user.role)) {
        if (user.facilityId !== facilityId) {
          recordAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            userFacility: user.facilityName,
            action: 'ACCESS_DENIED',
            resource: `MEDICINE_STOCK:${facilityId}`,
            reason: `Facility worker attempted unauthorized stock mutation on another facility ${facilityId}`,
            accessGranted: false,
          });
          return NextResponse.json({ success: false, error: 'Cannot modify stock of another facility' }, { status: 403 });
        }
      }

      return NextResponse.json({ success: true, allowed: true, user });
    }

    if (action === 'CREATE_REPLENISHMENT_REQUEST') {
      if (user.role === 'asha') {
        recordAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          userFacility: user.facilityName,
          action: 'ACCESS_DENIED',
          resource: 'REPLENISHMENT_REQUEST:CREATE',
          reason: 'ASHA workers are not authorized to create medicine replenishment requests',
          accessGranted: false,
        });
        return NextResponse.json({ success: false, error: 'ASHA workers are not authorized to create medicine replenishment requests' }, { status: 403 });
      }

      const { destinationFacilityId, items } = resource || {};
      const destFac = resolveCanonicalFacility(destinationFacilityId);

      // District Officer: Must be constrained to their own district
      if (user.role === 'district_officer') {
        if (!destFac || destFac.district.toLowerCase() !== (user.district || '').toLowerCase()) {
          recordAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            userFacility: user.facilityName,
            action: 'ACCESS_DENIED',
            resource: `REPLENISHMENT_REQUEST:${destinationFacilityId}`,
            reason: `District Officer (${user.district}) attempted to create request for foreign district facility (${destFac?.district || 'Unknown'})`,
            accessGranted: false,
          });
          return NextResponse.json({ 
            success: false, 
            error: `Unauthorized: District officer can only create replenishment requests for facilities within ${user.district} district` 
          }, { status: 403 });
        }
      }

      // Facility-level workers can only requisition for their own facility
      if (['phc_doctor', 'nurse', 'pharmacist', 'specialist'].includes(user.role)) {
        if (destinationFacilityId && destinationFacilityId !== user.facilityId) {
          recordAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            userFacility: user.facilityName,
            action: 'ACCESS_DENIED',
            resource: `REPLENISHMENT_REQUEST:${destinationFacilityId}`,
            reason: `Facility worker attempted to create request for another facility ${destinationFacilityId}`,
            accessGranted: false,
          });
          return NextResponse.json({ success: false, error: 'Cannot create replenishment requests for another facility' }, { status: 403 });
        }
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, error: 'Request must contain at least one medicine item' }, { status: 400 });
      }

      for (const item of items) {
        if (!item.medicineName || typeof item.medicineName !== 'string') {
          return NextResponse.json({ success: false, error: 'Invalid medicine name in line items' }, { status: 400 });
        }
        if (!item.requestedQuantity || typeof item.requestedQuantity !== 'number' || item.requestedQuantity <= 0) {
          return NextResponse.json({ success: false, error: `Invalid quantity for ${item.medicineName}: must be greater than 0` }, { status: 400 });
        }
      }

      return NextResponse.json({ 
        success: true, 
        allowed: true, 
        user, 
        authorizedFacilityId: user.facilityId || destinationFacilityId 
      });
    }

    if (action === 'CREATE_STOCK_TRANSFER' || action === 'PROCESS_STOCK_TRANSFER') {
      if (user.role === 'asha') {
        recordAuditLog({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          userFacility: user.facilityName,
          action: 'ACCESS_DENIED',
          resource: 'STOCK_TRANSFER:ACTION',
          reason: 'ASHA workers are not authorized to create or process stock transfers',
          accessGranted: false,
        });
        return NextResponse.json({ success: false, error: 'ASHA workers are not authorized for stock transfers' }, { status: 403 });
      }

      const { sourceFacilityId, destinationFacilityId } = resource || {};
      const srcFac = sourceFacilityId ? resolveCanonicalFacility(sourceFacilityId) : undefined;
      const dstFac = destinationFacilityId ? resolveCanonicalFacility(destinationFacilityId) : undefined;

      // District Officer: At least one facility must be in district or connect to State Reserve
      if (user.role === 'district_officer') {
        const userDistLower = (user.district || '').toLowerCase();
        const srcInDistrict = srcFac?.district.toLowerCase() === userDistLower;
        const dstInDistrict = dstFac?.district.toLowerCase() === userDistLower;
        const isStateSource = sourceFacilityId === 'fac-state-reserve';
        const isNationalSource = sourceFacilityId === 'fac-nha-delhi';

        if (!srcInDistrict && !dstInDistrict && !isStateSource && !isNationalSource) {
          recordAuditLog({
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            userFacility: user.facilityName,
            action: 'ACCESS_DENIED',
            resource: `STOCK_TRANSFER:${sourceFacilityId}->${destinationFacilityId}`,
            reason: `District Officer (${user.district}) attempted transfer action outside district jurisdiction (${srcFac?.district || ''} -> ${dstFac?.district || ''})`,
            accessGranted: false,
          });
          return NextResponse.json({ 
            success: false, 
            error: `Unauthorized: Transfer does not involve facilities within ${user.district} district` 
          }, { status: 403 });
        }
      }

      return NextResponse.json({ success: true, allowed: true, user });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
