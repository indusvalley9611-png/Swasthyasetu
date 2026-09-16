declare global {
  var __swasthyasetu_otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
  var __swasthyasetu_sessionStore: Map<string, { userId: string; role: string; expiresAt: number }> | undefined;
}

export const otpStore: Map<string, { otp: string; expiresAt: number }> = 
  globalThis.__swasthyasetu_otpStore || (globalThis.__swasthyasetu_otpStore = new Map());

export const sessionStore: Map<string, { userId: string; role: string; expiresAt: number }> = 
  globalThis.__swasthyasetu_sessionStore || (globalThis.__swasthyasetu_sessionStore = new Map());

export function generateSessionToken() {
  return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}
