import { getModel } from "./model";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

export const extractionSchema = z.object({
  symptoms: z.array(z.string()).describe("List of symptoms described by the patient"),
  duration: z.string().describe("How long the symptoms have been present"),
  severity: z.string().describe("Severity of the symptoms"),
  dismissedConcerns: z.array(z.string()).describe("Concerns or symptoms that the doctor dismissed or ignored"),
  doctorActions: z.array(z.string()).describe("Actions, tests, or advice the doctor actually provided"),
  missingTests: z.array(z.string()).describe("Potential tests or actions that seem missing based on the symptoms (from a generic medical advocacy perspective)"),
});

export type ExtractedData = z.infer<typeof extractionSchema>;

export const analyzePatientInput = async (input: string) => {
  const model = getModel();

  // Step 1: Extraction Chain
  const parser = StructuredOutputParser.fromZodSchema(extractionSchema);
  const extractionPrompt = PromptTemplate.fromTemplate(`
You are a medical data extraction assistant.
Extract structured medical interaction details from the patient's narrative.
If some information is missing, use "Not provided" or an empty array.

\n{format_instructions}\n

Patient Narrative:
{input}
`);

  const extractChain = extractionPrompt.pipe(model).pipe(parser);
  const extractedData = await extractChain.invoke({ 
    input, 
    format_instructions: parser.getFormatInstructions() 
  });

  // Step 2: Parallel Chains
  const validationModel = model.pipe(new StringOutputParser());
  const questionsModel = model.pipe(new StringOutputParser());
  const letterModel = model.pipe(new StringOutputParser());
  const timelineModel = model.pipe(new StringOutputParser());

  const validationPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate. Analyze if the patient's concern was medically valid based on general medical knowledge.
Explain in simple, empathetic language to the patient. Validate their feelings. Provide a 2-3 paragraph response.

Patient Data:
Symptoms: {symptoms}
Doctor's Actions: {doctorActions}
Dismissed Concerns: {dismissedConcerns}
`);

  const questionsPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate. Generate exactly 5 specific, assertive, medically relevant questions the patient can ask in their next visit based on their situation.
Format as a bulleted list.

Patient Data:
Symptoms: {symptoms}
Missing Tests (Potential): {missingTests}
Dismissed Concerns: {dismissedConcerns}
`);

  const letterPrompt = PromptTemplate.fromTemplate(`
You are a patient advocate. Write a professional follow-up letter to the doctor or clinic.
The letter should be polite but assertive, clearly state the ongoing or dismissed symptoms, and request specific tests or next steps.

Patient Data:
Symptoms: {symptoms}
Missing Tests (Potential): {missingTests}
Duration: {duration}
`);

  const timelinePrompt = PromptTemplate.fromTemplate(`
You are a medical data assistant. Based on the patient's input, create a brief chronological timeline of events if possible.
Return a JSON array of objects with "date" and "event" keys. DO NOT return markdown formatting, just raw JSON. If no timeline is extractable, return [].

Patient Data:
{input}
`);

  // We stringify the arrays to pass to the Prompts easily
  const promptData = {
    symptoms: extractedData.symptoms.join(", ") || "None mentioned",
    doctorActions: extractedData.doctorActions.join(", ") || "None mentioned",
    dismissedConcerns: extractedData.dismissedConcerns.join(", ") || "None mentioned",
    missingTests: extractedData.missingTests.join(", ") || "None mentioned",
    duration: extractedData.duration || "Not provided",
    input: input
  };

  const [validationResult, questionsResult, letterResult, timelineResultRaw] = await Promise.all([
    validationPrompt.pipe(validationModel).invoke(promptData),
    questionsPrompt.pipe(questionsModel).invoke(promptData),
    letterPrompt.pipe(letterModel).invoke(promptData),
    timelinePrompt.pipe(timelineModel).invoke({ input })
  ]);

  let timelineResult = [];
  try {
    const cleanedJson = timelineResultRaw.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    timelineResult = JSON.parse(cleanedJson);
  } catch (e) {
    console.error("Timeline parsing failed", e);
  }

  return {
    extraction: extractedData,
    validation: validationResult,
    questions: questionsResult,
    letter: letterResult,
    timeline: timelineResult
  };
};
