'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Role, UserProfile } from '@/lib/types';

export const PRE_REGISTERED_STAFF: Record<string, UserProfile> = {
  // ==========================================
  // 1. ASHA / FIELD LEVEL (4 PREREGISTERED MEMBERS ACROSS 2 PHCS)
  // ==========================================
  // ASHA 1: Velhe PHC Catchment - Ambavane Sub-Centre
  '9822019284': {
    id: 'user-asha-01',
    name: 'Smt. Sunita Shinde',
    role: 'asha',
    roleTitleEn: 'ASHA Facilitator (Ambavane)',
    roleTitleMr: 'आशा गट प्रवर्तक / सेविका (आंबवणे)',
    phone: '9822019284',
    facilityId: 'fac-sc-ambavane',
    facilityName: 'Ambavane Sub-Centre (Velhe PHC)',
    facilityType: 'Sub-Centre',
    hfrCode: 'HFR-MH-PUN-00412',
    taluka: 'Velhe',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Ambavane',
    registrationNumber: 'ASHA-MH-PUN-0941',
    administrativeLevel: 'field',
    permissions: ['view_basic_demographics', 'create_referral', 'register_patient'],
  },
  // ASHA 2: Velhe PHC Catchment - Pasali Sub-Centre
  '9822019285': {
    id: 'user-asha-02',
    name: 'Smt. Meena Jadhav',
    role: 'asha',
    roleTitleEn: 'ASHA Worker (Pasali Ward)',
    roleTitleMr: 'आशा सेविका (पासली प्रभाग)',
    phone: '9822019285',
    facilityId: 'fac-sc-pasali',
    facilityName: 'Pasali Sub-Centre (Velhe PHC)',
    facilityType: 'Sub-Centre',
    hfrCode: 'HFR-MH-PUN-00413',
    taluka: 'Velhe',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Pasali',
    registrationNumber: 'ASHA-MH-PUN-0942',
    administrativeLevel: 'field',
    permissions: ['view_basic_demographics', 'create_referral', 'register_patient'],
  },
  // ASHA 3: Nasrapur PHC Catchment - Khed Shivapur Sub-Centre
  '9822019286': {
    id: 'user-asha-03',
    name: 'Smt. Rekha Gaikwad',
    role: 'asha',
    roleTitleEn: 'ASHA Worker (Khed Shivapur Sector)',
    roleTitleMr: 'आशा सेविका (खेड शिवापूर विभाग)',
    phone: '9822019286',
    facilityId: 'fac-sc-khedshivapur',
    facilityName: 'Khed Shivapur Sub-Centre (Nasrapur PHC)',
    facilityType: 'Sub-Centre',
    hfrCode: 'HFR-MH-PUN-00414',
    taluka: 'Bhor',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Khed Shivapur',
    registrationNumber: 'ASHA-MH-PUN-0943',
    administrativeLevel: 'field',
    permissions: ['view_basic_demographics', 'create_referral', 'register_patient'],
  },
  // ASHA 4: Nasrapur PHC Catchment - Kasurdi Sub-Centre
  '9822019287': {
    id: 'user-asha-04',
    name: 'Smt. Anita Kamble',
    role: 'asha',
    roleTitleEn: 'ASHA Worker (Kasurdi Sector)',
    roleTitleMr: 'आशा सेविका (कासूर्डी विभाग)',
    phone: '9822019287',
    facilityId: 'fac-sc-kasurdi',
    facilityName: 'Kasurdi Sub-Centre (Nasrapur PHC)',
    facilityType: 'Sub-Centre',
    hfrCode: 'HFR-MH-PUN-00415',
    taluka: 'Bhor',
    district: 'Pune',
    state: 'Maharashtra',
    village: 'Kasurdi',
    registrationNumber: 'ASHA-MH-PUN-0944',
    administrativeLevel: 'field',
    permissions: ['view_basic_demographics', 'create_referral', 'register_patient'],
  },

  // ==========================================
  // 2. PHC LEVEL (4 PREREGISTERED MEMBERS ACROSS 2 NAMED PHCS)
  // ==========================================
  // PHC 1: Velhe Primary Health Centre - Medical Officer / Doctor
  '9422018374': {
    id: 'user-phc-01',
    name: 'Dr. Rajesh Deshmukh',
    role: 'phc_doctor',
    roleTitleEn: 'Medical Officer (MBBS) - Velhe PHC',
    roleTitleMr: 'वैद्यकीय अधिकारी (प्रा.आ.के. वेल्हे)',
    phone: '9422018374',
    facilityId: 'fac-phc-velhe',
    facilityName: 'Velhe Primary Health Centre (PHC)',
    facilityType: 'PHC',
    hfrCode: 'HFR-MH-PUN-00089',
    taluka: 'Velhe',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MMC-2014/08/3412',
    administrativeLevel: 'facility',
    assignedPatientIds: ['pat-001', 'pat-002'],
    permissions: [
      'view_basic_demographics',
      'view_clinical_reports',
      'edit_clinical_records',
      'create_referral',
      'emergency_break_glass',
      'register_patient',
    ],
  },
  // PHC 1: Velhe Primary Health Centre - Staff Nurse
  '9822055555': {
    id: 'user-nurse-01',
    name: 'Sister Anita Jagtap',
    role: 'nurse',
    roleTitleEn: 'Staff Nurse (GNM) - Velhe PHC',
    roleTitleMr: 'परिचारिका (प्रा.आ.के. वेल्हे)',
    phone: '9822055555',
    facilityId: 'fac-phc-velhe',
    facilityName: 'Velhe Primary Health Centre (PHC)',
    facilityType: 'PHC',
    hfrCode: 'HFR-MH-PUN-00089',
    taluka: 'Velhe',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MNC-2016/04/1109',
    administrativeLevel: 'facility',
    permissions: [
      'view_basic_demographics',
      'view_clinical_reports',
      'emergency_break_glass',
      'register_patient',
    ],
  },
  // PHC 2: Nasrapur Primary Health Centre - Medical Officer / Doctor
  '9422019999': {
    id: 'user-phc-02',
    name: 'Dr. Suresh Patil',
    role: 'phc_doctor',
    roleTitleEn: 'Medical Officer (MBBS) - Nasrapur PHC',
    roleTitleMr: 'वैद्यकीय अधिकारी (प्रा.आ.के. नसरापूर)',
    phone: '9422019999',
    facilityId: 'fac-phc-nasrapur',
    facilityName: 'Nasrapur Primary Health Centre (PHC)',
    facilityType: 'PHC',
    hfrCode: 'HFR-MH-PUN-00104',
    taluka: 'Bhor',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MMC-2017/05/2198',
    administrativeLevel: 'facility',
    assignedPatientIds: ['pat-003', 'pat-004', 'pat-005'],
    permissions: [
      'view_basic_demographics',
      'view_clinical_reports',
      'edit_clinical_records',
      'create_referral',
      'emergency_break_glass',
      'register_patient',
    ],
  },
  // PHC 2: Nasrapur Primary Health Centre - Pharmacist
  '9822066666': {
    id: 'user-pharm-01',
    name: 'Shri Anand Kadam',
    role: 'pharmacist',
    roleTitleEn: 'Pharmacist (B.Pharm) - Nasrapur PHC',
    roleTitleMr: 'औषध निर्माण अधिकारी (प्रा.आ.के. नसरापूर)',
    phone: '9822066666',
    facilityId: 'fac-phc-nasrapur',
    facilityName: 'Nasrapur Primary Health Centre (PHC)',
    facilityType: 'PHC',
    hfrCode: 'HFR-MH-PUN-00104',
    taluka: 'Bhor',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MSPC-2019/12/8762',
    administrativeLevel: 'facility',
    permissions: [
      'view_basic_demographics',
      'view_prescriptions_only',
    ],
  },

  // ==========================================
  // 3. DISTRICT LEVEL (4 PREREGISTERED MEMBERS ACROSS 2 DISTRICT HOSPITALS)
  // ==========================================
  // District Hospital 1: District Hospital Aundh, Pune (Pune District) - Senior Medical Officer / Specialist
  '9823091823': {
    id: 'user-spec-01',
    name: 'Dr. Ananya Kulkarni',
    role: 'specialist',
    roleTitleEn: 'Chief Casualty & Triage Specialist (MD)',
    roleTitleMr: 'कॅज्युअल्टी व ट्रायज प्रमुख तज्ज्ञ (जिल्हा रुग्णालय औंध, पुणे)',
    phone: '9823091823',
    facilityId: 'fac-dh-pune',
    facilityName: 'District Hospital Aundh, Pune',
    facilityType: 'District Hospital',
    hfrCode: 'HFR-MH-PUN-00001',
    taluka: 'Haveli',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MMC-2010/04/1890',
    administrativeLevel: 'district',
    assignedPatientIds: [],
    permissions: [
      'view_basic_demographics',
      'view_clinical_reports',
      'manage_admissions',
      'emergency_break_glass',
      'view_aggregate_analytics',
      'register_patient',
    ],
  },
  // District Hospital 1: District Hospital Aundh, Pune (Pune District) - District Health Officer / Administrator
  '9823091824': {
    id: 'user-dist-admin-01',
    name: 'Dr. Vinod Chavan',
    role: 'district_officer',
    roleTitleEn: 'District Health Officer (DHO) / Civil Surgeon',
    roleTitleMr: 'जिल्हा आरोग्य अधिकारी (DHO) / जिल्हा शल्यचिकित्सक (पुणे)',
    phone: '9823091824',
    facilityId: 'fac-dh-pune',
    facilityName: 'District Hospital Aundh, Pune',
    facilityType: 'District Hospital',
    hfrCode: 'HFR-MH-PUN-00001',
    taluka: 'Haveli',
    district: 'Pune',
    state: 'Maharashtra',
    registrationNumber: 'MMC-2005/03/0762',
    administrativeLevel: 'district',
    permissions: [
      'view_basic_demographics',
      'view_aggregate_analytics',
    ],
  },
  // District Hospital 2: District Civil Hospital, Nashik (Nashik District) - Specialist Doctor / Obstetrician
  '9823091825': {
    id: 'user-spec-02',
    name: 'Dr. Snehal More',
    role: 'specialist',
    roleTitleEn: 'Specialist Doctor / Obstetrician (MS OB-GYN)',
    roleTitleMr: 'वरिष्ठ स्त्रीरोग व प्रसूती तज्ज्ञ (जिल्हा रुग्णालय नाशिक)',
    phone: '9823091825',
    facilityId: 'fac-dh-nashik',
    facilityName: 'District Civil Hospital, Nashik',
    facilityType: 'District Hospital',
    hfrCode: 'HFR-MH-NSK-00001',
    taluka: 'Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    registrationNumber: 'MMC-2012/07/2234',
    administrativeLevel: 'district',
    assignedPatientIds: [],
    permissions: [
      'view_basic_demographics',
      'view_clinical_reports',
      'manage_admissions',
      'emergency_break_glass',
      'view_aggregate_analytics',
      'register_patient',
    ],
  },
  // District Hospital 2: District Civil Hospital, Nashik (Nashik District) - Hospital Resource Coordinator
  '9823091826': {
    id: 'user-dist-admin-02',
    name: 'Shri Sachin Gite',
    role: 'district_officer',
    roleTitleEn: 'Hospital Resource Coordinator - Nashik',
    roleTitleMr: 'रुग्णालय संसाधन समन्वयक (जिल्हा रुग्णालय नाशिक)',
    phone: '9823091826',
    facilityId: 'fac-dh-nashik',
    facilityName: 'District Civil Hospital, Nashik',
    facilityType: 'District Hospital',
    hfrCode: 'HFR-MH-NSK-00001',
    taluka: 'Nashik',
    district: 'Nashik',
    state: 'Maharashtra',
    registrationNumber: 'DHM-2018/11/4501',
    administrativeLevel: 'district',
    permissions: [
      'view_basic_demographics',
      'view_aggregate_analytics',
    ],
  },

  // ==========================================
  // 4. HIGHER ADMINISTRATIVE LEVELS (2 ACCOUNTS: STATE & NATIONAL)
  // ==========================================
  // State Health Administrator: Directorate of Health Services, Maharashtra State, Mumbai
  '9821094821': {
    id: 'user-admin-01',
    name: 'Dr. Nitin Patil',
    role: 'state_admin',
    roleTitleEn: 'Director of Health Services (DHS)',
    roleTitleMr: 'आरोग्य सेवा संचालक, महाराष्ट्र शासन',
    phone: '9821094821',
    facilityId: 'fac-dhs-mumbai',
    facilityName: 'Directorate of Health Services (DHS), Mumbai',
    facilityType: 'Directorate of Health Services',
    hfrCode: 'HFR-MH-MUM-DHS01',
    taluka: 'Mumbai City',
    district: 'Mumbai',
    state: 'Maharashtra',
    registrationNumber: 'IAS/MED-MH-084',
    administrativeLevel: 'state',
    permissions: ['view_aggregate_analytics'],
  },
  // National Administrator: National Health Authority / MoHFW, New Delhi
  '9810012345': {
    id: 'user-national-01',
    name: 'Dr. Arvind Sharma',
    role: 'national_admin',
    roleTitleEn: 'National Health Authority / MoHFW, New Delhi',
    roleTitleMr: 'राष्ट्रीय आरोग्य प्राधिकरण (NHA) / आरोग्य मंत्रालय, नवी दिल्ली',
    phone: '9810012345',
    facilityId: 'fac-nha-delhi',
    facilityName: 'National Health Authority (NHA), New Delhi',
    facilityType: 'National Health Authority',
    hfrCode: 'HFR-IND-DEL-NHA01',
    taluka: 'New Delhi',
    district: 'New Delhi',
    state: 'Delhi',
    registrationNumber: 'IAS/NHA-GOI-012',
    administrativeLevel: 'national',
    permissions: ['view_aggregate_analytics'],
  },
};

