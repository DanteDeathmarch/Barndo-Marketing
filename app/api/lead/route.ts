import { z } from "zod";
import { scoreLead, type LeadInput } from "@/lib/scoring";
import { writeLeadToNotion } from "@/lib/notion";
import { sendLeadAlert } from "@/lib/email";

export const runtime = "nodejs";

const leadSchema = z.object({
  state: z.string().min(1),
  landOwnership: z.string().min(1),
  acreage: z.string().min(1),
  timeline: z.string().min(1),
  buildStage: z.string().min(1),
  budget: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).default(""),
  phone: z.string().min(7).max(30),
  email: z.string().email(),
  bestTime: z.string().default(""),
  source: z.string().default("form"),
  variant: z.string().optional(),
});

export async function POST(req: Request) {
  let parsed: LeadInput;
  try {
    const body = await req.json();
    parsed = leadSchema.parse(body) as LeadInput;
  } catch {
    return Response.json(
      { ok: false, error: "Invalid lead data" },
      { status: 400 }
    );
  }

  const scored = scoreLead(parsed);

  const results = await Promise.allSettled([
    writeLeadToNotion(parsed, scored),
    sendLeadAlert(parsed, scored),
  ]);

  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error("Lead pipeline step failed:", r.reason);
    }
  });

  return Response.json({ ok: true, tier: scored.tier });
}
