import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Bed, Patient, ClinicalEvent, AuditLog

router = APIRouter(prefix="/census", tags=["census"])

@router.get("/")
def list_beds(db: Session = Depends(get_db)):
    beds = db.query(Bed).all()
    result = []
    for bed in beds:
        patient_info = None
        if bed.patient_id:
            patient = db.query(Patient).filter(Patient.id == bed.patient_id).first()
            if patient:
                patient_info = {
                    "id": patient.id,
                    "name": patient.name,
                    "mrn": patient.mrn,
                    "status": patient.status
                }
        result.append({
            "bedNumber": bed.bed_number,
            "department": bed.department,
            "patientId": bed.patient_id,
            "patient": patient_info
        })
    return result

@router.post("/transfer")
def transfer_patient(
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    patient_id = payload.get("patientId")
    source_bed = payload.get("sourceBed")
    target_bed = payload.get("targetBed")

    if not patient_id or not target_bed:
        raise HTTPException(status_code=400, detail="Missing parameters")

    # Check target bed
    target = db.query(Bed).filter(Bed.bed_number == target_bed).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target bed not found")
    if target.patient_id:
        raise HTTPException(status_code=400, detail=f"Target bed {target_bed} is occupied")

    # Release source bed
    if source_bed:
        db.query(Bed).filter(Bed.bed_number == source_bed).update({"patient_id": None})

    # Occupy target bed
    db.query(Bed).filter(Bed.bed_number == target_bed).update({"patient_id": patient_id})

    # Determine status based on bed (ICU or WARD)
    dept = "ACTIVE_CARE" if target_bed.startswith("ICU") else "ADMITTED"
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient.bed_number = target_bed
    patient.status = dept

    # Timeline event
    event = ClinicalEvent(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        timestamp=datetime.utcnow(),
        event_type="NOTE",
        source_modality="TEXT",
        event_data=json.dumps({
            "noteText": f"Patient transferred from bed {source_bed or 'None'} to {target_bed}."
        }),
        provenance="Bed Transfer System",
        author_id=x_user_id,
        author_name=x_user_name,
        author_role=x_user_role
    )
    db.add(event)

    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Transferred patient {patient.name} from {source_bed or 'None'} to {target_bed}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "patient": {"id": patient.id, "bed": patient.bed_number, "status": patient.status}}

