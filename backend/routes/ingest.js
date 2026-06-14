import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { extractClinicalEvent, generateNarrative } from '../utils/nlp.js';

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

// Ingestion Endpoint (handles text input, audio file upload, or document PDF upload)
router.post('/patient/:patientId', upload.single('mediaFile'), async (req, res) => {
  const { patientId } = req.params;
  const { textContent, sourceModality, provenance, eventTypeInput } = req.body;
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    let processedText = textContent || '';
    let modality = sourceModality || 'TEXT';
    let prov = provenance || 'Progress Note';

    // Simulation of ASR or OCR based on file upload
    if (req.file) {
      const filename = req.file.originalname.toLowerCase();
      prov = `File Upload: ${req.file.originalname}`;

      if (filename.endsWith('.wav') || filename.endsWith('.mp3') || filename.endsWith('.m4a') || filename.endsWith('.caf') || filename.endsWith('.webm')) {
        modality = 'VOICE';
        processedText = processedText || 'Transcribed Voice Notes: Patient doing well, started on Pantocid 40mg IV OD. Lab results check: creatinine is down to 2.1 mg/dL, Hb stable at 8.0 g/dL.';
      } else if (filename.endsWith('.pdf') || filename.endsWith('.jpg') || filename.endsWith('.png') || filename.endsWith('.jpeg')) {
        modality = 'DOCUMENT';
        processedText = processedText || 'OCR Document Scan: LAB REPORT\nCreatinine: 2.1 mg/dL (High)\nHemoglobin: 8.0 g/dL (Low)\nPlatelets: 150,000 /uL';
      }
    }

    if (!processedText.trim()) {
      return res.status(400).json({ error: 'No text content or file uploaded' });
    }

    // Call NLP Engine to extract clinical event details (CEO)
    const apiKey = req.headers['x-api-key'] || null;
    const extractedCEO = await extractClinicalEvent(processedText, apiKey);

    // Save ClinicalEvent to Database Event Ledger
    const finalEventType = eventTypeInput || extractedCEO.eventType || 'NOTE';
    
    // Save to database
    const createdEvent = await prisma.clinicalEvent.create({
      data: {
        patientId,
        timestamp: new Date(),
        eventType: finalEventType,
        sourceModality: modality,
        eventData: JSON.stringify(extractedCEO.extractedEntities),
        provenance: prov,
        authorId,
        authorName,
        authorRole
      }
    });

    // Fetch all events chronologically to trigger narrative generation
    const allEvents = await prisma.clinicalEvent.findMany({
      where: { patientId },
      orderBy: { timestamp: 'asc' }
    });

    // Rebuild Narratives using Continuous Narrative Engine (Gemini or Local fallback)
    const courseInHospital = await generateNarrative(patient, allEvents, 'courseInHospital', apiKey);
    const medicationJourney = await generateNarrative(patient, allEvents, 'medicationJourney', apiKey);
    const investigationJourney = await generateNarrative(patient, allEvents, 'investigationJourney', apiKey);
    const procedureJourney = await generateNarrative(patient, allEvents, 'procedureJourney', apiKey);

    // Update Narrative table
    await prisma.narrative.upsert({
      where: { patientId },
      create: {
        patientId,
        courseInHospital,
        medicationJourney,
        investigationJourney,
        procedureJourney
      },
      update: {
        courseInHospital,
        medicationJourney,
        investigationJourney,
        procedureJourney
      }
    });

    // Log the audit log
    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'CREATE_EVENT',
        details: `Ingested ${modality} data. Extracted event type ${finalEventType}. Summary: ${extractedCEO.summarySnippet}`
      }
    });

    res.json({
      success: true,
      event: createdEvent,
      extractedCEO,
      narrativeUpdated: true
    });
  } catch (error) {
    console.error('Ingestion pipeline error:', error);
    res.status(500).json({ error: 'Failed to ingest and parse clinical content' });
  }
});

// Update an existing event in the ledger
router.put('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { eventType, eventData, provenance } = req.body;
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  try {
    const originalEvent = await prisma.clinicalEvent.findUnique({
      where: { id: eventId }
    });

    if (!originalEvent) {
      return res.status(404).json({ error: 'Clinical event not found' });
    }

    const updatedEvent = await prisma.clinicalEvent.update({
      where: { id: eventId },
      data: {
        eventType: eventType || originalEvent.eventType,
        eventData: eventData ? JSON.stringify(eventData) : originalEvent.eventData,
        provenance: provenance || originalEvent.provenance
      }
    });

    const patientId = originalEvent.patientId;
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });

    // Fetch all events chronologically to trigger narrative generation
    const allEvents = await prisma.clinicalEvent.findMany({
      where: { patientId },
      orderBy: { timestamp: 'asc' }
    });

    // Rebuild Narratives using Continuous Narrative Engine
    const apiKey = req.headers['x-api-key'] || null;
    const courseInHospital = await generateNarrative(patient, allEvents, 'courseInHospital', apiKey);
    const medicationJourney = await generateNarrative(patient, allEvents, 'medicationJourney', apiKey);
    const investigationJourney = await generateNarrative(patient, allEvents, 'investigationJourney', apiKey);
    const procedureJourney = await generateNarrative(patient, allEvents, 'procedureJourney', apiKey);

    // Update Narrative table
    await prisma.narrative.update({
      where: { patientId },
      data: {
        courseInHospital,
        medicationJourney,
        investigationJourney,
        procedureJourney
      }
    });

    // Log the audit log
    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'UPDATE_EVENT',
        details: `Edited clinical event ID ${eventId} (${originalEvent.eventType} -> ${updatedEvent.eventType})`
      }
    });

    res.json({
      success: true,
      event: updatedEvent,
      narrativeUpdated: true
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update clinical event' });
  }
});

// Delete an event from the ledger
router.delete('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const authorId = req.headers['x-user-id'] || 'system';
  const authorName = req.headers['x-user-name'] || 'System';
  const authorRole = req.headers['x-user-role'] || 'SYSTEM';

  try {
    const originalEvent = await prisma.clinicalEvent.findUnique({
      where: { id: eventId }
    });

    if (!originalEvent) {
      return res.status(404).json({ error: 'Clinical event not found' });
    }

    await prisma.clinicalEvent.delete({
      where: { id: eventId }
    });

    const patientId = originalEvent.patientId;
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });

    // Fetch all events chronologically to trigger narrative generation
    const allEvents = await prisma.clinicalEvent.findMany({
      where: { patientId },
      orderBy: { timestamp: 'asc' }
    });

    // Rebuild Narratives using Continuous Narrative Engine
    const apiKey = req.headers['x-api-key'] || null;
    const courseInHospital = await generateNarrative(patient, allEvents, 'courseInHospital', apiKey);
    const medicationJourney = await generateNarrative(patient, allEvents, 'medicationJourney', apiKey);
    const investigationJourney = await generateNarrative(patient, allEvents, 'investigationJourney', apiKey);
    const procedureJourney = await generateNarrative(patient, allEvents, 'procedureJourney', apiKey);

    // Update Narrative table
    await prisma.narrative.update({
      where: { patientId },
      data: {
        courseInHospital,
        medicationJourney,
        investigationJourney,
        procedureJourney
      }
    });

    // Log the audit log
    await prisma.auditLog.create({
      data: {
        userId: authorId,
        userName: authorName,
        userRole: authorRole,
        action: 'DELETE_EVENT',
        details: `Deleted clinical event ID ${eventId} (${originalEvent.eventType})`
      }
    });

    res.json({
      success: true,
      narrativeUpdated: true
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete clinical event' });
  }
});

export default router;
