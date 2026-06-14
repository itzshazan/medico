import uuid
import json
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Patient, ClinicalEvent, Narrative, AuditLog
from ..utils.nlp import extract_clinical_event, generate_narrative, mock_vision_image_extraction

router = APIRouter(prefix="/ingest", tags=["ingest"])

@router.post("/patient/{patient_id}")
async def ingest_clinical_data(
    patient_id: str,
    textContent: str = Form(""),
    sourceModality: str = Form("TEXT"),
    provenance: str = Form(""),
    eventTypeInput: str = Form(""),
    mediaFile: UploadFile = File(None),
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM'),
    x_api_key: str = Header(None)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    processed_text = textContent
    modality = sourceModality
    prov = provenance or "Progress Note"

    # Simulated ASR or OCR based on file upload
    if mediaFile:
        filename = mediaFile.filename.lower()
        prov = f"Uploaded File: {mediaFile.filename}"
        
        # Determine modality
        if any(filename.endswith(ext) for ext in ['.wav', '.mp3', '.m4a', '.webm', '.caf']):
            modality = 'VOICE'
            processed_text = textContent or "Transcribed Voice Notes: Patient doing well, started on Pantocid 40mg IV OD. Lab results check: creatinine is down to 2.1 mg/dL, Hb stable at 8.0 g/dL."
        elif any(filename.endswith(ext) for ext in ['.pdf', '.jpg', '.jpeg', '.png']):
            # CT scan / X-ray image ingestion maps visual files directly to findings (V2 update)
            if 'ct' in filename or 'xray' in filename or 'x-ray' in filename or 'scan' in filename:
                modality = 'IMAGE'
                findings = mock_vision_image_extraction(mediaFile.filename)
                processed_text = findings["extractedEntities"]["value"]
                prov = f"Radiology Findings Ingestion: {mediaFile.filename}"
            else:
                modality = 'DOCUMENT'
                processed_text = textContent or "OCR Document Scan: LAB REPORT\nCreatinine: 2.1 mg/dL (High)\nHemoglobin: 8.0 g/dL (Low)\nPlatelets: 150,000 /uL"

    if not processed_text.strip():
        raise HTTPException(status_code=400, detail="No clinical content to parse")

    # Ingestion Pipeline: call NLP to extract Clinical Event Object (CEO)
    extracted_ceo = await extract_clinical_event(processed_text, x_api_key)

    # Save to Database Event Ledger
    final_event_type = eventTypeInput or extracted_ceo.get("eventType") or "NOTE"
    event_id = str(uuid.uuid4())
    
    new_event = ClinicalEvent(
        id=event_id,
        patient_id=patient_id,
        timestamp=datetime.utcnow(),
        event_type=final_event_type,
        source_modality=modality,
        event_data=json.dumps(extracted_ceo.get("extractedEntities", {})),
        provenance=prov,
        author_id=x_user_id,
        author_name=x_user_name,
        author_role=x_user_role
    )
    db.add(new_event)
    db.commit()

    # Rebuild narratives (Continuous Narrative Engine updates)
    all_events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).order_by(ClinicalEvent.timestamp.asc()).all()
    
    # Generate narratives using Gemini or Local fallback
    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "comorbidities": patient.comorbidities,
        "admission_date": patient.admission_date,
        "bed": patient.bed_number
    }

    course_in_hospital = await generate_narrative(patient_dict, all_events, 'courseInHospital', x_api_key)
    medication_journey = await generate_narrative(patient_dict, all_events, 'medicationJourney', x_api_key)
    investigation_journey = await generate_narrative(patient_dict, all_events, 'investigationJourney', x_api_key)
    procedure_journey = await generate_narrative(patient_dict, all_events, 'procedureJourney', x_api_key)

    # Upsert Narrative table
    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    if narrative:
        narrative.course_in_hospital = course_in_hospital
        narrative.medication_journey = medication_journey
        narrative.investigation_journey = investigation_journey
        narrative.procedure_journey = procedure_journey
    else:
        new_nar = Narrative(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            course_in_hospital=course_in_hospital,
            medication_journey=medication_journey,
            investigation_journey=investigation_journey,
            procedure_journey=procedure_journey
        )
        db.add(new_nar)

    # Audit log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="CREATE_EVENT",
        details=f"Ingested {modality} data. Event added: {final_event_type}. Summary: {extracted_ceo.get('summarySnippet')}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "event": {
            "id": new_event.id,
            "eventType": new_event.event_type,
            "sourceModality": new_event.source_modality
        },
        "extractedCEO": extracted_ceo,
        "narrativeUpdated": True
    }

