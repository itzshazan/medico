import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Patient } from '../context/AppContext';

export const Roadmap: React.FC = () => {
  const { patients, updatePatientRoadmap } = useApp();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Roadmap form states
  const [estDischarge, setEstDischarge] = useState('');
  const [newMilestoneText, setNewMilestoneText] = useState('');
  
  // Generate a timeline range: today - 3 days to today + 10 days (14 days total)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const timelineDays: Date[] = [];
  for (let i = -3; i <= 10; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    timelineDays.push(d);
  }
  
  const startTimestamp = timelineDays[0].getTime();
  const endTimestamp = timelineDays[timelineDays.length - 1].getTime() + 24 * 60 * 60 * 1000; // end of last day
  const totalDuration = endTimestamp - startTimestamp;

  useEffect(() => {
    if (selectedPatient) {
      // Refresh selected patient reference from latest patients list
      const latest = patients.find(p => p.id === selectedPatient.id);
      if (latest) {
        setSelectedPatient(latest);
        if (latest.estimatedDischargeDate) {
          setEstDischarge(latest.estimatedDischargeDate.substring(0, 10));
        } else {
          setEstDischarge('');
        }
      }
    }
  }, [patients]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    if (patient.estimatedDischargeDate) {
      setEstDischarge(patient.estimatedDischargeDate.substring(0, 10));
    } else {
      setEstDischarge('');
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setEstDischarge(newDate);
    if (selectedPatient) {
      const currentMilestones = selectedPatient.milestones || [];
      await updatePatientRoadmap(selectedPatient.id, newDate, currentMilestones);
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedPatient) return;
    const currentMilestones = selectedPatient.milestones || [];
    const updated = currentMilestones.map(m => {
      if (m.id === milestoneId) {
        const completed = !m.completed;
        return {
          ...m,
          completed,
          dateCompleted: completed ? new Date().toISOString() : undefined
        };
      }
      return m;
    });
    
    await updatePatientRoadmap(selectedPatient.id, estDischarge, updated);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newMilestoneText.trim()) return;

    const currentMilestones = selectedPatient.milestones || [];
    const newMilestone = {
      id: Math.random().toString(36).substring(2, 9),
      title: newMilestoneText.trim(),
      completed: false
    };
    const updated = [...currentMilestones, newMilestone];
    
    const success = await updatePatientRoadmap(selectedPatient.id, estDischarge, updated);
    if (success) {
      setNewMilestoneText('');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedPatient) return;
    const currentMilestones = selectedPatient.milestones || [];
    const updated = currentMilestones.filter(m => m.id !== milestoneId);
    await updatePatientRoadmap(selectedPatient.id, estDischarge, updated);
  };

  // Helper to calculate bar styling (left offset and width)
  const calculateBarPosition = (p: Patient) => {
    const adm = new Date(p.admissionDate).getTime();
    
    // Default estimated discharge to adm + 5 days if null
    let dis = p.estimatedDischargeDate 
      ? new Date(p.estimatedDischargeDate).getTime()
      : adm + 5 * 24 * 60 * 60 * 1000;
      
    if (p.status === 'DONE' && p.dischargeDate) {
      dis = new Date(p.dischargeDate).getTime();
    }
    
    // Clamp to timeline window
    const start = Math.max(adm, startTimestamp);
    const end = Math.max(Math.min(dis, endTimestamp), start);
    
    const leftPercent = ((start - startTimestamp) / totalDuration) * 100;
    const widthPercent = ((end - start) / totalDuration) * 100;
    
    return {
      left: `${Math.max(0, Math.min(100, leftPercent))}%`,
      width: `${Math.max(2, Math.min(100, widthPercent))}%`
    };
  };

  const getStatusColor = (p: Patient) => {
    if (p.status === 'DONE' || p.status === 'DISCHARGED') return '#36b37e'; // Green
    if (p.status === 'ACTIVE_CARE' || p.status === 'ICU') return '#6554c0'; // Purple
    if (p.status === 'IN_REVIEW' || p.status === 'CONFIRM_STATUS') return '#ffab00'; // Yellow/Amber
    return '#0052cc'; // Blue (Ward)
  };

  // Active care patients (excluding discharged ones unless recent)
  const activePatients = patients.filter(p => p.status !== 'DONE' && p.status !== 'DISCHARGED');

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      
      {/* Timeline main panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', borderRight: '1px solid var(--glass-border)' }}>
        
        {/* Header Breadcrumbs */}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Projects / Beyond Gravity / Roadmap
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>
          Care stay Timeline
        </h1>

        {/* Gantt Table */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '400px', overflow: 'auto' }}>
          
          {/* Gantt Headers */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ width: '220px', padding: '12px 16px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--glass-border)', flexShrink: 0 }}>
              PATIENT (MRN)
            </div>
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
              {timelineDays.map((date, idx) => {
                const isToday = date.toDateString() === today.toDateString();
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      flex: 1, 
                      padding: '12px 4px', 
                      fontSize: '0.7rem', 
                      fontWeight: isToday ? 800 : 600, 
                      color: isToday ? 'var(--color-blue)' : 'var(--text-muted)', 
                      textAlign: 'center', 
                      borderRight: '1px solid rgba(9, 30, 66, 0.08)',
                      background: isToday ? 'rgba(0, 82, 204, 0.05)' : 'transparent',
                      minWidth: '50px'
                    }}
                  >
                    {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {activePatients.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No active patients to show in roadmap timeline.
              </div>
            ) : (
              activePatients.map(p => {
                const isSelected = selectedPatient?.id === p.id;
                const { left, width } = calculateBarPosition(p);
                return (
                  <div 
                    key={p.id} 
                    onClick={() => handlePatientSelect(p)}
                    style={{ 
                      display: 'flex', 
                      borderBottom: '1px solid var(--glass-border)', 
                      alignItems: 'center',
                      background: isSelected ? 'rgba(0, 82, 204, 0.04)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    {/* Patient detail column */}
                    <div style={{ 
                      width: '220px', 
                      padding: '16px', 
                      borderRight: '1px solid var(--glass-border)', 
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--color-blue)' : 'var(--text-primary)' }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        🛏️ {p.bed || 'Waitlist'} • {p.mrn}
                      </span>
                    </div>

                    {/* Timeline bar column */}
                    <div style={{ flex: 1, height: '60px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                      
                      {/* Grid background lines */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, display: 'flex' }}>
                        {timelineDays.map((_, idx) => (
                          <div key={idx} style={{ flex: 1, borderRight: '1px solid rgba(9, 30, 66, 0.04)', height: '100%', minWidth: '50px' }} />
                        ))}
                      </div>

                      {/* Today indicator vertical line */}
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, 
                        bottom: 0, 
                        left: `${((today.getTime() - startTimestamp) / totalDuration) * 100}%`, 
                        width: '2px', 
                        background: 'var(--color-danger)', 
                        zIndex: 2, 
                        opacity: 0.7 
                      }} />

                      {/* Stay Gantt Bar */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: left,
                          width: width,
                          height: '24px',
                          background: getStatusColor(p),
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 12px',
                          color: '#ffffff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          zIndex: 1,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={`${p.name} - Admitted: ${p.admissionDate.substring(0,10)}`}
                      >
                        {p.status}
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* Sidebar Details Pane */}
      <div style={{ width: '380px', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', padding: '24px', overflowY: 'auto' }}>
        {selectedPatient ? (
          <div>
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Patient Details</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedPatient.name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span className="user-badge">{selectedPatient.mrn}</span>
                <span className="user-badge" style={{ background: '#eae6ff', color: '#403294' }}>{selectedPatient.status}</span>
                <span className="user-badge" style={{ background: '#efffd6', color: '#275813' }}>Bed: {selectedPatient.bed || 'Waitlist'}</span>
              </div>
            </div>

            {/* Estimated Discharge Picker */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Estimated Discharge Date
              </label>
              <input 
                type="date" 
                value={estDischarge}
                onChange={handleDateChange}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 10px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  background: '#ffffff'
                }}
              />
            </div>

            {/* Milestones Section */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Care stay Milestones
              </div>

              {/* Milestones List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {(!selectedPatient.milestones || selectedPatient.milestones.length === 0) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                    No milestones defined. Add one below to track care objectives.
                  </div>
                ) : (
                  selectedPatient.milestones.map(m => (
                    <div 
                      key={m.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        justifyContent: 'space-between',
                        background: '#ffffff', 
                        padding: '12px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--glass-border)' 
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                        <input 
                          type="checkbox" 
                          checked={m.completed} 
                          onChange={() => handleToggleMilestone(m.id)}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: 500, 
                            color: 'var(--text-primary)',
                            textDecoration: m.completed ? 'line-through' : 'none',
                            opacity: m.completed ? 0.6 : 1
                          }}>
                            {m.title}
                          </span>
                          {m.completed && m.dateCompleted && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              ✓ Completed {m.dateCompleted.substring(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteMilestone(m.id)}
                        style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.7 }}
                        title="Delete Milestone"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Milestone Form */}
              <form onSubmit={handleAddMilestone} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="search-input"
                  style={{ flex: 1, height: '36px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: '#ffffff', fontSize: '0.8rem' }}
                  placeholder="New care milestone..."
                  value={newMilestoneText}
                  onChange={(e) => setNewMilestoneText(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ height: '36px', padding: '0 12px', fontSize: '0.8rem' }}>
                  Add
                </button>
              </form>
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>No Patient Selected</h3>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>Select a patient from the roadmap timeline to view estimated discharge parameters and tick off care milestones.</p>
          </div>
        )}
      </div>

    </div>
  );
};
