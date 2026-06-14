import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Patient, Narrative, ClinicalEvent, Bed, AuditLog
from ..utils.routing import QueryRouter, HybridSearchEngine, call_llm_copilot

router = APIRouter(prefix="/narrative", tags=["narrative"])

@router.get("/patient/{patient_id}")
def get_narratives(patient_id: str, db: Session = Depends(get_db)):
    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    if not narrative:
        raise HTTPException(status_code=404, detail="Narratives not found")
    return {
        "id": narrative.id,
        "patientId": narrative.patient_id,
        "courseInHospital": narrative.course_in_hospital,
        "medicationJourney": narrative.medication_journey,
        "investigationJourney": narrative.investigation_journey,
        "procedureJourney": narrative.procedure_journey,
        "lastUpdated": narrative.last_updated.isoformat()
    }

@router.put("/patient/{patient_id}")
def update_narratives(
    patient_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    if x_user_role == 'NURSE':
        raise HTTPException(status_code=403, detail="ICU Nurses do not have permission to modify clinical narratives.")

    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    if not narrative:
        raise HTTPException(status_code=404, detail="Narratives not found")

    narrative.course_in_hospital = payload.get("courseInHospital", narrative.course_in_hospital)
    narrative.medication_journey = payload.get("medicationJourney", narrative.medication_journey)
    narrative.investigation_journey = payload.get("investigationJourney", narrative.investigation_journey)
    narrative.procedure_journey = payload.get("procedureJourney", narrative.procedure_journey)

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="REGENERATE_SUMMARY",
        details=f"Manually updated clinical narratives for patient {patient_id}"
    )
    db.add(audit)
    db.commit()

    return {"success": True}

@router.post("/compile-discharge/{patient_id}")
def compile_discharge(
    patient_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM')
):
    if x_user_role == 'NURSE':
        raise HTTPException(status_code=403, detail="Only attending physicians can compile and sign off discharge summaries.")

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).all()

    # Active medications
    meds = []
    for e in events:
        if e.event_type == 'MEDICATION':
            try:
                data = json.loads(e.event_data)
                meds.append(f"{data.get('drugName')} {data.get('dose')} {data.get('route', '')} {data.get('freq', '')} ({data.get('status')})")
            except Exception:
                pass

    # Active diagnoses
    diagnoses = []
    for e in events:
        if e.event_type == 'DIAGNOSIS':
            try:
                data = json.loads(e.event_data)
                diagnoses.append(f"{data.get('diagnosisName')} ({data.get('status')})")
            except Exception:
                pass

    discharge_summary = {
        "hospitalHeader": {
            "institution": "Medico-Agent Clinical Intelligence Portal",
            "department": "Department of Pulmonary & Critical Care Medicine",
            "physicianName": x_user_name
        },
        "patientInfo": {
            "name": patient.name,
            "mrn": patient.mrn,
            "age": patient.age,
            "gender": patient.gender,
            "admissionDate": patient.admission_date.isoformat(),
            "dischargeDate": datetime.utcnow().isoformat()
        },
        "sections": {
            "diagnoses": diagnoses if diagnoses else [patient.comorbidities],
            "historyOfPresentIllness": "Patient admitted with progressive respiratory failure, cough, fever and bilateral ground-glass infiltrates suggestive of Diffuse Alveolar Hemorrhage.",
            "investigations": narrative.investigation_journey if narrative else "No lab trends compiled.",
            "procedures": narrative.procedure_journey if narrative else "No procedures compiled.",
            "treatmentGiven": "Pulse steroid therapy with methylprednisolone was administered. Maintenance hemodialysis was continued.",
            "courseInHospital": narrative.course_in_hospital if narrative else "No course in hospital drafted.",
            "dischargeMedications": narrative.medication_journey if narrative else "No discharge medications compiled.",
            "advice": payload.get("adviceText", "Avoid strenuous physical activity, consult Pulmonology OPD if symptoms return."),
            "followUp": payload.get("followUpDate", "1 week from discharge in Pulmonology OPD."),
            "prognosis": payload.get("prognosisText", "Stable clinical course, guarded prognosis.")
        }
    }

    # Log audit
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="APPROVE_SUMMARY",
        details=f"Compiled and signed off Discharge Summary for patient {patient.name} (MRN: {patient.mrn})"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "dischargeSummary": discharge_summary}

@router.post("/copilot/{patient_id}")
async def copilot_chat(
    patient_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_api_key: str = Header(None)
):
    query = payload.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    # Fetch patient demographics
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch patient narratives
    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    narrative_data = {}
    if narrative:
        narrative_data = {
            "courseInHospital": narrative.course_in_hospital,
            "medicationJourney": narrative.medication_journey,
            "investigationJourney": narrative.investigation_journey,
            "procedureJourney": narrative.procedure_journey
        }

    patient_info = {
        "id": patient.id,
        "name": patient.name,
        "mrn": patient.mrn,
        "age": patient.age,
        "gender": patient.gender,
        "comorbidities": patient.comorbidities,
        "status": patient.status,
        "bedNumber": patient.bed_number,
        "admissionDate": patient.admission_date.strftime("%b %d, %Y") if patient.admission_date else None,
        "estimatedDischargeDate": patient.estimated_discharge_date.strftime("%b %d, %Y") if patient.estimated_discharge_date else None,
        "narrative": narrative_data
    }

    # 1. Intent routing
    route = QueryRouter.detect_route(query)
    
    # 2. Hybrid vector-keyword retrieval filtered by patient_id
    retrieved_events = HybridSearchEngine.search(db, patient_id, query, route)

    # 3. Call LLM copilot RAG context compiler
    history = payload.get("history", [])
    response = await call_llm_copilot(
        query=query,
        retrieved_events=retrieved_events,
        patient_info=patient_info,
        history=history,
        api_key=x_api_key
    )
    return response