@router.put("/event/{event_id}")
async def update_clinical_event(
    event_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM'),
    x_api_key: str = Header(None)
):
    original = db.query(ClinicalEvent).filter(ClinicalEvent.id == event_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Event not found")

    new_type = payload.get("eventType", original.event_type)
    new_data = payload.get("eventData")
    new_provenance = payload.get("provenance", original.provenance)

    original.event_type = new_type
    original.provenance = new_provenance
    if new_data:
        original.event_data = json.dumps(new_data)

    patient_id = original.patient_id
    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    # Re-compile timeline narratives
    all_events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).order_by(ClinicalEvent.timestamp.asc()).all()
    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "comorbidities": patient.comorbidities,
        "admission_date": patient.admission_date,
        "bed": patient.bed_number
    }

    course_in_hospital = await generate_narrative(patient_dict, all_events, 'courseInHospital', x_api_key)
    medication_journey = await generate_narrative(patient_dict, all_events, 'medicationJourney', x_api_key)
    investigation_journey = await generate_narrative(patient_dict, all_events, 'investigationJourney', x_api_key)
    procedure_journey = await generate_narrative(patient_dict, all_events, 'procedureJourney', x_api_key)

    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    if narrative:
        narrative.course_in_hospital = course_in_hospital
        narrative.medication_journey = medication_journey
        narrative.investigation_journey = investigation_journey
        narrative.procedure_journey = procedure_journey

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="UPDATE_EVENT",
        details=f"Edited clinical event ledger ID {event_id} ({original.event_type})"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "event": {"id": original.id, "eventType": original.event_type}, "narrativeUpdated": True}

@router.delete("/event/{event_id}")
async def delete_clinical_event(
    event_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header('system'),
    x_user_name: str = Header('System'),
    x_user_role: str = Header('SYSTEM'),
    x_api_key: str = Header(None)
):
    event = db.query(ClinicalEvent).filter(ClinicalEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    patient_id = event.patient_id
    db.delete(event)
    db.commit()

    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    # Re-compile timeline narratives
    all_events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).order_by(ClinicalEvent.timestamp.asc()).all()
    patient_dict = {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "comorbidities": patient.comorbidities,
        "admission_date": patient.admission_date,
        "bed": patient.bed_number
    }

    course_in_hospital = await generate_narrative(patient_dict, all_events, 'courseInHospital', x_api_key)
    medication_journey = await generate_narrative(patient_dict, all_events, 'medicationJourney', x_api_key)
    investigation_journey = await generate_narrative(patient_dict, all_events, 'investigationJourney', x_api_key)
    procedure_journey = await generate_narrative(patient_dict, all_events, 'procedureJourney', x_api_key)

    narrative = db.query(Narrative).filter(Narrative.patient_id == patient_id).first()
    if narrative:
        narrative.course_in_hospital = course_in_hospital
        narrative.medication_journey = medication_journey
        narrative.investigation_journey = investigation_journey
        narrative.procedure_journey = procedure_journey

    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=x_user_id,
        user_name=x_user_name,
        user_role=x_user_role,
        action="DELETE_EVENT",
        details=f"Deleted event ID {event_id} ({event.event_type})"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "narrativeUpdated": True}
