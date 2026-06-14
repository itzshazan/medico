import sys
import os
import json
import uuid
from datetime import datetime, timedelta

# Add backend directory to path so we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal, engine, Base
from app.models import User, Patient, Bed, ClinicalEvent, Narrative, AuditLog

def seed_db():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine) # clean start
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding users...")
        users = [
            User(
                id=str(uuid.uuid4()),
                username="deepak",
                name="Dr. Deepak R.",
                role="PHYSICIAN",
                specialty="Pulmonology",
<<<<<<< HEAD
                email="deepak@medico.com",
                password="password123"
=======
                clerk_id=None
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
            ),
            User(
                id=str(uuid.uuid4()),
                username="harpal",
                name="Nurse Harpal S.",
                role="NURSE",
<<<<<<< HEAD
                email="harpal@medico.com",
                password="password123"
=======
                clerk_id=None
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
            ),
            User(
                id=str(uuid.uuid4()),
                username="shalini",
                name="Dr. Shalini K.",
                role="SPECIALIST",
                specialty="Nephrology",
<<<<<<< HEAD
                email="shalini@medico.com",
                password="password123"
=======
                clerk_id=None
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
            )
        ]
        for u in users:
            db.add(u)
            
        print("Seeding beds...")
        # 16 ICU beds
        beds = []
        for i in range(1, 17):
            beds.append(Bed(bed_number=f"ICU-{i}", department="ICU"))
        # 2 Ward beds
        for i in range(1, 3):
            beds.append(Bed(bed_number=f"WARD-{i}", department="WARD"))
            
        for b in beds:
            db.add(b)
            
        # Seed patient Rajinder Nath Sharma
        print("Seeding active patient: Rajinder Nath Sharma...")
        patient_id = "rajinder-sharma-uuid" # Fixed ID for consistency in seed/testing
        
        sample_milestones = json.dumps([
            {"id": "m1", "title": "Complete 3-day high-dose pulse steroid therapy", "completed": True, "dateCompleted": (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {"id": "m2", "title": "Hemodialysis catheter placement check", "completed": True, "dateCompleted": (datetime.utcnow() - timedelta(days=2)).isoformat()},
            {"id": "m3", "title": "Wean from high-flow oxygen support to room air", "completed": False},
            {"id": "m4", "title": "Repeat Chest CT to verify resolving alveolar infiltrates", "completed": False},
            {"id": "m5", "title": "Draft final clinical discharge summary", "completed": False}
        ])
        
        rajinder = Patient(
            id=patient_id,
            mrn="MRN-948273",
            name="Rajinder Nath Sharma",
            age=68,
            gender="Male",
            comorbidities="CKD Stage 5 on maintenance hemodialysis, Hypertension, Type 2 Diabetes Mellitus, CAD status post PCI.",
            status="ACTIVE_CARE",
            bed_number="ICU-3",
            admission_date=datetime.utcnow() - timedelta(days=3),
            discharge_date=None,
<<<<<<< HEAD
=======
            clerk_id=None,
>>>>>>> 206159d5bef952df153fa24e863b8922cd7de729
            estimated_discharge_date=datetime.utcnow() + timedelta(days=4),
            milestones=sample_milestones
        )
        db.add(rajinder)
        
        # Link ICU-3 bed to Rajinder
        for b in beds:
            if b.bed_number == "ICU-3":
                b.patient_id = patient_id
                
        # Seed Narrative
        narrative = Narrative(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            course_in_hospital="68-year-old male with Stage 5 CKD, CAD, and HTN admitted on 11 Jun 2026 with severe dyspnea and hemoptysis. Chest CT showed bilateral diffuse alveolar infiltrates diagnostic of Diffuse Alveolar Hemorrhage (DAH). Started on high-dose methylprednisolone pulse therapy for 3 days. Patient remains hemodynamically stable in ICU-3, receiving maintenance hemodialysis.",
            medication_journey="Home anticoagulant Eliquis 5mg BD was held on admission (11 Jun 2026) due to active pulmonary bleeding. Pulse steroid therapy (Solu-Medrol 500mg IV OD) was initiated on 11 Jun 2026 and completed on 13 Jun 2026. Pantocid 40mg IV OD started for GI prophylaxis. Renal adjustments made for all other meds.",
            investigation_journey="Hemoglobin dropped to 7.5 g/dL on admission, stable at 8.0 g/dL post-admission. Creatinine elevated at 3.8 mg/dL on admission, consistent with ESKD. Chest CT on 13 Jun 2026 showed resolving consolidation bilaterally.",
            procedure_journey="Right internal jugular hemodialysis catheter checked. Completed a 3-hour session of maintenance hemodialysis on 12 Jun 2026 with 1.5L ultrafiltration, no hypotension or complications noted."
        )
        db.add(narrative)
        
        # Get users mapping for author details
        phys_user = [u for u in users if u.role == "PHYSICIAN"][0]
        nurse_user = [u for u in users if u.role == "NURSE"][0]
        spec_user = [u for u in users if u.role == "SPECIALIST"][0]
        
        # Seed events
        events = [
            # 1. Admission
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=3),
                event_type="DIAGNOSIS",
                source_modality="TEXT",
                event_data=json.dumps({
                    "diagnosisName": "Diffuse Alveolar Hemorrhage (DAH)",
                    "status": "Active",
                    "notes": "Suspected pulmonary vasculitis. Admitted due to acute progressive dyspnea and hemoptysis."
                }),
                provenance="Emergency Department Admission Note",
                author_id=phys_user.id,
                author_name=phys_user.name,
                author_role=phys_user.role
            ),
            # 2. investigation - creatinine
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=2, hours=22),
                event_type="INVESTIGATION",
                source_modality="DOCUMENT",
                event_data=json.dumps({
                    "labName": "Creatinine",
                    "value": "3.8",
                    "unit": "mg/dL",
                    "status": "High",
                    "notes": "Reflects baseline ESRD (Stage 5 CKD)."
                }),
                provenance="Admission Blood Panel",
                author_id=nurse_user.id,
                author_name=nurse_user.name,
                author_role=nurse_user.role
            ),
            # 3. investigation - Hb
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=2, hours=21),
                event_type="INVESTIGATION",
                source_modality="DOCUMENT",
                event_data=json.dumps({
                    "labName": "Hemoglobin (Hb)",
                    "value": "7.5",
                    "unit": "g/dL",
                    "status": "Critical Low",
                    "notes": "Drop from baseline 10.2 g/dL. Consonant with active bleeding."
                }),
                provenance="Admission Blood Panel",
                author_id=nurse_user.id,
                author_name=nurse_user.name,
                author_role=nurse_user.role
            ),
            # 4. Medication - Eliquis held
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=2, hours=20),
                event_type="MEDICATION",
                source_modality="TEXT",
                event_data=json.dumps({
                    "drugName": "Eliquis",
                    "dose": "5mg",
                    "route": "oral",
                    "freq": "BD",
                    "status": "stopped",
                    "reason": "Active hemorrhage / pulmonary bleeding"
                }),
                provenance="Physician Direct Order",
                author_id=phys_user.id,
                author_name=phys_user.name,
                author_role=phys_user.role
            ),
            # 5. Medication - Solu-Medrol started
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=2, hours=19),
                event_type="MEDICATION",
                source_modality="TEXT",
                event_data=json.dumps({
                    "drugName": "Solu-Medrol",
                    "dose": "500mg",
                    "route": "IV",
                    "freq": "OD",
                    "status": "started",
                    "reason": "Immunosuppression for diffuse alveolar hemorrhage"
                }),
                provenance="Pulse Steroid Order",
                author_id=phys_user.id,
                author_name=phys_user.name,
                author_role=phys_user.role
            ),
            # 6. Consultation
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=1, hours=14),
                event_type="CONSULTATION",
                source_modality="TEXT",
                event_data=json.dumps({
                    "specialty": "Nephrology Consult",
                    "notes": "Evaluated by Dr. Shalini K. Plan: Continue maintenance hemodialysis thrice weekly. Monitor volume status. Strictly adjust renally cleared drugs."
                }),
                provenance="Nephrology Consult Note",
                author_id=spec_user.id,
                author_name=spec_user.name,
                author_role=spec_user.role
            ),
            # 7. Procedure
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(days=1, hours=10),
                event_type="PROCEDURE",
                source_modality="TEXT",
                event_data=json.dumps({
                    "procedureName": "Hemodialysis",
                    "status": "Completed",
                    "notes": "Thrice weekly session. 1.5L fluid removed. No hemodynamically unstable episodes."
                }),
                provenance="ICU Hemodialysis Flowsheet",
                author_id=nurse_user.id,
                author_name=nurse_user.name,
                author_role=nurse_user.role
            ),
            # 8. Imaging
            ClinicalEvent(
                id=str(uuid.uuid4()),
                patient_id=patient_id,
                timestamp=datetime.utcnow() - timedelta(hours=18),
                event_type="INVESTIGATION",
                source_modality="IMAGE",
                event_data=json.dumps({
                    "labName": "Radiological Imaging (Vision scan)",
                    "value": "Chest CT shows diffuse alveolar infiltrates and patchy consolidation bilaterally. Suggestive of resolving DAH.",
                    "unit": "Scan Findings",
                    "status": "Abnormal",
                    "notes": "Chest CT Scan"
                }),
                provenance="Radiology Report Ingestion",
                author_id=phys_user.id,
                author_name=phys_user.name,
                author_role=phys_user.role
            )
        ]
        
        for e in events:
            db.add(e)
            
        db.commit()
        print("Database successfully seeded with users, beds, active patient, narratives, and event history!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
