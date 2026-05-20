import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { getConciergeSystem, type PromptVariant } from "@/lib/concierge";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Concierge is not configured yet.", { status: 503 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const trimmed = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  if (trimmed.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // A/B variant — proxy.ts sets the bb_variant cookie on first visit.
  const variantCookie = (await cookies()).get("bb_variant")?.value;
  const variant: PromptVariant = variantCookie === "B" ? "B" : "A";
  const systemPrompt = getConciergeSystem(variant);

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const claudeStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 700,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: trimmed,
          metadata: { user_id: `variant_${variant}` },
        });

        claudeStream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        await claudeStream.finalMessage();
        controller.close();
      } catch (err) {
        console.error("Concierge stream error:", err);
        controller.enqueue(
          encoder.encode("Sorry — I hit a snag. Please try again.")
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-bot-variant": variant,
    },
  });
}
