import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';

const ClerkControlSection: React.FC<{ activePortal: 'CLINICIAN' | 'PATIENT' }> = ({ activePortal }) => {
  const { isLoaded } = useAuth();
  const { clerkSyncing, clerkSyncError, retryClerkSync, loginUser } = useApp();
  const [bypassLoading, setBypassLoading] = useState(false);
  
  if (!isLoaded) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
        <p style={{ fontSize: '0.85rem' }}>Loading secure sign-in section...</p>
      </div>
    );
  }

  const handleSandboxBypass = async (username: string) => {
    setBypassLoading(true);
    sessionStorage.setItem('medico_portal_type', activePortal.toLowerCase());
    await loginUser(username);
    setBypassLoading(false);
  };
  
  return (
    <div>
      <Show when="signed-out">
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.4' }}>
            {activePortal === 'CLINICIAN' 
              ? 'Authenticate using your secure healthcare provider email and credentials.' 
              : 'Access your care records, stay roadmap, and medical documents securely.'}
          </p>
          
          <SignInButton mode="modal">
            <button className="btn btn-primary" style={{ width: '100%', height: '48px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              🔐 Sign In with Clerk
            </button>
          </SignInButton>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Don't have an account? <SignUpButton mode="modal"><span style={{ color: 'var(--color-blue)', cursor: 'pointer', fontWeight: 600 }}>Sign Up</span></SignUpButton>
        </div>
      </Show>
      <Show when="signed-in">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Clerk session badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <UserButton />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Clerk session active</span>
          </div>

          {/* Syncing state */}
          {clerkSyncing && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: '36px', height: '36px', border: '3px solid var(--glass-border)',
                borderTop: '3px solid var(--color-blue)', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px auto'
              }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Connecting to clinical registry...
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Verifying your identity with the backend server
              </p>
            </div>
          )}

          {/* Error state */}
          {clerkSyncError && !clerkSyncing && (
            <div style={{ width: '100%' }}>
              <div style={{
                background: '#fff3cd', color: '#856404', padding: '14px 16px',
                borderRadius: 'var(--radius-md)', fontSize: '0.8rem', textAlign: 'left',
                border: '1px solid #ffeeba', marginBottom: '16px', lineHeight: '1.5'
              }}>
                <strong>⚠️ Connection Issue</strong>
                <div style={{ marginTop: '6px' }}>{clerkSyncError}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-primary"
                  onClick={retryClerkSync}
                  style={{ flex: 1, height: '40px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  🔄 Retry Sync
                </button>
                <button
                  className="btn"
                  disabled={bypassLoading}
                  onClick={() => handleSandboxBypass(activePortal === 'CLINICIAN' ? 'deepak' : 'deepak')}
                  style={{
                    flex: 1, height: '40px', fontSize: '0.85rem', fontWeight: 600,
                    background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)', boxShadow: 'none'
                  }}
                >
                  {bypassLoading ? 'Loading...' : '🧪 Sandbox Mode'}
                </button>
              </div>
            </div>
          )}

          {/* Success state (brief moment before redirect) */}
          {!clerkSyncing && !clerkSyncError && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-success, #36B37E)', fontWeight: 600 }}>
                ✅ Authenticated! Redirecting to dashboard...
              </p>
            </div>
          )}
        </div>
      </Show>
    </div>
  );
};

