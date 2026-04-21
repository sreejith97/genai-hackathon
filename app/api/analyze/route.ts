import { NextResponse } from "next/server";
import { analyzePatientInput } from "@/lib/advocateChain";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    // Guardrail Check
    if (message.toLowerCase().includes("emergency") || message.toLowerCase().includes("suicide") || message.toLowerCase().includes("dying")) {
      return NextResponse.json({ 
        error: "Please seek immediate medical help. Call your local emergency services (e.g., 911) or go to the nearest emergency room." 
      }, { status: 400 });
    }

    const results = await analyzePatientInput(message);

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("Error analyzing patient input:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze input." }, { status: 500 });
  }
}
