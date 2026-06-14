from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..utils.safety import validate_patient_safety

router = APIRouter(prefix="/safety", tags=["safety"])

@router.get("/patient/{patient_id}")
def check_safety(patient_id: str, db: Session = Depends(get_db)):
    safety_info = validate_patient_safety(db, patient_id)
    return safety_info