export const Login: React.FC = () => {
  const { 
    apiBaseUrl, 
    loginUser, 
    loginPatient,
    registerPatient,
    tempClerkUser, 
    linkClerkPatient, 
    linkClerkClinician, 
    setUser,
    setActivePatient,
    setActiveView,
    addNotification,
    selectPatientById
  } = useApp();

  const [activePortal, setActivePortal] = useState<'CLINICIAN' | 'PATIENT'>('CLINICIAN');
  const [patientAuthMode, setPatientAuthMode] = useState<'MRN' | 'LOGIN' | 'REGISTER'>('MRN');
  
  // MRN Form State
  const [mrnInput, setMrnInput] = useState('');
  
  // Patient Credentials Form State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{ mrn: string; name: string; user: any; patientId: string } | null>(null);

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clinician Login Form State
  const [clinicianEmail, setClinicianEmail] = useState('');
  const [clinicianPassword, setClinicianPassword] = useState('');
  const [showClinicianPassword, setShowClinicianPassword] = useState(false);
  const [clinicianRemember, setClinicianRemember] = useState(false);

  const [clinicianLinkMethod, setClinicianLinkMethod] = useState<'EXISTING' | 'NEW'>('EXISTING');
  
  // Custom clinician profile link fields
  const [selectedClinicianUser, setSelectedClinicianUser] = useState('deepak');
  const [newClinicianName, setNewClinicianName] = useState('');
  const [newClinicianRole, setNewClinicianRole] = useState<'PHYSICIAN' | 'NURSE' | 'SPECIALIST'>('PHYSICIAN');
  const [newClinicianSpecialty, setNewClinicianSpecialty] = useState('');

  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  // Sandbox mode mock logins
  // const handleMockClinicianLogin = async (username: string) => {
  //   sessionStorage.setItem('medico_portal_type', 'clinician');
  //   await loginUser(username);
  // };

  // Clinician Email/Password Login
  const handleClinicianEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicianEmail || !clinicianPassword) return;
    setIsSubmitting(true);
    sessionStorage.setItem('medico_portal_type', 'clinician');
    await loginUser(clinicianEmail, clinicianPassword);
    setIsSubmitting(false);
  };

  // Quick MRN Access (Patient)
  const handleMockPatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrnInput) return;
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${apiBaseUrl}/patients`);
      const patientList = await res.json();
      const match = patientList.find((p: any) => p.mrn.toLowerCase() === mrnInput.trim().toLowerCase());
      if (match) {
        setUser({
          id: `sandbox_${match.id}`,
          username: match.mrn,
          name: match.name,
          role: 'PATIENT',
          linkedPatientId: match.id
        });
        
        // Fetch detailed record
        const detailRes = await fetch(`${apiBaseUrl}/patients/${match.id}`);
        const patientDetail = await detailRes.json();
        setActivePatient(patientDetail);
        setActiveView('patient-portal');
        addNotification(`Logged in as Patient: ${match.name}`, 'success');
      } else {
        addNotification('MRN not found in Sandbox database. Try MRN-948273.', 'danger');
      }
    } catch (err) {
      addNotification('Sandbox database offline', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email/Password Patient Login
  const handlePatientEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) return;
    setIsSubmitting(true);
    await loginPatient(emailInput, passwordInput);
    setIsSubmitting(false);
  };

  const handlePatientRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regAge || !regGender || !regEmail || !regPhone || !regPassword) return;
    if (!agreeTerms) {
      addNotification('Please agree to the Terms of Service & Privacy Policy.', 'warning');
      return;
    }
    setIsSubmitting(true);
    const res = await registerPatient(regName, parseInt(regAge), regGender, regEmail, regPhone, regPassword);
    setIsSubmitting(false);
    if (res && res.success) {
      setRegistrationSuccess({
        mrn: res.patient.mrn,
        name: res.patient.name,
        user: res.user,
        patientId: res.patient.id
      });
    }
  };

  const handleLinkPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrnInput) return;
    await linkClerkPatient(mrnInput);
  };

  const handleLinkClinicianSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clinicianLinkMethod === 'EXISTING') {
      await linkClerkClinician(selectedClinicianUser);
    } else {
      if (!newClinicianName) {
        addNotification('Name is required for new profile', 'warning');
        return;
      }
      await linkClerkClinician(undefined, newClinicianName, newClinicianRole, newClinicianSpecialty);
    }
  };

  const handlePortalChange = (portal: 'CLINICIAN' | 'PATIENT') => {
    setActivePortal(portal);
    setPatientAuthMode('MRN');
    sessionStorage.setItem('medico_portal_type', portal.toLowerCase());
  };

  // RENDER SPLIT LAYOUT (LOGIN OR REGISTER)
  if (activePortal === 'PATIENT' && (patientAuthMode === 'LOGIN' || patientAuthMode === 'REGISTER')) {
    const isLogin = patientAuthMode === 'LOGIN';
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#f8fafc',
        padding: '20px',
        fontFamily: 'var(--font-family)',
        color: '#1e293b'
      }}>
        {/* Container Split Card */}
        <div style={{
          display: 'flex',
          maxWidth: '1000px',
          width: '100%',
          minHeight: '620px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          {/* LEFT COLUMN: Features & Illustration Banner */}
          <div style={{
            flex: 1.1,
            background: 'linear-gradient(135deg, #091e42, #0052cc)',
            color: '#ffffff',
            padding: '40px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            {/* Header branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                🚀
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>Medico-Agent</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.65)' }}>Beyond Gravity Platform</span>
              </div>
            </div>

            {/* Graphic Illustration */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: '32px 0'
            }}>
              <img 
                src={isLogin ? "/patient_login_illustration.png" : "/patient_register_illustration.png"} 
                alt="Illustration" 
                style={{
                  maxWidth: '280px',
                  maxHeight: '260px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 15px 15px rgba(0, 0, 0, 0.2))',
                  animation: 'float 3s ease-in-out infinite'
                }} 
              />
            </div>

            {/* Checklist Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isLogin ? (
                <>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🛡️</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Secure & Compliant</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>HIPAA safeguards active to protect your data</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🔒</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Protected Data</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Your data is encrypted and stored securely</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>📈</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Smart & Efficient</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Streamlining healthcare workflows</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🛡️</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Secure & Confidential</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Your health data is safe with us</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>🔒</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Privacy Protected</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>We respect your privacy and never share your info</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>❤️</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Better Healthcare</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Access quality care and manage health effortlessly</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>📋</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '0.85rem', fontWeight: 700 }}>Easy & Convenient</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Quick registration and seamless EMR integration</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Form Column */}
          <div style={{
            flex: 1.2,
            padding: '48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {registrationSuccess ? (
              /* ============ REGISTRATION SUCCESS DISPLAY (MRN GENERATED) ============ */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem' }}>🎉</div>
                <div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: '8px' }}>Registration Successful!</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Welcome to Medico-Agent, {registrationSuccess.name}.</p>
                </div>
                
                <div style={{ 
                  width: '100%', 
                  background: 'rgba(9, 30, 66, 0.04)', 
                  border: '1px dashed var(--color-blue)', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  margin: '8px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Assigned MRN</span>
                  <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--color-blue)', letterSpacing: '1px', fontFamily: 'var(--font-display)' }}>
                    {registrationSuccess.mrn}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '6px' }}>
                    Please write down or copy this Medical Record Number. You will need it for future logins or quick MRN access.
                  </span>
                </div>

                <button 
                  onClick={async () => {
                    setIsSubmitting(true);
                    setUser(registrationSuccess.user);
                    await selectPatientById(registrationSuccess.patientId);
                    setIsSubmitting(false);
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '44px', fontWeight: 700, fontSize: '0.95rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  {isSubmitting ? (
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <>Proceed to Dashboard ➜</>
                  )}
                </button>
              </div>
            ) : isLogin ? (
              /* ============ EMAIL/PASSWORD LOGIN FORM ============ */
              <form onSubmit={handlePatientEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: '6px' }}>Welcome Back</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Login to access your patient account</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>✉️</span>
                    <input 
                      type="email" 
                      style={{ width: '100%', height: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.880rem' }}
                      placeholder="Enter your email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>🔒</span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      style={{ width: '100%', height: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 40px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.880rem' }}
                      placeholder="Enter your password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ width: '15px', height: '15px', accentColor: 'var(--color-blue)', cursor: 'pointer' }}
                    />
                    Remember me
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); addNotification("Please contact clinic EMR records branch to reset credentials.", "info"); }} style={{ fontSize: '0.82rem', color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'none' }}>
                    Forgot Password?
                  </a>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '42px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
                >
                  {isSubmitting ? (
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <>➜ Login</>
                  )}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Don't have an account?{' '}
                  <span 
                    onClick={() => setPatientAuthMode('REGISTER')}
                    style={{ color: 'var(--color-blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Register
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginTop: '10px' }}>
                  <span 
                    onClick={() => { setPatientAuthMode('MRN'); setEmailInput(''); setPasswordInput(''); }}
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ⬅ Go Back to Quick MRN Access
                  </span>
                </div>
              </form>
            ) : (
              /* ============ REGISTRATION FORM ============ */
              <form onSubmit={handlePatientRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: '4px' }}>Patient Register</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Create your account to get started.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>👤</span>
                    <input 
                      type="text" 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      placeholder="Enter your full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Age</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>📅</span>
                    <input 
                      type="number" 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      placeholder="Enter your age"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Gender</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>👥</span>
                    <select 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      required
                    >
                      <option value="" disabled hidden>Select your gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>✉️</span>
                    <input 
                      type="email" 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      placeholder="Enter your email address"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>📞</span>
                    <input 
                      type="text" 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      placeholder="Enter your phone number"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>🔒</span>
                    <input 
                      type={showRegPassword ? "text" : "password"} 
                      style={{ width: '100%', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 40px 8px 36px', background: '#ffffff', color: '#1e293b', fontSize: '0.85rem' }}
                      placeholder="Create a password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem' }}
                    >
                      {showRegPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '2px' }}>
                  <input 
                    type="checkbox" 
                    checked={agreeTerms} 
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ width: '14px', height: '14px', accentColor: 'var(--color-blue)', cursor: 'pointer', marginTop: '1px' }}
                    required
                  />
                  <span>
                    I agree to the <a href="#" style={{ color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'none' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</a>
                  </span>
                </label>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary" 
                  style={{ width: '100%', height: '40px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                >
                  {isSubmitting ? (
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <>👤+ Register</>
                  )}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Already have an account?{' '}
                  <span 
                    onClick={() => setPatientAuthMode('LOGIN')}
                    style={{ color: 'var(--color-blue)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Login
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '2px' }}>
                  <span 
                    onClick={() => { setPatientAuthMode('MRN'); setRegName(''); setRegAge(''); setRegGender(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); }}
                    style={{ fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ⬅ Go Back to Quick MRN Access
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }


  // Onboarding screen: Link Clerk to EMR (triggered when Clerk is authenticated but not linked)
  if (tempClerkUser) {
    if (tempClerkUser.role === 'PATIENT') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-secondary)', padding: '24px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🔑</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Link Patient Chart</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px', lineHeight: '1.4' }}>
              Welcome, <strong>{tempClerkUser.name}</strong>. To complete your secure patient portal setup, please enter your unique Medical Record Number (MRN).
            </p>
            <form onSubmit={handleLinkPatientSubmit}>
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Medical Record Number (MRN)</label>
                <input 
                  type="text" 
                  className="search-input"
                  style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: '#ffffff', color: 'var(--text-primary)' }}
                  placeholder="e.g. MRN-948273"
                  value={mrnInput}
                  onChange={(e) => setMrnInput(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', fontSize: '0.9rem', fontWeight: 600 }}>
                Link Patient Chart
              </button>
            </form>
          </div>
        </div>
      );
    } else {
      // Clinician onboarding link screen
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-secondary)', padding: '24px' }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '40px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🏥</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Clinician Profile Link</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Signed in as <strong>{tempClerkUser.name}</strong> ({tempClerkUser.email})
              </p>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '24px' }}>
              <button 
                className={`tab-btn ${clinicianLinkMethod === 'EXISTING' ? 'active' : ''}`}
                onClick={() => setClinicianLinkMethod('EXISTING')}
                style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'none', borderBottom: clinicianLinkMethod === 'EXISTING' ? '2px solid var(--color-blue)' : 'none', color: clinicianLinkMethod === 'EXISTING' ? 'var(--color-blue)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
              >
                Link to Seed Profile
              </button>
              <button 
                className={`tab-btn ${clinicianLinkMethod === 'NEW' ? 'active' : ''}`}
                onClick={() => setClinicianLinkMethod('NEW')}
                style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'none', borderBottom: clinicianLinkMethod === 'NEW' ? '2px solid var(--color-blue)' : 'none', color: clinicianLinkMethod === 'NEW' ? 'var(--color-blue)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
              >
                Create New Profile
              </button>
            </div>

            <form onSubmit={handleLinkClinicianSubmit}>
              {clinicianLinkMethod === 'EXISTING' ? (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Select Seed Doctor/Nurse Profile</label>
                  <select 
                    value={selectedClinicianUser}
                    onChange={(e) => setSelectedClinicianUser(e.target.value)}
                    style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: '#ffffff', color: 'var(--text-primary)', fontSize: '0.9rem' }}
                  >
                    <option value="deepak">Dr. Deepak R. (Pulmonologist)</option>
                    <option value="harpal">Nurse Harpal S. (Critical Care Nurse)</option>
                    <option value="shalini">Dr. Shalini K. (Nephrologist Specialist)</option>
                  </select>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Full Name</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: '#ffffff', color: 'var(--text-primary)' }}
                      placeholder="e.g. Dr. Ramesh Kumar"
                      value={newClinicianName}
                      onChange={(e) => setNewClinicianName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Role Type</label>
                      <select 
                        value={newClinicianRole}
                        onChange={(e: any) => setNewClinicianRole(e.target.value)}
                        style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: '#ffffff', color: 'var(--text-primary)' }}
                      >
                        <option value="PHYSICIAN">Physician</option>
                        <option value="NURSE">Nurse</option>
                        <option value="SPECIALIST">Consulting Specialist</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Specialty / Dept</label>
                      <input 
                        type="text" 
                        style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: '#ffffff', color: 'var(--text-primary)' }}
                        placeholder="e.g. Cardiology"
                        value={newClinicianSpecialty}
                        onChange={(e) => setNewClinicianSpecialty(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '40px', fontWeight: 600 }}>
                Link Clinician Account
              </button>
            </form>
          </div>
        </div>
      );
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-secondary)', padding: '24px' }}>
      <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
        
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #0052cc, #0747a6)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1.25rem'
          }}>
            🚀
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#172b4d', fontFamily: 'var(--font-display)' }}>Medico-Agent Dashboard</span>
            <span style={{ fontSize: '0.8rem', color: '#5e6c84', fontWeight: 500 }}>Beyond Gravity Platform</span>
          </div>
        </div>

        {/* Portal selector tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '32px' }}>
          <button 
            onClick={() => handlePortalChange('CLINICIAN')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              border: 'none', 
              background: activePortal === 'CLINICIAN' ? '#ffffff' : 'transparent', 
              color: activePortal === 'CLINICIAN' ? 'var(--color-blue)' : 'var(--text-secondary)',
              fontWeight: 700, 
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            👨‍⚕️ Clinician Login
          </button>
          <button 
            onClick={() => handlePortalChange('PATIENT')}
            style={{ 
              flex: 1, 
              padding: '10px', 
              border: 'none', 
              background: activePortal === 'PATIENT' ? '#ffffff' : 'transparent', 
              color: activePortal === 'PATIENT' ? 'var(--color-blue)' : 'var(--text-secondary)',
              fontWeight: 700, 
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            🏥 Patient Portal
          </button>
        </div>

        {hasClerkKey ? (
          <ClerkControlSection activePortal={activePortal} />
        ) : (
          /* Sandbox mode bypass / Local Forms */
          activePortal === 'CLINICIAN' ? (
            /* Clinician login form */
            <form onSubmit={handleClinicianEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '16px' }}>Clinician Login</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#172b4d' }}>Email Address</label>
                <input 
                  type="email" 
                  style={{ width: '100%', height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 14px', background: '#ffffff', color: '#1e293b', fontSize: '0.9rem' }}
                  placeholder="Enter your email address"
                  value={clinicianEmail}
                  onChange={(e) => setClinicianEmail(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#172b4d' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showClinicianPassword ? "text" : "password"} 
                    style={{ width: '100%', height: '44px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 44px 10px 14px', background: '#ffffff', color: '#1e293b', fontSize: '0.9rem' }}
                    placeholder="Enter your password"
                    value={clinicianPassword}
                    onChange={(e) => setClinicianPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowClinicianPassword(!showClinicianPassword)}
                    style={{ position: 'absolute', right: '14px', top: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    {showClinicianPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={clinicianRemember} 
                    onChange={(e) => setClinicianRemember(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-blue)', cursor: 'pointer' }}
                  />
                  Remember me
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); addNotification("Please contact hospital IT department to retrieve clinician credentials.", "info"); }} style={{ fontSize: '0.85rem', color: 'var(--color-blue)', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot Password?
                </a>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="btn btn-primary" 
                style={{ width: '100%', height: '44px', fontSize: '0.95rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '12px', background: '#0052cc', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                {isSubmitting ? (
                  <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Login
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Patient portal quick MRN access + sub-toggles */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setPatientAuthMode('LOGIN')}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--color-cyan)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.880rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <span>🚪</span> Login
                </button>
                
                <button 
                  onClick={() => setPatientAuthMode('REGISTER')}
                  style={{
                    flex: 1,
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-cyan)',
                    background: '#ffffff',
                    color: 'var(--color-cyan)',
                    fontWeight: 700,
                    fontSize: '0.880rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <span>👤+</span> Register
                </button>
              </div>

              <form onSubmit={handleMockPatientLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Patient MRN</label>
                  <input 
                    type="text" 
                    className="search-input"
                    style={{ width: '100%', height: '40px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: '#ffffff', color: 'var(--text-primary)' }}
                    placeholder="Enter MRN (e.g. MRN-948273)"
                    value={mrnInput}
                    onChange={(e) => setMrnInput(e.target.value)}
                    required
                  />
                </div>
                
                <button type="submit" disabled={isSubmitting} className="btn btn-secondary" style={{ width: '100%', height: '40px', fontWeight: 600, fontSize: '0.9rem', background: '#f8fafc', border: '1px solid var(--glass-border)', color: '#172b4d' }}>
                  {isSubmitting ? 'Verifying MRN...' : 'Access Patient Portal'}
                </button>
              </form>
            </div>
          )
        )}

        <div style={{ marginTop: '40px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          HIPAA Safeguards Active • Audit Log Tracking Enabled
        </div>
      </div>
    </div>
  );
};
