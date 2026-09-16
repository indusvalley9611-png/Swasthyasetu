const fs = require('fs');
let file = fs.readFileSync('context/AuthContext.tsx', 'utf8');

// 1. Remove setRole and loginAsUser from AuthContextType
file = file.replace(/  setRole: \(role: Role\) => void;\n/g, '');
file = file.replace(/  loginAsUser: \(profileOrPhone: UserProfile \| string\) => void;\n/g, '');

// 2. Change sendOtp signature in interface
file = file.replace(/  sendOtp: \(phone: string\) => { success: boolean; otp\?: string; error\?: string };\n/g, '  sendOtp: (phone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;\n');

// 3. Change verifyOtp signature in interface
file = file.replace(/  verifyOtp: \(phone: string, otp: string\) => { success: boolean; error\?: string };\n/g, '  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;\n');

// 4. Replace sendOtp and verifyOtp implementations
const regexSendVerify = /  const sendOtp = \(phone: string\) => \{[\s\S]*?  \};\n\n  const verifyOtp = \(phone: string, otp: string\) => \{[\s\S]*?  \};/m;

const newSendVerify = \  const sendOtp = async (phone: string) => {
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
  };\;

file = file.replace(regexSendVerify, newSendVerify);

// 5. Remove setRole, loginAsUser from the exported context provider value
file = file.replace(/        setRole,\n/g, '');
file = file.replace(/        loginAsUser,\n/g, '');

fs.writeFileSync('context/AuthContext.tsx', file);
console.log('Updated AuthContext.tsx');
