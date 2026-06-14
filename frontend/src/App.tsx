import { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { CensusDashboard } from './pages/CensusDashboard';
import { PatientPortal } from './pages/PatientPortal';
import { AuditLogPage } from './pages/AuditLogPage';
import { Roadmap } from './pages/Roadmap';
import { Backlog } from './pages/Backlog';
import { ProjectSettings } from './pages/ProjectSettings';

function App() {
  const { user, activeView, notifications } = useApp();
  const [showLanding, setShowLanding] = useState(true);

  // Show Landing Page → Login flow when no active user session
  if (!user) {
    if (showLanding) {
      return <LandingPage onEnterApp={() => setShowLanding(false)} />;
    }

    return (
      <>
        <Login />
        {/* Floating Notification Center */}
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 9999
        }}>
          {notifications.map(n => (
            <div 
              key={n.id} 
              className="glass-panel" 
              style={{
                padding: '12px 20px',
                fontSize: '0.85rem',
                borderLeft: `4px solid ${
                  n.type === 'success' ? 'var(--color-success)' :
                  n.type === 'warning' ? 'var(--color-warning)' :
                  n.type === 'danger' ? 'var(--color-danger)' : 'var(--color-blue)'
                }`,
                background: 'var(--bg-secondary)',
                minWidth: '280px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
              }}
            >
              {n.message}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Dashboard Space */}
      <div className="main-content">
        <TopBar />

        {/* Dynamic Page Views */}
        {activeView === 'census' && <CensusDashboard />}
        {activeView === 'patient-portal' && <PatientPortal subView="dashboard" />}
        {activeView === 'patient-timeline' && <PatientPortal subView="timeline" />}
        {activeView === 'patient-copilot' && <PatientPortal subView="copilot" />}
        {activeView === 'patient-care-team' && <PatientPortal subView="care-team" />}
        {activeView === 'patient-discharge' && <PatientPortal subView="discharge" />}
        {activeView === 'patient-billing' && <PatientPortal subView="billing" />}
        {activeView === 'audit-logs' && <AuditLogPage />}
        {activeView === 'roadmap' && <Roadmap />}
        {activeView === 'backlog' && <Backlog />}
        {activeView === 'project-settings' && <ProjectSettings />}
      </div>

      {/* Floating Notification Center */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999
      }}>
        {notifications.map(n => (
          <div 
            key={n.id} 
            className="glass-panel" 
            style={{
              padding: '12px 20px',
              fontSize: '0.85rem',
              borderLeft: `4px solid ${
                n.type === 'success' ? 'var(--color-success)' :
                n.type === 'warning' ? 'var(--color-warning)' :
                n.type === 'danger' ? 'var(--color-danger)' : 'var(--color-blue)'
              }`,
              background: 'var(--bg-secondary)',
              minWidth: '280px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
            }}
          >
            {n.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
