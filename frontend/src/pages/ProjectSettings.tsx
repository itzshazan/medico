import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const ProjectSettings: React.FC = () => {
  const { 
    beds, 
    apiBaseUrl, 
    apiKey, 
    setApiKey, 
    createBed, 
    deleteBed, 
    reseedDatabase, 
    loading,
    patients,
    auditLogs
  } = useApp();

  const [newBedNum, setNewBedNum] = useState('');
  const [newBedDept, setNewBedDept] = useState<'ICU' | 'WARD'>('WARD');
  const [savingBed, setSavingBed] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(apiKey);

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBedNum.trim()) return;

    setSavingBed(true);
    const success = await createBed(newBedNum.trim().toUpperCase(), newBedDept);
    setSavingBed(false);
    if (success) {
      setNewBedNum('');
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(geminiKeyInput);
  };

  const activeOccupiedBeds = beds.filter(b => b.patientId).length;

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: 'calc(100vh - 56px)' }}>
      
      {/* Header Breadcrumbs */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Settings / Beyond Gravity
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>
        Project settings
      </h1>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column: Bed Capacity Management */}
        <div style={{ flex: 2, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Bed Capacity Management
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Configure hospital beds, departments, and monitor occupancy thresholds.
            </p>

            {/* Quick Add Bed Form */}
            <form onSubmit={handleAddBed} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '24px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Bed Number
                </label>
                <input 
                  type="text" 
                  style={{ width: '100%', height: '36px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: '0.85rem' }}
                  placeholder="e.g. WARD-5"
                  value={newBedNum}
                  onChange={(e) => setNewBedNum(e.target.value)}
                  required
                />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Department
                </label>
                <select 
                  value={newBedDept}
                  onChange={(e: any) => setNewBedDept(e.target.value)}
                  style={{ width: '100%', height: '36px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 8px', background: '#ffffff', fontSize: '0.85rem' }}
                >
                  <option value="ICU">ICU</option>
                  <option value="WARD">Ward</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ height: '36px', fontWeight: 600, fontSize: '0.85rem' }}
                disabled={savingBed}
              >
                {savingBed ? 'Creating...' : 'Create Bed'}
              </button>
            </form>

            {/* Beds capacity list */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--glass-border)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Bed Number</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map(bed => {
                    const isOccupied = !!bed.patientId;
                    return (
                      <tr key={bed.bedNumber} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>{bed.bedNumber}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            background: bed.department === 'ICU' ? '#eae6ff' : '#efffd6',
                            color: bed.department === 'ICU' ? '#403294' : '#275813'
                          }}>
                            {bed.department}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isOccupied ? (
                            <span style={{ color: 'var(--color-blue)', fontWeight: 600 }}>Occupied</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Vacant</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <button 
                            onClick={() => deleteBed(bed.bedNumber)}
                            style={{ 
                              border: 'none', 
                              background: 'transparent', 
                              color: isOccupied ? 'var(--text-muted)' : 'var(--color-danger)', 
                              cursor: isOccupied ? 'not-allowed' : 'pointer',
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                            disabled={isOccupied}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Right Column: API Keys and Maintenance */}
        <div style={{ flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* EMR API Settings */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              EMR API Configuration
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Clinical API Base URL
              </label>
              <input 
                type="text" 
                style={{ width: '100%', height: '36px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                value={apiBaseUrl}
                disabled
              />
            </div>

            <form onSubmit={handleSaveApiKey}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Gemini API Developer Key
                </label>
                <input 
                  type="password" 
                  style={{ width: '100%', height: '36px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: '0.85rem' }}
                  placeholder="AI Narrative Gemini key..."
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '36px', fontWeight: 600, fontSize: '0.85rem' }}>
                Save Developer Key
              </button>
            </form>
          </div>

          {/* Database Stats & Maintenance */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
              EMR Maintenance
            </h3>
            
            {/* Stats list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '4px' }}>
                <span>Total beds defined:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{beds.length} ({activeOccupiedBeds} occupied)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '4px' }}>
                <span>Total patient charts:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{patients.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '4px' }}>
                <span>System audits recorded:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{auditLogs.length}</strong>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Perform a hard reseed of the SQLite clinical registry database. This clears all active ward placements, resets audit trails, and reloads standard EMR clinical narratives.
            </p>

            <button 
              onClick={reseedDatabase}
              className="btn"
              style={{ 
                width: '100%', 
                height: '40px', 
                fontWeight: 700, 
                fontSize: '0.85rem', 
                background: '#de350b', 
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 4px rgba(222, 53, 11, 0.2)'
              }}
              disabled={loading}
            >
              {loading ? 'Reseeding database...' : 'Reset & Re-seed EMR Database'}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