export const USER_PROFILES_BY_ROLE: Record<Role, UserProfile> = {
  asha: PRE_REGISTERED_STAFF['9822019284'],
  phc_doctor: PRE_REGISTERED_STAFF['9422018374'],
  nurse: PRE_REGISTERED_STAFF['9822055555'],
  pharmacist: PRE_REGISTERED_STAFF['9822066666'],
  specialist: PRE_REGISTERED_STAFF['9823091823'],
  district_officer: PRE_REGISTERED_STAFF['9823091824'],
  state_admin: PRE_REGISTERED_STAFF['9821094821'],
  national_admin: PRE_REGISTERED_STAFF['9810012345'],
};

export const ALL_REGISTERED_USERS: UserProfile[] = Object.values(PRE_REGISTERED_STAFF);

export function findUserById(userId: string): UserProfile | undefined {
  return ALL_REGISTERED_USERS.find((u) => u.id === userId || u.phone === userId);
}

export const GUEST_PROFILE: UserProfile = {
  id: 'guest-unauthenticated',
  name: 'Unauthenticated Session',
  role: 'asha',
  roleTitleEn: 'Guest Session',
  roleTitleMr: 'अनोळखी सत्र',
  phone: '',
  facilityId: '',
  facilityName: 'Public Health Department, Maharashtra',
  facilityType: 'PHC',
  hfrCode: 'HFR-UNASSIGNED',
  taluka: '',
  district: '',
  registrationNumber: '',
  administrativeLevel: 'facility',
  permissions: [],
};

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  activePhone: string;
  generatedOtp: string | null;
  setRole: (role: Role) => void;
  loginAsUser: (profileOrPhone: UserProfile | string) => void;
  sendOtp: (phone: string) => { success: boolean; otp?: string; error?: string };
  verifyOtp: (phone: string, otp: string) => { success: boolean; error?: string };
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
      }
    }
  }, []);

  const loginAsUser = (profileOrPhone: UserProfile | string) => {
    const profile =
      typeof profileOrPhone === 'string'
        ? PRE_REGISTERED_STAFF[profileOrPhone] ||
          ALL_REGISTERED_USERS.find((u) => u.id === profileOrPhone)
        : profileOrPhone;

    if (profile) {
      setCurrentUser(profile);
      setRoleState(profile.role);
      setActivePhone(profile.phone);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, profile.phone);
      }
    }
  };

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    const profile = USER_PROFILES_BY_ROLE[newRole];
    if (profile) {
      setCurrentUser(profile);
      setActivePhone(profile.phone);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, profile.phone);
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setRoleState(null);
    setIsAuthenticated(false);
    setActivePhone('');
    setGeneratedOtp(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const sendOtp = (phone: string) => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!PRE_REGISTERED_STAFF[cleanPhone]) {
      return { success: false, error: 'Phone number not registered in ABDM Healthcare Professional Registry (HPR).' };
    }
    const otp = '123456';
    setGeneratedOtp(otp);
    return { success: true, otp };
  };

  const verifyOtp = (phone: string, otp: string) => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (otp !== '123456') {
      return { success: false, error: 'Invalid OTP code. Please enter the 6-digit code received.' };
    }
    const profile = PRE_REGISTERED_STAFF[cleanPhone];
    if (profile) {
      loginAsUser(profile);
      setGeneratedOtp(null);
      return { success: true };
    }
    return { success: false, error: 'User profile not found in HPR registry.' };
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
        setRole,
        loginAsUser,
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
