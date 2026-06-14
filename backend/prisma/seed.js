import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany({});
  await prisma.narrative.deleteMany({});
  await prisma.clinicalEvent.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.bed.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const userPhysician = await prisma.user.create({
    data: {
      username: 'deepak',
      name: 'Dr. Deepak Bhasin',
      role: 'PHYSICIAN',
      specialty: 'Pulmonology',
    },
  });

  const userNurse = await prisma.user.create({
    data: {
      username: 'harpal',
      name: 'Nurse Harpal Singh',
      role: 'NURSE',
    },
  });

  const userSpecialist = await prisma.user.create({
    data: {
      username: 'shalini',
      name: 'Dr. Shalini (Nephrologist)',
      role: 'SPECIALIST',
      specialty: 'Nephrology',
    },
  });

  console.log('Users seeded successfully:', {
    physician: userPhysician.username,
    nurse: userNurse.username,
    specialist: userSpecialist.username,
  });

  // 3. Create Beds
  // 16 ICU beds
  const beds = [];
  for (let i = 1; i <= 16; i++) {
    beds.push({ bedNumber: `ICU-${i}`, department: 'ICU' });
  }
  // 2 Ward beds
  beds.push({ bedNumber: 'Ward-1', department: 'WARD' });
  beds.push({ bedNumber: 'Ward-2', department: 'WARD' });

  for (const bed of beds) {
    await prisma.bed.create({ data: bed });
  }
  console.log(`Seeded ${beds.length} beds.`);

  // 4. Create Active Patient: Mr. Rajinder Nath Sharma
  const patient = await prisma.patient.create({
    data: {
      mrn: 'MRN-882194',
      name: 'Rajinder Nath Sharma',
      age: 81,
      gender: 'Male',
      comorbidities: 'Coronary Artery Disease (CAD), Post-CABG, status post CVA, Chronic Kidney Disease (CKD) on maintenance hemodialysis',
      status: 'ICU',
      bed: 'ICU-3',
      admissionDate: new Date('2026-05-24T10:00:00.000Z'),
    },
  });

  // Assign patient to bed ICU-3
  await prisma.bed.update({
    where: { bedNumber: 'ICU-3' },
    data: { patientId: patient.id },
  });

  console.log(`Seeded patient Mr. Rajinder Nath Sharma in ICU-3.`);

  // 5. Seed clinical events for Mr. Rajinder Nath Sharma (Day 1 - May 24, 2026)
  const day1Date = new Date('2026-05-24T10:30:00.000Z');

  const events = [
    {
      patientId: patient.id,
      timestamp: day1Date,
      eventType: 'DIAGNOSIS',
      sourceModality: 'TEXT',
      eventData: JSON.stringify({
        diagnosisName: 'Diffuse Alveolar Hemorrhage',
        status: 'Active',
        severity: 'Severe',
        notes: 'Admitted with hemoptysis and progressive dyspnea. Chest X-ray showed bilateral lung infiltrates.'
      }),
      provenance: 'EMR Inital Assessment Note - Dr. Deepak Bhasin',
      authorId: userPhysician.id,
      authorName: userPhysician.name,
      authorRole: userPhysician.role,
    },
    {
      patientId: patient.id,
      timestamp: new Date('2026-05-24T11:00:00.000Z'),
      eventType: 'MEDICATION',
      sourceModality: 'TEXT',
      eventData: JSON.stringify({
        drugName: 'Eliquis',
        dose: '5mg',
        route: 'Oral',
        freq: 'BD',
        status: 'held',
        reason: 'Diffuse Alveolar Hemorrhage (DAH) / Active lung bleeding'
      }),
      provenance: 'Admission Order - Dr. Deepak Bhasin',
      authorId: userPhysician.id,
      authorName: userPhysician.name,
      authorRole: userPhysician.role,
    },
    {
      patientId: patient.id,
      timestamp: new Date('2026-05-24T11:15:00.000Z'),
      eventType: 'MEDICATION',
      sourceModality: 'TEXT',
      eventData: JSON.stringify({
        drugName: 'Solu-Medrol',
        dose: '500mg',
        route: 'IV',
        freq: 'Once daily',
        status: 'started',
        durationDays: 3,
        reason: 'Pulse steroid therapy for severe Diffuse Alveolar Hemorrhage (DAH)'
      }),
      provenance: 'Admission Order - Dr. Deepak Bhasin',
      authorId: userPhysician.id,
      authorName: userPhysician.name,
      authorRole: userPhysician.role,
    },
    {
      patientId: patient.id,
      timestamp: new Date('2026-05-24T12:00:00.000Z'),
      eventType: 'INVESTIGATION',
      sourceModality: 'DOCUMENT',
      eventData: JSON.stringify({
        labName: 'Hemoglobin (Hb)',
        value: '7.8',
        unit: 'g/dL',
        status: 'Critical Low',
        normalRange: '13.0 - 17.0 g/dL',
        notes: 'Patient exhibits drop in Hemoglobin from baseline 10.2 g/dL due to DAH.'
      }),
      provenance: 'Lab Report - Haematology',
      authorId: userNurse.id,
      authorName: userNurse.name,
      authorRole: userNurse.role,
    },
    {
      patientId: patient.id,
      timestamp: new Date('2026-05-24T12:10:00.000Z'),
      eventType: 'INVESTIGATION',
      sourceModality: 'DOCUMENT',
      eventData: JSON.stringify({
        labName: 'Creatinine',
        value: '3.8',
        unit: 'mg/dL',
        status: 'High',
        normalRange: '0.6 - 1.2 mg/dL',
        notes: 'Underlying CKD on dialysis. Hemodialysis schedule: Tuesday, Thursday, Saturday.'
      }),
      provenance: 'Lab Report - Biochemistry',
      authorId: userNurse.id,
      authorName: userNurse.name,
      authorRole: userNurse.role,
    },
    {
      patientId: patient.id,
      timestamp: new Date('2026-05-24T14:30:00.000Z'),
      eventType: 'NOTE',
      sourceModality: 'VOICE',
      eventData: JSON.stringify({
        noteText: 'Rounds summary: Patient started on oxygen support via high-flow nasal cannula. Pulse methylprednisolone administered. Checked hemoglobin; it is stable at 7.8 for now, will monitor closely. Dialysis catheter insertion site is clean, hemodialysis scheduled for tomorrow.'
      }),
      provenance: 'Voice Dictation - Dr. Deepak Bhasin',
      authorId: userPhysician.id,
      authorName: userPhysician.name,
      authorRole: userPhysician.role,
    }
  ];

  for (const event of events) {
    await prisma.clinicalEvent.create({ data: event });
  }
  console.log(`Seeded ${events.length} initial clinical events.`);

  // 6. Create initial narrative
  await prisma.narrative.create({
    data: {
      patientId: patient.id,
      courseInHospital: 'Patient admitted on May 24, 2026 with severe Diffuse Alveolar Hemorrhage (DAH) presenting as dyspnea and hemoptysis. Active comorbidities include Coronary Artery Disease (CAD), post-CABG, status post CVA, and Stage 5 Chronic Kidney Disease (CKD) on maintenance hemodialysis. Home anticoagulant Eliquis was immediately held due to pulmonary hemorrhage. Started on pulse steroid therapy with Solu-Medrol 500mg IV daily for 3 days. Baseline labs showed a drop in Hemoglobin to 7.8 g/dL and elevated serum Creatinine at 3.8 mg/dL.',
      medicationJourney: '1. Eliquis 5mg BD: Held on admission (May 24, 2026) due to active pulmonary bleeding.\n2. Solu-Medrol 500mg IV daily: Started on May 24, 2026 for Pulse steroid therapy.',
      investigationJourney: 'May 24, 2026: Hemoglobin 7.8 g/dL (Critical Low), Creatinine 3.8 mg/dL (High). Baseline chest X-ray confirms bilateral ground-glass opacities.',
      procedureJourney: 'May 24, 2026: Intravenous access established; supplemental oxygen therapy initiated via HFNC.'
    }
  });
  console.log('Seeded initial patient narrative.');

  // 7. Seed audit logs
  await prisma.auditLog.create({
    data: {
      userId: userPhysician.id,
      userName: userPhysician.name,
      userRole: userPhysician.role,
      action: 'LOGIN',
      details: 'Logged in to the Medico Agent platform'
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: userPhysician.id,
      userName: userPhysician.name,
      userRole: userPhysician.role,
      action: 'CREATE_EVENT',
      details: 'Imported EMR Initial Assessment, created patient MRN-882194, and logged admission events'
    }
  });

  console.log('Seeded audit logs. Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
