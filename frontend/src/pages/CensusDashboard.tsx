import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Patient } from '../context/AppContext';

export const CensusDashboard: React.FC = () => {
  const { patients, beds, refreshAllData, selectPatientById, apiBaseUrl, user, addNotification } = useApp();
  
  // Admit Patient Modal state
  const [showAdmitModal, setShowAdmitModal] = useState<boolean>(false);
  const [admitDept, setAdmitDept] = useState<'ICU' | 'WARD'>('WARD');
  const [selectedBedNum, setSelectedBedNum] = useState<string>('');
  
  // Admit Form State
  const [mrn, setMrn] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [comorbidities, setComorbidities] = useState('');

  // Transfer Bed Modal State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferPatient, setTransferPatient] = useState<Patient | null>(null);
  const [transferTargetDept, setTransferTargetDept] = useState<'ICU' | 'WARD'>('WARD');
  const [targetBedNum, setTargetBedNum] = useState<string>('');

  // Census Upload Panel State
  const [showCensusPanel, setShowCensusPanel] = useState<boolean>(false);
  const [censusFile, setCensusFile] = useState<File | null>(null);
  const [uploadingCensus, setUploadingCensus] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  // Drag over column state for visual highlights
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhysician, setSelectedPhysician] = useState<string | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, patientId: string) => {
    e.dataTransfer.setData('patientId', patientId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: 'ADMITTED' | 'ACTIVE_CARE' | 'IN_REVIEW' | 'DONE') => {
    e.preventDefault();
    setDragOverColumn(null);
    const patientId = e.dataTransfer.getData('patientId');
    if (!patientId) return;

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    // If target matches current status, do nothing
    if (patient.status === targetStatus) return;

    // Dropped to ADMITTED (Ward) or ACTIVE_CARE (ICU)
    if (targetStatus === 'ADMITTED' || targetStatus === 'ACTIVE_CARE') {
      const targetDept = targetStatus === 'ACTIVE_CARE' ? 'ICU' : 'WARD';
      setTransferPatient(patient);
      setTransferTargetDept(targetDept);
      
      const emptyBeds = beds.filter(b => b.department === targetDept && !b.patientId);
      if (emptyBeds.length === 0) {
        addNotification(`No vacant beds available in ${targetDept}! Free up a bed first.`, 'danger');
        return;
      }
      setTargetBedNum(emptyBeds[0].bedNumber); // Default first available
      setShowTransferModal(true);
    } else if (targetStatus === 'IN_REVIEW') {
      await executeResolveStatus(patientId, 'IN_REVIEW');
    } else if (targetStatus === 'DONE') {
      // Free bed and discharge
      await executeResolveStatus(patientId, 'DISCHARGED');
    }
  };

  const executeResolveStatus = async (patientId: string, resolution: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/census/resolve-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ patientId, resolution })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Patient status updated to ${resolution}`, 'success');
        refreshAllData();
      } else {
        addNotification(data.error || 'Failed to update patient status', 'danger');
      }
    } catch (e) {
      addNotification('Error connecting to backend API', 'danger');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferPatient || !targetBedNum) return;

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
          patientId: transferPatient.id,
          sourceBed: transferPatient.bed,
          targetBed: targetBedNum
        })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Transferred ${transferPatient.name} to bed ${targetBedNum}`, 'success');
        setShowTransferModal(false);
        setTransferPatient(null);
        refreshAllData();
      } else {
        addNotification(data.error || 'Transfer failed', 'danger');
      }
    } catch (err) {
      addNotification('Failed to transfer patient', 'danger');
    }
  };

  const handleAdmitClick = (dept: 'ICU' | 'WARD') => {
    setAdmitDept(dept);
    const vacantBeds = beds.filter(b => b.department === dept && !b.patientId);
    if (vacantBeds.length === 0) {
      addNotification(`No empty beds available in ${dept}!`, 'warning');
      return;
    }
    setSelectedBedNum(vacantBeds[0].bedNumber);
    setShowAdmitModal(true);
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrn || !name || !age || !selectedBedNum) {
      addNotification('Please fill all mandatory fields', 'warning');
      return;
    }

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
          mrn,
          name,
          age,
          gender,
          comorbidities,
          bed: selectedBedNum,
          status: selectedBedNum.startsWith('ICU') ? 'ACTIVE_CARE' : 'ADMITTED'
        })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Admitted patient ${name} to ${selectedBedNum}`, 'success');
        setShowAdmitModal(false);
        // Reset form
        setMrn('');
        setName('');
        setAge('');
        setComorbidities('');
        refreshAllData();
      } else {
        addNotification(data.error || 'Failed to admit patient', 'danger');
      }
    } catch (err) {
      addNotification('Error connecting to clinical backend', 'danger');
    }
  };

  const handleCensusUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!censusFile) {
      addNotification('Please select a census rounds file', 'warning');
      return;
    }

    setUploadingCensus(true);
    const formData = new FormData();
    formData.append('censusImage', censusFile);

    try {
      const res = await fetch(`${apiBaseUrl}/census/upload-census`, {
        method: 'POST',
        headers: {
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setReconciliationResult(data);
        addNotification('Census list reconciled. Anomalies detected.', 'warning');
        refreshAllData();
      } else {
        addNotification(data.error || 'Failed to process census upload', 'danger');
      }
    } catch (err) {
      addNotification('Error uploading census rounds image', 'danger');
    } finally {
      setUploadingCensus(false);
    }
  };

  const handleResolveStatus = async (patientId: string, resolution: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/census/resolve-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ patientId, resolution })
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Patient reconciled to state: ${resolution}`, 'success');
        if (reconciliationResult) {
          const updatedConfirm = reconciliationResult.confirmRequired.filter((p: any) => p.id !== patientId);
          setReconciliationResult({
            ...reconciliationResult,
            confirmRequired: updatedConfirm
          });
        }
        refreshAllData();
      } else {
        addNotification(data.error || 'Resolution failed', 'danger');
      }
    } catch (e) {
      addNotification('Failed to resolve patient status', 'danger');
    }
  };

  // Helper to render quick safety warnings on the card
  const getCardWarnings = (patient: Patient) => {
    const warnings: string[] = [];
    const normalizedComorb = patient.comorbidities ? patient.comorbidities.toLowerCase() : '';
    
    if (normalizedComorb.includes('ckd') || normalizedComorb.includes('kidney') || normalizedComorb.includes('renal')) {
      warnings.push('CKD / Renal Adjust');
    }
    if (normalizedComorb.includes('bleeding') || normalizedComorb.includes('hemorrhage') || normalizedComorb.includes('bleed risk')) {
      warnings.push('Bleed Risk / Anticoag Hold');
    }
    return warnings;
  };

  // Group patients by status and apply search + doctor filters
  const filterByStatus = (status: 'ADMITTED' | 'ACTIVE_CARE' | 'IN_REVIEW' | 'DONE') => {
    return patients.filter(p => {
      const pStatus = p.status;
      let matchesStatus = false;
      if (status === 'DONE') {
        matchesStatus = pStatus === 'DONE' || pStatus === 'DISCHARGED';
      } else if (status === 'ADMITTED') {
        matchesStatus = pStatus === 'ADMITTED' || pStatus === 'WARD';
      } else if (status === 'ACTIVE_CARE') {
        matchesStatus = pStatus === 'ACTIVE_CARE' || pStatus === 'ICU';
      } else if (status === 'IN_REVIEW') {
        matchesStatus = pStatus === 'IN_REVIEW' || pStatus === 'CONFIRM_STATUS';
      } else {
        matchesStatus = pStatus === status;
      }

      if (!matchesStatus) return false;

      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(query);
        const mrnMatch = p.mrn.toLowerCase().includes(query);
        const comorbMatch = p.comorbidities ? p.comorbidities.toLowerCase().includes(query) : false;
        if (!nameMatch && !mrnMatch && !comorbMatch) return false;
      }

      // Apply physician filters
      if (selectedPhysician) {
        if (selectedPhysician === 'DB' && !p.name.includes('Rajinder') && !p.name.includes('Amit')) return false;
        if (selectedPhysician === 'HS' && !p.bed?.startsWith('ICU')) return false;
        if (selectedPhysician === 'SP' && (p.name.includes('Rajinder') || p.bed?.startsWith('ICU'))) return false;
      }

      // Apply clinical risk filter
      if (selectedRisk) {
        const warnings = getCardWarnings(p);
        if (selectedRisk === 'CKD' && !warnings.some(w => w.includes('CKD'))) return false;
        if (selectedRisk === 'BLEED' && !warnings.some(w => w.includes('Bleed'))) return false;
      }

      return true;
    });
  };

  const renderComorbidityTags = (comorb: string) => {
    if (!comorb) return null;
    const tags = comorb.split(/[,;]/);
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
        {tags.map((tag, i) => {
          const cleanTag = tag.trim();
          if (!cleanTag) return null;
          // Determine color based on tag
          let bg = '#ebecf0';
          let color = '#42526e';
          const lower = cleanTag.toLowerCase();
          if (lower.includes('ckd') || lower.includes('renal') || lower.includes('kidney')) {
            bg = '#eae6ff'; // Light purple
            color = '#403294';
          } else if (lower.includes('bleed') || lower.includes('bleeding')) {
            bg = '#ffebe6'; // Light red/orange
            color = '#de350b';
          } else if (lower.includes('cad') || lower.includes('heart') || lower.includes('cardiac')) {
            bg = '#deebff'; // Light blue
            color = '#0747a6';
          } else if (lower.includes('htn') || lower.includes('hypertension') || lower.includes('diabetes') || lower.includes('dm')) {
            bg = '#e3fcef'; // Light green
            color = '#006644';
          }
          return (
            <span key={i} style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              background: bg,
              color: color,
              padding: '2px 6px',
              borderRadius: '3px',
              textTransform: 'uppercase',
              letterSpacing: '0.3px'
            }}>
              {cleanTag}
            </span>
          );
        })}
      </div>
    );
  };

  const admittedPatients = filterByStatus('ADMITTED');
  const activeCarePatients = filterByStatus('ACTIVE_CARE');
  const inReviewPatients = filterByStatus('IN_REVIEW');
  const donePatients = filterByStatus('DONE');

  const emptyIcuBeds = beds.filter(b => b.department === 'ICU' && !b.patientId);
  const emptyWardBeds = beds.filter(b => b.department === 'WARD' && !b.patientId);

  return (
    <div className="page-view" style={{ background: '#ffffff' }}>
      
      {/* Hidden button with ID for TopBar access to Admit Dialog */}
      <button 
        id="admit-patient-trigger" 
        style={{ display: 'none' }} 
        onClick={() => handleAdmitClick('WARD')}
      />

      {/* Projects Breadcrumbs */}
      <div style={{ 
        fontSize: '0.75rem', 
        color: '#5e6c84', 
        marginBottom: '6px', 
        display: 'flex', 
        gap: '6px', 
        alignItems: 'center',
        fontWeight: 500
      }}>
        <span>Projects</span>
        <span style={{ color: '#8993a4' }}>/</span>
        <span>Beyond Gravity</span>
      </div>

      {/* Board Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: '#172b4d' }}>
          Board
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => setShowCensusPanel(!showCensusPanel)}>
            📂 Reconcile Census
          </button>
        </div>
      </div>

      {/* Board Filters & Avatars Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '180px' }}>
            <input 
              type="text" 
              placeholder="Search board..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 8px 6px 28px',
                fontSize: '0.8rem',
                border: '1px solid #dfe1e6',
                borderRadius: '3px',
                width: '100%',
                background: '#ffffff',
                color: '#172b4d'
              }}
            />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5e6c84" strokeWidth="2.5" style={{ position: 'absolute', left: '8px', top: '10px' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            {searchQuery && (
              <span 
                style={{ position: 'absolute', right: '8px', top: '6px', cursor: 'pointer', fontSize: '0.8rem', color: '#8993a4' }}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </span>
            )}
          </div>

          {/* Clinician Avatars Row */}
          <div className="avatar-group" style={{ display: 'flex', alignItems: 'center' }}>
            <div 
              className="avatar" 
              style={{
                background: '#0052cc',
                border: selectedPhysician === 'DB' ? '2px solid #0052cc' : '2px solid #ffffff',
                transform: selectedPhysician === 'DB' ? 'scale(1.15)' : 'none',
                zIndex: selectedPhysician === 'DB' ? 5 : 1
              }}
              onClick={() => setSelectedPhysician(selectedPhysician === 'DB' ? null : 'DB')}
              title="Filter by Dr. Deepak Bhasin (Physician)"
            >
              DB
            </div>
            <div 
              className="avatar" 
              style={{ 
                background: '#ffab00',
                border: selectedPhysician === 'HS' ? '2px solid #ffab00' : '2px solid #ffffff',
                transform: selectedPhysician === 'HS' ? 'scale(1.15)' : 'none',
                zIndex: selectedPhysician === 'HS' ? 5 : 1
              }}
              onClick={() => setSelectedPhysician(selectedPhysician === 'HS' ? null : 'HS')}
              title="Filter by Nurse Harpal (ICU Staff)"
            >
              HS
            </div>
            <div 
              className="avatar" 
              style={{ 
                background: '#36b37e',
                border: selectedPhysician === 'SP' ? '2px solid #36b37e' : '2px solid #ffffff',
                transform: selectedPhysician === 'SP' ? 'scale(1.15)' : 'none',
                zIndex: selectedPhysician === 'SP' ? 5 : 1
              }}
              onClick={() => setSelectedPhysician(selectedPhysician === 'SP' ? null : 'SP')}
              title="Filter by Dr. Shalini (Specialist)"
            >
              SP
            </div>
            <div 
              className="avatar"
              style={{ background: '#8993a4', border: '2px solid #ffffff', zIndex: 0 }}
              title="Other Ward Clinicians"
            >
              +3
            </div>

            {(selectedPhysician || searchQuery || selectedRisk) && (
              <span 
                style={{ fontSize: '0.75rem', color: '#0052cc', marginLeft: '12px', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => {
                  setSelectedPhysician(null);
                  setSearchQuery('');
                  setSelectedRisk(null);
                }}
              >
                Clear all filters
              </span>
            )}
          </div>

          <div style={{ height: '16px', width: '1px', background: '#dfe1e6', margin: '0 8px' }} />

          {/* Clinical Risk Filter Dropdown */}
          <select 
            value={selectedRisk || ''}
            onChange={(e) => setSelectedRisk(e.target.value || null)}
            style={{
              border: '1px solid #dfe1e6',
              borderRadius: '3px',
              fontSize: '0.8rem',
              color: '#5e6c84',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '5px 10px',
              background: '#ffffff'
            }}
          >
            <option value="">Clinical Risk: All</option>
            <option value="CKD">CKD Adjustment Alert</option>
            <option value="BLEED">Bleed Risk Alert</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#5e6c84', fontWeight: 500 }}>
          <span>Group by: <strong>None</strong></span>
          <span style={{ color: '#dfe1e6' }}>|</span>
          <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            Insights
          </span>
        </div>
      </div>

      {/* CENSUS RECONCILIATION FILE PANEL */}
      {showCensusPanel && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', background: '#f4f5f7' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#172b4d', marginBottom: '4px', fontWeight: 600 }}>
            Verify rounds census checklist sheet
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginBottom: '16px' }}>
            Upload the physical rounds checklist image. Medico OCR will scan it and check for digital discrepancies instantly.
          </p>
          <form onSubmit={handleCensusUpload} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <input 
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => e.target.files && setCensusFile(e.target.files[0])}
              style={{
                color: '#172b4d',
                background: '#ffffff',
                border: '1px solid #dfe1e6',
                padding: '6px 12px',
                borderRadius: '3px',
                fontSize: '0.8rem'
              }}
            />
            <button 
              type="submit" 
              className="btn" 
              disabled={uploadingCensus || !censusFile}
            >
              {uploadingCensus ? 'Scanning Image OCR...' : 'Run Sync & Reconciliation'}
            </button>
          </form>
        </div>
      )}

      {/* CENSUS DISCREPANCY WARNING BANNER */}
      {reconciliationResult && reconciliationResult.confirmRequired && reconciliationResult.confirmRequired.length > 0 && (
        <div className="glass-panel" style={{
          borderColor: 'var(--color-warning)',
          background: '#fffae6',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#ff8b00', marginBottom: '4px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
            ⚠️ EMR Discrepancies Detected during Physical Rounds
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginBottom: '12px' }}>
            The following patients active in EMR database were **not detected** in the physical rounds checklist sheet.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reconciliationResult.confirmRequired.map((p: any) => (
              <div key={p.id} className="glass-panel" style={{
                background: '#ffffff',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '0.8rem' }}>
                  <strong style={{ color: '#172b4d' }}>{p.name}</strong> (MRN: {p.mrn}) — Last Bed: <span style={{ color: '#0052cc', fontWeight: 600 }}>{p.bed}</span>
                  <div style={{ fontSize: '0.7rem', color: '#8993a4', marginTop: '2px' }}>{p.reason}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleResolveStatus(p.id, p.status)}>
                    Confirm Bed
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleResolveStatus(p.id, 'WARD')}>
                    Move to Ward
                  </button>
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#36b37e' }} onClick={() => handleResolveStatus(p.id, 'DISCHARGED')}>
                    Discharge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JIRA KANBAN BOARD */}
      <div className="kanban-board">
        
        {/* ADMITTED / WARD COLUMN */}
        <div 
          className={`kanban-column ${dragOverColumn === 'ADMITTED' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'ADMITTED')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'ADMITTED')}
        >
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <span>Ward Board</span>
              <span className="kanban-column-badge">{admittedPatients.length}</span>
            </div>
            {user?.role !== 'SPECIALIST' && (
              <button 
                style={{ background: 'none', border: 'none', color: '#5e6c84', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => handleAdmitClick('WARD')}
                title="Admit to Ward"
              >
                ＋
              </button>
            )}
          </div>
          
          <div className="kanban-cards-container">
            {admittedPatients.map(p => (
              <div 
                key={p.id} 
                className="kanban-card"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onClick={() => selectPatientById(p.id)}
              >
                <div className="kanban-card-header">
                  <div className="kanban-card-title">{p.name}</div>
                  <span className="kanban-card-bed ward">{p.bed || 'No Bed'}</span>
                </div>
                <div className="kanban-card-info">
                  <span>{p.age}yo {p.gender}</span>
                </div>
                {renderComorbidityTags(p.comorbidities)}
                {getCardWarnings(p).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    {getCardWarnings(p).map((w, idx) => (
                      <div key={idx} className="kanban-card-warning-item">⚠️ {w}</div>
                    ))}
                  </div>
                )}
                
                <div className="kanban-card-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Ward issue type: green circle/square */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#36b37e">
                      <rect width="24" height="24" rx="2"/>
                    </svg>
                    <span style={{ fontSize: '0.7rem', color: '#5e6c84', fontWeight: 600 }}>{p.mrn}</span>
                  </div>
                  {/* Assigned clinician avatar */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: p.name.includes('Amit') ? '#36b37e' : '#0052cc',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700
                  }} title={p.name.includes('Amit') ? 'Dr. Shalini' : 'Dr. Deepak Bhasin'}>
                    {p.name.includes('Amit') ? 'SP' : 'DB'}
                  </div>
                </div>
              </div>
            ))}
            {admittedPatients.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8993a4', fontSize: '0.75rem', padding: '16px 0', border: '1px dashed #dfe1e6', borderRadius: '3px' }}>
                No ward patients.
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE CARE / ICU COLUMN */}
        <div 
          className={`rose-column kanban-column ${dragOverColumn === 'ACTIVE_CARE' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'ACTIVE_CARE')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'ACTIVE_CARE')}
        >
          <div className="kanban-column-header">
            <div className="kanban-column-title" style={{ color: '#de350b' }}>
              <span>Active Care (ICU)</span>
              <span className="kanban-column-badge" style={{ background: '#ffebe6', color: '#de350b' }}>{activeCarePatients.length}</span>
            </div>
            {user?.role !== 'SPECIALIST' && (
              <button 
                style={{ background: 'none', border: 'none', color: '#de350b', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}
                onClick={() => handleAdmitClick('ICU')}
                title="Admit to ICU"
              >
                ＋
              </button>
            )}
          </div>

          <div className="kanban-cards-container">
            {activeCarePatients.map(p => (
              <div 
                key={p.id} 
                className="kanban-card"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onClick={() => selectPatientById(p.id)}
                style={{ borderLeft: '3px solid #ff5630' }}
              >
                <div className="kanban-card-header">
                  <div className="kanban-card-title">{p.name}</div>
                  <span className="kanban-card-bed icu">{p.bed || 'No Bed'}</span>
                </div>
                <div className="kanban-card-info">
                  <span>{p.age}yo {p.gender}</span>
                </div>
                {renderComorbidityTags(p.comorbidities)}
                {getCardWarnings(p).length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    {getCardWarnings(p).map((w, idx) => (
                      <div key={idx} className="kanban-card-warning-item">⚠️ {w}</div>
                    ))}
                  </div>
                )}
                
                <div className="kanban-card-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* ICU issue type: red square */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff5630">
                      <rect width="24" height="24" rx="2"/>
                    </svg>
                    <span style={{ fontSize: '0.7rem', color: '#5e6c84', fontWeight: 600 }}>{p.mrn}</span>
                  </div>
                  {/* ICU is nurse assigned primarily */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ffab00',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700
                  }} title="Nurse Harpal Singh">
                    HS
                  </div>
                </div>
              </div>
            ))}
            {activeCarePatients.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8993a4', fontSize: '0.75rem', padding: '16px 0', border: '1px dashed #dfe1e6', borderRadius: '3px' }}>
                No ICU patients.
              </div>
            )}
          </div>
        </div>

        {/* IN REVIEW COLUMN */}
        <div 
          className={`kanban-column ${dragOverColumn === 'IN_REVIEW' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'IN_REVIEW')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'IN_REVIEW')}
        >
          <div className="kanban-column-header">
            <div className="kanban-column-title" style={{ color: '#ffab00' }}>
              <span>In Review</span>
              <span className="kanban-column-badge" style={{ background: '#fffae6', color: '#ffab00' }}>{inReviewPatients.length}</span>
            </div>
          </div>

          <div className="kanban-cards-container">
            {inReviewPatients.map(p => (
              <div 
                key={p.id} 
                className="kanban-card"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onClick={() => selectPatientById(p.id)}
                style={{ borderLeft: '3px solid #ffab00', background: '#fffae6' }}
              >
                <div className="kanban-card-header">
                  <div className="kanban-card-title">{p.name}</div>
                  <span className="kanban-card-bed none">{p.bed || 'No Bed'}</span>
                </div>
                <div className="kanban-card-info">
                  <span>{p.age}yo {p.gender}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#de350b', fontWeight: 'bold', margin: '4px 0 8px 0' }}>
                  🚨 Discrepancy: Missing from checklist
                </div>
                {renderComorbidityTags(p.comorbidities)}
                
                <div className="kanban-card-actions">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Discrepancy issue type: orange triangle */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffab00">
                      <path d="M12 2L2 22h20L12 2z"/>
                    </svg>
                    <span style={{ fontSize: '0.7rem', color: '#5e6c84', fontWeight: 600 }}>{p.mrn}</span>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={(e) => {
                    e.stopPropagation();
                    executeResolveStatus(p.id, p.bed?.startsWith('ICU') ? 'ACTIVE_CARE' : 'ADMITTED');
                  }}>
                    Confirm bed
                  </button>
                </div>
              </div>
            ))}
            {inReviewPatients.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8993a4', fontSize: '0.75rem', padding: '16px 0', border: '1px dashed #dfe1e6', borderRadius: '3px' }}>
                No active discrepancies.
              </div>
            )}
          </div>
        </div>

        {/* DONE / DISCHARGED COLUMN */}
        <div 
          className={`kanban-column ${dragOverColumn === 'DONE' ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'DONE')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'DONE')}
        >
          <div className="kanban-column-header">
            <div className="kanban-column-title" style={{ color: '#36b37e' }}>
              <span>Done (Discharged)</span>
              <span className="kanban-column-badge" style={{ background: '#e3fcef', color: '#006644' }}>{donePatients.length}</span>
            </div>
          </div>

          <div className="kanban-cards-container">
            {donePatients.map(p => (
              <div 
                key={p.id} 
                className="kanban-card"
                onClick={() => selectPatientById(p.id)}
                style={{ opacity: 0.75, borderLeft: '3px solid #36b37e' }}
              >
                <div className="kanban-card-header">
                  <div className="kanban-card-title" style={{ textDecoration: 'line-through' }}>{p.name}</div>
                  <span className="kanban-card-bed none" style={{ background: '#e3fcef', color: '#006644' }}>Discharged</span>
                </div>
                <div className="kanban-card-info">
                  <span>MRN: {p.mrn}</span>
                </div>
                {p.dischargeDate && (
                  <div style={{ fontSize: '0.7rem', color: '#5e6c84', marginTop: '4px' }}>
                    Discharged: {new Date(p.dischargeDate).toLocaleDateString()}
                  </div>
                )}
                
                <div className="kanban-card-actions" style={{ borderTop: 'none', paddingTop: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Discharged checkmark circle */}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#36b37e">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span style={{ fontSize: '0.7rem', color: '#8993a4' }}>Discharged ✓</span>
                  </div>
                </div>
              </div>
            ))}
            {donePatients.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8993a4', fontSize: '0.75rem', padding: '32px 0', border: '1px dashed #dfe1e6', borderRadius: '3px' }}>
                No discharged patients. Drag here to discharge.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ADMIT PATIENT MODAL */}
      {showAdmitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 30, 66, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '24px',
            background: '#ffffff'
          }}>
            <h3 style={{ marginBottom: '16px', color: '#172b4d', fontSize: '1.2rem', fontWeight: 600 }}>
              Admit New Patient to {admitDept}
            </h3>
            
            <form onSubmit={handleAdmitSubmit}>
              <div className="form-group">
                <label className="form-label">MRN (Medical Record Number) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. MRN-882194"
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Rajinder Nath Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Age *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 81"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender *</label>
                  <select 
                    className="form-input"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Bed *</label>
                <select 
                  className="form-input"
                  value={selectedBedNum}
                  onChange={(e) => setSelectedBedNum(e.target.value)}
                  required
                >
                  {(admitDept === 'ICU' ? emptyIcuBeds : emptyWardBeds).map(b => (
                    <option key={b.bedNumber} value={b.bedNumber}>{b.bedNumber}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Comorbidities & Clinical Assessment Notes</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="e.g. CAD, CKD, post-CABG..."
                  rows={3}
                  value={comorbidities}
                  onChange={(e) => setComorbidities(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1 }}
                  onClick={() => setShowAdmitModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn"
                  style={{ flexGrow: 1 }}
                >
                  Admit Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER / BED ALLOCATION MODAL */}
      {showTransferModal && transferPatient && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 30, 66, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            maxWidth: '450px',
            width: '100%',
            padding: '24px',
            background: '#ffffff'
          }}>
            <h3 style={{ marginBottom: '8px', color: '#172b4d', fontSize: '1.1rem', fontWeight: 600 }}>
              Assign bed for {transferPatient.name}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginBottom: '16px' }}>
              Select an available {transferTargetDept} bed to transfer patient from {transferPatient.bed || 'No Bed'}.
            </p>
            
            <form onSubmit={handleTransferSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Available {transferTargetDept} Beds</label>
                <select 
                  className="form-input"
                  value={targetBedNum}
                  onChange={(e) => setTargetBedNum(e.target.value)}
                  required
                >
                  {(transferTargetDept === 'ICU' ? emptyIcuBeds : emptyWardBeds).map(b => (
                    <option key={b.bedNumber} value={b.bedNumber}>{b.bedNumber}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1 }}
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferPatient(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn"
                  style={{ flexGrow: 1 }}
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
