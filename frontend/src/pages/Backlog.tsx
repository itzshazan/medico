import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Backlog: React.FC = () => {
  const { 
    patients, 
    beds, 
    apiBaseUrl, 
    refreshAllData, 
    addNotification, 
    user,
    releasePatientFromBed
  } = useApp();

  // Quick-admit waitlist form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [mrn, setMrn] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [comorbidities, setComorbidities] = useState('');
  const [admitting, setAdmitting] = useState(false);

  // Drag over states
  const [dragOverBed, setDragOverBed] = useState<string | null>(null);
  const [dragOverBacklog, setDragOverBacklog] = useState(false);

  // Filter unassigned waitlist patients
  const waitlistPatients = patients.filter(
    p => (!p.bed || p.bed === null) && p.status !== 'DONE' && p.status !== 'DISCHARGED'
  );

  const handleDragStart = (e: React.DragEvent, patientId: string, source: 'backlog' | 'bed', bedNumber?: string) => {
    e.dataTransfer.setData('patientId', patientId);
    e.dataTransfer.setData('source', source);
    if (bedNumber) e.dataTransfer.setData('sourceBed', bedNumber);
  };

  const handleDragOverBed = (e: React.DragEvent, bedNum: string) => {
    e.preventDefault();
    setDragOverBed(bedNum);
  };

  const handleDragLeaveBed = () => {
    setDragOverBed(null);
  };

  const handleDropOnBed = async (e: React.DragEvent, targetBedNum: string) => {
    e.preventDefault();
    setDragOverBed(null);
    const patientId = e.dataTransfer.getData('patientId');
    const source = e.dataTransfer.getData('source');
    const sourceBed = e.dataTransfer.getData('sourceBed');

    if (!patientId || !targetBedNum) return;

    // Check if target bed is vacant
    const bedObj = beds.find(b => b.bedNumber === targetBedNum);
    if (!bedObj || bedObj.patientId) {
      addNotification(`Bed ${targetBedNum} is occupied!`, 'warning');
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/census/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({
          patientId,
          sourceBed: source === 'bed' ? sourceBed : null,
          targetBed: targetBedNum
        })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Assigned patient to bed ${targetBedNum}`, 'success');
        refreshAllData();
      } else {
        addNotification(data.error || 'Assignment failed', 'danger');
      }
    } catch (err) {
      addNotification('Error assigning patient to bed', 'danger');
    }
  };

  const handleDropOnBacklog = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBacklog(false);
    const patientId = e.dataTransfer.getData('patientId');
    const source = e.dataTransfer.getData('source');

    if (!patientId || source !== 'bed') return;

    await releasePatientFromBed(patientId);
  };

  const handleQuickAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mrn || !age || !gender) {
      addNotification('Please fill in all required fields', 'warning');
      return;
    }

    setAdmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({
          name,
          mrn,
          age: parseInt(age),
          gender,
          comorbidities,
          bed: null, // admit directly to waitlist backlog
          status: 'ADMITTED'
        })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Patient ${name} added to triage waitlist`, 'success');
        setName('');
        setMrn('');
        setAge('');
        setComorbidities('');
        setShowAddForm(false);
        refreshAllData();
      } else {
        addNotification(data.detail || 'Failed to admit patient', 'danger');
      }
    } catch (err) {
      addNotification('Error connecting to backend EMR', 'danger');
    } finally {
      setAdmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      
      {/* Left Pane: Triage Waitlist Backlog */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setDragOverBacklog(true); }}
        onDragLeave={() => setDragOverBacklog(false)}
        onDrop={handleDropOnBacklog}
        style={{ 
          width: '320px', 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--bg-secondary)', 
          borderRight: '1px solid var(--glass-border)',
          padding: '24px',
          overflowY: 'auto',
          borderLeft: dragOverBacklog ? '3px dashed var(--color-blue)' : 'none',
          transition: 'border 0.15s'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Triage</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Waitlist Backlog</h2>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ 
              border: 'none', 
              background: 'var(--color-blue)', 
              color: '#ffffff', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold', 
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
            title="Admit new patient to waitlist"
          >
            {showAddForm ? '×' : '+'}
          </button>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form onSubmit={handleQuickAdmitSubmit} className="glass-panel" style={{ padding: '16px', background: '#ffffff', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px' }}>Triage Waitlist Intake</h4>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Patient Name *</label>
              <input type="text" style={{ width: '100%', height: '32px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', fontSize: '0.8rem' }} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>MRN *</label>
                <input type="text" style={{ width: '100%', height: '32px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', fontSize: '0.8rem' }} placeholder="MRN-XXX" required value={mrn} onChange={(e) => setMrn(e.target.value)} />
              </div>
              <div style={{ width: '60px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Age *</label>
                <input type="number" style={{ width: '100%', height: '32px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', fontSize: '0.8rem' }} required value={age} onChange={(e) => setAge(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Gender *</label>
              <select style={{ width: '100%', height: '32px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0 8px', fontSize: '0.8rem', background: '#ffffff' }} value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Comorbidities / Clinical Notes</label>
              <textarea style={{ width: '100%', height: '50px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical' }} placeholder="HTN, DM, Asthma..." value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '32px', fontSize: '0.8rem', fontWeight: 600 }} disabled={admitting}>
              {admitting ? 'Admitting...' : 'Intake to Waitlist'}
            </button>
          </form>
        )}

        {/* Waitlist list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {waitlistPatients.length === 0 ? (
            <div style={{ padding: '24px', border: '1px dashed var(--glass-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Waitlist queue is empty.
            </div>
          ) : (
            waitlistPatients.map(p => (
              <div 
                key={p.id} 
                draggable 
                onDragStart={(e) => handleDragStart(e, p.id, 'backlog')}
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '12px 16px', 
                  cursor: 'grab',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                className="waitlist-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.gender.substring(0, 1)}, {p.age}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-blue)', fontWeight: 600, marginBottom: '6px' }}>
                  {p.mrn}
                </div>
                {p.comorbidities && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(9, 30, 66, 0.04)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.comorbidities}>
                    {p.comorbidities}
                  </div>
                )}
                <div style={{ marginTop: '8px', fontSize: '0.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>✥ Drag onto bed to allocate</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Bed Allocation Census Grid */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Beyond Gravity / Census Management</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Active Bed Census Grid</h1>
        </div>

        {/* ICU Beds Section */}
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#5e6c84', letterSpacing: '0.5px', marginBottom: '12px' }}>
          🏥 Intensive Care Unit (ICU)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {beds.filter(b => b.department === 'ICU').map(bed => {
            const isOccupied = !!bed.patientId;
            const isTargeted = dragOverBed === bed.bedNumber;
            return (
              <div 
                key={bed.bedNumber}
                onDragOver={(e) => handleDragOverBed(e, bed.bedNumber)}
                onDragLeave={handleDragLeaveBed}
                onDrop={(e) => handleDropOnBed(e, bed.bedNumber)}
                style={{ 
                  background: isOccupied ? '#ffffff' : (isTargeted ? 'rgba(0, 82, 204, 0.08)' : 'rgba(9, 30, 66, 0.04)'), 
                  border: isTargeted ? '2px dashed var(--color-blue)' : '1px solid var(--glass-border)', 
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  minHeight: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s, border-color 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bed.bedNumber}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#eae6ff', color: '#403294' }}>ICU</span>
                </div>

                {isOccupied && bed.patient ? (
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, bed.patientId!, 'bed', bed.bedNumber)}
                    style={{ display: 'flex', flexDirection: 'column', cursor: 'grab', flex: 1 }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {bed.patient.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {bed.patient.mrn} • {bed.patient.status}
                    </div>
                    <button 
                      onClick={() => releasePatientFromBed(bed.patientId!)}
                      style={{ 
                        width: '100%', 
                        height: '24px', 
                        fontSize: '0.65rem', 
                        fontWeight: 600, 
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff', 
                        color: 'var(--color-neon-red)', 
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      Release to Waitlist
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                    Vacant Bed<br />Drop Patient Here
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* General Ward Beds Section */}
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#5e6c84', letterSpacing: '0.5px', marginBottom: '12px' }}>
          🛏️ General Medical Ward
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {beds.filter(b => b.department === 'WARD').map(bed => {
            const isOccupied = !!bed.patientId;
            const isTargeted = dragOverBed === bed.bedNumber;
            return (
              <div 
                key={bed.bedNumber}
                onDragOver={(e) => handleDragOverBed(e, bed.bedNumber)}
                onDragLeave={handleDragLeaveBed}
                onDrop={(e) => handleDropOnBed(e, bed.bedNumber)}
                style={{ 
                  background: isOccupied ? '#ffffff' : (isTargeted ? 'rgba(0, 82, 204, 0.08)' : 'rgba(9, 30, 66, 0.04)'), 
                  border: isTargeted ? '2px dashed var(--color-blue)' : '1px solid var(--glass-border)', 
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  minHeight: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'background-color 0.15s, border-color 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bed.bedNumber}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#efffd6', color: '#275813' }}>WARD</span>
                </div>

                {isOccupied && bed.patient ? (
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, bed.patientId!, 'bed', bed.bedNumber)}
                    style={{ display: 'flex', flexDirection: 'column', cursor: 'grab', flex: 1 }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {bed.patient.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {bed.patient.mrn} • {bed.patient.status}
                    </div>
                    <button 
                      onClick={() => releasePatientFromBed(bed.patientId!)}
                      style={{ 
                        width: '100%', 
                        height: '24px', 
                        fontSize: '0.65rem', 
                        fontWeight: 600, 
                        border: '1px solid var(--glass-border)',
                        background: '#ffffff', 
                        color: 'var(--color-neon-red)', 
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                      }}
                    >
                      Release to Waitlist
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px 0' }}>
                    Vacant Bed<br />Drop Patient Here
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
