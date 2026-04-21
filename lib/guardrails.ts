import { z } from "zod";

// Zod schema for simple, reusable structure validation
export const chatInputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message is too long"),
  persona: z.string().optional(),
});

// Custom Guardrail Function
export const validateInput = (input: string) => {
  if (input.length > 500) return "Message exceeds the maximum allowed length.";
  
  const blockedTerms = ["hack", "illegal", "bypass", "exploit"];
  const lowerInput = input.toLowerCase();
  
  if (blockedTerms.some(term => lowerInput.includes(term))) {
    return "This request flagged our safety guardrails.";
  }
  
  return null;
};
