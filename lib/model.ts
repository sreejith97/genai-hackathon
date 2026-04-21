import { ChatOpenAI } from "@langchain/openai";

// Abstract Model Layer
export const getModel = () => {
  return new ChatOpenAI({
    temperature: 0.7,
    apiKey: process.env.GROK_API_KEY, // Reading the GROK_API_KEY which currently holds the Groq key
    configuration: {
      baseURL: "https://api.groq.com/openai/v1", // Switched to Groq
    },
    modelName: "llama-3.3-70b-versatile", // Using a fast, modern Groq model
  });
};
