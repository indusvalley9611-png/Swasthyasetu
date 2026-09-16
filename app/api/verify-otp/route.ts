import { NextRequest, NextResponse } from 'next/server';
import { otpStore, sessionStore, generateSessionToken } from '@/lib/authStore';
import { PRE_REGISTERED_STAFF } from '@/lib/staffRegistry';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: 'Phone number and OTP code are required.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanOtp = otp.trim();

    const storedData = otpStore.get(cleanPhone);
    if (!storedData) {
      return NextResponse.json(
        { success: false, error: 'No active OTP found for this number or it has expired.' },
        { status: 400 }
      );
    }

    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(cleanPhone);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (storedData.otp !== cleanOtp) {
      return NextResponse.json(
        { success: false, error: 'Invalid 6-digit OTP code.' },
        { status: 400 }
      );
    }

    // OTP matched! Remove it from store to prevent replay
    otpStore.delete(cleanPhone);

    const userProfile = PRE_REGISTERED_STAFF[cleanPhone];
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found in HPR registry.' },
        { status: 401 }
      );
    }

    // Generate Session Token
    const sessionToken = generateSessionToken();
    sessionStore.set(sessionToken, {
      userId: userProfile.id,
      role: userProfile.role,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    const res = NextResponse.json({
      success: true,
      message: 'Mobile number verified successfully via ABDM Gateway.',
      user: userProfile
    });

    res.cookies.set('swasthyasetu_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
