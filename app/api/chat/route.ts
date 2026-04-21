import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { runChainStream } from "@/lib/langchain";
import { validateInput } from "@/lib/guardrails";
import { z } from "zod";

// AI SDK v5 sends { messages: UIMessage[], ...extraBody }
const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.string(),
      parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
      content: z.string().optional(),
    }).passthrough()
  ),
  persona: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // 1. Parse AI SDK v5 message format
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const { messages, persona } = parsed.data;

    // 2. Extract the last user message text from parts
    const lastMessage = messages[messages.length - 1];
    let message = "";
    if (lastMessage?.parts) {
      message = lastMessage.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join("");
    } else if (lastMessage?.content) {
      message = lastMessage.content;
    }

    if (!message.trim()) {
      return Response.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    // 3. Custom Guardrail Filter
    const guardrailError = validateInput(message);
    if (guardrailError) {
      return Response.json({ error: guardrailError }, { status: 400 });
    }

    // 4. Run LLM Chain
    const stream = await runChainStream(message, persona);

    // 5. Return as standard Vercel AI SDK UI message stream
    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
    });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An error occurred";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
