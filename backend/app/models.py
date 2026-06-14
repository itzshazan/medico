from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    name = Column(String)
    role = Column(String)  # 'PHYSICIAN', 'NURSE', 'SPECIALIST'
    specialty = Column(String, nullable=True)  # e.g., 'Pulmonology', 'Nephrology'
<<<<<<< HEAD
    email = Column(String, unique=True, index=True, nullable=True)
    password = Column(String, nullable=True)
=======
    clerk_id = Column(String, unique=True, nullable=True)
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
    created_at = Column(DateTime, default=func.now())

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True)
    mrn = Column(String, unique=True, index=True)
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    comorbidities = Column(String)  # Textual comorbidity tags/list
    status = Column(String)  # 'ADMITTED' (Ward To Do), 'ACTIVE_CARE' (ICU In Progress), 'IN_REVIEW', 'DONE' (Discharged)
    bed_number = Column(String, nullable=True)
    admission_date = Column(DateTime, default=func.now())
    discharge_date = Column(DateTime, nullable=True)
<<<<<<< HEAD
    estimated_discharge_date = Column(DateTime, nullable=True)
    email = Column(String, unique=True, nullable=True)
    password = Column(String, nullable=True)
    phone = Column(String, nullable=True)
=======
    clerk_id = Column(String, unique=True, nullable=True)
    estimated_discharge_date = Column(DateTime, nullable=True)
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
    milestones = Column(String, nullable=True)  # JSON string representing milestones
    created_at = Column(DateTime, default=func.now())

    events = relationship("ClinicalEvent", back_populates="patient", cascade="all, delete-orphan")
    narratives = relationship("Narrative", back_populates="patient", cascade="all, delete-orphan")

class Bed(Base):
    __tablename__ = "beds"

    bed_number = Column(String, primary_key=True, index=True)
    department = Column(String)  # 'ICU', 'WARD'
    patient_id = Column(String, unique=True, nullable=True)

class ClinicalEvent(Base):
    __tablename__ = "clinical_events"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id", ondelete="CASCADE"))
    timestamp = Column(DateTime, index=True)
    event_type = Column(String)  # 'DIAGNOSIS', 'MEDICATION', 'PROCEDURE', 'INVESTIGATION', 'CONSULTATION', 'NOTE'
    source_modality = Column(String)  # 'TEXT', 'VOICE', 'DOCUMENT', 'IMAGE'
    event_data = Column(String)  # JSON-serialized payload details
    provenance = Column(String)  # e.g., "Progress Note Day 3", "ASR Round Dictation"
    author_id = Column(String)
    author_name = Column(String)
    author_role = Column(String)
    created_at = Column(DateTime, default=func.now())

    patient = relationship("Patient", back_populates="events")

class Narrative(Base):
    __tablename__ = "narratives"

    id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.id", ondelete="CASCADE"), unique=True)
    course_in_hospital = Column(String)
    medication_journey = Column(String)
    investigation_journey = Column(String)
    procedure_journey = Column(String)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

    patient = relationship("Patient", back_populates="narratives")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String)
    user_name = Column(String)
    user_role = Column(String)
    action = Column(String)  # 'CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT', 'APPROVE_SUMMARY', 'LOGIN'
    timestamp = Column(DateTime, default=func.now())
    details = Column(String)
