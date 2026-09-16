'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Role, UserProfile } from '@/lib/types';

// Re-export from shared module so existing component imports keep working
export { PRE_REGISTERED_STAFF, USER_PROFILES_BY_ROLE, ALL_REGISTERED_USERS, findUserById, GUEST_PROFILE } from '@/lib/staffRegistry';
import { PRE_REGISTERED_STAFF, USER_PROFILES_BY_ROLE, GUEST_PROFILE, ALL_REGISTERED_USERS, findUserById } from '@/lib/staffRegistry';

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  activePhone: string;
  generatedOtp: string | null;
  sendOtp: (phone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'swasthyasetu_auth_phone';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<Role | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activePhone, setActivePhone] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  // Restore authenticated session from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPhone = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedPhone && PRE_REGISTERED_STAFF[savedPhone]) {
        const profile = PRE_REGISTERED_STAFF[savedPhone];
        setCurrentUser(profile);
        setRoleState(profile.role);
        setActivePhone(profile.phone);
        setIsAuthenticated(true);

        // P2: Verify if the server-side HttpOnly session survived (e.g. serverless cold start)
        fetch('/api/audit', { method: 'GET' })
          .then(res => {
            if (res.status === 401) {
              console.warn('Server session expired or lost. Logging out.');
              setCurrentUser(null);
              setRoleState(null);
              setIsAuthenticated(false);
              setActivePhone('');
              localStorage.removeItem(AUTH_STORAGE_KEY);
              if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
                window.location.href = '/';
              }
            }
          })
          .catch(err => console.error('Failed to verify session', err));
      }
    }
  }, []);

  const logout = () => {
    setCurrentUser(null);
    setRoleState(null);
    setIsAuthenticated(false);
    setActivePhone('');
    setGeneratedOtp(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      // Clear cookie if present
      document.cookie = 'swasthyasetu_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      // Always redirect to the main SwasthyaSetu Portal Sign-In page
      if (window.location.pathname !== '/' || window.location.search || window.location.hash) {
        window.location.href = '/';
      }
    }
  };

  const sendOtp = async (phone: string) => {
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedOtp(data.demoSimulation?.otp || null);
        return { success: true, otp: data.demoSimulation?.otp };
      }
      return { success: false, error: data.error || 'Failed to send OTP' };
    } catch (err: any) {
      return { success: false, error: 'Network error' };
    }
  };

  const verifyOtp = async (phone: string, otp: string) => {
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setRoleState(data.user.role);
        setActivePhone(phone);
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_STORAGE_KEY, phone);
        }
        setGeneratedOtp(null);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid OTP' };
    } catch (err: any) {
      return { success: false, error: 'Network error' };
    }
  };

  // Resolve active user: prioritized to exact currentUser, fallback to role profile or guest session
  const activeUser: UserProfile =
    currentUser || (role ? USER_PROFILES_BY_ROLE[role] : GUEST_PROFILE);

  return (
    <AuthContext.Provider
      value={{
        role,
        user: activeUser,
        currentUser,
        isAuthenticated,
        activePhone,
        generatedOtp,
        sendOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
