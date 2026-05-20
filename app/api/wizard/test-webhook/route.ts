// Wizard Step 5 — POSTs a sample lead payload to the customer's webhook
// URL and reports back what happened. Server-side so we bypass CORS.
//
// Returns success only on 2xx with response in <5s. Anything else is
// reported with the actual status / error so the customer can debug
// (most webhook misses are missing auth headers, wrong route, or
// CRM-specific required fields).

export const runtime = "nodejs";

const SAMPLE_LEAD = {
  source: "wizard-test",
  test: true,
  note: "This is a test payload from the BarndoBuilt install wizard. Safe to ignore in production data.",
  lead: {
    firstName: "Test",
    lastName: "Lead",
    email: "test+wizard@example.com",
    phone: "5125550000",
    state: "TX",
    landOwnership: "own-outright",
    acreage: "5-20",
    timeline: "0-6mo",
    buildStage: "need-builder",
    budget: "300-500k",
    bestTime: "morning",
    score: 115,
    tier: "A",
  },
  submittedAt: new Date().toISOString(),
};

export async function POST(req: Request) {
  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "").trim();
    if (!url) throw new Error("missing url");
    if (!/^https?:\/\//i.test(url)) throw new Error("URL must start with http:// or https://");
    new URL(url);
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "invalid url" },
      { status: 400 }
    );
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(SAMPLE_LEAD),
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Date.now() - start;

    let respText = "";
    try {
      respText = await res.text();
    } catch {
      respText = "(could not read response body)";
    }

    if (!res.ok) {
      return Response.json({
        ok: false,
        status: res.status,
        elapsedMs: elapsed,
        responseSnippet: respText.slice(0, 300),
        hint: hintForStatus(res.status),
      });
    }

    return Response.json({
      ok: true,
      status: res.status,
      elapsedMs: elapsed,
      responseSnippet: respText.slice(0, 300),
    });
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json(
      {
        ok: false,
        elapsedMs: elapsed,
        error: msg,
        hint: msg.includes("aborted")
          ? "Webhook took longer than 5 seconds. Most CRMs respond instantly; check the URL or the receiving handler."
          : "Couldn't reach the URL. Check spelling, https://, and that the endpoint is publicly accessible.",
      },
      { status: 502 }
    );
  }
}

function hintForStatus(status: number): string {
  if (status === 401 || status === 403)
    return "Auth failed. If your CRM expects a Bearer token or API key, configure your webhook receiver (Zapier/Make/n8n) to accept the payload without secrets — or add the auth header in your own routing layer between us and the CRM.";
  if (status === 404)
    return "Endpoint not found. Double-check the URL path.";
  if (status === 422 || status === 400)
    return "Endpoint rejected the payload. Your CRM is expecting specific field names; map the BarndoBuilt lead schema to your CRM's fields via Zapier/Make.";
  if (status === 429)
    return "Rate limited. Try again in a moment.";
  if (status >= 500)
    return "Your endpoint returned a server error. Check the receiving service's logs.";
  return "Non-2xx response — see the body snippet for details.";
}
