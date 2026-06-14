import json
from ..models import ClinicalEvent, Patient, Narrative

def validate_patient_safety(db, patient_id: str) -> dict:
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"alerts": [], "missingChecks": [], "valid": True}
        
    events = db.query(ClinicalEvent).filter(ClinicalEvent.patient_id == patient_id).all()
    narratives = db.query(Narrative).filter(Narrative.patient_id == patient_id).all()
    narrative = narratives[0] if narratives else None
    
    alerts = []
    missing_checks = []
    
    # Extract diagnoses
    diagnoses = []
    for e in events:
        if e.event_type == 'DIAGNOSIS':
            try:
                data = json.loads(e.event_data)
                diagnoses.append(data.get('diagnosisName', '').lower())
            except Exception:
                pass
                
    # Extract medications
    medications = []
    for e in events:
        if e.event_type == 'MEDICATION':
            try:
                medications.append(json.loads(e.event_data))
            except Exception:
                pass

    # 1. Anticoagulant bleeding contradiction
    active_bleeding = 'hemorrhage' in patient.comorbidities.lower() or 'bleeding' in patient.comorbidities.lower() or \
                      any('hemorrhage' in d or 'bleeding' in d for d in diagnoses)
                      
    active_anticoagulant = None
    for m in medications:
        if m.get('drugName', '').lower() in ['eliquis', 'heparin', 'warfarin', 'clexane'] and \
           m.get('status') in ['started', 'continued']:
            active_anticoagulant = m
            break
            
    if active_bleeding and active_anticoagulant:
      alerts.append({
        "type": "CRITICAL_CONTRADICTION",
        "severity": "CRITICAL",
        "message": f"Clinical Conflict: Anticoagulant ({active_anticoagulant.get('drugName')}) is active while the patient has a diagnosed active pulmonary hemorrhage/bleeding.",
        "suggestedAction": "Hold anticoagulant immediately and review coagulation profile."
      })

    # 2. Dosage Threshold & Renal Adjustment Checks
    for m in medications:
        drug_name = m.get('drugName', '').lower()
        dose_str = m.get('dose', '')
        
        # Steroid limits
        if drug_name in ['solu-medrol', 'methylprednisolone']:
            try:
                dose_val = float(dose_str.replace('mg', '').strip())
                if dose_val > 1000:
                    alerts.append({
                        "type": "DOSAGE_ERROR",
                        "severity": "HIGH",
                        "message": f"Dosage Alert: Methylprednisolone dose ({dose_str}) exceeds recommended safe daily limit (1000mg/day) for pulse therapy.",
                        "suggestedAction": "Reduce dose to 250mg - 1000mg range."
                    })
            except ValueError:
                pass
                
            # Renal check
            if 'ckd' in patient.comorbidities.lower() or 'kidney' in patient.comorbidities.lower():
                alerts.append({
                    "type": "RENAL_ADJUSTMENT",
                    "severity": "MEDIUM",
                    "message": f"Renal Alert: High-dose steroid therapy ({dose_str}) started in a patient with underlying Stage 5 CKD. Monitor volume status and glucose levels closely.",
                    "suggestedAction": "Ensure daily fluid balance and capillary blood glucose monitoring."
                })
                
        # Meropenem CKD check
        if drug_name == 'meropenem':
            if 'ckd' in patient.comorbidities.lower() or 'kidney' in patient.comorbidities.lower():
                if m.get('freq') == 'TDS' and '1g' in m.get('dose', ''):
                    alerts.append({
                        "type": "RENAL_ADJUSTMENT",
                        "severity": "HIGH",
                        "message": "Renal Adjustment Needed: Meropenem 1g TDS is not adjusted for Stage 5 CKD. Standard dose in ESRD is 500mg OD or post-dialysis.",
                        "suggestedAction": "Reduce Meropenem dose to 500mg IV OD (or post-dialysis) and consult Nephrology."
                    })

    # 3. Lab checks
    for e in events:
        if e.event_type == 'INVESTIGATION':
            try:
                data = json.loads(e.event_data)
                lab_name = data.get('labName', '')
                val_str = data.get('value', '0')
                status = data.get('status', '')
                
                if 'Hemoglobin' in lab_name:
                    try:
                        val = float(val_str)
                        if val < 8.0 and 'Low' in status:
                            alerts.append({
                                "type": "CRITICAL_LAB",
                                "severity": "HIGH",
                                "message": f"Critical Lab Value: Hemoglobin is {val_str} g/dL (exceeds transfusion threshold of <7.0-8.0 g/dL for symptomatic patients).",
                                "suggestedAction": "Consider packed red blood cell transfusion and check for active bleeding sites."
                            })
                    except ValueError:
                        pass
                if 'Creatinine' in lab_name:
                    try:
                        val = float(val_str)
                        if val > 3.0 and 'dialysis' in patient.comorbidities.lower():
                            alerts.append({
                                "type": "RENAL_LAB",
                                "severity": "MEDIUM",
                                "message": f"Elevated Creatinine: Creatinine is {val_str} mg/dL. Ensure dialysis schedule is maintained.",
                                "suggestedAction": "Confirm last dialysis session date and check catheter patency."
                            })
                    except ValueError:
                        pass
            except Exception:
                pass

    # 4. Missing Information Detection
    has_diagnosis = len(diagnoses) > 0
    has_meds = len(medications) > 0
    has_follow_up = False
    
    if narrative:
        text_to_check = narrative.course_in_hospital.lower()
        has_follow_up = 'follow' in text_to_check or 'opd' in text_to_check
        
    if not has_diagnosis:
        missing_checks.append({
            "section": "Diagnosis",
            "severity": "HIGH",
            "message": "No primary diagnosis recorded in the active timeline."
        })
    if not has_meds:
        missing_checks.append({
            "section": "Medications",
            "severity": "MEDIUM",
            "message": "No active or home medications logged in the patient record."
        })
    if not has_follow_up:
        missing_checks.append({
            "section": "Follow-Up",
            "severity": "MEDIUM",
            "message": "No follow-up details (date, OPD clinic) found in the course or narrative text."
        })
        
    critical_alerts = [a for a in alerts if a['severity'] in ['CRITICAL', 'HIGH']]
    return {
        "alerts": alerts,
        "missingChecks": missing_checks,
        "valid": len(critical_alerts) == 0
    }
