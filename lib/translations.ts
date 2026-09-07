export type Language = 'en' | 'mr';

export const translations = {
  en: {
    appTitle: 'SwasthyaSetu',
    appSubtitle: 'Integrated Public Healthcare & Referral Management System',
    govtHeader: 'Public Health Department, Government of Maharashtra',
    abdmConform: 'ABDM & FHIR R4 Compliant',
    
    // Roles
    role_asha: 'ASHA Worker / Sub-Centre',
    role_phc: 'PHC Medical Officer',
    role_specialist: 'District Specialist / Casualty',
    role_admin: 'State Health Administrator',
    
    // Nav & Common
    dashboard: 'Dashboard',
    patients: 'Patient Registry',
    referrals: 'Triage & Referrals',
    resources: 'Beds & Resources',
    inventory: 'Emergency Stock',
    outbreakMap: 'Disease Outbreaks',
    searchPlaceholder: 'Search by 14-digit ABHA ID, Phone or Name...',
    online: 'Online',
    offline: 'Offline Mode',
    synced: 'All Changes Synced',
    pendingSync: 'Queued Offline',
    syncNow: 'Sync Now',
    simulateOffline: 'Simulate Offline',
    simulateOnline: 'Restore Online',
    switchRole: 'Switch Role',
    
    // Triage
    triageRed: 'CRITICAL (Priority 1)',
    triageYellow: 'URGENT (Priority 2)',
    triageGreen: 'ROUTINE (Priority 3)',
    triageScore: 'Triage Score',
    recommendedFacility: 'Recommended Care Level',
    
    // Vitals
    systolicBp: 'Systolic BP',
    diastolicBp: 'Diastolic BP',
    heartRate: 'Pulse Rate',
    spO2: 'SpO2 Oxygen',
    respiratoryRate: 'Respiration Rate',
    temperature: 'Body Temperature',
    bloodGlucose: 'Blood Glucose',
    hemoglobin: 'Hemoglobin',
    consciousLevel: 'Consciousness (AVPU)',
    
    // Patient Form
    newPatient: 'Register New Patient',
    fullName: 'Full Name',
    age: 'Age',
    gender: 'Gender',
    phone: 'Phone Number',
    village: 'Village / Wada',
    taluka: 'Taluka',
    district: 'District',
    bloodGroup: 'Blood Group',
    isPregnant: 'Is Patient Pregnant?',
    gestationalWeeks: 'Gestational Weeks',
    highRiskFlag: 'High Risk Pregnancy (HRP)',
    saveOffline: 'Save Record (Offline Ready)',
    
    // Referral
    newReferral: 'Generate Digital Referral',
    referringFacility: 'Referring Facility',
    targetFacility: 'Target Destination Hospital',
    specialtyRequired: 'Specialty Required',
    reasonForReferral: 'Clinical Rationale & Chief Complaints',
    generateQrToken: 'Generate Digital Referral Token',
    viewQrSlip: 'View / Print Referral Slip',
    tokenCode: 'Referral Token',
    bypassDeskMsg: 'Scan at Casualty Desk to Bypass Registration Line',
    ambulanceRequired: '108 ALS Ambulance Dispatched',
    
    // Beds & Resources
    bedMatrix: 'Live Hospital Bed Matrix',
    totalBeds: 'Total Beds',
    occupiedBeds: 'Occupied',
    vacantBeds: 'Available',
    icuBeds: 'ICU Beds',
    ventilatorBeds: 'Ventilators',
    oxygenBeds: 'Oxygen Beds',
    
    // Inventory
    emergencyStock: 'Critical Lifesaving Medicines',
    drugName: 'Medicine / Gas',
    currentStock: 'Current Stock',
    bufferStock: 'Buffer Level',
    requestStock: 'Request Inter-Facility Transfer',
    lowStockAlert: 'Low Stock Alert (<25% Buffer)',
    
    // Status
    statusPending: 'Incoming / En Route',
    statusAccepted: 'Accepted by Specialist',
    statusAdmitted: 'Admitted to Ward/ICU',
  },
  
  mr: {
    appTitle: 'स्वास्थ्यसेतू',
    appSubtitle: 'एकात्मिक सार्वजनिक आरोग्य व संदर्भ सेवा व्यवस्थापन प्रणाली',
    govtHeader: 'सार्वजनिक आरोग्य विभाग, महाराष्ट्र शासन',
    abdmConform: 'आयुष्मान भारत डिजिटल मिशन (ABDM) सुसंगत',
    
    // Roles
    role_asha: 'आशा सेविका / उपकेंद्र',
    role_phc: 'वैद्यकीय अधिकारी (प्रा.आ.के.)',
    role_specialist: 'जिल्हा रुग्णालय तज्ज्ञ / कॅज्युअल्टी',
    role_admin: 'राज्य आरोग्य संचालक',
    
    // Nav & Common
    dashboard: 'डॅशबोर्ड',
    patients: 'रुग्ण नोंदवही',
    referrals: 'रुग्ण संदर्भ व ट्रायज',
    resources: 'खाटा व संसाधने',
    inventory: 'तातडीचा औषध साठा',
    outbreakMap: 'रोग प्रादुर्भाव नकाशा',
    searchPlaceholder: '१४-अंकी आभा आयडी, फोन किंवा नावाने शोधा...',
    online: 'ऑनलाईन',
    offline: 'ऑफलाईन मोड',
    synced: 'सर्व माहिती समक्रमित',
    pendingSync: 'ऑफलाईन रांगेत',
    syncNow: 'आता सिंक करा',
    simulateOffline: 'ऑफलाईन चाचणी',
    simulateOnline: 'ऑनलाईन पूर्ववत करा',
    switchRole: 'भूमिका बदला',
    
    // Triage
    triageRed: 'अतिदक्षता / गंभीर (प्राधान्य १)',
    triageYellow: 'तातडीचे (प्राधान्य २)',
    triageGreen: 'नियमित (प्राधान्य ३)',
    triageScore: 'ट्रायज गुणसंख्या',
    recommendedFacility: 'शिफारस केलेली आरोग्य सुविधा',
    
    // Vitals
    systolicBp: 'रक्तदाब (सिस्टोलिक)',
    diastolicBp: 'रक्तदाब (डायस्टोलिक)',
    heartRate: 'नाडीचे ठोके (Pulse)',
    spO2: 'ऑक्सिजन प्रमाण (SpO2)',
    respiratoryRate: 'श्वसन गती',
    temperature: 'शरीराचे तापमान',
    bloodGlucose: 'रक्तातील साखर',
    hemoglobin: 'हिमोग्लोबिन',
    consciousLevel: 'शुद्धीची स्थिती (AVPU)',
    
    // Patient Form
    newPatient: 'नवीन रुग्ण नोंदणी',
    fullName: 'रुग्णाचे पूर्ण नाव',
    age: 'वय',
    gender: 'लिंग',
    phone: 'मोबाईल क्रमांक',
    village: 'गाव / वाडी',
    taluka: 'तालुका',
    district: 'जिल्हा',
    bloodGroup: 'रक्तगट',
    isPregnant: 'रुग्ण गरोदर आहे का?',
    gestationalWeeks: 'गरोदरपणाचे आठवडे',
    highRiskFlag: 'अतिधोकादायक गरोदरपण (HRP)',
    saveOffline: 'नोंद जतन करा (ऑफलाईन सक्षम)',
    
    // Referral
    newReferral: 'डिजिटल रेफरल तयार करा',
    referringFacility: 'रेफर करणारी सुविधा',
    targetFacility: 'गंतव्य रुग्णालय',
    specialtyRequired: 'आवश्यक तज्ज्ञ विभाग',
    reasonForReferral: 'रेफर करण्याचे मुख्य वैद्यकीय कारण',
    generateQrToken: 'डिजिटल रेफरल टोकन बनवा',
    viewQrSlip: 'रेफरल पावती पहा / प्रिंट करा',
    tokenCode: 'रेफरल टोकन क्रमांक',
    bypassDeskMsg: 'गंतव्य रुग्णालयात रांग वगळण्यासाठी स्कॅन करा',
    ambulanceRequired: '१०८ रुग्णवाहिका रवाना करण्यात आली',
    
    // Beds & Resources
    bedMatrix: 'थेट रुग्णालय खाटा स्थिती',
    totalBeds: 'एकूण खाटा',
    occupiedBeds: 'भरलेल्या खाटा',
    vacantBeds: 'उपलब्ध खाटा',
    icuBeds: 'आयसीयू (ICU) खाटा',
    ventilatorBeds: 'व्हेंटिलेटर सुविधा',
    oxygenBeds: 'ऑक्सिजन खाटा',
    
    // Inventory
    emergencyStock: 'तातडीची जीवनरक्षक औषधे',
    drugName: 'औषधाचे नाव / वायू',
    currentStock: 'सध्याचा साठा',
    bufferStock: 'किमान राखीव साठा',
    requestStock: 'आंतर-रुग्णालय पुरवठा मागणी',
    lowStockAlert: 'कमी साठा इशारा (२५% पेक्षा कमी)',
    
    // Status
    statusPending: 'येत आहे / मार्गावर',
    statusAccepted: 'तज्ज्ञांकडून स्वीकारले',
    statusAdmitted: 'दाखल करून घेतले',
  }
};
