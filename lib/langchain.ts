import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getModel } from "./model";
import { basePrompt } from "./prompts";

export const runChain = async (input: string, persona?: string) => {
  const model = getModel();
  
  // Create prompt from reusable template
  const prompt = PromptTemplate.fromTemplate(basePrompt(input, persona));
  
  // Pipe the prompt to the model and parse output as string
  const chain = prompt.pipe(model).pipe(new StringOutputParser());
  
  // For standard invocation
  return await chain.invoke({});
};

// Stream version specifically tailored for Next.js AI streaming
export const runChainStream = async (input: string, persona?: string) => {
  const model = getModel();
  const prompt = PromptTemplate.fromTemplate(basePrompt(input, persona));
  // Remove StringOutputParser so we yield AIMessageChunk, required by toUIMessageStream
  const chain = prompt.pipe(model);
  
  return await chain.stream({});
};
