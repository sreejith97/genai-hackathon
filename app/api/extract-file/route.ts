import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const runtime = "nodejs";

const getVisionModel = () =>
  new ChatOpenAI({
    apiKey: process.env.GROK_API_KEY,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
    modelName: "llama-3.2-11b-vision-preview",
    maxTokens: 3000,
    temperature: 0,
  });

async function extractFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString("base64");
  const model = getVisionModel().pipe(new StringOutputParser());
  return await model.invoke([
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "You are a medical document reader. Extract ALL text, numbers, medical values, diagnoses, medications, test results, lab values, and any other information from this document image. Return the raw extracted content as plain text, preserving structure. Do not summarise — extract everything.",
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    },
  ]);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const mimeType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    if (mimeType === "application/pdf") {
      return NextResponse.json(
        { error: "PDF parsing is currently disabled due to formatting issues. Please take a SCREENSHOT of your document and upload it as a JPG or PNG instead. Our Vision AI works perfectly with images!" },
        { status: 400 }
      );
    } else if (mimeType.startsWith("image/")) {
      extractedText = await extractFromImage(buffer, mimeType);
    } else {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Please upload an image (JPG, PNG, WEBP).` },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract any text from this file. Please try a clearer screenshot." },
        { status: 400 }
      );
    }

    return NextResponse.json({ text: extractedText.trim() });
  } catch (err: any) {
    console.error("File extraction error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to extract text from file." },
      { status: 500 }
    );
  }
}
