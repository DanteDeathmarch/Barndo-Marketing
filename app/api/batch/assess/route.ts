import {
  batchConfigured,
  submitLeadBatch,
  type LeadForBatch,
} from "@/lib/batch";
import {
  notionConfigured,
  readLeadsByStatus,
  updateLeadStatus,
} from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.BATCH_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-batch-secret");
  const url = new URL(req.url);
  return header === secret || url.searchParams.get("secret") === secret;
}

// Reads all "New" leads from Notion, submits them as one Claude Message Batch
// for builder-briefing generation, and flips each lead to "Assessing".
// Returns the batch id — poll /api/batch/collect with it once the batch ends.
export async function POST(req: Request) {
  if (!process.env.BATCH_SECRET) {
    return Response.json(
      { ok: false, error: "BATCH_SECRET not configured" },
      { status: 503 }
    );
  }
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!batchConfigured() || !notionConfigured()) {
    return Response.json(
      { ok: false, error: "ANTHROPIC_API_KEY or Notion not configured" },
      { status: 503 }
    );
  }

  const rows = await readLeadsByStatus("New");
  if (rows.length === 0) {
    return Response.json({ ok: true, count: 0, batchId: null });
  }

  const leads: LeadForBatch[] = rows.map((r) => ({
    customId: r.pageId.replace(/-/g, ""),
    lead: r.lead,
    scored: r.scored,
  }));

  const batchId = await submitLeadBatch(leads);

  await Promise.allSettled(
    rows.map((r) => updateLeadStatus(r.pageId, "Assessing"))
  );

  return Response.json({ ok: true, count: leads.length, batchId });
}
