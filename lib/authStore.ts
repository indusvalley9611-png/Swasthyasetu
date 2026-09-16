// Prototype Limitations: 
// 1. In-memory stores will clear on serverless cold starts. Production requires Redis/DB.
// 2. We use HttpOnly cookies with a server-side session map.
// 3. For the demo, this provides a boundary against client-side role forgery.

const globalAny = global as any;

export const otpStore: Map<string, { otp: string; expiresAt: number }> = 
  globalAny.otpStore || new Map();
if (process.env.NODE_ENV !== 'production') globalAny.otpStore = otpStore;

export const sessionStore: Map<string, { userId: string; role: string; expiresAt: number }> = 
  globalAny.sessionStore || new Map();
if (process.env.NODE_ENV !== 'production') globalAny.sessionStore = sessionStore;

export function generateSessionToken() {
  return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}
