import json
import urllib.request
import urllib.error
from datetime import datetime

# Local heuristic parser for offline/no-key clinical event extraction
def mock_extract_clinical_event(text: str) -> dict:
    normalized = text.lower()
    
    # 1. Medications
    if any(k in normalized for k in ['start', 'give', 'administer', 'hold', 'stop', 'discontinue', 'resume']):
        status = 'started'
        if 'hold' in normalized or 'held' in normalized:
            status = 'held'
        elif 'stop' in normalized or 'discontinue' in normalized:
            status = 'stopped'
        elif 'resume' in normalized:
            status = 'started'
            
        drugs = ['meropenem', 'eliquis', 'solu-medrol', 'methylprednisolone', 'pantocid', 'lasix', 'levosalbutamol', 'budesonide', 'heparin', 'linezolid', 'norad', 'piptaz', 'vasopressin']
        found_drug = 'Unknown Medication'
        for d in drugs:
            if d in normalized:
                found_drug = d.capitalize()
                if d == 'solu-medrol':
                    found_drug = 'Solu-Medrol'
                break
                
        dose = 'standard'
        route = 'oral'
        freq = 'daily'
        
        if 'iv' in normalized: route = 'IV'
        if 'sc' in normalized or 'subcutaneous' in normalized: route = 'SC'
        if 'neb' in normalized: route = 'NEB'
        
        if '1g' in normalized or '1 g' in normalized: dose = '1g'
        elif '500mg' in normalized or '500 mg' in normalized: dose = '500mg'
        elif '5mg' in normalized or '5 mg' in normalized: dose = '5mg'
        elif '40mg' in normalized or '40 mg' in normalized: dose = '40mg'
        
        if 'tds' in normalized or 'three times' in normalized: freq = 'TDS'
        elif 'bd' in normalized or 'twice' in normalized: freq = 'BD'
        elif 'od' in normalized or 'once' in normalized: freq = 'OD'
        
        return {
            "eventType": "MEDICATION",
            "extractedEntities": {
                "drugName": found_drug,
                "dose": dose,
                "route": route,
                "freq": freq,
                "status": status,
                "reason": "active bleeding / safety hold" if status == "held" else "clinical management"
            },
            "confidence": 0.9,
            "flags": ["medication_hold"] if status == "held" else [],
            "summarySnippet": f"Medication {found_drug} {status} ({dose} {route} {freq})"
        }
        
    # 2. Investigations (Labs/Vitals)
    if any(k in normalized for k in ['hb', 'hemoglobin', 'creatinine', 'crp', 'wbc', 'platelet', 'abg', 'oxygen']):
        lab_name = 'Unknown Lab'
        value = 'normal'
        unit = ''
        status = 'Normal'
        flags = []
        
        if 'hb' in normalized or 'hemoglobin' in normalized:
            lab_name = 'Hemoglobin (Hb)'
            unit = 'g/dL'
            value = '7.5'  # Default mock value
            # Extract simple numeric value
            for word in normalized.split():
                try:
                    val = float(word.replace(',', ''))
                    if 4.0 < val < 18.0:
                        value = str(val)
                        break
                except ValueError:
                    pass
            if float(value) < 9.0:
                status = 'Critical Low'
                flags.append('critical_value')
        elif 'creatinine' in normalized:
            lab_name = 'Creatinine'
            unit = 'mg/dL'
            value = '2.4'  # Default mock
            for word in normalized.split():
                try:
                    val = float(word.replace(',', ''))
                    if 0.2 < val < 12.0:
                        value = str(val)
                        break
                except ValueError:
                    pass
            if float(value) > 1.5:
                status = 'High'
                flags.append('high_value')
        elif 'crp' in normalized:
            lab_name = 'CRP'
            unit = 'mg/L'
            value = '45'
            if 'crp' in normalized:
                status = 'Elevated'
                
        return {
            "eventType": "INVESTIGATION",
            "extractedEntities": {
                "labName": lab_name,
                "value": value,
                "unit": unit,
                "status": status,
                "notes": f"Seeded value."
            },
            "confidence": 0.95,
            "flags": flags,
            "summarySnippet": f"{lab_name} level: {value} {unit} ({status})"
        }

    # 3. Procedures
    if any(k in normalized for k in ['intubat', 'extubat', 'cath', 'dialysis', 'bronchoscopy']):
        proc_name = 'Procedure'
        if 'intubat' in normalized: proc_name = 'Endotracheal Intubation'
        elif 'extubat' in normalized: proc_name = 'Extubation'
        elif 'dialysis' in normalized or 'hemodialysis' in normalized: proc_name = 'Hemodialysis'
        elif 'bronchoscopy' in normalized: proc_name = 'Flexible Bronchoscopy'
        elif 'cath' in normalized: proc_name = 'Central Venous Catheterization'
        
        return {
            "eventType": "PROCEDURE",
            "extractedEntities": {
                "procedureName": proc_name,
                "status": "Completed",
                "notes": text
            },
            "confidence": 0.9,
            "flags": [],
            "summarySnippet": f"Procedure performed: {proc_name}"
        }

    # 4. Consultations
    if any(k in normalized for k in ['consult', 'referral', 'specialist', 'nephro', 'cardio', 'neuro']):
        spec = 'General Consultation'
        if 'nephro' in normalized: spec = 'Nephrology Consult'
        elif 'cardio' in normalized: spec = 'Cardiology Consult'
        elif 'neuro' in normalized: spec = 'Neurology Consult'
        
        return {
            "eventType": "CONSULTATION",
            "extractedEntities": {
                "specialty": spec,
                "notes": text
            },
            "confidence": 0.85,
            "flags": [],
            "summarySnippet": f"Specialist Consultation: {spec}"
        }

    # 5. Diagnosis
    if any(k in normalized for k in ['diagnos', 'admit', 'present with', 'pneumonia', 'bleeding', 'hemorrhage', 'copd', 'asthma']):
        diag = 'Clinical Condition'
        if 'pneumonia' in normalized: diag = 'Pneumonia'
        elif 'hemorrhage' in normalized or 'bleeding' in normalized: diag = 'Diffuse Alveolar Hemorrhage'
        elif 'ckd' in normalized or 'kidney' in normalized: diag = 'Chronic Kidney Disease'
        
        return {
            "eventType": "DIAGNOSIS",
            "extractedEntities": {
                "diagnosisName": diag,
                "status": "Active",
                "notes": text
            },
            "confidence": 0.85,
            "flags": [],
            "summarySnippet": f"Diagnosis recorded: {diag}"
        }

    return {
        "eventType": "NOTE",
        "extractedEntities": {
            "content": text
        },
        "confidence": 0.8,
        "flags": [],
        "summarySnippet": "Clinical progress update logged."
    }

