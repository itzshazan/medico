import React from 'react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, logoutUser, activePatient, user } = useApp();

  const isPatient = user?.role === 'PATIENT';

  return (
    <div className="sidebar">
      <div>
        {/* Project Header */}
        <div style={{ display: 'flex', gap: '10px', padding: '0 8px 16px 8px', borderBottom: '1px solid #dfe1e6', marginBottom: '16px' }}>
          {/* Project icon resembling Beyond Gravity shuttle */}
          <div style={{
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #6554c0, #8777d9)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '1rem'
          }}>
            🚀
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#172b4d' }}>Beyond Gravity</span>
            <span style={{ fontSize: '0.7rem', color: '#5e6c84' }}>Clinical Census</span>
          </div>
        </div>

        {/* PLANNING SECTION (Clinicians only) */}
        {!isPatient && (
          <>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5e6c84', padding: '12px 8px 6px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Planning
            </div>
            <ul className="nav-links">
              <li>
                <div 
                  className={`nav-item ${activeView === 'roadmap' ? 'active' : ''}`}
                  onClick={() => setActiveView('roadmap')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14h3"/><path d="M7 9h6"/><path d="M7 19h10"/></svg>
                  Roadmap
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'backlog' ? 'active' : ''}`}
                  onClick={() => setActiveView('backlog')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  Backlog
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'census' ? 'active' : ''}`}
                  onClick={() => setActiveView('census')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                  Board
                </div>
              </li>
            </ul>
          </>
        )}

        {/* CLINICAL PORTALS */}
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5e6c84', padding: '16px 8px 6px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {isPatient ? 'My Health Center' : 'Development'}
        </div>
        <ul className="nav-links">
          {isPatient ? (
            <>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-portal' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-portal')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                  Health Dashboard
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-timeline' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-timeline')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Timeline Explorer
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-copilot' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-copilot')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  AI Care Companion
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-care-team' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-care-team')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Attending Care Team
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-discharge' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-discharge')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Discharge Instructions
                </div>
              </li>
              <li>
                <div 
                  className={`nav-item ${activeView === 'patient-billing' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                  onClick={() => activePatient && setActiveView('patient-billing')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  Billing & Insurance
                </div>
              </li>
            </>
          ) : (
            <li>
              <div 
                className={`nav-item ${activeView === 'patient-portal' ? 'active' : ''} ${!activePatient ? 'disabled' : ''}`}
                onClick={() => activePatient && setActiveView('patient-portal')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Patient Portal
              </div>
            </li>
          )}
        </ul>

        {/* COMPLIANCE & AUDIT SECTION (Clinicians only) */}
        {!isPatient && (
          <>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#5e6c84', padding: '16px 8px 6px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Compliance & Security
            </div>
            <ul className="nav-links">
              <li>
                <div 
                  className={`nav-item ${activeView === 'audit-logs' ? 'active' : ''}`}
                  onClick={() => setActiveView('audit-logs')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Active Audit Trail
                </div>
              </li>
            </ul>
          </>
        )}
      </div>

      <div>
        {/* Project settings (Clinicians only) */}
        {!isPatient && (
          <div 
            className={`nav-item ${activeView === 'project-settings' ? 'active' : ''}`}
            onClick={() => setActiveView('project-settings')}
            style={{ marginBottom: '4px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Project settings
          </div>
        )}
        <div 
          className="nav-item" 
          onClick={logoutUser} 
          style={{ color: '#de350b', borderLeft: 'none' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Terminate Session
        </div>
      </div>
    </div>
  );
};
