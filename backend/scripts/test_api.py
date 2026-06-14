import urllib.request
import urllib.parse
import json
import sys

def run_tests():
    print("--- STARTING BACKEND REST API INTEGRATION TESTS (PYTHON) ---")
    base_url = "http://localhost:5000/api"
    
    # helper for requests
    def make_req(path, method="GET", headers=None, body=None):
        url = f"{base_url}{path}"
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)
            
        data = None
        if body:
            if req_headers.get('Content-Type') == 'application/x-www-form-urlencoded':
                data = urllib.parse.urlencode(body).encode('utf-8')
            else:
                data = json.dumps(body).encode('utf-8')
                
        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            try:
                err_data = json.loads(e.read().decode('utf-8'))
            except Exception:
                err_data = e.reason
            return e.code, err_data
        except Exception as e:
            return 500, str(e)

    # 1. Health check
    code, res = make_req("/health")
    assert code == 200, f"Health check failed with code {code}: {res}"
    assert res.get("status") == "OK", f"Health status not OK: {res}"
    print("PASS: Health Check")

    # 2. Get Users
    code, users = make_req("/auth/users")
    assert code == 200, f"Failed to get users: {users}"
    print(f"PASS: Fetched {len(users)} clinical users successfully.")
    
    physician = next(u for u in users if u["role"] == "PHYSICIAN")
    nurse = next(u for u in users if u["role"] == "NURSE")
    print(f"    - Testing with Physician: {physician['name']} and Nurse: {nurse['name']}")

    # 3. Get Patients
    code, patients = make_req("/patients")
    assert code == 200, f"Failed to get patients: {patients}"
    assert len(patients) > 0, "No patients found"
    patient = patients[0]
    print(f"PASS: Active patients count in DB: {len(patients)}")
    print(f"    - Active testing patient: {patient['name']} (MRN: {patient['mrn']})")

    # 4. RBAC: Nurse editing clinical narratives (should return 403 Forbidden)
    headers = {
        'x-user-id': nurse['id'],
        'x-user-name': nurse['name'],
        'x-user-role': nurse['role']
    }
    code, res = make_req(f"/narrative/patient/{patient['id']}", method="PUT", headers=headers, body={
        "courseInHospital": "Unauthorized change by Nurse"
    })
    assert code == 403, f"RBAC failed, allowed nurse to edit narrative: {code} {res}"
    print("PASS: Nurse blocked from editing narratives (403 Forbidden)")

    # 5. Ingest progress note (Form data)
    headers = {
        'x-user-id': physician['id'],
        'x-user-name': physician['name'],
        'x-user-role': physician['role'],
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    body = {
        'textContent': 'Started Meropenem 1g IV TDS due to severe pneumonia.',
        'sourceModality': 'TEXT',
        'provenance': 'Physician Ward Progress Note Day 2'
    }
    print("Ingesting clinical progress note: 'Started Meropenem 1g IV TDS...'")
    code, res = make_req(f"/ingest/patient/{patient['id']}", method="POST", headers=headers, body=body)
    assert code == 200, f"Ingestion failed: {code} {res}"
    assert res["success"] is True, f"Ingest success is false: {res}"
    assert res["event"]["eventType"] == "MEDICATION", f"Unexpected event type: {res}"
    print("PASS: Ingestion pipeline: Clinical notes parsed and event categorized")

    # 6. Safety check validations (Renal adjustment alert for Meropenem TDS in CKD)
    code, res = make_req(f"/safety/patient/{patient['id']}")
    assert code == 200, f"Safety check endpoint failed: {code} {res}"
    
    alerts = res.get("alerts", [])
    renal_alerts = [a for a in alerts if a["type"] == "RENAL_ADJUSTMENT"]
    assert len(renal_alerts) > 0, "No renal adjustment dosage warnings triggered!"
    print("PASS: Safety Validator: dosage adjustment warning triggered for Stage 5 CKD")
    for a in renal_alerts:
        print(f"    - Warn: {a['message']} -> Action: {a['suggestedAction']}")
        
    print("--- ALL BACKEND INTEGRATION TESTS COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    run_tests()
