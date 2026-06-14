

/**
 * Fallback parser for offline/no-key usage to extract clinical entities
 * using simple heuristics.
 */
function mockExtractClinicalEvent(text) {
  const normalized = text.toLowerCase();
  
  // 1. Check for medication changes
  if (normalized.includes('start') || normalized.includes('give') || normalized.includes('administer') || normalized.includes('hold') || normalized.includes('stop')) {
    let status = 'started';
    if (normalized.includes('hold') || normalized.includes('held')) status = 'held';
    if (normalized.includes('stop') || normalized.includes('discontinue')) status = 'stopped';
    
    // Check known drugs from rules
    const drugs = ['meropenem', 'eliquis', 'solu-medrol', 'methylprednisolone', 'pantocid', 'lasix', 'levosalbutamol', 'budesonide', 'heparin', 'linezolid', 'norad', 'piptaz', 'vasopressin'];
    let foundDrug = 'Unknown Medication';
    for (const d of drugs) {
      if (normalized.includes(d)) {
        foundDrug = d.charAt(0).toUpperCase() + d.slice(1);
        break;
      }
    }

    // Try parsing dose, route, freq
    let dose = 'standard';
    let route = 'oral';
    let freq = 'daily';
    
    if (normalized.includes('iv')) route = 'IV';
    if (normalized.includes('sc') || normalized.includes('subcutaneous')) route = 'SC';
    if (normalized.includes('neb')) route = 'NEB';
    
    if (normalized.includes('1g') || normalized.includes('1 g')) dose = '1g';
    if (normalized.includes('500mg') || normalized.includes('500 mg')) dose = '500mg';
    if (normalized.includes('5mg') || normalized.includes('5 mg')) dose = '5mg';
    if (normalized.includes('40mg') || normalized.includes('40 mg')) dose = '40mg';

    if (normalized.includes('tds') || normalized.includes('three times')) freq = 'TDS';
    if (normalized.includes('bd') || normalized.includes('twice')) freq = 'BD';
    if (normalized.includes('od') || normalized.includes('once')) freq = 'OD';
    if (normalized.includes('qds')) freq = 'QDS';

    return {
      eventType: 'MEDICATION',
      extractedEntities: {
        drugName: foundDrug,
        dose,
        route,
        freq,
        status,
        reason: status === 'held' ? 'active bleeding / clinical safety' : 'clinical management'
      },
      confidence: 0.9,
      flags: status === 'held' ? ['medication_hold'] : [],
      summarySnippet: `Medication ${foundDrug} ${status} (${dose} ${route} ${freq})`
    };
  }

  // 2. Check for investigations
  if (normalized.includes('hb') || normalized.includes('hemoglobin') || normalized.includes('creatinine') || normalized.includes('crp') || normalized.includes('wbc') || normalized.includes('platelet')) {
    let labName = 'Unknown Investigation';
    let value = 'normal';
    let unit = '';
    let status = 'Normal';
    let flags = [];

    if (normalized.includes('hb') || normalized.includes('hemoglobin')) {
      labName = 'Hemoglobin (Hb)';
      unit = 'g/dL';
      const match = normalized.match(/(?:hb|hemoglobin)\s*(?:is|of)?\s*([0-9.]+)/);
      if (match) value = match[1];
      else value = '7.5'; // fallback mock value
      if (parseFloat(value) < 9.0) {
        status = 'Critical Low';
        flags.push('critical_value');
      }
    } else if (normalized.includes('creatinine')) {
      labName = 'Creatinine';
      unit = 'mg/dL';
      const match = normalized.match(/creatinine\s*(?:is|of)?\s*([0-9.]+)/);
      if (match) value = match[1];
      else value = '2.4'; // fallback mock value
      if (parseFloat(value) > 1.5) {
        status = 'High';
        flags.push('high_value');
      }
    } else if (normalized.includes('crp')) {
      labName = 'CRP';
      unit = 'mg/L';
      const match = normalized.match(/crp\s*(?:is|of)?\s*([0-9.]+)/);
      if (match) value = match[1];
      else value = '45';
      if (parseFloat(value) > 10.0) status = 'Elevated';
    }

    return {
      eventType: 'INVESTIGATION',
      extractedEntities: {
        labName,
        value,
        unit,
        status,
        notes: `Extracted from results.`
      },
      confidence: 0.95,
      flags,
      summarySnippet: `${labName} level: ${value} ${unit} (${status})`
    };
  }

  // 3. Check for procedures
  if (normalized.includes('intubat') || normalized.includes('extubat') || normalized.includes('cath') || normalized.includes('dialysis') || normalized.includes('bronchoscopy')) {
    let procedureName = 'Procedure';
    if (normalized.includes('intubat')) procedureName = 'Endotracheal Intubation';
    else if (normalized.includes('extubat')) procedureName = 'Extubation';
    else if (normalized.includes('dialysis') || normalized.includes('hemodialysis')) procedureName = 'Hemodialysis';
    else if (normalized.includes('bronchoscopy')) procedureName = 'Flexible Bronchoscopy';
    else if (normalized.includes('cath')) procedureName = 'Central Venous Catheterization';

    return {
      eventType: 'PROCEDURE',
      extractedEntities: {
        procedureName,
        status: 'Completed',
        notes: text
      },
      confidence: 0.9,
      flags: [],
      summarySnippet: `Procedure performed: ${procedureName}`
    };
  }

  // 4. Check for consultations
  if (normalized.includes('consult') || normalized.includes('referral') || normalized.includes('specialist')) {
    let specialist = 'General Consultation';
    if (normalized.includes('nephro')) specialist = 'Nephrology Consult';
    else if (normalized.includes('cardio')) specialist = 'Cardiology Consult';
    else if (normalized.includes('neuro')) specialist = 'Neurology Consult';

    return {
      eventType: 'CONSULTATION',
      extractedEntities: {
        specialty: specialist,
        notes: text
      },
      confidence: 0.85,
      flags: [],
      summarySnippet: `Specialist Consultation: ${specialist}`
    };
  }

  // 5. Check for diagnoses
  if (normalized.includes('diagnos') || normalized.includes('admit') || normalized.includes('present with') || normalized.includes('pneumonia') || normalized.includes('bleeding') || normalized.includes('hemorrhage')) {
    let diagnosisName = 'Clinical Condition';
    if (normalized.includes('pneumonia')) diagnosisName = 'Pneumonia';
    else if (normalized.includes('hemorrhage') || normalized.includes('bleeding')) diagnosisName = 'Diffuse Alveolar Hemorrhage';
    else if (normalized.includes('ckd') || normalized.includes('kidney')) diagnosisName = 'Chronic Kidney Disease';

    return {
      eventType: 'DIAGNOSIS',
      extractedEntities: {
        diagnosisName,
        status: 'Active',
        notes: text
      },
      confidence: 0.85,
      flags: [],
      summarySnippet: `Diagnosis recorded: ${diagnosisName}`
    };
  }

  // Default fallback to note
  return {
    eventType: 'NOTE',
    extractedEntities: {
      content: text
    },
    confidence: 0.8,
    flags: [],
    summarySnippet: `Clinical note logged.`
  };
}