@router.post("/upload-census")
async def upload_census(
    censusImage: UploadFile = File(...),
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    try:
        # Mock OCR scanning logic:
        # In a real scan, OCR maps patient coordinates.
        # We simulate this: we match Rajinder Nath Sharma (ICU-3) successfully,
        # but mark any other active patient not detected in the mock scan as missing (IN_REVIEW).
        patients = db.query(Patient).filter(Patient.status.in_(["ADMITTED", "ACTIVE_CARE"])).all()
        
        confirm_required = []
        parsed_census = [
            {"bed": "ICU-3", "name": "Rajinder Nath Sharma", "matched": True}
        ]

        for p in patients:
            if "rajinder" in p.name.lower():
                # Confirmed matched in census sheet
                continue
            else:
                # Anomaly detected: patient in EMR database but missing in physical rounds list
                # Move status to IN_REVIEW instead of auto-deleting (Safeguard)
                p.status = "IN_REVIEW"
                
                confirm_required.append({
                    "id": p.id,
                    "name": p.name,
                    "mrn": p.mrn,
                    "bed": p.bed_number,
                    "status": p.status,
                    "reason": "Name was not found in the uploaded rounds census list image. Verification required."
                })

                # Log alert in timeline
                event = ClinicalEvent(
                    id=str(uuid.uuid4()),
                    patient_id=p.id,
                    timestamp=datetime.utcnow(),
                    event_type="NOTE",
                    source_modality="TEXT",
                    event_data=json.dumps({
                        "noteText": "System Alert: Patient missing from physical rounds census sheet scan. Status set to In Review."
                    }),
                    provenance="Automated Census Reconciliation",
                    author_id="system",
                    author_name="Census Engine",
                    author_role="SYSTEM"
                )
                db.add(event)

        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=x_user_id,
            user_name=x_user_name,
            user_role=x_user_role,
            action="UPDATE_EVENT",
            details=f"Uploaded census rounds list image. Reconciliation scanned {len(patients)} charts. Detected {len(confirm_required)} discrepancies."
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": "Census list reconciled successfully.",
            "parsedCensus": parsed_census,
            "confirmRequired": confirm_required,
            "confirmedCount": len(patients) - len(confirm_required)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reconcile census: {str(e)}")

@router.post("/resolve-status")
def resolve_patient_status(
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    patient_id = payload.get("patientId")
    resolution = payload.get("resolution")  # 'ADMITTED', 'ACTIVE_CARE', 'DISCHARGED', 'LAMA', 'DECEASED'

    if not patient_id or not resolution:
        raise HTTPException(status_code=400, detail="Missing parameters")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    original_bed = patient.bed_number

    if resolution in ['DISCHARGED', 'LAMA', 'DECEASED']:
        patient.bed_number = None
        patient.status = 'DONE' if resolution == 'DISCHARGED' else resolution
        patient.discharge_date = datetime.utcnow()
        
        # Free bed
        if original_bed:
            db.query(Bed).filter(Bed.bed_number == original_bed).update({"patient_id": None})
    else:
        # Re-assign/Return to Ward or ICU
        patient.status = resolution

    # Log resolved event in patient timeline
    event = ClinicalEvent(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        timestamp=datetime.utcnow(),
        event_type="NOTE",
        source_modality="TEXT",
        event_data=json.dumps({
            "noteText": f"Census reconciliation status resolved. Patient status updated to {resolution}."
        }),
        provenance="Reconciliation Audit Resolution",
        author_id=x_user_id,
        author_name=x_user_name,
        author_role=x_user_role
    )
    db.add(event)

    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Resolved census anomaly for {patient.name}. Set state to {resolution}."
    )
    db.add(audit)
    db.commit()

    return {"success": True, "patient": {"id": patient.id, "status": patient.status, "bed": patient.bed_number}}

@router.post("/beds")
def create_bed(
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    bed_number = payload.get("bedNumber")
    department = payload.get("department") # 'ICU' or 'WARD'
    
    if not bed_number or not department:
        raise HTTPException(status_code=400, detail="bedNumber and department are required")
        
    existing = db.query(Bed).filter(Bed.bed_number == bed_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bed number already exists")
        
    new_bed = Bed(bed_number=bed_number, department=department, patient_id=None)
    db.add(new_bed)
    
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Added new bed {bed_number} to {department} department"
    )
    db.add(audit)
    db.commit()
    return {"success": True, "bed": {"bedNumber": bed_number, "department": department}}

@router.delete("/beds/{bed_number}")
def delete_bed(
    bed_number: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    bed = db.query(Bed).filter(Bed.bed_number == bed_number).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    if bed.patient_id:
        raise HTTPException(status_code=400, detail="Cannot delete an occupied bed. Transfer the patient first.")
        
    db.delete(bed)
    
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Deleted bed {bed_number}"
    )
    db.add(audit)
    db.commit()
    return {"success": True}

@router.post("/release")
def release_patient(
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    patient_id = payload.get("patientId")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patientId is required")
        
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    original_bed = patient.bed_number
    if original_bed:
        # Free bed
        db.query(Bed).filter(Bed.bed_number == original_bed).update({"patient_id": None})
        
    patient.bed_number = None
    
    # Log event
    event = ClinicalEvent(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        timestamp=datetime.utcnow(),
        event_type="NOTE",
        source_modality="TEXT",
        event_data=json.dumps({
            "noteText": f"Patient released from bed {original_bed} and moved back to triage backlog waitlist."
        }),
        provenance="Bed Assignment System",
        author_id=x_user_id,
        author_name=x_user_name,
        author_role=x_user_role
    )
    db.add(event)
    
    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Released patient {patient.name} from bed {original_bed} to waitlist backlog"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True}
