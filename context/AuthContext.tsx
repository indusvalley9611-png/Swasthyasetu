'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Role } from '@/lib/types';

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  roleTitleEn: string;
  roleTitleMr: string;
  phone: string;
  facilityName: string;
  facilityType: string;
  hfrCode: string; // Health Facility Registry code
  taluka: string;
  district: string;
  registrationNumber: string; // MMC or ASHA ID
}

export const PRE_REGISTERED_STAFF: Record<string, UserProfile> = {
  '9822019284': {
    id: 'user-asha-01',
    name: 'Smt. Sunita Shinde',
    role: 'asha',
    roleTitleEn: 'ASHA Facilitator',
    roleTitleMr: 'आशा गट प्रवर्तक / सेविका',
    phone: '9822019284',
    facilityName: 'Ambavane Sub-Centre',
    facilityType: 'Sub-Centre',
    hfrCode: 'HFR-MH-PUN-00412',
    taluka: 'Velhe',
    district: 'Pune',
    registrationNumber: 'ASHA-MH-PUN-0941',
  },
  '9422018374': {
    id: 'user-phc-01',
    name: 'Dr. Rajesh Deshmukh',
    role: 'phc_doctor',
    roleTitleEn: 'Medical Officer (MBBS)',
    roleTitleMr: 'वैद्यकीय अधिकारी (प्रा.आ.के.)',
    phone: '9422018374',
    facilityName: 'Velhe Primary Health Centre (PHC)',
    facilityType: 'PHC',
    hfrCode: 'HFR-MH-PUN-00089',
    taluka: 'Velhe',
    district: 'Pune',
    registrationNumber: 'MMC-2014/08/3412',
  },
  '9823091823': {
    id: 'user-spec-01',
    name: 'Dr. Ananya Kulkarni',
    role: 'specialist',
    roleTitleEn: 'Chief Casualty & Triage Specialist (MD)',
    roleTitleMr: 'कॅज्युअल्टी व ट्रायज प्रमुख तज्ज्ञ',
    phone: '9823091823',
    facilityName: 'District Hospital Aundh, Pune',
    facilityType: 'District Hospital',
    hfrCode: 'HFR-MH-PUN-00001',
    taluka: 'Haveli',
    district: 'Pune',
    registrationNumber: 'MMC-2010/04/1890',
  },
  '9821094821': {
    id: 'user-admin-01',
    name: 'Dr. Nitin Patil',
    role: 'state_admin',
    roleTitleEn: 'Director of Health Services (DHS)',
    roleTitleMr: 'आरोग्य सेवा संचालक, महाराष्ट्र शासन',
    phone: '9821094821',
    facilityName: 'Arogya Bhavan, Mumbai',
    facilityType: 'Directorate of Health Services',
    hfrCode: 'HFR-MH-MUM-DHS01',
    taluka: 'Mumbai City',
    district: 'Mumbai',
    registrationNumber: 'IAS/MED-MH-084',
  },
};

export const USER_PROFILES_BY_ROLE: Record<Role, UserProfile> = {
  asha: PRE_REGISTERED_STAFF['9822019284'],
  phc_doctor: PRE_REGISTERED_STAFF['9422018374'],
  specialist: PRE_REGISTERED_STAFF['9823091823'],
  state_admin: PRE_REGISTERED_STAFF['9821094821'],
};

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  isAuthenticated: boolean;
  activePhone: string;
  generatedOtp: string | null;
  setRole: (role: Role) => void;
  sendOtp: (phone: string) => { success: boolean; otp?: string; error?: string };
  verifyOtp: (phone: string, otp: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activePhone, setActivePhone] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    const profile = USER_PROFILES_BY_ROLE[newRole];
    if (profile) {
      setActivePhone(profile.phone);
      setIsAuthenticated(true);
    }
  };

  const sendOtp = (phone: string) => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const staff = PRE_REGISTERED_STAFF[cleanPhone];
    if (!staff) {
      return {
        success: false,
        error: 'Phone number not found in Maharashtra Public Health Staff Registry.',
      };
    }

    // Generate random 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    return { success: true, otp: newOtp };
  };

  const verifyOtp = (phone: string, otp: string) => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const staff = PRE_REGISTERED_STAFF[cleanPhone];
    if (!staff) {
      return { success: false, error: 'Staff member not recognized.' };
    }

    // Accept generated OTP or demo bypass OTP '123456'
    if (otp === generatedOtp || otp === '123456') {
      setRoleState(staff.role);
      setActivePhone(cleanPhone);
      setIsAuthenticated(true);
      setGeneratedOtp(null);
      return { success: true };
    }

    return { success: false, error: 'Invalid 6-digit OTP code entered.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setRoleState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        user: (role ? USER_PROFILES_BY_ROLE[role] : USER_PROFILES_BY_ROLE['asha']) as UserProfile,
        isAuthenticated,
        activePhone,
        generatedOtp,
        setRole,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
