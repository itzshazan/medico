import React from 'react';
import { useApp } from '../context/AppContext';

export const TopBar: React.FC = () => {
  const { 
    user, 
    switchDemoRole, 
    apiKey, 
    setApiKey, 
    activePatient, 
    setActiveView,
    activeView
  } = useApp();

  if (!user) return null;

  const isPatient = user.role === 'PATIENT';

  return (
    <div className="top-bar" style={{ gap: '16px' }}>
      {/* Left branding & Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* Brand Logo */}
        <div 
          onClick={() => !isPatient && setActiveView('census')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isPatient ? 'default' : 'pointer' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.2 2L2 12.2h5V22h5.2V2z" fill="#0052cc"/>
            <path d="M22 12.2l-10.2 10.2H16.8v-5H22v-5.2z" fill="#2684FF"/>
          </svg>
          <span style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 800, 
            fontSize: '1.1rem', 
            color: '#0747a6',
            letterSpacing: '-0.3px'
          }}>
            Medico
          </span>
        </div>

        {/* Navigation Tabs */}
        {!isPatient ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className={`nav-tab ${activeView === 'census' ? 'active' : ''}`}
              onClick={() => setActiveView('census')}
              style={{
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: activeView === 'census' ? 600 : 500,
                color: activeView === 'census' ? '#0052cc' : '#42526e',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f4f5f7'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Your work
            </span>
            <span 
              className={`nav-tab ${activeView === 'patient-portal' ? 'active' : ''}`}
              onClick={() => activePatient && setActiveView('patient-portal')}
              style={{
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: activeView === 'patient-portal' ? 600 : 500,
                color: !activePatient ? '#8993a4' : activeView === 'patient-portal' ? '#0052cc' : '#42526e',
                cursor: activePatient ? 'pointer' : 'not-allowed',
                opacity: activePatient ? 1 : 0.6,
                borderRadius: '3px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => activePatient && (e.currentTarget.style.background = '#f4f5f7')}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Patients {activePatient && `(${activePatient.name})`}
            </span>
            <span 
              className={`nav-tab ${activeView === 'audit-logs' ? 'active' : ''}`}
              onClick={() => setActiveView('audit-logs')}
              style={{
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: activeView === 'audit-logs' ? 600 : 500,
                color: activeView === 'audit-logs' ? '#0052cc' : '#42526e',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f4f5f7'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Audit Trail
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              style={{
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#0052cc',
                background: 'rgba(0, 82, 204, 0.08)',
                borderRadius: '3px'
              }}
            >
              Patient Portal {activePatient && `(${activePatient.mrn})`}
            </span>
          </div>
        )}

        {/* Primary admitting button */}
        {!isPatient && activeView === 'census' && (
          <button 
            className="btn"
            onClick={() => {
              // Trigger click on Admit Ward Button inside CensusDashboard
              const el = document.getElementById('admit-patient-trigger');
              if (el) el.click();
            }}
            style={{ 
              background: '#0052cc', 
              color: '#ffffff',
              padding: '6px 12px',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Admit Patient
          </button>
        )}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* API key configuration block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>Gemini Key:</label>
          <input 
            type="password"
            placeholder="System fallback active"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{
              background: '#fafbfc',
              border: '1px solid #dfe1e6',
              color: '#172b4d',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '0.75rem',
              width: '130px'
            }}
          />
        </div>

        {/* Demo role quick switcher */}
        {!isPatient && (
          <div className="role-switcher-container">
            <select 
              className="role-select" 
              value={user.role} 
              onChange={(e) => switchDemoRole(e.target.value as 'PHYSICIAN' | 'NURSE' | 'SPECIALIST')}
              style={{ fontWeight: 600 }}
            >
              <option value="PHYSICIAN">Physician Portal</option>
              <option value="NURSE">ICU Nurse Station</option>
              <option value="SPECIALIST">Consult Specialist</option>
            </select>
          </div>
        )}

        {/* User profile */}
        <div className="user-profile">
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: user.role === 'PHYSICIAN' ? '#0052cc' : user.role === 'SPECIALIST' ? '#36b37e' : '#ffab00',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {user.name.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#172b4d' }}>{user.name}</span>
            <span style={{ fontSize: '0.65rem', color: '#5e6c84', textTransform: 'uppercase', fontWeight: 700 }}>
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
