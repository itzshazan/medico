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
    tempClerkUser, 
    linkClerkPatient, 
    linkClerkClinician, 
    setUser,
    setActivePatient,
    setActiveView,
    addNotification
  } = useApp();

  const [activePortal, setActivePortal] = useState<'CLINICIAN' | 'PATIENT'>('CLINICIAN');
  const [mrnInput, setMrnInput] = useState('');
  const [clinicianLinkMethod, setClinicianLinkMethod] = useState<'EXISTING' | 'NEW'>('EXISTING');
  
  // Custom clinician profile link fields
  const [selectedClinicianUser, setSelectedClinicianUser] = useState('deepak');
  const [newClinicianName, setNewClinicianName] = useState('');
  const [newClinicianRole, setNewClinicianRole] = useState<'PHYSICIAN' | 'NURSE' | 'SPECIALIST'>('PHYSICIAN');
  const [newClinicianSpecialty, setNewClinicianSpecialty] = useState('');

  const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  // Sandbox mode mock logins
  const handleMockClinicianLogin = async (username: string) => {
    sessionStorage.setItem('medico_portal_type', 'clinician');
    await loginUser(username);
  };

  const handleMockPatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrnInput) return;
    
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
    sessionStorage.setItem('medico_portal_type', portal.toLowerCase());
  };

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

        {/* Clerk vs Sandbox bypass UI */}
        {hasClerkKey ? (
          <ClerkControlSection activePortal={activePortal} />
        ) : (
          /* Sandbox mode bypass */
          <div>
            <div style={{ 
              background: '#fff3cd', 
              color: '#856404', 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.75rem', 
              textAlign: 'left', 
              border: '1px solid #ffeeba',
              marginBottom: '24px',
              lineHeight: '1.4'
            }}>
              <strong>⚠️ Clerk Sandbox Bypass Mode Active</strong>
              <div style={{ marginTop: '4px' }}>VITE_CLERK_PUBLISHABLE_KEY is not defined in the environment. Local database credentials are active for developer verification.</div>
            </div>

            {activePortal === 'CLINICIAN' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none' }}
                  onClick={() => handleMockClinicianLogin('deepak')}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>🩺</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Attending Physician Portal</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dr. Deepak R. (Pulmonology)</div>
                  </div>
                </button>

                <button 
                  className="btn" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none' }}
                  onClick={() => handleMockClinicianLogin('harpal')}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>🧑‍⚕️</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>ICU Nursing Station</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nurse Harpal S. (Critical Care)</div>
                  </div>
                </button>

                <button 
                  className="btn" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', boxShadow: 'none' }}
                  onClick={() => handleMockClinicianLogin('shalini')}
                >
                  <span style={{ fontSize: '1.5rem', marginRight: '12px' }}>🔬</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Consulting Specialist Portal</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dr. Shalini K. (Nephrology)</div>
                  </div>
                </button>
              </div>
            ) : (
              <form onSubmit={handleMockPatientLogin}>
                <div style={{ textAlign: 'left', marginBottom: '20px' }}>
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
                <button type="submit" className="btn btn-secondary" style={{ width: '100%', height: '40px', fontWeight: 600, fontSize: '0.9rem' }}>
                  Access Patient Portal
                </button>
              </form>
            )}
          </div>
        )}

        <div style={{ marginTop: '40px', fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          HIPAA Safeguards Active • Audit Log Tracking Enabled
        </div>
      </div>
    </div>
  );
};
