import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

// Get all beds and who occupies them
router.get('/', async (req, res) => {
  try {
    const beds = await prisma.bed.findMany({
      orderBy: { bedNumber: 'asc' }
    });
    
    // Fetch patient names for occupied beds
    const patients = await prisma.patient.findMany({
      where: {
        id: { in: beds.map(b => b.patientId).filter(Boolean) }
      },
      select: { id: true, name: true, mrn: true, status: true }
    });

    const patientMap = patients.reduce((acc, curr) => {
      acc[curr.id] = curr;
      return acc;
    }, {});

    const enrichedBeds = beds.map(bed => ({
      ...bed,
      patient: bed.patientId ? patientMap[bed.patientId] || null : null
    }));

    res.json(enrichedBeds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve beds' });
  }
});

// Transfer a patient to another bed
router.post('/transfer', async (req, res) => {
  const { patientId, sourceBed, targetBed } = req.body;
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  if (!patientId || !targetBed) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Check if target bed is occupied
    const target = await prisma.bed.findUnique({ where: { bedNumber: targetBed } });
    if (target && target.patientId) {
      return res.status(400).json({ error: `Target bed ${targetBed} is already occupied` });
    }

    // 1. Release source bed
    if (sourceBed) {
      await prisma.bed.update({
        where: { bedNumber: sourceBed },
        data: { patientId: null }
      });
    }

    // 2. Occupy target bed
    await prisma.bed.update({
      where: { bedNumber: targetBed },
      data: { patientId: patientId }
    });

    // 3. Update patient bed status and location
    const dept = targetBed.startsWith('ICU') ? 'ICU' : 'WARD';
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data: { bed: targetBed, status: dept }
    });

    // 4. Log transfer event in timeline
    await prisma.clinicalEvent.create({
      data: {
        patientId,
        timestamp: new Date(),
        eventType: 'NOTE',
        sourceModality: 'TEXT',
        eventData: JSON.stringify({
          noteText: `Patient transferred from bed ${sourceBed || 'None'} to ${targetBed}.`
        }),
        provenance: 'Census Bed Transfer',
        authorId,
        authorName,
        authorRole
      }
    });

    // 5. Log audit
    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'UPDATE_EVENT',
        details: `Transferred patient ${patient.name} from ${sourceBed || 'None'} to ${targetBed}`
      }
    });

    res.json({ success: true, patient });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to complete bed transfer' });
  }
});

// Upload Census Image (simulation)
router.post('/upload-census', upload.single('censusImage'), async (req, res) => {
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  try {
    // In a real system, OCR would scan the text in the census image.
    // We will simulate OCR processing. Let's assume the OCR results returned:
    // "ICU-3: Rajinder Nath Sharma"
    // And let's assume we have another patient in bed ICU-5 who is NOT in the image.
    
    const patients = await prisma.patient.findMany({
      where: { status: { in: ['ICU', 'WARD'] } }
    });

    const auditChanges = [];
    const confirmRequired = [];

    // Let's inspect the active patients.
    // If they match "Rajinder Nath Sharma", they are confirmed in bed ICU-3.
    // If we had any other patient, they would be marked as "CONFIRM_STATUS".
    // For demonstration, let's create a simulated response showing what was parsed.
    
    for (const p of patients) {
      if (p.name.includes('Rajinder')) {
        auditChanges.push(`Confirmed: ${p.name} in bed ${p.bed}`);
      } else {
        // If there are other active patients, flag them as "CONFIRM_STATUS" if not found.
        // Let's simulate a missing patient
        confirmRequired.push({
          id: p.id,
          name: p.name,
          mrn: p.mrn,
          bed: p.bed,
          status: p.status,
          reason: 'Name was not found in the uploaded census list image. Please verify if discharged, LAMA, or deceased.'
        });

        // Set status to confirm in database
        await prisma.patient.update({
          where: { id: p.id },
          data: { status: 'CONFIRM_STATUS' }
        });

        await prisma.clinicalEvent.create({
          data: {
            patientId: p.id,
            timestamp: new Date(),
            eventType: 'NOTE',
            sourceModality: 'TEXT',
            eventData: JSON.stringify({
              noteText: 'System Alert: Patient name missing in census image rounds list. Status set to Confirm Status (pending discharge verification).'
            }),
            provenance: 'Automated Census Reconciliation',
            authorId: 'system',
            authorName: 'Census Engine',
            authorRole: 'SYSTEM'
          }
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'UPDATE_EVENT',
        details: `Uploaded census rounds list image. Run census auto-reconciliation. Detected ${confirmRequired.length} anomalies.`
      }
    });

    res.json({
      success: true,
      message: 'Census list reconciled successfully.',
      parsedCensus: [
        { bed: 'ICU-3', name: 'Rajinder Nath Sharma', matched: true }
      ],
      confirmRequired,
      confirmedCount: patients.length - confirmRequired.length
    });
  } catch (error) {
    console.error('Census reconciliation error:', error);
    res.status(500).json({ error: 'Failed to reconcile census rounds list' });
  }
});

// Resolve a patient's confirm status (discharged/deceased/LAMA)
router.post('/resolve-status', async (req, res) => {
  const { patientId, resolution } = req.body; // 'WARD', 'ICU', 'DISCHARGED', 'LAMA', 'DECEASED'
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  if (!patientId || !resolution) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const originalBed = patient.bed;

    let updateData = { status: resolution };
    if (['DISCHARGED', 'LAMA', 'DECEASED'].includes(resolution)) {
      updateData.bed = null;
      updateData.dischargeDate = new Date();
      
      // Free the bed
      if (originalBed) {
        await prisma.bed.update({
          where: { bedNumber: originalBed },
          data: { patientId: null }
        });
      }
    } else {
      updateData.status = resolution; // put back in ICU/WARD
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patientId },
      data: updateData
    });

    await prisma.clinicalEvent.create({
      data: {
        patientId,
        timestamp: new Date(),
        eventType: 'NOTE',
        sourceModality: 'TEXT',
        eventData: JSON.stringify({
          noteText: `Reconciliation status resolved. Patient status updated to ${resolution}.`
        }),
        provenance: 'Census Reconciliation Resolution',
        authorId,
        authorName,
        authorRole
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'UPDATE_EVENT',
        details: `Resolved census anomaly for ${patient.name}. Set status to ${resolution}.`
      }
    });

    res.json({ success: true, patient: updatedPatient });
  } catch (error) {
    console.error('Resolve status error:', error);
    res.status(500).json({ error: 'Failed to resolve patient status' });
  }
});

export default router;
