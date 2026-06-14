import React from 'react';
import { useApp } from '../context/AppContext';

export const AuditLogPage: React.FC = () => {
  const { auditLogs } = useApp();

  return (
    <div className="page-view">
      <div className="census-header">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🔒 Compliance & Medico-Legal Audit Trail</h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Total Actions Logged: {auditLogs.length}
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Under HIPAA regulations, every extraction, clinical change, user login, and discharge approval action is recorded in this immutable ledger.
      </p>

      <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px 8px' }}>Timestamp</th>
              <th style={{ padding: '12px 8px' }}>User</th>
              <th style={{ padding: '12px 8px' }}>Role</th>
              <th style={{ padding: '12px 8px' }}>Action Type</th>
              <th style={{ padding: '12px 8px' }}>Activity Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No actions logged.
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="audit-row">
                  <td style={{ padding: '12px 8px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600 }}>{log.userName}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className="event-type-badge" style={{
                      background: log.userRole === 'PHYSICIAN' ? 'rgba(59,130,246,0.1)' : 
                                  log.userRole === 'SPECIALIST' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                      color: log.userRole === 'PHYSICIAN' ? 'var(--color-blue)' : 
                             log.userRole === 'SPECIALIST' ? 'var(--color-success)' : 'var(--text-muted)'
                    }}>{log.userRole}</span>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--color-cyan)', fontSize: '0.8rem' }}>
                    {log.action}
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-primary)' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