/**
 * Core clinical entity extractor utilizing Gemini API if API key is present.
 * Otherwise, falls back to local rule-based extractor.
 */
export async function extractClinicalEvent(text, customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No Gemini API key found. Using local heuristic extraction...');
    return mockExtractClinicalEvent(text);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert clinical documentation AI. Parse the following clinical text and extract structured medical event data in JSON format.
                  
Your output MUST be a valid JSON object matching this schema:
{
  "eventType": "DIAGNOSIS" | "MEDICATION" | "PROCEDURE" | "INVESTIGATION" | "CONSULTATION" | "NOTE",
  "extractedEntities": {
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
  },
  "confidence": number (0.0 to 1.0),
  "flags": string[] (e.g. "critical_value", "medication_hold", "conflict"),
  "summarySnippet": string (A one-line clinical summary sentence, e.g. "Eliquis held due to active pulmonary bleeding.")
}

Return ONLY raw JSON. Do not include markdown code block formatting.

Clinical text to parse:
"${text}"`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Clean JSON markdown markers if any
    let cleanedText = resultText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.substring(7);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    
    return JSON.parse(cleanedText.trim());
  } catch (error) {
    console.error('Error in Gemini API extraction, falling back to heuristics:', error);
    return mockExtractClinicalEvent(text);
  }
}

/**
 * Generate Narrative Prose from compiled patient timeline and events
 */
export async function generateNarrative(patientDetails, timelineEvents, type = 'courseInHospital', customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  
  // Format timeline text for the prompt or fallback
  const timelineDescription = timelineEvents.map(e => {
    const dateStr = new Date(e.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const data = JSON.parse(e.eventData);
    return `[${dateStr}] (${e.eventType}) by ${e.authorName}: ${e.provenance} - ${e.eventType === 'NOTE' ? data.noteText : JSON.stringify(data)}`;
  }).join('\n');

  if (!apiKey) {
    console.log('No Gemini API key found for narrative. Generating template-based narrative...');
    
    // Simple heuristic narrative generator
    const meds = timelineEvents.filter(e => e.eventType === 'MEDICATION');
    const labs = timelineEvents.filter(e => e.eventType === 'INVESTIGATION');
    const procs = timelineEvents.filter(e => e.eventType === 'PROCEDURE');
    const consults = timelineEvents.filter(e => e.eventType === 'CONSULTATION');

    if (type === 'medicationJourney') {
      let medText = `Active Medications Tracker:\n`;
      meds.forEach((m, idx) => {
        const data = JSON.parse(m.eventData);
        medText += `${idx + 1}. ${data.drugName} ${data.dose} ${data.route || ''} ${data.freq || ''} - ${data.status.toUpperCase()} (${data.reason || 'Management'})\n`;
      });
      return medText || 'No medications recorded yet.';
    }

    if (type === 'investigationJourney') {
      let labText = `Laboratory Trends:\n`;
      labs.forEach(l => {
        const data = JSON.parse(l.eventData);
        labText += `- ${new Date(l.timestamp).toLocaleDateString()}: ${data.labName} ${data.value} ${data.unit || ''} (${data.status})\n`;
      });
      return labText || 'No labs recorded yet.';
    }

    if (type === 'procedureJourney') {
      let procText = `Procedures Ledger:\n`;
      procs.forEach(p => {
        const data = JSON.parse(p.eventData);
        procText += `- ${new Date(p.timestamp).toLocaleDateString()}: ${data.procedureName} - ${data.status}\n`;
      });
      return procText || 'No procedures performed yet.';
    }

    // Default Course in Hospital
    return `Patient ${patientDetails.name} (${patientDetails.age}yo ${patientDetails.gender}), admitted on ${new Date(patientDetails.admissionDate).toLocaleDateString()} with comorbidities: ${patientDetails.comorbidities}. Currently bedded in ${patientDetails.bed || 'Ward'}.\n\n` +
      `Course Summary:\n` +
      timelineEvents.map(e => {
        const data = JSON.parse(e.eventData);
        if (e.eventType === 'DIAGNOSIS') return `Admitted and diagnosed with ${data.diagnosisName} (${data.severity || ''}).`;
        if (e.eventType === 'MEDICATION') return `Medication ${data.drugName} was ${data.status} (${data.dose} ${data.route || ''} ${data.freq || ''}).`;
        if (e.eventType === 'INVESTIGATION') return `Investigation showed ${data.labName} of ${data.value} ${data.unit || ''} (${data.status}).`;
        if (e.eventType === 'PROCEDURE') return `Procedure performed: ${data.procedureName}.`;
        if (e.eventType === 'CONSULTATION') return `Consultation obtained: ${data.specialty}.`;
        return data.noteText || 'Clinical progress updated.';
      }).join('\n');
  }

  try {
    let promptInstruction = '';
    if (type === 'courseInHospital') {
      promptInstruction = `Generate a detailed, continuous, chronological narrative of the patient's hospital course in formal medical prose. Summarize diagnoses, clinical deterioration, stabilization, medication logic, laboratory results, and investigations. Include specialist consultations. Format as a cohesive paragraph.`;
    } else if (type === 'medicationJourney') {
      promptInstruction = `Generate a summarized Medication Journey. List and explain started, held, and stopped medications with their respective clinical reasons based on the timeline.`;
    } else if (type === 'investigationJourney') {
      promptInstruction = `Generate a summary of laboratory and diagnostic investigation trends. Focus on key biometrics (e.g., Creatinine, Hemoglobin, CRP) and mention values chronologically.`;
    } else {
      promptInstruction = `Generate a chronological list of procedures performed on the patient, detailing their status and indications.`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an elite pulmonology and critical care clinical documentation assistant.
                  
Patient Details:
- Name: ${patientDetails.name}
- Age: ${patientDetails.age}
- Gender: ${patientDetails.gender}
- Comorbidities: ${patientDetails.comorbidities}
- Admission Date: ${new Date(patientDetails.admissionDate).toLocaleDateString()}

Patient Timeline Events:
${timelineDescription}

Task:
${promptInstruction}

Write a high-quality clinical narrative summary. Write in professional medical terminology. Do NOT mention LLMs, instructions, or prompts. Return ONLY the clinical narrative text.`
                }
              ]
            }
          ]
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Narrative generation failed.';
  } catch (error) {
    console.error('Error generating narrative via Gemini, falling back:', error);
    return mockExtractClinicalEvent(timelineEvents[timelineEvents.length - 1]?.eventData || '{}').summarySnippet;
  }
}