# Vision model analysis simulator for CT/X-Ray image uploads
def mock_vision_image_extraction(filename: str) -> dict:
    fname = filename.lower()
    findings = "Bilateral chest consolidation, ground-glass opacities, resolving pulmonary edema."
    
    if 'xray' in fname or 'x-ray' in fname:
        findings = "Bilateral ground-glass opacities in lower zones. No pneumothorax. Heart size normal."
    elif 'ct' in fname:
        findings = "Chest CT confirms diffuse alveolar infiltrates and patchy consolidation bilaterally. Consistent with severe Diffuse Alveolar Hemorrhage (DAH)."
        
    return {
        "eventType": "INVESTIGATION",
        "extractedEntities": {
            "labName": "Radiological Imaging (Vision scan)",
            "value": findings,
            "unit": "Scan Findings",
            "status": "Abnormal",
            "notes": f"Scanned file metadata: {filename}"
        },
        "confidence": 0.9,
        "flags": ["abnormal_imaging"],
        "summarySnippet": f"Radiological Scan parsed: {findings[:50]}..."
    }

async def extract_clinical_event(text: str, api_key: str = None) -> dict:
    if not api_key or api_key in ("", "null", "undefined"):
        import os
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if not api_key:
        return mock_extract_clinical_event(text)
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    prompt = f"""You are an expert clinical documentation AI. Parse the following clinical text and extract structured medical event data in JSON format.
                  
Your output MUST be a valid JSON object matching this schema:
{{
  "eventType": "DIAGNOSIS" | "MEDICATION" | "PROCEDURE" | "INVESTIGATION" | "CONSULTATION" | "NOTE",
  "extractedEntities": {{
    // For DIAGNOSIS:
    "diagnosisName": string,
    "status": string ("Active", "Resolved", "Suspected"),
    // For MEDICATION:
    "drugName": string,
    "dose": string,
    "route": string,
    "freq": string,
    "status": string ("started", "held", "stopped", "continued"),
    "reason": string,
    // For PROCEDURE:
    "procedureName": string,
    "status": string,
    // For INVESTIGATION:
    "labName": string,
    "value": string,
    "unit": string,
    "status": string ("Normal", "High", "Low", "Critical Low"),
    // For CONSULTATION:
    "specialty": string,
    // For General NOTE:
    "content": string,
    "notes": string
  }},
  "confidence": number (0.0 to 1.0),
  "flags": string[] (e.g. "critical_value", "medication_hold", "conflict"),
  "summarySnippet": string (A one-line clinical summary sentence, e.g. "Eliquis held due to active pulmonary bleeding.")
}}

Return ONLY raw JSON. Do not include markdown code block formatting.

Clinical text to parse:
"{text}"
"""
    data = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            result_text = res_data['candidates'][0]['content']['parts'][0]['text']
            
            # Clean possible markdown block markers
            cleaned = result_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
                
            return json.loads(cleaned.strip())
    except Exception as e:
        print(f"Error in Gemini extract API, fallback to mock: {e}")
        return mock_extract_clinical_event(text)

