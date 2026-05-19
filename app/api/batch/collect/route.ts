import { batchConfigured, getBatchStatus, collectBriefings } from "@/lib/batch";
import { notionConfigured, updateLeadAssessment } from "@/lib/notion";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.BATCH_SECRET;
  if (!secret) return false;
  return (
    req.headers.get("x-batch-secret") === secret ||
    url.searchParams.get("secret") === secret
  );
}

// Checks a submitted batch. While still processing, returns the status.
// Once ended, writes each generated briefing back to its Notion lead and
// flips the lead to "Assessed".
export async function POST(req: Request) {
  const url = new URL(req.url);

  if (!process.env.BATCH_SECRET) {
    return Response.json(
      { ok: false, error: "BATCH_SECRET not configured" },
      { status: 503 }
    );
  }
  if (!authorized(req, url)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!batchConfigured() || !notionConfigured()) {
    return Response.json(
      { ok: false, error: "ANTHROPIC_API_KEY or Notion not configured" },
      { status: 503 }
    );
  }

  const batchId = url.searchParams.get("batchId");
  if (!batchId) {
    return Response.json(
      { ok: false, error: "Missing batchId query parameter" },
      { status: 400 }
    );
  }

  const status = await getBatchStatus(batchId);
  if (!status.ended) {
    return Response.json({ ok: true, ended: false, status: status.status });
  }

  const { briefings, errored } = await collectBriefings(batchId);

  const writes = await Promise.allSettled(
    [...briefings.entries()].map(([pageId, briefing]) =>
      updateLeadAssessment(pageId, briefing, "Assessed")
    )
  );
  const written = writes.filter((w) => w.status === "fulfilled").length;

  return Response.json({
    ok: true,
    ended: true,
    written,
    errored: errored.length,
    succeeded: status.succeeded,
  });
}
