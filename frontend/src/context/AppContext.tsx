import React, { createContext, useState, useEffect, useContext } from 'react';
import { useUser } from '@clerk/react';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'PHYSICIAN' | 'NURSE' | 'SPECIALIST' | 'PATIENT';
  specialty?: string;
  linkedPatientId?: string;
}

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  comorbidities: string;
  admissionDate: string;
  dischargeDate?: string | null;
  estimatedDischargeDate?: string | null;
  milestones?: Array<{
    id: string;
    title: string;
    completed: boolean;
    dateCompleted?: string;
  }>;
  status: 'ICU' | 'WARD' | 'DISCHARGED' | 'CONFIRM_STATUS' | 'ADMITTED' | 'ACTIVE_CARE' | 'IN_REVIEW' | 'DONE';
  bed?: string | null;
  events?: ClinicalEvent[];
  narratives?: Narrative[];
}

export interface Bed {
  bedNumber: string;
  department: 'ICU' | 'WARD';
  patientId?: string | null;
  patient?: {
    id: string;
    name: string;
    mrn: string;
    status: string;
  } | null;
}

export interface ClinicalEvent {
  id: string;
  patientId: string;
  timestamp: string;
  eventType: 'DIAGNOSIS' | 'MEDICATION' | 'PROCEDURE' | 'INVESTIGATION' | 'CONSULTATION' | 'NOTE';
  sourceModality: 'TEXT' | 'VOICE' | 'DOCUMENT' | 'IMAGE';
  eventData: string; // JSON string
  provenance: string;
  authorId: string;
  authorName: string;
  authorRole: string;
}

export interface Narrative {
  id: string;
  patientId: string;
  courseInHospital: string;
  medicationJourney: string;
  investigationJourney: string;
  procedureJourney: string;
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  timestamp: string;
  details: string;
}

interface AppContextType {
  user: User | null;
  activePatient: Patient | null;
  patients: Patient[];
  beds: Bed[];
  auditLogs: AuditLog[];
  activeView: 'census' | 'patient-portal' | 'patient-timeline' | 'patient-copilot' | 'patient-care-team' | 'patient-discharge' | 'patient-billing' | 'audit-logs' | 'roadmap' | 'backlog' | 'project-settings';
  apiBaseUrl: string;
  apiKey: string;
  loading: boolean;
  setApiKey: (key: string) => void;
  setActiveView: (view: 'census' | 'patient-portal' | 'patient-timeline' | 'patient-copilot' | 'patient-care-team' | 'patient-discharge' | 'patient-billing' | 'audit-logs' | 'roadmap' | 'backlog' | 'project-settings') => void;
  setUser: (user: User | null) => void;
  setActivePatient: (patient: Patient | null) => void;
  loginUser: (username: string) => Promise<boolean>;
  logoutUser: () => void;
  switchDemoRole: (role: 'PHYSICIAN' | 'NURSE' | 'SPECIALIST') => Promise<void>;
  refreshAllData: () => Promise<void>;
  selectPatientById: (id: string) => Promise<void>;
  addNotification: (message: string, type: 'info' | 'success' | 'warning' | 'danger') => void;
  notifications: Array<{ id: string; message: string; type: string }>;
  
  // Clerk State & Helpers
  tempClerkUser: any;
  setTempClerkUser: (user: any) => void;
  clerkSyncing: boolean;
  clerkSyncError: string | null;
  linkClerkPatient: (mrn: string) => Promise<boolean>;
  linkClerkClinician: (username?: string, name?: string, role?: string, specialty?: string) => Promise<boolean>;
  retryClerkSync: () => void;
  
