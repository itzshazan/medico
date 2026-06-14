import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Patient, AuditLog
from ..schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(UserResponse):
    pass

@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    username = payload.get("username")
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
        
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username")
        
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user.id,
        user_name=user.name,
        user_role=user.role,
        action="LOGIN",
        details=f"Logged in as {user.name} ({user.role})"
    )
    db.add(audit)
    db.commit()
    
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "specialty": user.specialty
        }
    }

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "name": u.name,
        "role": u.role,
        "specialty": u.specialty
    } for u in users]

@router.post("/clerk-sync")
def clerk_sync(payload: dict, db: Session = Depends(get_db)):
    clerk_id = payload.get("clerkId")
    portal_type = payload.get("portalType") # 'clinician' or 'patient'
    
    if not clerk_id:
        raise HTTPException(status_code=400, detail="clerkId is required")
        
    # Search for linked patient
    patient = db.query(Patient).filter(Patient.clerk_id == clerk_id).first()
    if patient:
        return {
            "linked": True,
            "role": "PATIENT",
            "patient": {
                "id": patient.id,
                "mrn": patient.mrn,
                "name": patient.name,
                "status": patient.status,
                "bed": patient.bed_number
            },
            "user": {
                "id": clerk_id,
                "username": patient.mrn,
                "name": patient.name,
                "role": "PATIENT",
                "linkedPatientId": patient.id
            }
        }
        
    # Search for linked clinician
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if user:
        return {
            "linked": True,
            "role": user.role,
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "role": user.role,
                "specialty": user.specialty
            }
        }
        
    # Not linked yet
    return {
        "linked": False,
        "role": "PATIENT" if portal_type == "patient" else "CLINICIAN"
    }

@router.post("/clerk-link-patient")
def clerk_link_patient(payload: dict, db: Session = Depends(get_db)):
    clerk_id = payload.get("clerkId")
    mrn = payload.get("mrn")
    
    if not clerk_id or not mrn:
        raise HTTPException(status_code=400, detail="clerkId and mrn are required")
        
    # Find patient by MRN
    patient = db.query(Patient).filter(Patient.mrn == mrn).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient MRN not found in EMR database")
        
    if patient.clerk_id:
        raise HTTPException(status_code=400, detail="This patient chart is already linked to another user")
        
    # Update Patient clerk_id
    patient.clerk_id = clerk_id
    
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=clerk_id,
        user_name=patient.name,
        user_role="PATIENT",
        action="LOGIN",
        details=f"Linked Clerk account {clerk_id} to Patient MRN {mrn}"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "role": "PATIENT",
        "patient": {
            "id": patient.id,
            "mrn": patient.mrn,
            "name": patient.name,
            "status": patient.status,
            "bed": patient.bed_number
        },
        "user": {
            "id": clerk_id,
            "username": patient.mrn,
            "name": patient.name,
            "role": "PATIENT",
            "linkedPatientId": patient.id
        }
    }

@router.post("/clerk-link-clinician")
def clerk_link_clinician(payload: dict, db: Session = Depends(get_db)):
    clerk_id = payload.get("clerkId")
    username = payload.get("username") # e.g., 'deepak', 'harpal', 'shalini'
    name = payload.get("name")
    role = payload.get("role")
    specialty = payload.get("specialty")
    
    if not clerk_id:
        raise HTTPException(status_code=400, detail="clerkId is required")
        
    # Case 1: Linking to an existing seed profile
    if username:
        user = db.query(User).filter(User.username == username.lower()).first()
        if not user:
            raise HTTPException(status_code=404, detail="Seed user not found")
        if user.clerk_id:
            raise HTTPException(status_code=400, detail="This profile is already linked to another user")
            
        user.clerk_id = clerk_id
        db.commit()
    else:
        # Case 2: Creating a new clinician profile
        if not name or not role:
            raise HTTPException(status_code=400, detail="Name and role are required to create a new profile")
        user = User(
            id=str(uuid.uuid4()),
            username=f"clerk_{clerk_id[-8:]}",
            name=name,
            role=role,
            specialty=specialty,
            clerk_id=clerk_id
        )
        db.add(user)
        db.commit()
        
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=clerk_id,
        user_name=user.name,
        user_role=user.role,
        action="LOGIN",
        details=f"Linked Clerk account {clerk_id} to Clinician {user.name} ({user.role})"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "role": user.role,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
            "specialty": user.specialty
        }
    }

@router.post("/reset-db")
def reset_db():
    import os
    import sys
    import subprocess
    try:
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "seed.py"))
        python_exe = sys.executable
        result = subprocess.run([python_exe, script_path], capture_output=True, text=True, check=True)
        return {"success": True, "message": "Database successfully reseeded", "log": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")