async def generate_narrative(patient_details: dict, events: list, type_str: str, api_key: str = None) -> str:
    # Format timeline context
    timeline_desc = []
    for e in events:
        date_str = e.timestamp.strftime("%d %b %Y")
        try:
            data = json.loads(e.event_data)
        except Exception:
            data = {}
        timeline_desc.append(f"[{date_str}] ({e.event_type}) by {e.author_name}: {e.provenance} - {data.get('noteText') or json.dumps(data)}")
    timeline_text = "\n".join(timeline_desc)

    if not api_key or api_key in ("", "null", "undefined"):
        import os
        api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        # Static local template compiler
        meds = [e for e in events if e.event_type == 'MEDICATION']
        labs = [e for e in events if e.event_type == 'INVESTIGATION']
        procs = [e for e in events if e.event_type == 'PROCEDURE']
        
        if type_str == 'medicationJourney':
            med_text = "Active Medications Tracker:\n"
            for idx, m in enumerate(meds):
                try:
                    data = json.loads(m.event_data)
                except Exception:
                    data = {}
                med_text += f"{idx + 1}. {data.get('drugName')} {data.get('dose')} {data.get('route', '')} {data.get('freq', '')} - {data.get('status', '').upper()} ({data.get('reason', 'Management')})\n"
            return med_text if meds else "No active medications."
            
        elif type_str == 'investigationJourney':
            lab_text = "Laboratory Trends:\n"
            for l in labs:
                try:
                    data = json.loads(l.event_data)
                except Exception:
                    data = {}
                lab_text += f"- {l.timestamp.strftime('%Y-%m-%d')}: {data.get('labName')} {data.get('value')} {data.get('unit', '')} ({data.get('status')})\n"
            return lab_text if labs else "No lab investigations logged."
            
        elif type_str == 'procedureJourney':
            proc_text = "Procedures Ledger:\n"
            for p in procs:
                try:
                    data = json.loads(p.event_data)
                except Exception:
                    data = {}
                proc_text += f"- {p.timestamp.strftime('%Y-%m-%d')}: {data.get('procedureName')} - {data.get('status')}\n"
            return proc_text if procs else "No procedures performed."
            
        # Default Course in Hospital
        return f"Patient {patient_details['name']} ({patient_details['age']}yo {patient_details['gender']}), admitted on {patient_details['admission_date'].strftime('%Y-%m-%d')} with comorbidities: {patient_details['comorbidities']}.\n\n" + \
               "Hospital Course Timeline Notes:\n" + \
               "\n".join([f"- {e.timestamp.strftime('%b %d')}: {json.loads(e.event_data).get('summarySnippet') or e.provenance}" for e in events])

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    
    prompt_instruction = ""
    if type_str == 'courseInHospital':
        prompt_instruction = "Generate a detailed, continuous, chronological narrative of the patient's hospital course in formal medical prose. Summarize diagnoses, clinical deterioration, stabilization, medication logic, laboratory results, and investigations. Include specialist consultations. Format as a cohesive paragraph."
    elif type_str == 'medicationJourney':
        prompt_instruction = "Generate a summarized Medication Journey. List and explain started, held, and stopped medications with their respective clinical reasons based on the timeline."
    elif type_str == 'investigationJourney':
        prompt_instruction = "Generate a summary of laboratory and diagnostic investigation trends. Focus on key biometrics (e.g., Creatinine, Hemoglobin, CRP) and mention values chronologically."
    else:
        prompt_instruction = "Generate a chronological list of procedures performed on the patient, detailing their status and indications."

    prompt = f"""You are an elite pulmonology and critical care clinical documentation assistant.
                  
Patient Details:
- Name: {patient_details['name']}
- Age: {patient_details['age']}
- Gender: {patient_details['gender']}
- Comorbidities: {patient_details['comorbidities']}
- Admission Date: {patient_details['admission_date'].strftime('%Y-%m-%d')}

Patient Timeline Events:
{timeline_text}

Task:
{prompt_instruction}

Write a high-quality clinical narrative summary in professional medical terminology. Do NOT mention LLMs, instructions, or prompts. Return ONLY the clinical narrative text.
"""
    
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        print(f"Error generating narrative: {e}")
        return "Narrative generation failed."