  // Bed Capacity & Project Settings
  reseedDatabase: () => Promise<boolean>;
  createBed: (bedNumber: string, department: 'ICU' | 'WARD') => Promise<boolean>;
  deleteBed: (bedNumber: string) => Promise<boolean>;
  releasePatientFromBed: (patientId: string) => Promise<boolean>;
  updatePatientRoadmap: (patientId: string, estimatedDischargeDate: string, milestones: any[]) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Internal sync helper that can safely use useUser only when rendered inside ClerkProvider
const ClerkSyncHelper: React.FC<{ onSync: (user: any, loaded: boolean) => void; retryCount: number }> = ({ onSync, retryCount }) => {
  const { user, isLoaded } = useUser();
  useEffect(() => {
    onSync(user, isLoaded);
  }, [user, isLoaded, retryCount]);
  return null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const apiBaseUrl = 'http://127.0.0.1:5000/api';
  const [user, setUser] = useState<User | null>(null);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeView, setActiveView] = useState<'census' | 'patient-portal' | 'patient-timeline' | 'patient-copilot' | 'patient-care-team' | 'patient-discharge' | 'patient-billing' | 'audit-logs' | 'roadmap' | 'backlog' | 'project-settings'>('census');
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string }>>([]);
  
  // Clerk integration state
  const [tempClerkUser, setTempClerkUser] = useState<any>(null);
  const [clerkSyncing, setClerkSyncing] = useState<boolean>(false);
  const [clerkSyncError, setClerkSyncError] = useState<string | null>(null);
  const [clerkSyncRetryCount, setClerkSyncRetryCount] = useState(0);
  const clerkSyncInFlightRef = React.useRef<boolean>(false);
  const lastSyncedClerkIdRef = React.useRef<string | null>(null);

  const addNotification = (message: string, type: 'info' | 'success' | 'warning' | 'danger') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const refreshAllData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch(`${apiBaseUrl}/patients`);
      const patientsData = await pRes.json();
      setPatients(patientsData);

      const bRes = await fetch(`${apiBaseUrl}/census`);
      const bedsData = await bRes.json();
      setBeds(bedsData);

      const aRes = await fetch(`${apiBaseUrl}/audit`);
      const auditData = await aRes.json();
      setAuditLogs(auditData);
    } catch (error) {
      console.error('Failed to load data from backend API:', error);
      addNotification('Error connecting to clinical backend server.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const loginUser = async (username: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        addNotification(`Logged in successfully as ${data.user.name}`, 'success');
        refreshAllData();
        return true;
      } else {
        addNotification(data.error || 'Invalid credentials', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Auth server connection failed', 'danger');
      return false;
    }
  };

  const logoutUser = () => {
    setUser(null);
    setActivePatient(null);
    setActiveView('census');
    setTempClerkUser(null);
    
    // Clear Clerk session globally if available
    if ((window as any).Clerk) {
      try {
        (window as any).Clerk.signOut();
      } catch (err) {}
    }
    
    addNotification('Logged out successfully', 'info');
  };

  const switchDemoRole = async (role: 'PHYSICIAN' | 'NURSE' | 'SPECIALIST') => {
    let mockUsername = 'deepak';
    if (role === 'NURSE') mockUsername = 'harpal';
    if (role === 'SPECIALIST') mockUsername = 'shalini';

    await loginUser(mockUsername);
  };

  const selectPatientById = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/patients/${id}`);
      if (res.ok) {
        const patientData = await res.json();
        setActivePatient(patientData);
        setActiveView('patient-portal');
      } else {
        addNotification('Failed to fetch patient portal records.', 'danger');
      }
    } catch (error) {
      addNotification('Server failed to fetch patient details.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Link Clerk to Patient MRN
  const linkClerkPatient = async (mrn: string): Promise<boolean> => {
    if (!tempClerkUser) return false;
    try {
      const res = await fetch(`${apiBaseUrl}/auth/clerk-link-patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId: tempClerkUser.id, mrn })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setTempClerkUser(null);
        addNotification(`Linked account to Patient MRN ${mrn}`, 'success');
        await selectPatientById(data.patient.id);
        return true;
      } else {
        addNotification(data.detail || 'Failed to link patient', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Connection error while linking patient', 'danger');
      return false;
    }
  };

  // Link Clerk to Clinician Profile
  const linkClerkClinician = async (username?: string, name?: string, role?: string, specialty?: string): Promise<boolean> => {
    if (!tempClerkUser) return false;
    try {
      const res = await fetch(`${apiBaseUrl}/auth/clerk-link-clinician`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: tempClerkUser.id,
          username,
          name,
          role,
          specialty
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setTempClerkUser(null);
        refreshAllData();
        addNotification(`Welcome, ${data.user.name}`, 'success');
        return true;
      } else {
        addNotification(data.detail || 'Failed to link clinician', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Connection error while linking clinician', 'danger');
      return false;
    }
  };

  // Reseed Database
  const reseedDatabase = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/reset-db`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification('Clinical database successfully reseeded', 'success');
        await refreshAllData();
        return true;
      } else {
        addNotification('Reseed failed', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Error connecting to reset endpoint', 'danger');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create Bed Capacity
  const createBed = async (bedNumber: string, department: 'ICU' | 'WARD'): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/census/beds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ bedNumber, department })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification(`Bed ${bedNumber} created successfully`, 'success');
        refreshAllData();
        return true;
      } else {
        addNotification(data.detail || 'Failed to create bed', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Error creating bed', 'danger');
      return false;
    }
  };

  // Delete Vacant Bed
  const deleteBed = async (bedNumber: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/census/beds/${bedNumber}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification(`Bed ${bedNumber} deleted successfully`, 'success');
        refreshAllData();
        return true;
      } else {
        addNotification(data.detail || 'Failed to delete bed', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Error deleting bed', 'danger');
      return false;
    }
  };

  // Release Patient from Bed to Waitlist Backlog
  const releasePatientFromBed = async (patientId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/census/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ patientId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification('Patient moved back to waitlist queue', 'success');
        refreshAllData();
        return true;
      } else {
        addNotification(data.detail || 'Failed to release patient', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Error releasing patient', 'danger');
      return false;
    }
  };

  // Update Patient stay roadmap
  const updatePatientRoadmap = async (patientId: string, estimatedDischargeDate: string, milestones: any[]): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBaseUrl}/patients/${patientId}/roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || 'demo',
          'x-user-name': user?.name || 'Demo User',
          'x-user-role': user?.role || 'PHYSICIAN'
        },
        body: JSON.stringify({ estimatedDischargeDate, milestones })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addNotification('Patient roadmap successfully updated', 'success');
        refreshAllData();
        return true;
      } else {
        addNotification(data.detail || 'Failed to update roadmap', 'danger');
        return false;
      }
    } catch (e) {
      addNotification('Error updating roadmap', 'danger');
      return false;
    }
  };

  // Retry clerk sync (exposed to UI for manual retry)
  const retryClerkSync = () => {
    lastSyncedClerkIdRef.current = null;
    clerkSyncInFlightRef.current = false;
    setClerkSyncError(null);
    setClerkSyncRetryCount(c => c + 1); // Bump counter to re-trigger ClerkSyncHelper
  };

  // Sync Clerk Authenticated User — with timeout, dedup, and error handling
  const handleClerkSync = async (clerkUser: any, isLoaded: boolean) => {
    if (!isLoaded) return;
    
    if (!clerkUser) {
      // User is signed out of Clerk
      setTempClerkUser(null);
      setClerkSyncing(false);
      setClerkSyncError(null);
      lastSyncedClerkIdRef.current = null;
      clerkSyncInFlightRef.current = false;
      // Only reset local user session if they were logged in via Clerk
      if (user && user.id.startsWith('user_')) {
        setUser(null);
        setActivePatient(null);
        setActiveView('census');
      }
      return;
    }

    // Dedup: skip if already synced for this clerk user or if a sync is in flight
    if (lastSyncedClerkIdRef.current === clerkUser.id || clerkSyncInFlightRef.current) return;
    clerkSyncInFlightRef.current = true;

    setClerkSyncing(true);
    setClerkSyncError(null);

    const portalType = sessionStorage.getItem('medico_portal_type') || 'clinician';
    
    // AbortController for 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const res = await fetch(`${apiBaseUrl}/auth/clerk-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.username || 'Clerk User',
          portalType
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (res.ok) {
        lastSyncedClerkIdRef.current = clerkUser.id;
        if (data.linked) {
          setUser(data.user);
          setTempClerkUser(null);
          setClerkSyncError(null);
          addNotification(`Welcome back, ${data.user.name}!`, 'success');
          if (data.role === 'PATIENT') {
            await selectPatientById(data.patient.id);
          } else {
            refreshAllData();
          }
        } else {
          // Clerk user signed in but not yet linked in Medico DB
          setTempClerkUser({
            id: clerkUser.id,
            name: clerkUser.fullName || clerkUser.username || 'Clerk User',
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
            role: data.role
          });
          setUser(null); // Clear context user until EMR link is confirmed
        }
      } else {
        setClerkSyncError('Server returned an error during sync. Please retry.');
        addNotification('Clerk sync failed — server error.', 'warning');
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setClerkSyncError('Backend server timed out. Make sure the backend is running on port 5000.');
        addNotification('Clerk sync timed out. Is the backend server running?', 'warning');
      } else {
        setClerkSyncError('Could not connect to clinical backend. Ensure the server is running.');
        addNotification('Cannot reach clinical backend server.', 'danger');
      }
      console.error('Clerk session synchronization failed:', e);
    } finally {
      setClerkSyncing(false);
      clerkSyncInFlightRef.current = false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        activePatient,
        patients,
        beds,
        auditLogs,
        activeView,
        apiBaseUrl,
        apiKey,
        loading,
        setApiKey,
        setActiveView,
        setUser,
        setActivePatient,
        loginUser,
        logoutUser,
        switchDemoRole,
        refreshAllData,
        selectPatientById,
        addNotification,
        notifications,
        tempClerkUser,
        setTempClerkUser,
        clerkSyncing,
        clerkSyncError,
        linkClerkPatient,
        linkClerkClinician,
        retryClerkSync,
        reseedDatabase,
        createBed,
        deleteBed,
        releasePatientFromBed,
        updatePatientRoadmap
      }}
    >
      {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
        <ClerkSyncHelper onSync={handleClerkSync} retryCount={clerkSyncRetryCount} />
      )}
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
