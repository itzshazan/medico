import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import type { ClinicalEvent } from '../context/AppContext';

export const PatientPortal: React.FC<{ subView?: 'dashboard' | 'timeline' | 'copilot' | 'care-team' | 'discharge' | 'billing' }> = ({ subView = 'timeline' }) => {
  const { activePatient, apiBaseUrl, user, addNotification, refreshAllData, selectPatientById, apiKey } = useApp();
  const isPatient = user?.role === 'PATIENT';
  
  // Tab within portal
  const [activeTab, setActiveTab] = useState<'narrative' | 'copilot' | 'discharge'>('narrative');

  // Intake State
  const [textInput, setTextInput] = useState('');
  const [modality, setModality] = useState<'TEXT' | 'VOICE' | 'DOCUMENT'>('TEXT');
  const [provenanceText, setProvenanceText] = useState('Daily Progress Note');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingesting, setIngesting] = useState(false);

  // Active Ledger view states
  const [medsLedger, setMedsLedger] = useState<any[]>([]);
  const [labsLedger, setLabsLedger] = useState<any[]>([]);
  const [procsLedger, setProcsLedger] = useState<any[]>([]);
  
  // Timeline filter states
  const [filterType, setFilterType] = useState<string>('ALL');

  // Safety & Alerts States
  const [safetyAlerts, setSafetyAlerts] = useState<any[]>([]);
  const [missingChecks, setMissingChecks] = useState<any[]>([]);
  const [safetyLoading, setSafetyLoading] = useState(false);

  // Copilot Chat States
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ q: string; a: string; sources: any[] }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Editing Narrative states
  const [editCoH, setEditCoH] = useState('');
  const [editMeds, setEditMeds] = useState('');
  const [editLabs, setEditLabs] = useState('');
  const [editProcs, setEditProcs] = useState('');
  const [savingNarrative, setSavingNarrative] = useState(false);

  // Final Discharge compilation state
  const [dischargeDoc, setDischargeDoc] = useState<any>(null);
  const [adviceText, setAdviceText] = useState('Avoid strenuous physical activity, consult Pulmonology OPD if symptoms return.');
  const [followUpDate, setFollowUpDate] = useState('1 week from discharge in Pulmonology OPD.');
  const [prognosisText, setPrognosisText] = useState('Stable clinical course, guarded prognosis.');
  const [compilingDischarge, setCompilingDischarge] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceLang, setVoiceLang] = useState('en-US');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const durationIntervalRef = useRef<any>(null);

  const LANGUAGES = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
    { code: 'mr-IN', label: 'मराठी (Marathi)' },
    { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
    { code: 'te-IN', label: 'తెలుగు (Telugu)' },
    { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
    { code: 'bn-IN', label: 'বাংলা (Bengali)' },
    { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
    { code: 'es-ES', label: 'Español (Spanish)' },
    { code: 'de-DE', label: 'Deutsch (German)' },
    { code: 'fr-FR', label: 'Français (French)' }
  ];

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startAudioRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], "dictation.wav", { type: "audio/wav" });
        
        if (fileInputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInputRef.current.files = dataTransfer.files;
          addNotification("Recorded voice dictation attached to memory ledger upload.", "success");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = voiceLang;

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setTextInput(finalTranscript || interimTranscript);
        };

        recognition.onerror = () => {
          console.log("Speech recognition error");
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setTextInput("Transcribing live voice... (Speak clearly into your microphone, audio WAV file is being recorded!)");
      }

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      addNotification("Microphone access denied or not available.", "danger");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    setIsRecording(false);
  };

  // Event editing modal state
  const [editingEvent, setEditingEvent] = useState<ClinicalEvent | null>(null);
  const [editEventData, setEditEventData] = useState<any>(null);
  const [editEventType, setEditEventType] = useState<string>('');

  useEffect(() => {
    if (activePatient && (!activePatient.events || !activePatient.narratives)) {
      selectPatientById(activePatient.id);
    }
  }, [activePatient, selectPatientById]);

  useEffect(() => {
    if (activePatient) {
      // Parse active patient events
      parseLedgers();
      fetchSafetyAlerts();
      
      // Initialize edit narrative textareas
      const nar = activePatient.narratives?.[0];
      if (nar) {
        setEditCoH(nar.courseInHospital || '');
        setEditMeds(nar.medicationJourney || '');
        setEditLabs(nar.investigationJourney || '');
        setEditProcs(nar.procedureJourney || '');
      }
    }
  }, [activePatient]);

  useEffect(() => {
    if (isPatient && activeTab === 'discharge' && activePatient && activePatient.status === 'DONE' && !dischargeDoc && !compilingDischarge) {
      const autoCompile = async () => {
        setCompilingDischarge(true);
        try {
          const res = await fetch(`${apiBaseUrl}/narrative/compile-discharge/${activePatient.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user?.id || 'demo',
              'x-user-name': user?.name || 'Demo User',
              'x-user-role': 'PHYSICIAN'
            },
            body: JSON.stringify({ adviceText, followUpDate, prognosisText })
          });
          const data = await res.json();
          if (res.ok) {
            setDischargeDoc(data.dischargeSummary);
          }
        } catch (e) {
          console.error("Auto-compile discharge summary failed", e);
        } finally {
          setCompilingDischarge(false);
        }
      };
      autoCompile();
    }
  }, [isPatient, activeTab, activePatient, dischargeDoc, compilingDischarge, apiBaseUrl, user, adviceText, followUpDate, prognosisText]);

  const parseLedgers = () => {
    if (!activePatient || !activePatient.events) return;
    
    const events = activePatient.events;
    
    // Parse meds
    const meds = events
      .filter(e => e.eventType === 'MEDICATION')
      .map(e => ({ id: e.id, ...JSON.parse(e.eventData), date: e.timestamp, author: e.authorName, provenance: e.provenance }));
    setMedsLedger(meds);

    // Parse labs
    const labs = events
      .filter(e => e.eventType === 'INVESTIGATION')
      .map(e => ({ id: e.id, ...JSON.parse(e.eventData), date: e.timestamp, author: e.authorName, provenance: e.provenance }));
    setLabsLedger(labs);

    // Parse procedures
    const procs = events
      .filter(e => e.eventType === 'PROCEDURE')
      .map(e => ({ id: e.id, ...JSON.parse(e.eventData), date: e.timestamp, author: e.authorName, provenance: e.provenance }));
    setProcsLedger(procs);
  };

  const fetchSafetyAlerts = async () => {
    if (!activePatient) return;
    setSafetyLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/safety/patient/${activePatient.id}`);
      const data = await res.json();
      if (res.ok) {
        setSafetyAlerts(data.alerts);
        setMissingChecks(data.missingChecks);
      }
    } catch (e) {
      console.error('Failed to fetch safety alerts');
    } finally {
      setSafetyLoading(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !fileInputRef.current?.files?.length) {
      addNotification('Please enter text or select a file to ingest', 'warning');
      return;
    }

    setIngesting(true);
    const formData = new FormData();
    formData.append('textContent', textInput);
    formData.append('sourceModality', modality);
    formData.append('provenance', provenanceText);

    if (fileInputRef.current?.files?.[0]) {
      formData.append('mediaFile', fileInputRef.current.files[0]);
    }

    try {
      const headers: Record<string, string> = {
        'x-user-id': user?.id || 'demo',
        'x-user-name': user?.name || 'Demo User',
        'x-user-role': user?.role || 'PHYSICIAN'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(`${apiBaseUrl}/ingest/patient/${activePatient?.id}`, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        addNotification(`Ingested event successfully. Event type: ${data.event.eventType}`, 'success');
        setTextInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Reload current patient context
        if (activePatient) {
          await selectPatientById(activePatient.id);
        }
      } else {
        addNotification(data.error || 'Failed to ingest data', 'danger');
      }
    } catch (err) {
      addNotification('Error uploading data', 'danger');
    } finally {
      setIngesting(false);
    }
  };

  const handleNarrativeSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'NURSE') {
      addNotification('Nurses do not have permission to edit clinical narratives', 'danger');
      return;
    }

    setSavingNarrative(true);
    try {
      const res = await fetch(`${apiBaseUrl}/narrative/patient/${activePatient?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({
          courseInHospital: editCoH,
          medicationJourney: editMeds,
          investigationJourney: editLabs,
          procedureJourney: editProcs
        })
      });

      if (res.ok) {
        addNotification('Clinical narratives updated and saved to DB.', 'success');
        if (activePatient) {
          await selectPatientById(activePatient.id);
        }
      } else {
        addNotification('Failed to update narratives.', 'danger');
      }
    } catch (e) {
      addNotification('Connection failed while saving narratives.', 'danger');
    } finally {
      setSavingNarrative(false);
    }
  };

  const handleCompileDischarge = async () => {
    if (user?.role === 'NURSE') {
      addNotification('Nurses cannot compile discharge summaries', 'danger');
      return;
    }

    setCompilingDischarge(true);
    try {
      const res = await fetch(`${apiBaseUrl}/narrative/compile-discharge/${activePatient?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ adviceText, followUpDate, prognosisText })
      });

      const data = await res.json();
      if (res.ok) {
        setDischargeDoc(data.dischargeSummary);
        setActiveTab('discharge');
        addNotification('1-Click Discharge Summary compiled successfully!', 'success');
      } else {
        addNotification(data.error || 'Discharge compiler failed', 'danger');
      }
    } catch (e) {
      addNotification('Failed to run Discharge Summary Engine', 'danger');
    } finally {
      setCompilingDischarge(false);
    }
  };

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    setChatLoading(true);
    const userQuery = chatQuery;
    setChatQuery('');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(`${apiBaseUrl}/narrative/copilot/${activePatient?.id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: userQuery,
          history: chatHistory.map(item => ({ q: item.q, a: item.a }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        setChatHistory(prev => [...prev, { q: userQuery, a: data.answer, sources: data.sources || [] }]);
      } else {
        addNotification('Copilot failed to answer query.', 'danger');
      }
    } catch (e) {
      addNotification('Copilot connection timed out.', 'danger');
    } finally {
      setChatLoading(false);
    }
  };

  const handleEditEventClick = (event: ClinicalEvent) => {
    setEditingEvent(event);
    setEditEventType(event.eventType);
    setEditEventData(JSON.parse(event.eventData));
  };

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'demo',
        'x-user-name': user?.name || 'Demo User',
        'x-user-role': user?.role || 'PHYSICIAN'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(`${apiBaseUrl}/ingest/event/${editingEvent.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          eventType: editEventType,
          eventData: editEventData,
          provenance: editingEvent.provenance
        })
      });

      if (res.ok) {
        addNotification('Event updated successfully. Recalculating clinical narratives...', 'success');
        setEditingEvent(null);
        if (activePatient) {
          await selectPatientById(activePatient.id);
        }
      } else {
        addNotification('Failed to update event ledger', 'danger');
      }
    } catch (e) {
      addNotification('Failed to connect to database', 'danger');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this clinical event from the ledger? This will automatically update all generated narratives.')) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        'x-user-id': user?.id || 'demo',
        'x-user-name': user?.name || 'Demo User',
        'x-user-role': user?.role || 'PHYSICIAN'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(`${apiBaseUrl}/ingest/event/${eventId}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        addNotification('Event deleted from ledger. Narratives rebuilt.', 'success');
        if (activePatient) {
          await selectPatientById(activePatient.id);
        }
      } else {
        addNotification('Failed to delete event', 'danger');
      }
    } catch (e) {
      addNotification('Deletion connection error', 'danger');
    }
  };

  if (!activePatient) return <div className="page-view">No patient selected. Go to Census map.</div>;

  const filteredEvents = activePatient.events?.filter(e => {
    if (filterType === 'ALL') return true;
    return e.eventType === filterType;
  }) || [];

  if (isPatient) {
    return (
      <div className="page-view" style={{ padding: '24px 32px 32px 32px', overflowY: 'auto' }}>
        {subView === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Greeting Header */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(0, 82, 204, 0.05), rgba(38, 132, 255, 0.05))' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0747a6' }}>👋 Welcome, {activePatient.name}</h2>
                <p style={{ margin: '4px 0 0 0', color: '#5e6c84', fontSize: '0.85rem' }}>Your clinical care summary and daily health metrics.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span className="badge" style={{ background: '#e6fcff', color: '#00b8d9', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                  📍 ICU Bed {activePatient.bed || 'Unassigned'}
                </span>
                <span className="badge" style={{ background: '#e3fcef', color: '#006644', padding: '6px 12px', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                  ● Status: {activePatient.status || 'STABLE'}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="dashboard-grid">
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'rgba(222, 53, 11, 0.1)', color: '#de350b' }}>❤️</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>Heart Rate</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#172b4d' }}>78 bpm</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'rgba(0, 82, 204, 0.1)', color: '#0052cc' }}>🫁</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>Oxygen Level (SpO2)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#172b4d' }}>98% <span style={{ fontSize: '0.8rem', color: '#36b37e', fontWeight: 500 }}>Normal</span></div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'rgba(0, 184, 217, 0.1)', color: '#00b8d9' }}>🩺</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>Blood Pressure</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#172b4d' }}>130/80 mmHg</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon" style={{ background: 'rgba(255, 171, 0, 0.1)', color: '#ffab00' }}>🌡️</div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>Body Temp</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#172b4d' }}>98.6 °F</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Clinical Course */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '12px', color: '#0052cc' }}>📝 Clinical Course Summary</h3>
                  <p style={{ fontSize: '0.85rem', color: '#172b4d', lineHeight: '1.5', margin: 0 }}>
                    {activePatient.narratives?.[0]?.courseInHospital || 'No clinical course notes are available yet.'}
                  </p>
                </div>

                {/* Prescriptions */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '12px', color: '#0052cc' }}>💊 Active Prescriptions</h3>
                  {medsLedger.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#5e6c84', margin: 0 }}>No active medications listed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {medsLedger.map((m, idx) => (
                        <div key={idx} style={{ padding: '10px', background: '#fafbfc', border: '1px solid #dfe1e6', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '0.85rem', color: '#172b4d' }}>{m.drugName}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#5e6c84' }}>{m.dose} • {m.route} • {m.freq}</div>
                          </div>
                          <span style={{ fontSize: '0.7rem', background: m.status === 'stopped' ? '#ffebe6' : '#e3fcef', color: m.status === 'stopped' ? '#de350b' : '#006644', padding: '2px 8px', borderRadius: '3px', fontWeight: 600, textTransform: 'uppercase' }}>
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick AI Companion helper */}
              <div className="glass-panel" style={{ 
                padding: '20px', 
                display: 'grid', 
                gridTemplateRows: 'auto auto 1fr auto', 
                gap: '10px', 
                alignSelf: 'stretch',
                boxSizing: 'border-box'
              }}>
                <h3 style={{ fontSize: '0.9rem', margin: 0, color: '#0052cc' }}>🤖 Ask AI Companion</h3>
                <p style={{ fontSize: '0.7rem', color: '#5e6c84', margin: 0 }}>Ask quick questions about your health and ICU stay.</p>
                <div style={{ overflowY: 'auto', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {chatHistory.slice(-2).map((item, idx) => (
                    <div key={idx}>
                      <div style={{ background: '#f4f5f7', padding: '6px 10px', borderRadius: '6px', alignSelf: 'flex-end', display: 'inline-block', maxWidth: '90%', float: 'right', marginBottom: '4px', clear: 'both' }}>{item.q}</div>
                      <div style={{ background: '#deebff', padding: '8px 10px', borderRadius: '6px', display: 'inline-block', width: '100%', float: 'left', marginBottom: '4px', clear: 'both' }}>{item.a}</div>
                    </div>
                  ))}
                  {chatLoading && <div style={{ color: '#5e6c84', fontStyle: 'italic' }}>Thinking...</div>}
                </div>
                <form onSubmit={handleCopilotSubmit} style={{ display: 'flex', gap: '6px', margin: 0 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ask a quick question..." 
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                  />
                  <button type="submit" className="btn" style={{ padding: '4px 8px' }} disabled={chatLoading}>➔</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {subView === 'timeline' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0052cc' }}>
                🗺️ Timeline Explorer & Health Journey
              </h3>
              
              <select 
                className="role-select" 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                <option value="ALL">All Events</option>
                <option value="DIAGNOSIS">Diagnoses</option>
                <option value="MEDICATION">Medications</option>
                <option value="INVESTIGATION">Labs & Vitals</option>
                <option value="PROCEDURE">Procedures</option>
                <option value="CONSULTATION">Consults</option>
                <option value="NOTE">Clinical Notes</option>
              </select>
            </div>

            <div className="interactive-timeline-flow">
              <div className="flow-step active">Admission Assessment</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${medsLedger.length > 0 ? 'active' : ''}`}>Therapy Started</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${procsLedger.length > 0 ? 'active' : ''}`}>Procedures</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${activePatient.status === 'DISCHARGED' || activePatient.status === 'DONE' ? 'active' : ''}`}>Discharge</div>
            </div>

            <div style={{ marginTop: '16px' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#5e6c84' }}>
                  No events match the selected category filter.
                </div>
              ) : (
                <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredEvents.map((event) => {
                    const data = JSON.parse(event.eventData);
                    return (
                      <div key={event.id} className="timeline-event-item" style={{ borderLeft: '3px solid #4c9aff' }}>
                        <div className="timeline-event-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span className="event-type-badge" style={{
                            background: event.eventType === 'DIAGNOSIS' ? 'rgba(239, 68, 68, 0.15)' :
                                        event.eventType === 'MEDICATION' ? 'rgba(0, 242, 254, 0.15)' :
                                        event.eventType === 'INVESTIGATION' ? 'rgba(245, 158, 11, 0.15)' :
                                        'rgba(16, 185, 129, 0.15)',
                            color: event.eventType === 'DIAGNOSIS' ? 'var(--color-danger)' :
                                   event.eventType === 'MEDICATION' ? 'var(--color-cyan)' :
                                   event.eventType === 'INVESTIGATION' ? 'var(--color-warning)' :
                                   'var(--color-success)',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            fontWeight: 700
                          }}>{event.eventType}</span>
                          <span className="event-time" style={{ fontSize: '0.75rem', color: '#5e6c84' }}>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="event-details" style={{ fontSize: '0.85rem', color: '#172b4d' }}>
                          {event.eventType === 'DIAGNOSIS' && (
                            <div><strong>{data.diagnosisName}</strong> ({data.status}) — {data.notes}</div>
                          )}
                          {event.eventType === 'MEDICATION' && (
                            <div><strong>{data.drugName}</strong> {data.dose} ({data.route}) {data.freq} — <span style={{ color: data.status === 'held' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>{data.status.toUpperCase()}</span> ({data.reason})</div>
                          )}
                          {event.eventType === 'INVESTIGATION' && (
                            <div><strong>{data.labName}</strong>: {data.value} {data.unit} — <span style={{ color: data.status.includes('Low') || data.status.includes('High') ? 'var(--color-warning)' : 'var(--text-primary)' }}>{data.status}</span></div>
                          )}
                          {event.eventType === 'PROCEDURE' && (
                            <div><strong>{data.procedureName}</strong> ({data.status}) — {data.notes}</div>
                          )}
                          {event.eventType === 'CONSULTATION' && (
                            <div><strong>{data.specialty}</strong> — {data.notes}</div>
                          )}
                          {event.eventType === 'NOTE' && (
                            <div>{data.noteText}</div>
                          )}
                        </div>
                        <div className="event-provenance" style={{ fontSize: '0.7rem', color: '#8993a4', marginTop: '6px' }}>
                          <span>Source: 📄 {event.provenance} (by {event.authorName})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {subView === 'copilot' && (
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0052cc' }}>
              🤖 AI Care Companion (Clinical Q&A)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginTop: '4px', marginBottom: '16px' }}>
              Ask detailed questions about your clinical parameters, lab results, medications, or plan of care.
            </p>

            <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {chatHistory.length === 0 ? (
                <div style={{ textAlign: 'center', marginTop: '80px', color: '#5e6c84', fontSize: '0.9rem' }}>
                  👋 Ask your care companion a question:
                  <ul style={{ listStyle: 'none', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
                    <li style={{ cursor: 'pointer', color: '#0052cc', fontWeight: 500 }} onClick={() => setChatQuery('Explain my diagnosis in simple terms.')}>"Explain my diagnosis in simple terms."</li>
                    <li style={{ cursor: 'pointer', color: '#0052cc', fontWeight: 500 }} onClick={() => setChatQuery('Why was my Eliquis held?')}>"Why was my Eliquis held?"</li>
                    <li style={{ cursor: 'pointer', color: '#0052cc', fontWeight: 500 }} onClick={() => setChatQuery('What labs are high or abnormal?')}>"What labs are high or abnormal?"</li>
                  </ul>
                </div>
              ) : (
                chatHistory.map((item, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem' }}>
                    <div style={{ background: '#f4f5f7', padding: '8px 12px', borderRadius: '8px', alignSelf: 'flex-end', display: 'inline-block', maxWidth: '80%', float: 'right', marginBottom: '6px', clear: 'both' }}>
                      {item.q}
                    </div>
                    <div style={{ background: '#deebff', border: '1px solid #dfe1e6', padding: '10px 14px', borderRadius: '8px', display: 'inline-block', width: '100%', float: 'left', marginBottom: '8px', clear: 'both' }}>
                      <div>{item.a}</div>
                      {item.sources && item.sources.length > 0 && (
                        <div style={{ marginTop: '8px', borderTop: '1px solid #dfe1e6', paddingTop: '6px', fontSize: '0.7rem', color: '#5e6c84' }}>
                          <strong>Sources</strong>:
                          {item.sources.map((s: any, sIdx: number) => (
                            <div key={sIdx} style={{ marginTop: '2px' }}>
                              🔗 {s.title} ({s.date}) by {s.author}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && <div style={{ fontSize: '0.8rem', color: '#5e6c84' }}>🤖 Clinical RAG searching ledger...</div>}
            </div>

            <form onSubmit={handleCopilotSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ask your care companion..." 
                style={{ flexGrow: 1 }}
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
              />
              <button type="submit" className="btn" style={{ padding: '10px 16px' }} disabled={chatLoading}>
                Send
              </button>
            </form>
          </div>
        )}

        {subView === 'care-team' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0052cc' }}>👥 Your Attending Care Team</h3>
            <p style={{ fontSize: '0.8rem', color: '#5e6c84', marginTop: '4px', marginBottom: '20px' }}>These healthcare professionals are managing your treatment and recovery.</p>
            
            <div className="care-team-grid">
              <div className="care-card">
                <div className="care-avatar" style={{ background: '#0052cc' }}>DR</div>
                <strong style={{ fontSize: '1rem', color: '#172b4d' }}>Dr. Deepak R.</strong>
                <span style={{ fontSize: '0.75rem', color: '#0052cc', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Attending Physician</span>
                <p style={{ fontSize: '0.75rem', color: '#5e6c84', margin: '8px 0 0 0' }}>Specialty: Pulmonology & Critical Care. Directs your general plan of care and ICU stay.</p>
              </div>
              
              <div className="care-card">
                <div className="care-avatar" style={{ background: '#ffab00' }}>HS</div>
                <strong style={{ fontSize: '1rem', color: '#172b4d' }}>Nurse Harpal S.</strong>
                <span style={{ fontSize: '0.75rem', color: '#ffab00', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Primary Care Nurse</span>
                <p style={{ fontSize: '0.75rem', color: '#5e6c84', margin: '8px 0 0 0' }}>Specialty: ICU Critical Care Nursing. Handles medication administration and bedside monitoring.</p>
              </div>

              <div className="care-card">
                <div className="care-avatar" style={{ background: '#36b37e' }}>SK</div>
                <strong style={{ fontSize: '1rem', color: '#172b4d' }}>Dr. Shalini K.</strong>
                <span style={{ fontSize: '0.75rem', color: '#36b37e', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px' }}>Consulting Specialist</span>
                <p style={{ fontSize: '0.75rem', color: '#5e6c84', margin: '8px 0 0 0' }}>Specialty: Nephrology. Manages your kidney function and coordinates maintenance hemodialysis.</p>
              </div>
            </div>
          </div>
        )}

        {subView === 'discharge' && (
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#36b37e', marginBottom: '16px' }}>
              📋 Your Discharge Summary & Advice
            </h3>
            {compilingDischarge ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5e6c84' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🔄</div>
                <p style={{ fontSize: '0.85rem' }}>Compiling official discharge summary...</p>
              </div>
            ) : dischargeDoc ? (
              <div style={{ fontSize: '0.85rem' }}>
                <div className="glass-panel" style={{ background: '#fafbfc', padding: '20px', border: '1px solid #dfe1e6', borderRadius: '6px', maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #ebecf0', paddingBottom: '12px', marginBottom: '16px' }}>
                    <strong style={{ fontSize: '1rem', color: '#172b4d' }}>{dischargeDoc.hospitalHeader.institution}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#5e6c84' }}>{dischargeDoc.hospitalHeader.department}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#36b37e', marginTop: '8px' }}>OFFICIAL DISCHARGE CERTIFICATE</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.75rem', borderBottom: '1px solid #dfe1e6', paddingBottom: '12px' }}>
                    <div>
                      <strong>Patient Name</strong>: {dischargeDoc.patientInfo.name}<br/>
                      <strong>MRN</strong>: {dischargeDoc.patientInfo.mrn} • <strong>Age/Gender</strong>: {dischargeDoc.patientInfo.age} / {dischargeDoc.patientInfo.gender}
                    </div>
                    <div>
                      <strong>Admitted</strong>: {new Date(dischargeDoc.patientInfo.admissionDate).toLocaleDateString()}<br/>
                      <strong>Discharged</strong>: {new Date(dischargeDoc.patientInfo.dischargeDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>1. Diagnoses Reconciled:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px' }}>
                        {dischargeDoc.sections.diagnoses.map((d: string, i: number) => (
                          <div key={i}>• {d}</div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>2. Hospital Course Summary:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px', lineHeight: '1.4' }}>{dischargeDoc.sections.courseInHospital}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>3. Discharge Medications:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px', whiteSpace: 'pre-line', lineHeight: '1.4' }}>{dischargeDoc.sections.dischargeMedications}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>4. Procedures Completed:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px' }}>{dischargeDoc.sections.procedures}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>5. Patient Advice & Instructions:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px', lineHeight: '1.4' }}>{dischargeDoc.sections.advice}</div>
                    </div>

                    <div>
                      <strong style={{ color: '#0747a6', fontSize: '0.8rem' }}>6. Follow Up Clinic Appointment:</strong>
                      <div style={{ fontSize: '0.75rem', paddingLeft: '12px', marginTop: '4px' }}>{dischargeDoc.sections.followUp}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#5e6c84' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔒</div>
                <p style={{ fontSize: '0.85rem' }}>No official discharge summary has been certified by your attending physician yet.</p>
                <p style={{ fontSize: '0.75rem', color: '#8993a4' }}>Once certified, your discharge documentation and instructions will appear here.</p>
              </div>
            )}
          </div>
        )}

        {subView === 'billing' && (
          <div className="billing-container">
            <div className="billing-invoice">
              <div className="invoice-header">
                <div>
                  <h2 style={{ margin: 0, color: '#0052cc' }}>Medico Hospital</h2>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginTop: '2px' }}>Clinical Billing & Invoice Department</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#172b4d' }}>INVOICE</strong>
                  <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginTop: '2px' }}>Invoice ID: INV-2026-9482<br/>Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.8rem' }}>
                <div>
                  <strong>Billed To:</strong><br/>
                  {activePatient.name}<br/>
                  MRN: {activePatient.mrn}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Insurance Provider:</strong><br/>
                  Blue Cross Blue Shield EMR Core<br/>
                  Policy ID: BCBS-EMR-88294
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <div style={{ borderBottom: '2px solid #ebecf0', paddingBottom: '8px', fontWeight: 600, fontSize: '0.85rem', color: '#5e6c84', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Description of Charge</span>
                  <span>Amount</span>
                </div>

                <div className="invoice-row">
                  <span>ICU Room Charge (3 Days @ $1,500/day)</span>
                  <span>$4,500.00</span>
                </div>
                <div className="invoice-row">
                  <span>Laboratory Services (Blood panels, Creatinine/Hb tests)</span>
                  <span>$120.00</span>
                </div>
                <div className="invoice-row">
                  <span>Radiological Imaging (Chest CT Scan)</span>
                  <span>$450.00</span>
                </div>
                <div className="invoice-row">
                  <span>Pharmacy & Medication Charges (Solu-Medrol, IV solutions)</span>
                  <span>$350.00</span>
                </div>

                <div className="invoice-total">
                  <span>Total Hospital Charges:</span>
                  <span>$5,420.00</span>
                </div>

                <div className="invoice-row" style={{ color: '#006644', borderBottom: 'none', fontWeight: 600 }}>
                  <span>Insurance Covered (90%):</span>
                  <span>-$4,878.00</span>
                </div>

                <div className="invoice-total" style={{ borderTop: '2px solid #0052cc', fontSize: '1.2rem', color: '#de350b' }}>
                  <span>Patient Responsibility (Copay):</span>
                  <span>$542.00</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn" style={{ padding: '10px 24px', fontSize: '0.9rem', background: '#de350b' }} onClick={() => addNotification('Bill paid successfully via linked insurance portal!', 'success')}>
                  💳 Pay Outstanding Copay
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="page-view" style={{ padding: '24px 32px 32px 32px' }}>
      
      {/* 3 COLUMN WORKSPACE */}
      <div className="portal-layout">
        
        {/* COLUMN 1: INGESTION, ACTIVE PRESCRIPTIONS & LABS */}
        <div className="portal-col">
          
          {/* Intake Card */}
          {!isPatient && (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--color-blue)' }}>
                📥 Multimodal Data Intake
              </h3>
              
              <form onSubmit={handleIngestSubmit}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Input Modality</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className={`btn btn-secondary ${modality === 'TEXT' ? 'active' : ''}`}
                      onClick={() => { setModality('TEXT'); setProvenanceText('Daily Progress Note'); }}
                      style={{ flexGrow: 1, padding: '8px 4px', fontSize: '0.8rem', background: modality === 'TEXT' ? 'rgba(59,130,246,0.1)' : 'var(--bg-tertiary)', borderColor: modality === 'TEXT' ? 'var(--color-cyan)' : 'var(--glass-border)' }}
                    >
                      📝 Note
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-secondary ${modality === 'VOICE' ? 'active' : ''}`}
                      onClick={() => { setModality('VOICE'); setProvenanceText('ASR Round Dictation'); }}
                      style={{ flexGrow: 1, padding: '8px 4px', fontSize: '0.8rem', background: modality === 'VOICE' ? 'rgba(59,130,246,0.1)' : 'var(--bg-tertiary)', borderColor: modality === 'VOICE' ? 'var(--color-cyan)' : 'var(--glass-border)' }}
                    >
                      🎤 Voice
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-secondary ${modality === 'DOCUMENT' ? 'active' : ''}`}
                      onClick={() => { setModality('DOCUMENT'); setProvenanceText('Radiology/Lab PDF Scan'); }}
                      style={{ flexGrow: 1, padding: '8px 4px', fontSize: '0.8rem', background: modality === 'DOCUMENT' ? 'rgba(59,130,246,0.1)' : 'var(--bg-tertiary)', borderColor: modality === 'DOCUMENT' ? 'var(--color-cyan)' : 'var(--glass-border)' }}
                    >
                      📂 Document
                    </button>
                  </div>
                </div>

                {modality === 'TEXT' && (
                  <div className="form-group">
                    <label className="form-label">Progress Note Text</label>
                    <textarea 
                      className="form-textarea"
                      rows={4}
                      placeholder="Enter daily progress notes, e.g., 'Started Meropenem 1g IV TDS due to suspected pneumonia...'"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                  </div>
                )}

                {modality === 'VOICE' && (
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Dictate Rounds Logs</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select 
                          value={voiceLang}
                          onChange={(e) => setVoiceLang(e.target.value)}
                          style={{
                            border: '1px solid #dfe1e6',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            background: '#ffffff',
                            color: '#5e6c84',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          disabled={isRecording}
                        >
                          {LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: '0.75rem', color: isRecording ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: isRecording ? 'bold' : 'normal' }}>
                          {isRecording ? `🔴 Recording (${formatDuration(recordingDuration)})` : 'Mic Ready'}
                        </span>
                      </div>
                    </div>
                    <textarea 
                      className="form-textarea"
                      rows={3}
                      placeholder={isRecording ? "Listening to your voice dictation..." : "Type or speak to transcribe rounds dictation..."}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {!isRecording ? (
                        <button 
                          type="button" 
                          className="btn" 
                          onClick={startAudioRecording}
                          style={{ flexGrow: 1, fontSize: '0.75rem', padding: '6px 10px', background: '#de350b', color: '#ffffff' }}
                        >
                          🎙️ Start Recording
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          className="btn" 
                          onClick={stopAudioRecording}
                          style={{ flexGrow: 1, fontSize: '0.75rem', padding: '6px 10px', background: '#36b37e', color: '#ffffff', animation: 'pulse-recording 1.5s infinite' }}
                        >
                          ⏹️ Stop & Keep Note
                        </button>
                      )}
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '6px 8px' }} 
                        onClick={() => setTextInput('Rounds update: Checked labs today, creatinine is down to 2.1. The pulse steroid course is completed today. Antibiotic course continues.')}
                        disabled={isRecording}
                      >
                        Use Sample
                      </button>
                      <input 
                        type="file" 
                        id="voice-file-upload"
                        accept="audio/*" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={() => { 
                          if (fileInputRef.current?.files?.[0]) {
                            setTextInput(prev => prev || `Attached Audio: ${fileInputRef.current?.files?.[0].name}`);
                            addNotification(`Audio file attached: ${fileInputRef.current?.files?.[0].name}`, 'success');
                          }
                        }} 
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '6px 8px' }} 
                        onClick={() => document.getElementById('voice-file-upload')?.click()}
                        disabled={isRecording}
                      >
                        📎 Upload WAV/MP3
                      </button>
                    </div>
                  </div>
                )}

                {modality === 'DOCUMENT' && (
                  <div className="form-group">
                    <label className="form-label">Upload Diagnostic PDF/Image</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      ref={fileInputRef}
                      style={{
                        color: 'var(--text-primary)',
                        background: 'rgba(7, 9, 19, 0.4)',
                        border: '1px solid var(--glass-border)',
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        width: '100%',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                      onChange={() => { if (fileInputRef.current?.files?.[0]) setTextInput(fileInputRef.current.files[0].name) }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flexGrow: 1, fontSize: '0.75rem', padding: '6px' }} onClick={() => setTextInput('Lab report parsed: Hb is 8.0 g/dL, WBC is 11,200/uL, Platelets 175,000/uL.')}>
                        📄 Mock Lab OCR
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ flexGrow: 1, fontSize: '0.75rem', padding: '6px' }} onClick={() => setTextInput('Chest CT Scan shows bilateral consolidations and resolving diffuse infiltrates.')}>
                        📷 Mock Image vector
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group" style={{ marginTop: '8px' }}>
                  <label className="form-label">Provenance Source Label</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={provenanceText}
                    onChange={(e) => setProvenanceText(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }} disabled={ingesting}>
                  {ingesting ? 'AI Clinical Parsing...' : '🔌 Commit to Memory Ledger'}
                </button>
              </form>
            </div>
          )}

          {/* Active Medication Ledger */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              💊 Medication & Antibiotic Ledger
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {medsLedger.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No medications recorded.</div>
              ) : (
                medsLedger.map((m, idx) => (
                  <div key={idx} style={{ 
                    padding: '8px', 
                    borderBottom: '1px solid var(--glass-border)',
                    fontSize: '0.8rem',
                    background: m.status === 'held' ? 'rgba(239, 68, 68, 0.05)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <strong>{m.drugName}</strong> {m.dose} ({m.route})
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                        Freq: {m.freq} • {m.provenance}
                      </div>
                    </div>
                    <span className="event-type-badge" style={{
                      background: m.status === 'started' ? 'rgba(16, 185, 129, 0.15)' : m.status === 'held' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      color: m.status === 'started' ? 'var(--color-success)' : m.status === 'held' ? 'var(--color-danger)' : 'var(--text-muted)'
                    }}>{m.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Labs Trend Visualizer */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              📈 Lab Biometrics Journey
            </h4>
            {labsLedger.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No investigations logged.</div>
            ) : (
              <div>
                <div style={{ fontSize: '0.8rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Creatinine Trend:</span>
                  <span style={{ color: 'var(--color-cyan)', fontWeight: 'bold' }}>
                    {labsLedger.filter(l => l.labName === 'Creatinine').map(l => `${l.value} mg/dL`).join(' ➔ ') || 'No data'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hemoglobin (Hb):</span>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>
                    {labsLedger.filter(l => l.labName === 'Hemoglobin (Hb)').map(l => `${l.value} g/dL`).join(' ➔ ') || 'No data'}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* COLUMN 2: TIMELINE EXPLORER & CITATION LINKS */}
        <div className="portal-col" style={{ flexGrow: 1 }}>
          
          <div className="glass-panel" style={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                🗺️ Timeline Explorer & Context Assembler
              </h3>
              
              {/* Event category filter */}
              <select 
                className="role-select" 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                <option value="ALL">All Events</option>
                <option value="DIAGNOSIS">Diagnoses</option>
                <option value="MEDICATION">Medications</option>
                <option value="INVESTIGATION">Labs & Vitals</option>
                <option value="PROCEDURE">Procedures</option>
                <option value="CONSULTATION">Consults</option>
                <option value="NOTE">Clinical Notes</option>
              </select>
            </div>

            {/* Horizontal Timeline Indicator */}
            <div className="interactive-timeline-flow">
              <div className="flow-step active">Admission Assessment</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${medsLedger.length > 0 ? 'active' : ''}`}>Therapy Started</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${procsLedger.length > 0 ? 'active' : ''}`}>Procedures</div>
              <div className="flow-arrow">➔</div>
              <div className={`flow-step ${activePatient.status === 'DISCHARGED' || activePatient.status === 'DONE' ? 'active' : ''}`}>Discharge</div>
            </div>

            {/* Event list */}
            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '420px', marginTop: '12px' }}>
              {filteredEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No events match the selected category filter.
                </div>
              ) : (
                <div className="timeline-list">
                  {filteredEvents.map((event) => {
                    const data = JSON.parse(event.eventData);
                    return (
                      <div key={event.id} className={`timeline-event-item ${event.eventType.toLowerCase()}`}>
                        <div className="timeline-event-header">
                          <span className="event-type-badge" style={{
                            background: event.eventType === 'DIAGNOSIS' ? 'rgba(239, 68, 68, 0.15)' :
                                        event.eventType === 'MEDICATION' ? 'rgba(0, 242, 254, 0.15)' :
                                        event.eventType === 'INVESTIGATION' ? 'rgba(245, 158, 11, 0.15)' :
                                        'rgba(16, 185, 129, 0.15)',
                            color: event.eventType === 'DIAGNOSIS' ? 'var(--color-danger)' :
                                   event.eventType === 'MEDICATION' ? 'var(--color-cyan)' :
                                   event.eventType === 'INVESTIGATION' ? 'var(--color-warning)' :
                                   'var(--color-success)'
                          }}>{event.eventType}</span>
                          
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                            {user?.role !== 'NURSE' && !isPatient && (
                              <>
                                <button style={{ background: 'none', border: 'none', color: 'var(--color-blue)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleEditEventClick(event)}>✏️</button>
                                <button style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleDeleteEvent(event.id)}>🗑️</button>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="event-details">
                          {event.eventType === 'DIAGNOSIS' && (
                            <div>
                              <strong>{data.diagnosisName}</strong> ({data.status}) — {data.notes}
                            </div>
                          )}
                          {event.eventType === 'MEDICATION' && (
                            <div>
                              <strong>{data.drugName}</strong> {data.dose} ({data.route}) {data.freq} — <span style={{ color: data.status === 'held' ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 'bold' }}>{data.status.toUpperCase()}</span> ({data.reason})
                            </div>
                          )}
                          {event.eventType === 'INVESTIGATION' && (
                            <div>
                              <strong>{data.labName}</strong>: {data.value} {data.unit} — <span style={{ color: data.status.includes('Low') || data.status.includes('High') ? 'var(--color-warning)' : 'var(--text-primary)' }}>{data.status}</span>
                            </div>
                          )}
                          {event.eventType === 'PROCEDURE' && (
                            <div>
                              <strong>{data.procedureName}</strong> ({data.status}) — {data.notes}
                            </div>
                          )}
                          {event.eventType === 'CONSULTATION' && (
                            <div>
                              <strong>{data.specialty}</strong> — {data.notes}
                            </div>
                          )}
                          {event.eventType === 'NOTE' && (
                            <div>
                              {data.noteText}
                            </div>
                          )}
                        </div>

                        <div className="event-provenance">
                          <span>Provenance: 📄 {event.provenance}</span>
                          <span>• Logged by: {event.authorName} ({event.authorRole})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* COLUMN 3: CLINICAL NARRATIVES, SAFETY TASKS, OR COPILOT */}
        <div className="portal-col">
          
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
            <button 
              className={`btn btn-secondary`}
              onClick={() => setActiveTab('narrative')}
              style={{ flexGrow: 1, padding: '10px 4px', fontSize: '0.8rem', background: activeTab === 'narrative' ? 'rgba(0,242,254,0.1)' : 'none', borderColor: activeTab === 'narrative' ? 'var(--color-cyan)' : 'transparent', color: activeTab === 'narrative' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              ✍️ Course Narrative
            </button>
            <button 
              className={`btn btn-secondary`}
              onClick={() => setActiveTab('copilot')}
              style={{ flexGrow: 1, padding: '10px 4px', fontSize: '0.8rem', background: activeTab === 'copilot' ? 'rgba(0,242,254,0.1)' : 'none', borderColor: activeTab === 'copilot' ? 'var(--color-cyan)' : 'transparent', color: activeTab === 'copilot' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              🤖 Copilot Q&A
            </button>
            <button 
              className={`btn btn-secondary`}
              onClick={() => setActiveTab('discharge')}
              style={{ flexGrow: 1, padding: '10px 4px', fontSize: '0.8rem', background: activeTab === 'discharge' ? 'rgba(0,242,254,0.1)' : 'none', borderColor: activeTab === 'discharge' ? 'var(--color-cyan)' : 'transparent', color: activeTab === 'discharge' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              📄 Discharge doc
            </button>
          </div>

          {/* TAB 1: NARRATIVE PROSE EDITING & SAFETY CHECKS */}
          {activeTab === 'narrative' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Safety Alerts panel */}
              <div className="glass-panel" style={{ padding: '20px', borderColor: safetyAlerts.length > 0 ? 'var(--color-neon-red)' : 'var(--glass-border)' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: safetyAlerts.length > 0 ? 'var(--color-neon-red)' : 'var(--text-primary)' }}>
                  🛡️ Validation & Safety alerts
                </h4>
                
                {safetyLoading ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Running safety audit checks...</div>
                ) : (
                  <div>
                    {safetyAlerts.length === 0 && missingChecks.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                        ✓ All safety checks passed. No contradictions or dosage errors.
                      </div>
                    ) : (
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {safetyAlerts.map((a, idx) => (
                          <div key={idx} className={`safety-card ${a.severity === 'CRITICAL' ? 'critical' : ''}`}>
                            <div className="safety-card-title">
                              {a.severity === 'CRITICAL' ? '🛑' : '⚠️'} {a.type}: {a.message}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              <strong>Action</strong>: {a.suggestedAction}
                            </div>
                          </div>
                        ))}
                        {missingChecks.map((m, idx) => (
                          <div key={idx} className="safety-card" style={{ borderLeftColor: 'var(--color-warning)' }}>
                            <div className="safety-card-title">✍️ Missing {m.section} info</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isPatient ? (
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--color-blue)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '4px' }}>🏥 Your Care Journey Summary</h4>
                  <div>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Hospital Stay Course</strong>
                    <p style={{ fontSize: '0.825rem', marginTop: '6px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{editCoH || "No stay narrative summarized yet."}</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Medications Summary</strong>
                    <p style={{ fontSize: '0.825rem', marginTop: '6px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{editMeds || "No medications summary recorded yet."}</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Diagnostics Summary</strong>
                    <p style={{ fontSize: '0.825rem', marginTop: '6px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{editLabs || "No diagnostic labs summary recorded yet."}</p>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyItems: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem' }}>Continuous Narratives Drafting</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Updated dynamically</span>
                  </div>
                  
                  <form onSubmit={handleNarrativeSave}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Course in Hospital Narrative</label>
                      <textarea 
                        className="form-textarea"
                        rows={5}
                        value={editCoH}
                        onChange={(e) => setEditCoH(e.target.value)}
                        disabled={user?.role === 'NURSE'}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Medications Journey Summary</label>
                      <textarea 
                        className="form-textarea"
                        rows={3}
                        value={editMeds}
                        onChange={(e) => setEditMeds(e.target.value)}
                        disabled={user?.role === 'NURSE'}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Lab Investigation Trends</label>
                      <textarea 
                        className="form-textarea"
                        rows={3}
                        value={editLabs}
                        onChange={(e) => setEditLabs(e.target.value)}
                        disabled={user?.role === 'NURSE'}
                      />
                    </div>

                    {user?.role !== 'NURSE' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" className="btn btn-secondary" style={{ flexGrow: 1 }} disabled={savingNarrative}>
                          {savingNarrative ? 'Saving...' : '💾 Save Draft'}
                        </button>
                        <button type="button" className="btn" style={{ flexGrow: 1 }} onClick={handleCompileDischarge} disabled={compilingDischarge}>
                          ⚡ 1-Click Discharge
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', textAlign: 'center' }}>
                        🔒 Narrative editing restricted to Physicians / Specialists.
                      </div>
                    )}
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: CLINICAL COPILOT RAG CHAT */}
          {activeTab === 'copilot' && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '530px' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--color-blue)' }}>
                🤖 Source-Aware Clinical Copilot
              </h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Ask questions about this patient's admission chronology, lab metrics, or medication logic.
              </p>

              {/* Chat window */}
              <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                {chatHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    👋 Ask me anything, e.g.:
                    <ul style={{ listStyle: 'none', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li style={{ cursor: 'pointer', color: 'var(--color-cyan)' }} onClick={() => setChatQuery('Why Eliquis held?')}>"Why Eliquis held?"</li>
                      <li style={{ cursor: 'pointer', color: 'var(--color-cyan)' }} onClick={() => setChatQuery('Why ICU transfer?')}>"Why ICU transfer?"</li>
                      <li style={{ cursor: 'pointer', color: 'var(--color-cyan)' }} onClick={() => setChatQuery('What is the creatinine trend?')}>"What is the creatinine trend?"</li>
                    </ul>
                  </div>
                ) : (
                  chatHistory.map((item, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem' }}>
                      {/* Question */}
                      <div style={{ background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '8px', alignSelf: 'flex-end', display: 'inline-block', maxWidth: '85%', float: 'right', marginBottom: '6px', clear: 'both' }}>
                        {item.q}
                      </div>
                      {/* Answer */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', padding: '10px 14px', borderRadius: '8px', display: 'inline-block', width: '100%', float: 'left', marginBottom: '8px', clear: 'both' }}>
                        <div>{item.a}</div>
                        {item.sources && item.sources.length > 0 && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <strong>Sources</strong>:
                            {item.sources.map((s: any, sIdx: number) => (
                              <div key={sIdx} style={{ marginTop: '2px' }}>
                                🔗 {s.title} ({s.date}) by {s.author}: <i>"{s.text}"</i>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🤖 Clinical RAG searching ledger...</div>}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleCopilotSubmit} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ask copilot..." 
                  style={{ flexGrow: 1 }}
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                />
                <button type="submit" className="btn" style={{ padding: '10px' }} disabled={chatLoading}>
                  ➔
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: DISCHARGE SUMMARY FINAL CERTIFICATE */}
          {activeTab === 'discharge' && (
            <div className="glass-panel" style={{ padding: '20px', height: '530px', overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-success)' }}>
                📄 Final Discharge Summary Compiler
              </h4>
              
              {isPatient ? (
                compilingDischarge ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '12px' }}>🔄</div>
                    <p style={{ fontSize: '0.85rem' }}>Compiling official discharge summary...</p>
                  </div>
                ) : dischargeDoc ? (
                  <div style={{ fontSize: '0.85rem' }}>
                    {/* Preview compiled document */}
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', marginBottom: '16px', maxHeight: '420px', overflowY: 'auto' }}>
                      <div style={{ textAlign: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{dischargeDoc.hospitalHeader.institution}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dischargeDoc.hospitalHeader.department}</div>
                      </div>
                      
                      <div style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
                        <strong>Patient Name</strong>: {dischargeDoc.patientInfo.name}<br/>
                        <strong>MRN</strong>: {dischargeDoc.patientInfo.mrn} • <strong>Age/Gen</strong>: {dischargeDoc.patientInfo.age} / {dischargeDoc.patientInfo.gender}<br/>
                        <strong>Admitted</strong>: {new Date(dischargeDoc.patientInfo.admissionDate).toLocaleDateString()}<br/>
                        <strong>Discharged</strong>: {new Date(dischargeDoc.patientInfo.dischargeDate).toLocaleDateString()}
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Final Diagnosis:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>
                          {dischargeDoc.sections.diagnoses.map((d: string, i: number) => (
                            <div key={i}>• {d}</div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>History of Present Illness:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.historyOfPresentIllness}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Course in Hospital Narrative:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.courseInHospital}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Discharge Medications:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px', whiteSpace: 'pre-line' }}>{dischargeDoc.sections.dischargeMedications}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Procedures Performed:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.procedures}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Advice on Discharge:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.advice}</div>
                      </div>

                      <div>
                        <strong>Follow Up Clinic:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.followUp}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Discharge summary is currently being drafted by your clinician.</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Once certified by the attending physician, your official discharge documentation, medications, and follow-up plan will appear here.
                    </p>
                  </div>
                )
              ) : (
                !dischargeDoc ? (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Configure the final advice and instructions parameters before compiling the clinical document.
                    </p>
                    
                    <div className="form-group">
                      <label className="form-label">Discharge Advice</label>
                      <textarea 
                        className="form-textarea"
                        rows={3}
                        value={adviceText}
                        onChange={(e) => setAdviceText(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Follow-Up Clinic Plan</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Prognosis Description</label>
                      <input 
                        type="text" 
                        className="form-input"
                        value={prognosisText}
                        onChange={(e) => setPrognosisText(e.target.value)}
                      />
                    </div>

                    <button className="btn" style={{ width: '100%', marginTop: '12px' }} onClick={handleCompileDischarge} disabled={compilingDischarge}>
                      {compilingDischarge ? '⚡ Compiling...' : '⚡ Run Discharge Summary Engine'}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem' }}>
                    {/* Preview compiled document */}
                    <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', marginBottom: '16px', maxHeight: '380px', overflowY: 'auto' }}>
                      <div style={{ textAlign: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{dischargeDoc.hospitalHeader.institution}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dischargeDoc.hospitalHeader.department}</div>
                      </div>
                      
                      <div style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
                        <strong>Patient Name</strong>: {dischargeDoc.patientInfo.name}<br/>
                        <strong>MRN</strong>: {dischargeDoc.patientInfo.mrn} • <strong>Age/Gen</strong>: {dischargeDoc.patientInfo.age} / {dischargeDoc.patientInfo.gender}<br/>
                        <strong>Admitted</strong>: {new Date(dischargeDoc.patientInfo.admissionDate).toLocaleDateString()}<br/>
                        <strong>Discharged</strong>: {new Date(dischargeDoc.patientInfo.dischargeDate).toLocaleDateString()}
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Final Diagnosis:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>
                          {dischargeDoc.sections.diagnoses.map((d: string, i: number) => (
                            <div key={i}>• {d}</div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>History of Present Illness:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.historyOfPresentIllness}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Course in Hospital Narrative:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.courseInHospital}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Discharge Medications:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px', whiteSpace: 'pre-line' }}>{dischargeDoc.sections.dischargeMedications}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Procedures Performed:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.procedures}</div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <strong>Advice on Discharge:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.advice}</div>
                      </div>

                      <div>
                        <strong>Follow Up Clinic:</strong>
                        <div style={{ fontSize: '0.75rem', paddingLeft: '8px' }}>{dischargeDoc.sections.followUp}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ flexGrow: 1 }} onClick={() => setDischargeDoc(null)}>
                        ⬅ Modify
                      </button>
                      <button className="btn" style={{ flexGrow: 1 }} onClick={async () => {
                        addNotification('Discharge Summary certified. PDF generated and EMR synchronized.', 'success');
                        // Set patient status to discharged in EMR
                        try {
                          await fetch(`${apiBaseUrl}/census/resolve-status`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-user-id': user?.id || 'demo',
                              'x-user-name': user?.name || 'Demo User',
                              'x-user-role': user?.role || 'PHYSICIAN'
                            },
                            body: JSON.stringify({ patientId: activePatient.id, resolution: 'DISCHARGED' })
                          });
                          refreshAllData();
                          setDischargeDoc(null);
                          setActiveTab('narrative');
                          selectPatientById(activePatient.id);
                        } catch (e) {
                          console.error('Final signoff failed');
                        }
                      }}>
                        ✍️ Sign Off & Export
                      </button>
                    </div>
                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

      {/* EVENT EDITING MODAL */}
      {editingEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px'
          }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--color-cyan)' }}>
              Edit Clinical Ledger Event
            </h3>

            <form onSubmit={handleEditEventSubmit}>
              <div className="form-group">
                <label className="form-label">Event Category</label>
                <select 
                  className="form-input" 
                  value={editEventType}
                  onChange={(e) => setEditEventType(e.target.value)}
                >
                  <option value="DIAGNOSIS">Diagnosis</option>
                  <option value="MEDICATION">Medication</option>
                  <option value="INVESTIGATION">Investigation (Lab/Vital)</option>
                  <option value="PROCEDURE">Procedure</option>
                  <option value="CONSULTATION">Consultation</option>
                  <option value="NOTE">Clinical Note</option>
                </select>
              </div>

              {editEventType === 'MEDICATION' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Medication Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editEventData.drugName || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, drugName: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Dose</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editEventData.dose || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, dose: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Route</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editEventData.route || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, route: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prescription State</label>
                    <select 
                      className="form-input"
                      value={editEventData.status || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, status: e.target.value })}
                    >
                      <option value="started">Started</option>
                      <option value="held">Held (Anticoagulant safety)</option>
                      <option value="stopped">Stopped</option>
                      <option value="continued">Continued</option>
                    </select>
                  </div>
                </div>
              )}

              {editEventType === 'INVESTIGATION' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Lab/Biometric Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editEventData.labName || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, labName: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Value</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editEventData.value || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, value: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editEventData.unit || ''}
                        onChange={(e) => setEditEventData({ ...editEventData, unit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {editEventType === 'DIAGNOSIS' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Diagnosis Title</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editEventData.diagnosisName || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, diagnosisName: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {editEventType === 'NOTE' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Note Content</label>
                    <textarea 
                      className="form-textarea" 
                      rows={4}
                      value={editEventData.noteText || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, noteText: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {['PROCEDURE', 'CONSULTATION'].includes(editEventType) && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Title/Specialty</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editEventData.procedureName || editEventData.specialty || ''}
                      onChange={(e) => setEditEventData({ 
                        ...editEventData, 
                        procedureName: e.target.value,
                        specialty: e.target.value 
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description Notes</label>
                    <textarea 
                      className="form-textarea" 
                      rows={3}
                      value={editEventData.notes || ''}
                      onChange={(e) => setEditEventData({ ...editEventData, notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyItems: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flexGrow: 1 }}
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn"
                  style={{ flexGrow: 1 }}
                >
                  Rebuild Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
