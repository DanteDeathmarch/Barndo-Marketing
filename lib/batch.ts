import Anthropic from "@anthropic-ai/sdk";
import type { LeadInput, ScoredLead } from "./scoring";

// Shared, stable system prompt — cached across every request in a batch so we
// only pay full input price for it once. Keep this content frozen.
const ASSESSOR_SYSTEM = `
You are the lead assessor for BarndoBuilt, a service that matches rural
landowners in Texas, Tennessee, Oklahoma, and Louisiana with barndominium
builders. Each lead is a landowner who filled out a qualification form or
talked to our concierge. Your job is to write a short, practical briefing for
the regional builder who will receive this lead — the kind of note a good sales
manager hands a rep before a call.

## How leads are scored
- Owns land outright: +30
- Land still being paid off: +20
- Timeline 12 months or less: +25
- Budget $150k or more: +20
- Land in Texas or Tennessee: +15
- 5 or more acres: +10
- "Knows what they want, needs a builder": +15
- "18+ months out / just exploring": -20

Tiers: A = score 85+, B = 50-84, Nurture = below 50.

## What the briefing must contain
Write 4 short sections, each labeled, total under 180 words:

1. **Read** — One or two sentences on how strong and how ready this lead is,
   and why, in plain language.
2. **Key details** — The land, timeline, and budget facts that matter, condensed.
3. **Approach** — Concretely how the builder should open the conversation and
   what to lead with for this specific lead.
4. **Watch-outs** — Any risk, gap, or objection to expect (financing not lined
   up, vague timeline, small acreage, out-of-strong-market, etc.).

## Rules
- Be direct and concrete. No filler, no hype, no restating the rubric.
- Never invent facts not present in the lead. If budget is "unsure", say so.
- Do not promise prices or timelines — those come from a site visit.
- Plain text only. Use the four bold section labels exactly as shown above.
`.trim();

export interface LeadForBatch {
  customId: string;
  lead: LeadInput;
  scored: ScoredLead;
}

function renderLead(lead: LeadInput, scored: ScoredLead): string {
  return [
    `Assess this BarndoBuilt lead and write the builder briefing.`,
    ``,
    `Name:        ${lead.firstName} ${lead.lastName}`.trim(),
    `State:       ${lead.state}`,
    `Land status: ${lead.landOwnership}`,
    `Acreage:     ${lead.acreage}`,
    `Timeline:    ${lead.timeline}`,
    `Build stage: ${lead.buildStage}`,
    `Budget:      ${lead.budget}`,
    `Source:      ${lead.source}${lead.variant ? ` (variant ${lead.variant})` : ""}`,
    `Score:       ${scored.score}`,
    `Tier:        ${scored.tier}`,
  ].join("\n");
}

export function batchConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function submitLeadBatch(
  leads: LeadForBatch[]
): Promise<string> {
  const client = new Anthropic();

  const batch = await client.messages.batches.create({
    requests: leads.map(({ customId, lead, scored }) => ({
      custom_id: customId,
      params: {
        model: "claude-opus-4-7",
        max_tokens: 1024,
        output_config: { effort: "low" },
        system: [
          {
            type: "text",
            text: ASSESSOR_SYSTEM,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: renderLead(lead, scored) }],
      },
    })),
  });

  return batch.id;
}

export interface BatchStatus {
  id: string;
  status: string;
  ended: boolean;
  succeeded: number;
  errored: number;
  processing: number;
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  const client = new Anthropic();
  const batch = await client.messages.batches.retrieve(batchId);
  return {
    id: batch.id,
    status: batch.processing_status,
    ended: batch.processing_status === "ended",
    succeeded: batch.request_counts.succeeded,
    errored: batch.request_counts.errored,
    processing: batch.request_counts.processing,
  };
}

export interface CollectedBriefings {
  briefings: Map<string, string>;
  errored: string[];
}

export async function collectBriefings(
  batchId: string
): Promise<CollectedBriefings> {
  const client = new Anthropic();
  const briefings = new Map<string, string>();
  const errored: string[] = [];

  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type === "succeeded") {
      const textBlock = result.result.message.content.find(
        (b): b is Anthropic.TextBlock => b.type === "text"
      );
      if (textBlock) {
        briefings.set(result.custom_id, textBlock.text.trim());
      } else {
        errored.push(result.custom_id);
      }
    } else {
      errored.push(result.custom_id);
    }
  }

  return { briefings, errored };
}
