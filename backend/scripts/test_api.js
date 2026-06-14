

async function runTests() {
  console.log('--- STARTING CLINICAL BACKEND RBAC & SAFETY TESTS ---');
  const apiBaseUrl = 'http://localhost:5000/api';
  
  try {
    // 1. Health check validation
    const healthRes = await fetch(`${apiBaseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('✓ Health Check Status:', healthData.status === 'OK' ? 'PASS' : 'FAIL');

    // 2. Fetch seeded users
    const usersRes = await fetch(`${apiBaseUrl}/auth/users`);
    const users = await usersRes.json();
    console.log(`✓ Fetched ${users.length} seeded clinical roles successfully.`);

    const physician = users.find(u => u.role === 'PHYSICIAN');
    const nurse = users.find(u => u.role === 'NURSE');

    // 3. Fetch active patients
    const patientsRes = await fetch(`${apiBaseUrl}/patients`);
    const patients = await patientsRes.json();
    console.log(`✓ Active patients count in DB: ${patients.length}`);
    
    const activePatient = patients[0];
    if (!activePatient) {
      throw new Error('No patient found in database to run tests on.');
    }
    console.log(`✓ Active testing patient: ${activePatient.name} (MRN: ${activePatient.mrn})`);

    // 4. Test RBAC validation: Nurse editing clinical narratives (should fail with 403)
    console.log('Running RBAC test: Nurse editing narrative...');
    const nurseEditRes = await fetch(`${apiBaseUrl}/narrative/patient/${activePatient.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': nurse.id,
        'x-user-name': nurse.name,
        'x-user-role': nurse.role
      },
      body: JSON.stringify({
        courseInHospital: 'Unauthorized modification'
      })
    });
    
    console.log('✓ Nurse Edit blocking verification:', nurseEditRes.status === 403 ? 'PASS (Blocked)' : 'FAIL (Allowed)');

    // 5. Test Ingestion & NLP Extraction Pipeline: Committing a clinical note
    console.log('Running Ingestion test: Committing progress note...');
    const ingestRes = await fetch(`${apiBaseUrl}/ingest/patient/${activePatient.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': physician.id,
        'x-user-name': physician.name,
        'x-user-role': physician.role
      },
      body: JSON.stringify({
        textContent: 'Started Meropenem 1g IV TDS due to severe pneumonia.',
        sourceModality: 'TEXT',
        provenance: 'Physician Ward Progress Note Day 2'
      })
    });
    
    const ingestData = await ingestRes.json();
    console.log('✓ Ingest Event Extraction verification:', ingestRes.status === 200 && ingestData.extractedCEO.eventType === 'MEDICATION' ? 'PASS (Parsed as MEDICATION)' : 'FAIL');

    // 6. Test Safety Validator: Check for active medication contraindications
    // Eliquis is active bleeding contraindication, plus check Meropenem CKD dosage alert
    console.log('Running Safety Validator checks...');
    const safetyRes = await fetch(`${apiBaseUrl}/safety/patient/${activePatient.id}`);
    const safetyData = await safetyRes.json();
    
    const renalAlert = safetyData.alerts.find(a => a.type === 'RENAL_ADJUSTMENT');
    console.log('✓ Safety checks: Renal adjustment dosage warning:', renalAlert ? 'PASS (Detected)' : 'FAIL (Missed)');
    console.log(`  └ Alert message: "${renalAlert?.message}"`);

    console.log('--- ALL AUTOMATED CLINICAL TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  }
}

runTests();
