import { getModel } from "./model";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface ExtractedData {
  symptoms: string[];
  duration: string;
  severity: string;
  diagnoses: string[];
  medications: string[];
  dismissedConcerns: string[];
  doctorActions: string[];
  missingTests: string[];
}

const parser = new StringOutputParser();

export const analyzePatientInput = async (input: string) => {
  const model = getModel();

  // Step 0: Fast Relevancy & Gibberish Guardrail
  const relevancyPrompt = PromptTemplate.fromTemplate(`
You are a medical safety filter. 
Analyze the following user input and determine if it is related to a medical condition, a doctor's visit, a medical question, or health symptoms.
If the input is gibberish (e.g. "kIkikikiki", "asdf"), completely unrelated (e.g. asking for a recipe, software code), or totally off-topic, reply exactly with the word "NO".
If it mentions health, medicine, doctors, symptoms, biology, or is a readable medical report, reply exactly with the word "YES".

User Input:
{input}
`);

  const relevancyResultRaw = await relevancyPrompt.pipe(model).pipe(parser).invoke({ input });
  const relevancy = relevancyResultRaw.trim().toUpperCase();
  
  if (relevancy.includes("NO") && !relevancy.includes("YES")) {
    throw new Error("RELEVANCY_ERROR");
  }

  // Step 1: Extraction Chain — pure prompt-based JSON, no response_format header
  const extractionPrompt = PromptTemplate.fromTemplate(`
You are a medical data extraction assistant.
Extract the following information from the patient's input. The input may be an informal narrative OR a formal medical report.
Respond with ONLY a raw JSON object. Do NOT wrap it in markdown or code blocks. Do not add any explanation.

The JSON must follow exactly this structure:
{{
  "symptoms": ["..."],
  "duration": "...",
  "severity": "...",
  "diagnoses": ["..."],
  "medications": ["..."],
  "dismissedConcerns": ["..."],
  "doctorActions": ["..."],
  "missingTests": ["..."]
}}

If information is missing, use "Not provided" for strings and [] for arrays. 
If this is a medical report with clear diagnoses and medications, extract them accurately.

Patient Input:
{input}
`);

  const extractChain = extractionPrompt.pipe(model).pipe(parser);
  const rawExtraction = await extractChain.invoke({ input });

  let extractedData: ExtractedData = {
    symptoms: [],
    duration: "Not provided",
    severity: "Not provided",
    diagnoses: [],
    medications: [],
    dismissedConcerns: [],
    doctorActions: [],
    missingTests: [],
  };

  try {
    const cleaned = rawExtraction.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    extractedData = JSON.parse(cleaned);
  } catch (e) {
    console.error("Extraction JSON parse failed:", e, "\nRaw:", rawExtraction);
  }

  // Step 2: Parallel Chains (all plain text, no structured output)
  const validationPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate. Analyze the patient's situation based on general medical knowledge.
IMPORTANT: The user may have provided a narrative OR an official medical report.
- If a diagnosis was already made (e.g. Hashimoto's), explain what it means simply and validate their journey to getting diagnosed.
- If concerns were dismissed, validate their frustration in empathetic language.
Respond in 2-3 paragraphs. Use simple formatting.

Patient Data:
Symptoms: {symptoms}
Diagnoses Found: {diagnoses}
Doctor's Actions/Plan: {doctorActions}
Dismissed Concerns: {dismissedConcerns}
`);

  const questionsPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate. Generate exactly 5 specific, assertive, medically relevant questions for the patient to ask at their next appointment.
IMPORTANT RULE: 
- If the patient already has a clear Diagnosis, DO NOT ask for tests to diagnose the problem. Instead, generate questions about TREATMENT, PROGNOSIS, MEDICATION SIDE EFFECTS, or LIFESTYLE CHANGES.
- If they don't have a diagnosis, suggest questions about potential tests or differential diagnoses.
Format as a clear markdown bulleted list.

Patient Data:
Symptoms: {symptoms}
Diagnoses: {diagnoses}
Medications: {medications}
Dismissed Concerns: {dismissedConcerns}
`);

  const letterPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate writing a professional follow-up letter from the patient to the doctor/clinic.
CRITICAL INSTRUCTION:
- If a Diagnosis was ALREADY provided in the medical report, DO NOT demand diagnostic tests that have clearly been done. Instead, the letter should be a follow-up asking for clarification on the treatment plan, reporting on medication status, or addressing secondary unresolved symptoms.
- If no diagnosis exists, the letter must be polite but assertive, clearly restating the unresolved symptoms and requesting specific next steps.

Patient Data:
Symptoms: {symptoms}
Diagnoses: {diagnoses}
Medications: {medications}
Doctor's Actions: {doctorActions}
`);

  const timelinePrompt = PromptTemplate.fromTemplate(`
You are a medical data assistant. Based on the patient's narrative, extract a brief chronological timeline of events.
Respond with ONLY a raw JSON array. No markdown. No code blocks. No explanation.
Format: [{{"date": "...", "event": "..."}}]
If no timeline can be extracted, respond with exactly: []

Patient Narrative:
{input}
`);

  const promptData = {
    symptoms: extractedData.symptoms.join(", ") || "None mentioned",
    doctorActions: extractedData.doctorActions.join(", ") || "None mentioned",
    dismissedConcerns: extractedData.dismissedConcerns.join(", ") || "None mentioned",
    diagnoses: extractedData.diagnoses?.join(", ") || "No diagnosis provided",
    medications: extractedData.medications?.join(", ") || "No medications provided",
    missingTests: extractedData.missingTests.join(", ") || "None mentioned",
    duration: extractedData.duration || "Not provided",
    input,
  };

  const [validationResult, questionsResult, letterResult, timelineResultRaw] = await Promise.all([
    validationPrompt.pipe(model).pipe(parser).invoke(promptData),
    questionsPrompt.pipe(model).pipe(parser).invoke(promptData),
    letterPrompt.pipe(model).pipe(parser).invoke(promptData),
    timelinePrompt.pipe(model).pipe(parser).invoke({ input }),
  ]);

  let timelineResult: { date: string; event: string }[] = [];
  try {
    const cleaned = timelineResultRaw.replace(/```json/g, "").replace(/```/g, "").trim();
    timelineResult = JSON.parse(cleaned);
  } catch (e) {
    console.error("Timeline JSON parse failed:", e);
  }

  return {
    extraction: extractedData,
    validation: validationResult,
    questions: questionsResult,
    letter: letterResult,
    timeline: timelineResult,
  };
};
