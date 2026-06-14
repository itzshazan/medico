from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class UserBase(BaseModel):
    username: str
    name: str
    role: str
    specialty: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    mrn: str
    name: str
    age: int
    gender: str
    comorbidities: str
    status: str  # 'ADMITTED', 'ACTIVE_CARE', 'IN_REVIEW', 'DONE'
    bed_number: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BedResponse(BaseModel):
    bed_number: str
    department: str
    patient_id: Optional[str] = None
    patient: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ClinicalEventBase(BaseModel):
    timestamp: datetime
    event_type: str
    source_modality: str
    event_data: str  # JSON string
    provenance: str

class ClinicalEventCreate(ClinicalEventBase):
    pass

class ClinicalEventResponse(ClinicalEventBase):
    id: str
    patient_id: str
    author_id: str
    author_name: str
    author_role: str
    created_at: datetime

    class Config:
        from_attributes = True

class NarrativeUpdate(BaseModel):
    course_in_hospital: str
    medication_journey: str
    investigation_journey: str
    procedure_journey: str

class NarrativeResponse(NarrativeUpdate):
    id: str
    patient_id: str
    last_updated: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_role: str
    action: str
    timestamp: datetime
    details: str

    class Config:
        from_attributes = True
<<<<<<< HEAD

class PatientRegisterRequest(BaseModel):
    name: str
    age: int
    email: str
    phone: str
    password: str

class PatientLoginRequest(BaseModel):
    email: str
    password: str

=======
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
