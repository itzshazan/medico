import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get list of all patients
router.get('/', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        narratives: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get detailed patient by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { timestamp: 'asc' }
        },
        narratives: true
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  const { mrn, name, age, gender, comorbidities, bed, status } = req.body;
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  if (!mrn || !name || !age || !gender || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if patient with MRN already exists
    let patient = await prisma.patient.findUnique({ where: { mrn } });
    if (patient) {
      return res.status(400).json({ error: 'Patient MRN already exists' });
    }

    // Check if bed is already occupied
    if (bed) {
      const activeBed = await prisma.bed.findUnique({ where: { bedNumber: bed } });
      if (activeBed && activeBed.patientId) {
        return res.status(400).json({ error: `Bed ${bed} is already occupied` });
      }
    }

    // Create patient
    patient = await prisma.patient.create({
      data: {
        mrn,
        name,
        age: parseInt(age),
        gender,
        comorbidities: comorbidities || '',
        status,
        bed: bed || null
      }
    });

    // Assign bed if specified
    if (bed) {
      await prisma.bed.update({
        where: { bedNumber: bed },
        data: { patientId: patient.id }
      });
    }

    // Initialize blank narrative
    await prisma.narrative.create({
      data: {
        patientId: patient.id,
        courseInHospital: 'Patient admitted. Course in hospital initialized.',
        medicationJourney: 'No medications recorded.',
        investigationJourney: 'No investigations recorded.',
        procedureJourney: 'No procedures recorded.'
      }
    });

    // Create admission event
    await prisma.clinicalEvent.create({
      data: {
        patientId: patient.id,
        timestamp: new Date(),
        eventType: 'DIAGNOSIS',
        sourceModality: 'TEXT',
        eventData: JSON.stringify({
          diagnosisName: 'Admission Initial Assessment',
          status: 'Active',
          notes: 'Admitted to ward/ICU.'
        }),
        provenance: 'Admission Order',
        authorId,
        authorName,
        authorRole
      }
    });

    // Log the audit
    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'CREATE_EVENT',
        details: `Admitted patient ${name} (MRN: ${mrn}) in bed ${bed || 'None'}`
      }
    });

    res.json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ error: 'Failed to admit patient' });
  }
});

export default router;
