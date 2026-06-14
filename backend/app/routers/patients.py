import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Patient, Bed, ClinicalEvent, Narrative, AuditLog

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    result = []
    for p in patients:
        narrative = db.query(Narrative).filter(Narrative.patient_id == p.id).first()
        result.append({
            "id": p.id,
            "mrn": p.mrn,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "comorbidities": p.comorbidities,
            "status": p.status,
            "bed": p.bed_number,
            "admissionDate": p.admission_date.isoformat(),
            "dischargeDate": p.discharge_date.isoformat() if p.discharge_date else None,
            "estimatedDischargeDate": p.estimated_discharge_date.isoformat() if p.estimated_discharge_date else None,
            "milestones": json.loads(p.milestones) if p.milestones else [],
            "courseInHospital": narrative.course_in_hospital if narrative else ""
        })
    return result

@router.get("/{patient_id}")
def get_patient_detail(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).order_by(ClinicalEvent.timestamp.asc()).all()
    narratives = db.query(Narrative).filter(Narrative.patient_id == patient_id).all()
    
    events_json = []
    for e in events:
        events_json.append({
            "id": e.id,
            "patientId": e.patient_id,
            "timestamp": e.timestamp.isoformat(),
            "eventType": e.event_type,
            "sourceModality": e.source_modality,
            "eventData": e.event_data,
            "provenance": e.provenance,
            "authorId": e.author_id,
            "authorName": e.author_name,
            "authorRole": e.author_role
        })

    narratives_json = []
    for n in narratives:
        narratives_json.append({
            "id": n.id,
            "patientId": n.patient_id,
            "courseInHospital": n.course_in_hospital,
            "medicationJourney": n.medication_journey,
            "investigationJourney": n.investigation_journey,
            "procedureJourney": n.procedure_journey,
            "lastUpdated": n.last_updated.isoformat()
        })
        
    return {
        "id": patient.id,
        "mrn": patient.mrn,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "comorbidities": patient.comorbidities,
        "status": patient.status,
        "bed": patient.bed_number,
        "admissionDate": patient.admission_date.isoformat(),
        "dischargeDate": patient.discharge_date.isoformat() if patient.discharge_date else None,
        "estimatedDischargeDate": patient.estimated_discharge_date.isoformat() if patient.estimated_discharge_date else None,
        "milestones": json.loads(patient.milestones) if patient.milestones else [],
        "events": events_json,
        "narratives": narratives_json
    }

@router.post("/{patient_id}/roadmap")
def update_patient_roadmap(
    patient_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    est_discharge = payload.get("estimatedDischargeDate")
    milestones_list = payload.get("milestones")
    
    if est_discharge is not None:
        if est_discharge == "":
            patient.estimated_discharge_date = None
        else:
            try:
                if "T" in est_discharge:
                    patient.estimated_discharge_date = datetime.fromisoformat(est_discharge.replace("Z", ""))
                else:
                    patient.estimated_discharge_date = datetime.strptime(est_discharge, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD or ISO format.")
                
    if milestones_list is not None:
        patient.milestones = json.dumps(milestones_list)
        
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Updated care roadmap and milestones for patient {patient.name}"
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "estimatedDischargeDate": patient.estimated_discharge_date.isoformat() if patient.estimated_discharge_date else None,
        "milestones": json.loads(patient.milestones) if patient.milestones else []
    }

@router.post("/")
def admit_patient(
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    mrn = payload.get("mrn")
    name = payload.get("name")
    age = payload.get("age")
    gender = payload.get("gender")
    comorbidities = payload.get("comorbidities", "")
    bed = payload.get("bed")
    status_str = payload.get("status", "ADMITTED")

    if not mrn or not name or not age or not gender:
        raise HTTPException(status_code=400, detail="Missing required patient fields")

    # Check MRN uniqueness
    existing = db.query(Patient).filter(Patient.mrn == mrn).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient MRN already exists")

    # Check bed allocation
    if bed:
        active_bed = db.query(Bed).filter(Bed.bed_number == bed).first()
        if active_bed and active_bed.patient_id:
            raise HTTPException(status_code=400, detail=f"Bed {bed} is already occupied")

    patient_id = str(uuid.uuid4())
    new_patient = Patient(
        id=patient_id,
        mrn=mrn,
        name=name,
        age=int(age),
        gender=gender,
        comorbidities=comorbidities,
        status=status_str,
        bed_number=bed if bed else None
    )
    db.add(new_patient)

    # Allocate bed
    if bed:
        db.query(Bed).filter(Bed.bed_number == bed).update({"patient_id": patient_id})

    # Create empty narratives
    new_narrative = Narrative(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        course_in_hospital="Patient admitted. Course in hospital narrative initialized.",
        medication_journey="No medications recorded.",
        investigation_journey="No investigations recorded.",
        procedure_journey="No procedures recorded."
    )
    db.add(new_narrative)

    # Initial assessment event
    init_event = ClinicalEvent(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        timestamp=datetime.utcnow(),
        event_type="DIAGNOSIS",
        source_modality="TEXT",
        event_data=json.dumps({
            "diagnosisName": "Admission Initial Assessment",
            "status": "Active",
            "notes": "Admitted and indexed in bed ledger."
        }),
        provenance="Admission Assessment",
        author_id=x_user_id,
        author_name=x_user_name,
        author_role=x_user_role
    )
    db.add(init_event)

    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="CREATE_EVENT",
        details=f"Admitted patient {name} (MRN: {mrn}) in bed {bed if bed else 'None'}"
    )
    db.add(audit)
    db.commit()

    return {
        "id": new_patient.id,
        "mrn": new_patient.mrn,
        "name": new_patient.name,
        "status": new_patient.status,
        "bed": new_patient.bed_number
    }
