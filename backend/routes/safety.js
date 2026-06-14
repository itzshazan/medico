import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Run safety validations for a patient
router.get('/patient/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        events: true,
        narratives: true
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const events = patient.events;
    const narrative = patient.narratives[0];

    const alerts = [];
    const missingChecks = [];

    // 1. Clinical Contradiction: Anticoagulants active during active hemorrhage
    const activeBleeding = patient.comorbidities.toLowerCase().includes('hemorrhage') || 
                           patient.comorbidities.toLowerCase().includes('bleeding') ||
                           events.some(e => {
                             if (e.eventType !== 'DIAGNOSIS') return false;
                             const data = JSON.parse(e.eventData);
                             return data.diagnosisName && (data.diagnosisName.toLowerCase().includes('hemorrhage') || data.diagnosisName.toLowerCase().includes('bleeding'));
                           });

    const medications = events.filter(e => e.eventType === 'MEDICATION').map(e => JSON.parse(e.eventData));
    
    // Check if any anticoagulant (e.g., Eliquis, Heparin, Warfarin) is marked as "started" or "continued" while bleeding is active
    const activeAnticoagulant = medications.find(m => 
      ['eliquis', 'heparin', 'warfarin', 'clexane'].includes(m.drugName?.toLowerCase()) && 
      (m.status === 'started' || m.status === 'continued')
    );

    if (activeBleeding && activeAnticoagulant) {
      alerts.push({
        type: 'CRITICAL_CONTRADICTION',
        severity: 'CRITICAL',
        message: `Clinical Conflict: Anticoagulant (${activeAnticoagulant.drugName}) is active while the patient has a diagnosed active pulmonary hemorrhage/bleeding.`,
        suggestedAction: 'Hold anticoagulant immediately and review coagulation profile.'
      });
    }

    // 2. Dosage Sanity Checks
    // Check methylprednisolone / Solu-Medrol dosage
    medications.forEach(m => {
      if (['solu-medrol', 'methylprednisolone'].includes(m.drugName?.toLowerCase())) {
        const doseVal = parseFloat(m.dose);
        if (doseVal > 1000) {
          alerts.push({
            type: 'DOSAGE_ERROR',
            severity: 'HIGH',
            message: `Dosage Alert: Methylprednisolone dose (${m.dose}) exceeds recommended safe daily limit (1000mg/day) for pulse therapy.`,
            suggestedAction: 'Reduce dose to 250mg - 1000mg range.'
          });
        }
        
        // CKD check
        if (patient.comorbidities.toLowerCase().includes('ckd') || patient.comorbidities.toLowerCase().includes('kidney')) {
          alerts.push({
            type: 'RENAL_ADJUSTMENT',
            severity: 'MEDIUM',
            message: `Renal Alert: High-dose steroid therapy (${m.dose}) started in a patient with underlying Stage 5 CKD. Monitor volume status and glucose levels closely.`,
            suggestedAction: 'Ensure daily fluid balance and capillary blood glucose monitoring.'
          });
        }
      }

      // Check Meropenem dosage
      if (m.drugName?.toLowerCase() === 'meropenem') {
        const doseVal = parseFloat(m.dose);
        // Standard dose is 1g TDS, but in CKD it must be adjusted (e.g. 500mg daily or post-dialysis)
        if (patient.comorbidities.toLowerCase().includes('ckd') || patient.comorbidities.toLowerCase().includes('kidney')) {
          if (m.freq === 'TDS' && doseVal >= 1) {
            alerts.push({
              type: 'RENAL_ADJUSTMENT',
              severity: 'HIGH',
              message: `Renal Adjustment Needed: Meropenem ${m.dose} ${m.freq} is not adjusted for Stage 5 CKD. Standard dose in ESRD is 500mg OD or post-dialysis.`,
              suggestedAction: 'Reduce Meropenem dose to 500mg IV OD (or post-dialysis) and consult Nephrology.'
            });
          }
        }
      }
    });

    // 3. Lab value validation
    events.forEach(e => {
      if (e.eventType === 'INVESTIGATION') {
        const data = JSON.parse(e.eventData);
        if (data.labName === 'Hemoglobin (Hb)' && parseFloat(data.value) < 8.0 && data.status === 'Critical Low') {
          alerts.push({
            type: 'CRITICAL_LAB',
            severity: 'HIGH',
            message: `Critical Lab Value: Hemoglobin is ${data.value} g/dL (exceeds transfusion threshold of <7.0-8.0 g/dL for symptomatic patients).`,
            suggestedAction: 'Consider packed red blood cell transfusion and check for active bleeding sites.'
          });
        }
        if (data.labName === 'Creatinine' && parseFloat(data.value) > 3.0 && patient.comorbidities.toLowerCase().includes('dialysis')) {
          alerts.push({
            type: 'RENAL_LAB',
            severity: 'MEDIUM',
            message: `Elevated Creatinine: Creatinine is ${data.value} mg/dL. Ensure dialysis schedule is maintained.`,
            suggestedAction: 'Confirm last dialysis session date and check catheter patency.'
          });
        }
      }
    });

    // 4. Missing Information Detection
    const hasFollowUp = narrative && (narrative.courseInHospital.toLowerCase().includes('follow') || 
                                       narrative.courseInHospital.toLowerCase().includes('opd'));
    const hasMeds = medications.length > 0;
    const hasDiagnosis = events.some(e => e.eventType === 'DIAGNOSIS');

    if (!hasDiagnosis) {
      missingChecks.push({
        section: 'Diagnosis',
        severity: 'HIGH',
        message: 'No primary diagnosis recorded in the active timeline.'
      });
    }
    if (!hasMeds) {
      missingChecks.push({
        section: 'Medications',
        severity: 'MEDIUM',
        message: 'No active or home medications logged in the patient record.'
      });
    }
    if (!hasFollowUp) {
      missingChecks.push({
        section: 'Follow-Up',
        severity: 'MEDIUM',
        message: 'No follow-up details (date, OPD clinic) found in the course or narrative text.'
      });
    }

    res.json({
      alerts,
      missingChecks,
      valid: alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length === 0
    });
  } catch (error) {
    console.error('Safety validation error:', error);
    res.status(500).json({ error: 'Failed to complete safety checks' });
  }
});

export default router;
