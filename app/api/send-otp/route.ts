import { NextRequest, NextResponse } from 'next/server';

// In-memory OTP cache for development/demo (in production, use Redis or DB)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Valid 10-digit phone number is required.' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    const fullPhoneNumber = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanPhone, { otp: generatedOtp, expiresAt });

    // Check for Real SMS Gateway Environment Variables
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const fast2smsKey = process.env.FAST2SMS_API_KEY;

    let smsSentReal = false;
    let gatewayUsed = 'Simulated Local Gateway';

    // 1. Attempt Twilio SMS
    let gatewayErrorMessage = '';
    if (twilioSid && twilioToken && twilioPhone) {
      try {
        const cleanFromNumber = twilioPhone.trim().replace(/\s+/g, '');
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        const params = new URLSearchParams({
          To: fullPhoneNumber,
          From: cleanFromNumber,
          Body: `[SwasthyaSetu - Government of Maharashtra] Your ABHA Health Registration OTP is ${generatedOtp}. Valid for 10 mins.`,
        });

        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );

        const twilioData = await twilioRes.json();
        if (twilioRes.ok) {
          smsSentReal = true;
          gatewayUsed = 'Twilio Real SMS';
        } else {
          gatewayErrorMessage = twilioData.message || JSON.stringify(twilioData);
          console.error('Twilio SMS error:', gatewayErrorMessage);
        }
      } catch (err: any) {
        gatewayErrorMessage = err?.message || 'Twilio fetch network error';
        console.error('Twilio fetch failed:', err);
      }
    }

    // 2. Attempt Fast2SMS (Indian Gateway)
    if (!smsSentReal && fast2smsKey) {
      try {
        const fastRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variables_values: generatedOtp,
            route: 'otp',
            numbers: cleanPhone,
          }),
        });

        const fastData = await fastRes.json();
        if (fastRes.ok) {
          smsSentReal = true;
          gatewayUsed = 'Fast2SMS Real SMS';
        } else {
          gatewayErrorMessage = fastData.message || JSON.stringify(fastData);
          console.error('Fast2SMS error:', gatewayErrorMessage);
        }
      } catch (err: any) {
        gatewayErrorMessage = err?.message || 'Fast2SMS fetch network error';
        console.error('Fast2SMS fetch failed:', err);
      }
    }

    // 3. Attempt MSG91 (Indian Gateway)
    const msg91AuthKey = process.env.MSG91_AUTH_KEY;
    const msg91TemplateId = process.env.MSG91_TEMPLATE_ID;

    if (!smsSentReal && msg91AuthKey && msg91TemplateId) {
      try {
        // MSG91 SendOTP API
        const msg91Url = `https://control.msg91.com/api/v5/otp?template_id=${msg91TemplateId}&mobile=91${cleanPhone}&authkey=${msg91AuthKey}&otp=${generatedOtp}`;
        
        const msg91Res = await fetch(msg91Url, { method: 'POST' });
        const msg91Data = await msg91Res.json();

        if (msg91Data.type === 'success') {
          smsSentReal = true;
          gatewayUsed = 'MSG91 Real SMS';
        } else {
          gatewayErrorMessage = msg91Data.message || JSON.stringify(msg91Data);
          console.error('MSG91 error:', gatewayErrorMessage);
        }
      } catch (err: any) {
        gatewayErrorMessage = err?.message || 'MSG91 fetch network error';
        console.error('MSG91 fetch failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      otp: generatedOtp, // Included so frontend can show fallback if no real SMS API key is set yet
      realSmsSent: smsSentReal,
      gateway: gatewayUsed,
      gatewayError: gatewayErrorMessage || undefined,
      message: smsSentReal
        ? `Real SMS dispatched to +91 ${cleanPhone} via ${gatewayUsed}.`
        : gatewayErrorMessage
        ? `Gateway Error: ${gatewayErrorMessage}`
        : `OTP generated for +91 ${cleanPhone}. Add API key in .env.local to send live SMS.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
