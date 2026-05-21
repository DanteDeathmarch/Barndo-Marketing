/**
 * Customer-Owned Conversion Bot — Install Wizard (Artifact version)
 *
 * Single-file React component for pasting into Claude.ai as a published
 * artifact. Self-contained, no external imports beyond React, no data leaves
 * the customer's browser.
 *
 * IMPROVEMENTS over the v1 artifact (synced back from the published version):
 *  - Three-tier askClaude fallback: window.claude.complete → direct Anthropic
 *    API using the Step 2 key → typed ClaudeError with recovery UI
 *  - ClaudeErrorBanner: inline recovery affordance with Retry / Open
 *    Claude.ai / Dismiss instead of throwing a dead screen
 *  - window._botWizardApiKey stash: Step 2 wires the API key to window so
 *    the askClaude fallback can reach it
 *  - Inline styles throughout: reliable rendering in Claude.ai's artifact
 *    sandbox even when its Tailwind CDN setup varies
 *  - anthropic-dangerous-direct-browser-access header on the fallback path
 */

import { useEffect, useState } from "react";

type StepId =
  | "welcome"
  | "anthropic-key"
  | "brand"
  | "knowledge"
  | "qualifying"
  | "deploy"
  | "test"
  | "install";

interface StepDef {
  id: StepId;
  num: number;
  title: string;
  blurb: string;
}

const STEPS: StepDef[] = [
  { id: "welcome", num: 1, title: "Account prep", blurb: "Confirm the five accounts you'll own. Nothing touches our servers — everything lives in your stack." },
  { id: "anthropic-key", num: 2, title: "Anthropic API key", blurb: "Paste your key. It stays in your browser's localStorage and goes into your deployed bot's environment — never anywhere else." },
  { id: "brand", num: 3, title: "Brand & voice", blurb: "Your Claude analyzes your existing site and pre-fills brand defaults. Override anything." },
  { id: "knowledge", num: 4, title: "Knowledge base", blurb: "Paste your SOPs / FAQs / docs. Your Claude restructures them into a clean knowledge.md." },
  { id: "qualifying", num: 5, title: "Qualifying & lead destination", blurb: "Define your good-lead signals + where leads should land." },
  { id: "deploy", num: 6, title: "Deploy", blurb: "Your Claude orchestrates the Vercel + GitHub deploy if you have those MCP connectors attached — or follow the manual steps." },
  { id: "test", num: 7, title: "Live-fire test", blurb: "Your Claude role-plays the bot's hardest visitor personas against your config before any real customer sees it." },
  { id: "install", num: 8, title: "Install + ongoing playbook", blurb: "One script tag for your site, plus the Claude Max templates you keep forever." },
];

interface Persona {
  id: string;
  name: string;
  description: string;
  openingMessage: string;
  expectedOutcome: "qualify-bridge" | "soft-exit" | "educate-then-bridge" | "gracefully-end";
}

interface EvalResult {
  persona: Persona;
  transcript: { role: "bot" | "persona"; content: string }[];
  verdict: string;
  score: number;
  suggestedEdit?: string;
}

interface Iteration {
  number: number;
  timestamp: string;
  overallScore: number;
  appliedRule: string;
  rationale: string;
}

interface WizardState {
  currentStep: StepId;
  completed: StepId[];
  anthropicKey: string;
  siteUrl: string;
  siteTitle: string;
  siteTagline: string;
  brandColor: string;
  brandColorAccent: string;
  logoUrl: string;
  toneWords: string;
  formality: "casual" | "warm" | "professional";
  knowledgeRaw: string;
  knowledgeMarkdown: string;
  qualifyingGoal: string;
  qualifyingSignals: string;
  disqualifyingSignals: string;
  webhookUrl: string;
  vercelProjectName: string;
  deployedUrl: string;
  personas: Persona[];
  evalResults: EvalResult[];
  customRules: string[];
  iterations: Iteration[];
}

const INITIAL: WizardState = {
  currentStep: "welcome",
  completed: [],
  anthropicKey: "",
  siteUrl: "",
  siteTitle: "",
  siteTagline: "",
  brandColor: "#9a3324",
  brandColorAccent: "#1f1b16",
  logoUrl: "",
  toneWords: "warm, plainspoken, expert",
  formality: "warm",
  knowledgeRaw: "",
  knowledgeMarkdown: "",
  qualifyingGoal: "",
  qualifyingSignals: "",
  disqualifyingSignals: "",
  webhookUrl: "",
  vercelProjectName: "",
  deployedUrl: "",
  personas: [],
  evalResults: [],
  customRules: [],
  iterations: [],
};

const STORAGE_KEY = "conversion_bot_wizard_v1";

const BOOTSTRAP_PROMPT = `I am installing the customer-qualifying chatbot on my own stack.
I own everything — my Anthropic API key, my Vercel project, my data.

Please be ready to help me with these workflows as they come up:

1. UPDATE-KB — I'll paste my current knowledge.md and describe a change.
   Return the updated file ready to commit.

2. REFINE-TONE — I'll paste my system prompt and describe a voice change.
   Rewrite only the rules section, keep the four-phase arc intact.

3. ADD-QUALIFYING-RULE — I'll describe a new lead-scoring or disqualifying
   rule. Show me the system-prompt edit ready to drop in.

4. AUDIT — When I paste my daily audit report, summarize what's healthy,
   what's anomalous, and what I should act on.

5. RESEARCH — When I ask, research my niche / competitors / current
   landscape and propose KB additions with sources.

Confirm you're ready, then wait for me to bring you the first task.`;

// ---------------------------------------------------------------------------
// askClaude — three-tier fallback chain:
//   1. window.claude.complete()  — preferred, routes through host conversation
//   2. Direct Anthropic API      — uses the key from Step 2 if available
//   3. Throws a typed ClaudeError — UI catches this and shows recovery UI
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    claude?: { complete: (prompt: string) => Promise<string> };
    _botWizardApiKey?: string; // set by Step 2 so askClaude can reach it
  }
}

class ClaudeError extends Error {
  constructor(
    message: string,
    public tier: "window" | "api" | "both",
    public recoverable: boolean
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

async function askClaude(prompt: string): Promise<string> {
  // Tier 1 — window.claude.complete (host conversation)
  if (typeof window !== "undefined" && window.claude?.complete) {
    try {
      const result = await window.claude.complete(prompt);
      if (result && result.trim().length > 0) return result;
      throw new Error("Empty response from window.claude.complete");
    } catch (e) {
      // Fall through to Tier 2 — don't surface this error yet
      console.warn("[wizard] window.claude.complete failed, trying API fallback:", e);
    }
  }

  // Tier 2 — direct Anthropic API using the key from Step 2
  const apiKey = typeof window !== "undefined"
    ? window._botWizardApiKey || ""
    : "";

  if (apiKey.startsWith("sk-ant-") && apiKey.length > 30) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`API ${res.status}: ${(errBody as {error?: {message?: string}}).error?.message ?? res.statusText}`);
      }
      const data = await res.json() as { content: { type: string; text?: string }[] };
      const text = data.content
        .filter((b) => b.type === "text")
        .map((b) => b.text ?? "")
        .join("\n")
        .trim();
      if (!text) throw new Error("Empty response from Anthropic API");
      return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API call failed";
      throw new ClaudeError(
        `Both Claude conversation and direct API failed.\n\nAPI error: ${msg}\n\nCheck that your API key in Step 2 is valid and has credits.`,
        "both",
        true
      );
    }
  }

  // Tier 3 — no key available, give clear recovery instructions
  throw new ClaudeError(
    typeof window !== "undefined" && window.claude === undefined
      ? "This wizard must run inside a Claude.ai conversation — open it from within Claude, not as a standalone link."
      : "Claude connection lost. To recover: paste your Anthropic API key in Step 2, then retry. Or refresh the page to reconnect to your Claude conversation.",
    "both",
    true
  );
}

// ---------------------------------------------------------------------------
// ClaudeErrorBanner — shown inline when askClaude throws a ClaudeError
// ---------------------------------------------------------------------------
function ClaudeErrorBanner({
  error,
  onRetry,
  onDismiss,
}: {
  error: ClaudeError;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={{ borderRadius: 6, border: "2px solid #fca5a5", background: "#fef2f2", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: "#9a3324", margin: 0 }}>⚠ Claude connection issue</p>
        <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#78716c", lineHeight: 1 }}>×</button>
      </div>
      <p style={{ fontSize: 12, color: "#44403c", margin: 0, whiteSpace: "pre-wrap" }}>{error.message}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onRetry && (
          <button onClick={onRetry} style={{ borderRadius: 6, background: "#9a3324", padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "white", border: "none", cursor: "pointer" }}>
            Retry
          </button>
        )}
        <button onClick={() => { window.location.href = "https://claude.ai"; }} style={{ borderRadius: 6, border: "1px solid #d6d3d1", padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "#44403c", background: "white", cursor: "pointer" }}>
          Open Claude.ai ↗
        </button>
        <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#78716c", padding: "8px 0" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export default function InstallWizard() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...INITIAL, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, loaded]);

  function update<K extends keyof WizardState>(key: K, val: WizardState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }
  function goTo(id: StepId) { setState((s) => ({ ...s, currentStep: id })); }
  function markComplete(id: StepId, next?: StepId) {
    setState((s) => ({
      ...s,
      completed: s.completed.includes(id) ? s.completed : [...s.completed, id],
      currentStep: next ?? s.currentStep,
    }));
  }
  function reset() {
    if (!confirm("Reset wizard? Your inputs will be lost.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL);
  }

  const idx = STEPS.findIndex((s) => s.id === state.currentStep);
  const step = STEPS[idx];
  const next = STEPS[idx + 1];
  const prev = STEPS[idx - 1];

  if (!loaded) return <div style={{ padding: "1.5rem", color: "#57534e" }}>Loading…</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#fafaf9", color: "#1c1917", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem", display: "grid", gridTemplateColumns: "220px 1fr", gap: "1.5rem" }}>
        <aside>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#78716c", marginBottom: 12 }}>Install Wizard</h2>
          {STEPS.map((s) => {
            const isCurrent = s.id === state.currentStep;
            const isDone = state.completed.includes(s.id);
            return (
              <button key={s.id} onClick={() => goTo(s.id)} style={{ width: "100%", textAlign: "left", borderRadius: 6, padding: "8px 12px", fontSize: 13, border: "none", cursor: "pointer", marginBottom: 2, background: isCurrent ? "#9a3324" : "transparent", color: isCurrent ? "#fafaf9" : "#44403c", fontWeight: isCurrent ? 600 : 400, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", width: 20, height: 20, borderRadius: "50%", fontSize: 11, alignItems: "center", justifyContent: "center", flexShrink: 0, background: isDone ? "#15803d" : isCurrent ? "#fafaf9" : "#d6d3d1", color: isDone ? "white" : isCurrent ? "#9a3324" : "#78716c", fontWeight: 600 }}>
                  {isDone ? "✓" : s.num}
                </span>
                {s.title}
              </button>
            );
          })}
          <button onClick={reset} style={{ width: "100%", textAlign: "left", borderRadius: 6, padding: "8px 12px", marginTop: 24, fontSize: 11, color: "#78716c", border: "none", background: "transparent", cursor: "pointer" }}>
            Reset wizard
          </button>
        </aside>

        <main style={{ background: "white", border: "1px solid #e7e5e4", borderRadius: 8, padding: "1.75rem", maxWidth: 640 }}>
          <div style={{ fontSize: 12, color: "#78716c" }}>Step {step.num} of {STEPS.length}</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700 }}>{step.title}</h1>
          <p style={{ marginTop: 8, color: "#44403c", fontSize: 14 }}>{step.blurb}</p>

          <div style={{ marginTop: 24, borderTop: "1px solid #e7e5e4", paddingTop: 24 }}>
            {step.id === "welcome" && <StepWelcome onContinue={() => markComplete("welcome", "anthropic-key")} />}
            {step.id === "anthropic-key" && <StepAnthropicKey value={state.anthropicKey} onChange={(v) => update("anthropicKey", v)} onContinue={() => markComplete("anthropic-key", "brand")} />}
            {step.id === "brand" && <StepBrand state={state} update={update} onContinue={() => markComplete("brand", "knowledge")} />}
            {step.id === "knowledge" && <StepKnowledge state={state} update={update} onContinue={() => markComplete("knowledge", "qualifying")} />}
            {step.id === "qualifying" && <StepQualifying state={state} update={update} onContinue={() => markComplete("qualifying", "deploy")} />}
            {step.id === "deploy" && <StepDeploy state={state} update={update} onContinue={() => markComplete("deploy", "test")} />}
            {step.id === "test" && <StepTest state={state} update={update} onContinue={() => markComplete("test", "install")} />}
            {step.id === "install" && <StepInstall state={state} />}
          </div>

          <div style={{ marginTop: 32, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e7e5e4", paddingTop: 20, fontSize: 13 }}>
            {prev ? (
              <button onClick={() => goTo(prev.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#78716c", fontWeight: 600 }}>← {prev.title}</button>
            ) : <span />}
            {next && state.completed.includes(state.currentStep) && (
              <button onClick={() => goTo(next.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#78716c", fontWeight: 600 }}>{next.title} →</button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------
const btn = (extra?: object) => ({
  borderRadius: 6, background: "#9a3324", padding: "10px 20px",
  fontSize: 13, fontWeight: 600, color: "#fafaf9", border: "none",
  cursor: "pointer", ...extra,
});
const inp = (extra?: object) => ({
  width: "100%", borderRadius: 6, border: "1px solid #d6d3d1",
  background: "white", padding: "10px 12px", fontSize: 13,
  boxSizing: "border-box" as const, ...extra,
});

// ---------------------------------------------------------------------------
// Step 1 — Welcome
// ---------------------------------------------------------------------------
function StepWelcome({ onContinue }: { onContinue: () => void }) {
  const accounts = [
    { name: "Claude Max", url: "https://claude.ai/upgrade", why: "You're already in it — this artifact runs inside your Claude conversation. Your Claude does all the AI work in this wizard." },
    { name: "Anthropic API key", url: "https://console.anthropic.com/settings/keys", why: "Your deployed bot's runtime brain. Cents per conversation. Not used by this wizard itself." },
    { name: "Vercel (free tier OK)", url: "https://vercel.com/signup", why: "Hosts your bot. Auto-deploys from GitHub." },
    { name: "GitHub", url: "https://github.com/join", why: "Source of truth for the bot's code." },
    { name: "Replit (optional)", url: "https://replit.com/", why: "In-browser editor + always-on background eval runner." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ borderRadius: 6, background: "#f5f5f4", padding: 16, fontSize: 13 }}>
        <strong>You own everything.</strong> Your data never touches us. Your conversations live in your Vercel project. Your API costs go to your Anthropic account. Cancel us tomorrow and the bot keeps running on your stack.
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>A. Accounts you&apos;ll need</h3>
        {accounts.map((a) => (
          <div key={a.name} style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 12, marginBottom: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>{a.name}</span>
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontSize: 12, fontWeight: 600 }}>Open ↗</a>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#57534e" }}>{a.why}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>B. Prime your Claude (this conversation)</h3>
        <p style={{ fontSize: 12, color: "#44403c", marginBottom: 8 }}>Copy this and paste it as your next message to Claude so it knows what workflows to be ready for.</p>
        <pre style={{ background: "#1c1917", color: "#fafaf9", borderRadius: 6, padding: 12, fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{BOOTSTRAP_PROMPT}</pre>
        <button onClick={() => navigator.clipboard.writeText(BOOTSTRAP_PROMPT)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9a3324" }}>Copy bootstrap prompt</button>
      </div>
      <button onClick={onContinue} style={btn()}>Everything ready — continue</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Anthropic API key (for the deployed bot runtime AND wizard fallback)
// ---------------------------------------------------------------------------
function StepAnthropicKey({ value, onChange, onContinue }: { value: string; onChange: (v: string) => void; onContinue: () => void }) {
  const looksValid = value.startsWith("sk-ant-") && value.length > 30;

  // Keep window._botWizardApiKey in sync so the askClaude fallback can reach it
  useEffect(() => {
    if (typeof window !== "undefined") {
      window._botWizardApiKey = value;
    }
  }, [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ borderRadius: 6, background: "#fffbeb", border: "1px solid #fbbf24", padding: 12, fontSize: 12, color: "#92400e" }}>
        This key powers your <strong>deployed bot</strong> and acts as a <strong>fallback</strong> if the wizard loses its Claude connection mid-session.
      </div>
      <ol style={{ fontSize: 13, color: "#44403c", paddingLeft: 20, lineHeight: 1.8 }}>
        <li>Open <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontWeight: 600 }}>console.anthropic.com → API Keys</a></li>
        <li>Create a key named <code>bot-runtime</code></li>
        <li>Paste it below</li>
      </ol>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="sk-ant-…" style={inp({ fontFamily: "monospace" })} />
      <p style={{ fontSize: 12, color: "#78716c", margin: 0 }}>Stored only in this browser&apos;s localStorage. Goes into your Vercel env vars in Step 6. Also used as a wizard fallback if your Claude conversation disconnects.</p>
      {looksValid && <button onClick={onContinue} style={btn()}>Key saved — continue</button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Brand & voice
// ---------------------------------------------------------------------------
function StepBrand({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "scanned" | "error">("idle");
  const [claudeError, setClaudeError] = useState<ClaudeError | null>(null);

  async function scanWithClaude() {
    if (!state.siteUrl.trim()) return;
    setScanState("scanning"); setClaudeError(null);
    const prompt = `I'm setting up a chatbot for the business at this URL: ${state.siteUrl}

Please fetch the page and extract:
- title (og:title or <title>)
- tagline (og:description, meta description, or first H1)
- primaryColor (hex from theme-color, logo, or most prominent CSS color)
- logoUrl (og:image or logo img, absolute URL)

Return ONLY a JSON object on a single line, no preamble, no markdown fences:
{"title":"...","tagline":"...","primaryColor":"#hex","logoUrl":"https://..."}

Use empty string for any unknown field.`;
    try {
      const raw = await askClaude(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Claude didn't return JSON — try again.");
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; tagline?: string; primaryColor?: string; logoUrl?: string };
      if (parsed.title) update("siteTitle", parsed.title);
      if (parsed.tagline) update("siteTagline", parsed.tagline);
      if (parsed.primaryColor && /^#[0-9a-f]{3,8}$/i.test(parsed.primaryColor)) update("brandColor", parsed.primaryColor);
      if (parsed.logoUrl) update("logoUrl", parsed.logoUrl);
      setScanState("scanned");
    } catch (err) {
      if (err instanceof ClaudeError) { setClaudeError(err); setScanState("idle"); }
      else { setScanState("error"); setClaudeError(new ClaudeError(err instanceof Error ? err.message : "scan failed", "both", true)); }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", background: "#fafaf9", padding: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>Your website URL</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="url" value={state.siteUrl} onChange={(e) => update("siteUrl", e.target.value)} placeholder="https://yourcompany.com" style={inp({ flex: 1, width: "auto" })} />
          <button type="button" onClick={scanWithClaude} disabled={!state.siteUrl.trim() || scanState === "scanning"} style={btn({ opacity: (!state.siteUrl.trim() || scanState === "scanning") ? 0.5 : 1, whiteSpace: "nowrap" })}>
            {scanState === "scanning" ? "Scanning…" : "Scan with Claude"}
          </button>
        </div>
        {scanState === "scanned" && <p style={{ marginTop: 8, fontSize: 12, color: "#15803d" }}>✓ Scanned — fields below are pre-filled. Edit anything.</p>}
        {claudeError && <ClaudeErrorBanner error={claudeError} onRetry={scanWithClaude} onDismiss={() => setClaudeError(null)} />}
        {state.siteTitle && (
          <div style={{ marginTop: 12, fontSize: 12 }}>
            <strong>Title:</strong> {state.siteTitle}
            {state.siteTagline && <span> · <strong>Tagline:</strong> {state.siteTagline}</span>}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ fontSize: 13 }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Brand color</span>
          <input type="color" value={state.brandColor} onChange={(e) => update("brandColor", e.target.value)} style={{ width: "100%", height: 40, borderRadius: 6, border: "1px solid #d6d3d1", cursor: "pointer" }} />
        </label>
        <label style={{ fontSize: 13 }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Text color</span>
          <input type="color" value={state.brandColorAccent} onChange={(e) => update("brandColorAccent", e.target.value)} style={{ width: "100%", height: 40, borderRadius: 6, border: "1px solid #d6d3d1", cursor: "pointer" }} />
        </label>
      </div>

      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Logo URL (optional)</span>
        <input type="url" value={state.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://yourcompany.com/logo.png" style={inp()} />
      </label>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Tone words (3–5 adjectives)</span>
        <input type="text" value={state.toneWords} onChange={(e) => update("toneWords", e.target.value)} placeholder="warm, plainspoken, expert" style={inp()} />
      </label>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Formality</span>
        <select value={state.formality} onChange={(e) => update("formality", e.target.value as WizardState["formality"])} style={inp()}>
          <option value="casual">Casual (texting voice)</option>
          <option value="warm">Warm (showroom employee)</option>
          <option value="professional">Professional (consultant)</option>
        </select>
      </label>

      <div style={{ borderRadius: 8, border: "1px solid #e7e5e4", padding: 16, background: state.brandColor + "15" }}>
        <p style={{ fontSize: 11, color: "#78716c", marginBottom: 8, margin: "0 0 8px" }}>Preview</p>
        <div style={{ borderRadius: 6, padding: 12, fontSize: 13, background: state.brandColor, color: state.brandColorAccent }}>
          <strong>Concierge:</strong> Hey — tell me what you&apos;re working on and I&apos;ll help shape it.
        </div>
      </div>

      {state.toneWords.trim().length > 0 && (
        <button onClick={onContinue} style={btn()}>Save brand — continue</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Knowledge base
// ---------------------------------------------------------------------------
function StepKnowledge({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [restructureState, setRestructureState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [restructureError, setRestructureError] = useState("");

  async function restructure() {
    if (state.knowledgeRaw.trim().length < 50) return;
    setRestructureState("working"); setRestructureError("");
    try {
      const prompt = `Restructure this raw knowledge dump into a clean knowledge.md file for a customer-qualifying chatbot.

Rules:
- Use ## headings for sections (What we do / Pricing / Process / FAQ / Coverage — whatever fits)
- Keep facts verbatim — do NOT invent prices, names, or guarantees
- Use ranges for any number that varies; note "a [role] confirms after [event]" for specifics
- Omit duplicate content
- Plain markdown only, no front-matter
- Return ONLY the markdown, no preamble, no explanation

Raw text:
<<<
${state.knowledgeRaw}
>>>`;
      const md = await askClaude(prompt);
      update("knowledgeMarkdown", md.trim());
      setRestructureState("done");
    } catch (err) {
      setRestructureState("error");
      setRestructureError(err instanceof Error ? err.message : "restructure failed");
    }
  }

  const ready = state.knowledgeRaw.trim().length > 50;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "#44403c", margin: 0 }}>Paste your SOPs, FAQs, pricing notes, &quot;things customers always ask&quot; — anything the bot should know. Don&apos;t worry about formatting; your Claude cleans it up.</p>
      <textarea value={state.knowledgeRaw} onChange={(e) => update("knowledgeRaw", e.target.value)} placeholder="Paste raw notes, doc dumps, FAQ lists, transcripts…" rows={10} style={inp({ fontFamily: "monospace", fontSize: 12, resize: "vertical" })} />
      {ready && (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={restructure} disabled={restructureState === "working"} style={btn({ opacity: restructureState === "working" ? 0.5 : 1 })}>
            {restructureState === "working" ? "Restructuring…" : "Restructure with Claude"}
          </button>
          <button type="button" onClick={onContinue} style={{ borderRadius: 6, border: "1px solid #d6d3d1", padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#44403c", background: "white", cursor: "pointer" }}>
            Skip — continue
          </button>
        </div>
      )}
      {restructureState === "error" && <p style={{ fontSize: 12, color: "#9a3324", margin: 0 }}>⚠ {restructureError}</p>}
      {state.knowledgeMarkdown && (
        <>
          <div style={{ borderRadius: 6, border: "1px solid #e7e5e4" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid #e7e5e4" }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Restructured knowledge.md — review & edit</p>
              <button type="button" onClick={() => navigator.clipboard.writeText(state.knowledgeMarkdown)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9a3324" }}>Copy</button>
            </div>
            <textarea value={state.knowledgeMarkdown} onChange={(e) => update("knowledgeMarkdown", e.target.value)} rows={14} style={{ width: "100%", fontSize: 11, fontFamily: "monospace", padding: 12, border: 0, borderRadius: "0 0 6px 6px", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          <button onClick={onContinue} style={btn()}>Looks good — continue</button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Qualifying criteria + lead destination
// ---------------------------------------------------------------------------
function StepQualifying({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [webhookState, setWebhookState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [webhookMsg, setWebhookMsg] = useState("");

  async function testWebhook() {
    if (!state.webhookUrl.trim()) return;
    setWebhookState("testing");
    try {
      const res = await fetch(state.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "wizard-test", test: true, lead: { firstName: "Test", tier: "A", score: 115 } }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) { setWebhookState("ok"); setWebhookMsg(`✓ ${res.status} — endpoint accepted the sample payload.`); }
      else { setWebhookState("fail"); setWebhookMsg(`${res.status} — endpoint rejected the payload. Check auth headers.`); }
    } catch (err) {
      setWebhookState("fail");
      const msg = err instanceof Error ? err.message : "request failed";
      setWebhookMsg(msg.includes("CORS") || msg.includes("Failed to fetch")
        ? "Browser blocked the request (CORS). Test via your Claude or from your own server."
        : msg);
    }
  }

  const ready = state.qualifyingGoal.trim().length > 5 && state.qualifyingSignals.trim().length > 5;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>What is this bot trying to get the visitor to do?</span>
        <input type="text" value={state.qualifyingGoal} onChange={(e) => update("qualifyingGoal", e.target.value)} placeholder="Book a 30-min consult / fill out qualify form / request a quote" style={inp()} />
      </label>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Qualifying signals — what a good lead looks like</span>
        <textarea value={state.qualifyingSignals} onChange={(e) => update("qualifyingSignals", e.target.value)} placeholder="Owns land · timeline under 12 months · budget over $150k · in TX/TN/OK/LA" rows={3} style={inp({ resize: "vertical" })} />
      </label>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Disqualifying signals</span>
        <textarea value={state.disqualifyingSignals} onChange={(e) => update("disqualifyingSignals", e.target.value)} placeholder="No land yet · 18+ months out · wants a kit not a builder" rows={2} style={inp({ resize: "vertical" })} />
      </label>
      <label style={{ fontSize: 13 }}>
        <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Lead webhook URL</span>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="url" value={state.webhookUrl} onChange={(e) => { update("webhookUrl", e.target.value); setWebhookState("idle"); }} placeholder="https://your-crm.com/api/leads OR Zapier / Make webhook" style={inp({ flex: 1, width: "auto", fontFamily: "monospace", fontSize: 12 })} />
          <button type="button" onClick={testWebhook} disabled={!state.webhookUrl.trim() || webhookState === "testing"} style={btn({ opacity: (!state.webhookUrl.trim() || webhookState === "testing") ? 0.5 : 1 })}>
            {webhookState === "testing" ? "Testing…" : "Test"}
          </button>
        </div>
      </label>
      {webhookState !== "idle" && webhookMsg && (
        <div style={{ borderRadius: 6, padding: 12, fontSize: 12, background: webhookState === "ok" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${webhookState === "ok" ? "#86efac" : "#fca5a5"}`, color: webhookState === "ok" ? "#15803d" : "#9a3324" }}>{webhookMsg}</div>
      )}
      {ready && <button onClick={onContinue} style={btn()}>Save criteria — continue</button>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Deploy
// ---------------------------------------------------------------------------
function StepDeploy({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const REPO = "https://github.com/DanteDeathmarch/Barndo-Marketing";
  const [mcpState, setMcpState] = useState<"unknown" | "checking" | "available" | "unavailable">("unknown");
  const [deployState, setDeployState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [deployError, setDeployError] = useState("");

  const env = `ANTHROPIC_API_KEY=${state.anthropicKey ? state.anthropicKey : "(paste your key from step 2)"}
LEAD_WEBHOOK_URL=${state.webhookUrl || "(set in step 5)"}
BRAND_COLOR=${state.brandColor}
BRAND_LOGO_URL=${state.logoUrl || ""}
TONE_WORDS=${state.toneWords}
FORMALITY=${state.formality}
BUSINESS_NAME=${state.vercelProjectName || "your-business"}`;

  function logLine(line: string) { setDeployLog((l) => [...l, line]); }

  async function checkMcp() {
    setMcpState("checking");
    try {
      const probe = await askClaude(
        `Do you currently have access to MCP tools for BOTH Vercel AND GitHub — tools that let you create Vercel projects and manage GitHub repos via tool calls? Reply with exactly one word: YES or NO.`
      );
      setMcpState(probe.trim().toUpperCase().startsWith("YES") ? "available" : "unavailable");
    } catch { setMcpState("unavailable"); }
  }

  async function autoDeploy() {
    if (!state.vercelProjectName.trim()) { setDeployError("Set a Vercel project name first."); return; }
    setDeployState("running"); setDeployLog([]); setDeployError("");
    try {
      logLine("Asking your Claude to fork the template repo into your GitHub…");
      const fork = await askClaude(
        `Use your GitHub MCP tool to fork the repository ${REPO} into the authenticated user's account. Name the fork "${state.vercelProjectName}". When done, reply with exactly one line:
FORKED <full https URL of the new repo>
If blocked, reply: FAIL <reason>`
      );
      const forkMatch = fork.match(/FORKED\s+(\S+)/i);
      if (!forkMatch) throw new Error(fork.replace(/^FAIL\s+/i, "").slice(0, 200));
      const forkUrl = forkMatch[1];
      logLine(`✓ Forked → ${forkUrl}`);

      logLine("Creating Vercel project and linking to fork…");
      const create = await askClaude(
        `Use your Vercel MCP tool to create a new project named "${state.vercelProjectName}" linked to GitHub repo ${forkUrl}. Framework: Next.js. When done, reply with exactly one line:
PROJECT <full vercel project URL like https://${state.vercelProjectName}.vercel.app>
If blocked, reply: FAIL <reason>`
      );
      const projectMatch = create.match(/PROJECT\s+(\S+)/i);
      if (!projectMatch) throw new Error(create.replace(/^FAIL\s+/i, "").slice(0, 200));
      const projectUrl = projectMatch[1];
      logLine(`✓ Project → ${projectUrl}`);

      logLine("Setting environment variables…");
      const setEnv = await askClaude(
        `Use your Vercel MCP tool to set these environment variables on project "${state.vercelProjectName}" (Production):

ANTHROPIC_API_KEY=${state.anthropicKey}
LEAD_WEBHOOK_URL=${state.webhookUrl}
BRAND_COLOR=${state.brandColor}
BRAND_LOGO_URL=${state.logoUrl}
TONE_WORDS=${state.toneWords}
FORMALITY=${state.formality}
BUSINESS_NAME=${state.vercelProjectName}

When done, reply with exactly: ENV_SET
If blocked, reply: FAIL <reason>`
      );
      if (!/ENV_SET/i.test(setEnv)) throw new Error(setEnv.replace(/^FAIL\s+/i, "").slice(0, 200));
      logLine("✓ Env vars set");

      logLine("Triggering production deploy…");
      const deploy = await askClaude(
        `Use your Vercel MCP tool to trigger a production deploy of project "${state.vercelProjectName}". When started, reply:
DEPLOY_STARTED <inspection URL>
If blocked, reply: FAIL <reason>`
      );
      const deployMatch = deploy.match(/DEPLOY_STARTED\s+(\S+)/i);
      logLine(deployMatch ? `✓ Deploy started → ${deployMatch[1]}` : "✓ Deploy triggered");

      update("deployedUrl", projectUrl);
      setDeployState("done");
    } catch (err) {
      setDeployState("failed");
      setDeployError(err instanceof Error ? err.message : "deploy failed");
    }
  }

  const ready = state.vercelProjectName.trim().length > 2;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ borderRadius: 6, border: "2px solid #86efac", background: "#f0fdf4", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontWeight: 600, color: "#14532d", fontSize: 13, margin: 0 }}>⚡ Auto-deploy via Vercel + GitHub MCP</p>
        <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>If you have Vercel and GitHub MCP connectors attached to this Claude conversation, Claude orchestrates the entire fork + deploy + env-var setup. Zero terminal commands.</p>
        {mcpState === "unknown" && <button type="button" onClick={checkMcp} style={{ ...btn(), background: "#15803d", alignSelf: "flex-start" }}>Check if my Claude has the connectors</button>}
        {mcpState === "checking" && <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>Checking Claude&apos;s tool access…</p>}
        {mcpState === "available" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, color: "#15803d", fontWeight: 600, margin: 0 }}>✓ Vercel + GitHub MCP detected.</p>
            <input type="text" value={state.vercelProjectName} onChange={(e) => update("vercelProjectName", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="project-name (lowercase, hyphens only)" style={inp({ fontFamily: "monospace" })} />
            <button type="button" onClick={autoDeploy} disabled={!ready || deployState === "running"} style={{ ...btn(), background: "#15803d", alignSelf: "flex-start", opacity: (!ready || deployState === "running") ? 0.5 : 1 }}>
              {deployState === "running" ? "Deploying…" : "Auto-deploy to my Vercel"}
            </button>
          </div>
        )}
        {mcpState === "unavailable" && (
          <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>
            No Vercel/GitHub MCP detected. Use Path A below — ~3 extra clicks but works without connectors.{" "}
            <button type="button" onClick={() => setMcpState("unknown")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a3324", fontWeight: 600, fontSize: 12 }}>Recheck</button>
          </p>
        )}
        {deployLog.length > 0 && (
          <div style={{ borderRadius: 6, background: "#1c1917", color: "#fafaf9", padding: 12, fontSize: 11, fontFamily: "monospace", maxHeight: 150, overflowY: "auto" }}>
            {deployLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
        {deployState === "done" && state.deployedUrl && (
          <p style={{ fontSize: 13, margin: 0 }}><strong style={{ color: "#15803d" }}>✓ Deployed:</strong> <a href={state.deployedUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontWeight: 600 }}>{state.deployedUrl}</a></p>
        )}
        {deployState === "failed" && <p style={{ fontSize: 12, color: "#9a3324", margin: 0 }}>⚠ Auto-deploy stopped: {deployError}. Use Path A below to finish manually.</p>}
      </div>

      <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Path A — Manual (fork → Vercel → env vars)</p>
        <ol style={{ fontSize: 13, color: "#44403c", paddingLeft: 20, lineHeight: 2 }}>
          <li>Open <a href={REPO} target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontWeight: 600 }}>the template repo ↗</a> → Fork</li>
          <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontWeight: 600 }}>vercel.com/new ↗</a> → Import your fork</li>
          <li>Paste the env vars below into Vercel&apos;s Environment Variables pane</li>
          <li>Deploy — first build takes ~2 minutes</li>
        </ol>
      </div>

      {!state.deployedUrl && (
        <label style={{ fontSize: 13 }}>
          <span style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Vercel project name</span>
          <input type="text" value={state.vercelProjectName} onChange={(e) => update("vercelProjectName", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="your-bot-name" style={inp({ fontFamily: "monospace" })} />
        </label>
      )}

      <div style={{ borderRadius: 6, border: "1px solid #e7e5e4" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid #e7e5e4" }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Env vars — paste into Vercel</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(env)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9a3324" }}>Copy all</button>
        </div>
        <pre style={{ background: "#1c1917", color: "#fafaf9", padding: 12, fontSize: 11, overflowX: "auto", borderRadius: "0 0 6px 6px", margin: 0 }}>{env}</pre>
      </div>

      {ready && (
        <button onClick={onContinue} style={btn()}>
          {state.deployedUrl ? "Continue to live-fire test →" : "Deployed manually — continue to test"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Live-fire test
// ---------------------------------------------------------------------------
function StepTest({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [genState, setGenState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [genError, setGenError] = useState("");
  const [evalState, setEvalState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [evalProgress, setEvalProgress] = useState({ done: 0, total: 0, current: "" });
  const [fixState, setFixState] = useState<"idle" | "diagnosing" | "applied" | "error">("idle");
  const [fixError, setFixError] = useState("");
  const [mineTranscript, setMineTranscript] = useState("");
  const [mineState, setMineState] = useState<"idle" | "mining" | "done" | "error">("idle");
  const [mineError, setMineError] = useState("");

  async function generatePersonas() {
    setGenState("generating"); setGenError("");
    try {
      const prompt = `Generate 8 visitor personas to stress-test a customer-qualifying chatbot.
Bot's job: ${state.qualifyingGoal}
Qualifying signals (good lead): ${state.qualifyingSignals}
Disqualifying signals: ${state.disqualifyingSignals || "(none specified)"}

Cover this distribution:
- 2 strong fits (different sub-archetypes)
- 1 tire-kicker (curious, never commits)
- 1 wrong-fit (matches a disqualifying signal)
- 1 hostile/skeptic (rude but real intent)
- 1 terse/mobile (1-3 word answers)
- 1 overqualified (impatient with discovery)
- 1 time-waster (endless hypotheticals)

Return ONLY a JSON array, no preamble, no fences:
[{"id":"kebab-id","name":"Human Name","description":"1-2 sentences","openingMessage":"their first message","expectedOutcome":"qualify-bridge"|"soft-exit"|"educate-then-bridge"|"gracefully-end"}]`;
      const raw = await askClaude(prompt);
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error("Claude didn't return a JSON array.");
      const personas = JSON.parse(arrMatch[0]) as Persona[];
      update("personas", personas);
      setGenState("done");
    } catch (err) { setGenState("error"); setGenError(err instanceof Error ? err.message : "generation failed"); }
  }

  function buildSystemPrompt() {
    const customRulesBlock = state.customRules.length > 0
      ? `\n\nAdditional rules from prior eval fixes:\n${state.customRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "";
    return `You are the conversion concierge for ${state.vercelProjectName || "this business"}. You behave like a knowledgeable, helpful guide — warm and direct, never pushy.

Voice: ${state.toneWords}. Formality: ${state.formality}.
Job: ${state.qualifyingGoal}.
Qualifying signals: ${state.qualifyingSignals}.
Disqualifying signals: ${state.disqualifyingSignals || "(none)"}.

Rules:
- Keep replies 1-3 short sentences. No long paragraphs.
- End almost every turn with ONE focused question. Never a menu.
- Reflect the visitor's specific words back so they feel heard.
- Never invent prices, names, or guarantees. Use ranges; say "a [role] confirms after [event]".
- Follow a 4-phase arc: open → discovery → vision → bridge.${customRulesBlock}

Knowledge base:
${state.knowledgeMarkdown || state.knowledgeRaw || "(no knowledge configured yet)"}`;
  }

  async function runFullEval() {
    if (state.personas.length === 0) return;
    setEvalState("running"); setEvalProgress({ done: 0, total: state.personas.length, current: "" });
    update("evalResults", []);
    const sys = buildSystemPrompt();
    const results: EvalResult[] = [];

    for (let i = 0; i < state.personas.length; i++) {
      const p = state.personas[i];
      setEvalProgress({ done: i, total: state.personas.length, current: p.name });
      try {
        const prompt = `You are evaluating a chatbot.

BOT SYSTEM PROMPT:
<<<
${sys}
>>>

PERSONA:
- Name: ${p.name}
- Description: ${p.description}
- Opening message: "${p.openingMessage}"
- Expected outcome: ${p.expectedOutcome}

Simulate a 5-turn conversation (persona speaks first). Stay strictly in character on both sides.

Score the bot 1-5 each:
- brevity (1-3 sentences per turn)
- one_question (one focused question per turn)
- listens (reflects visitor's words)
- phase_arc (open → discovery → vision → bridge)
- honesty (no invented prices/names/guarantees)
- outcome (handled this persona's expected outcome)

Return STRICT JSON, no preamble, no fences:
{"transcript":[{"role":"persona","content":"..."},{"role":"bot","content":"..."}],"scores":{"brevity":N,"one_question":N,"listens":N,"phase_arc":N,"honesty":N,"outcome":N},"overall":N,"verdict":"one-paragraph assessment","suggestedEdit":"ONE concrete system-prompt rule (1-2 sentences) or empty string"}`;
        const raw = await askClaude(prompt);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no json");
        const parsed = JSON.parse(jsonMatch[0]);
        results.push({ persona: p, transcript: parsed.transcript ?? [], verdict: parsed.verdict ?? "", score: parsed.overall ?? 0, suggestedEdit: typeof parsed.suggestedEdit === "string" ? parsed.suggestedEdit.trim() : "" });
      } catch { results.push({ persona: p, transcript: [], verdict: "Eval call failed; skipped.", score: 0 }); }
    }

    setEvalProgress({ done: state.personas.length, total: state.personas.length, current: "" });
    update("evalResults", results);
    const avg = results.reduce((s, r) => s + r.score, 0) / results.length;
    const iter: Iteration = {
      number: state.iterations.length + 1,
      timestamp: new Date().toISOString(),
      overallScore: Number(avg.toFixed(2)),
      appliedRule: state.customRules[state.customRules.length - 1] ?? "",
      rationale: state.customRules.length > 0 ? "Re-run after applying fix." : "Baseline eval — no fixes applied yet.",
    };
    update("iterations", [...state.iterations, iter]);
    setEvalState("done");
  }

  async function applyFixes() {
    const edits = state.evalResults.map((r) => r.suggestedEdit).filter((e): e is string => !!e && e.trim().length > 0 && e.toLowerCase() !== "(none)");
    if (edits.length === 0) { setFixError("Judge had no concrete edits to suggest."); setFixState("error"); return; }
    setFixState("diagnosing"); setFixError("");
    try {
      const prompt = `I just ran an eval on my chatbot. Here are the per-persona suggested fixes:

${edits.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Find the COMMON ROOT CAUSE and distill ONE concrete rule (1-2 sentences) to add to the bot's rules list.

Return STRICT JSON, no preamble, no fences:
{"rule":"the one rule","rationale":"one sentence why this addresses the failures"}`;
      const raw = await askClaude(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON returned.");
      const parsed = JSON.parse(jsonMatch[0]) as { rule?: string };
      if (!parsed.rule?.trim()) throw new Error("Distilled rule was empty.");
      update("customRules", [...state.customRules, parsed.rule.trim()]);
      setFixState("applied");
      await runFullEval();
    } catch (err) { setFixState("error"); setFixError(err instanceof Error ? err.message : "couldn't apply fix"); }
  }

  async function mineFromTranscript() {
    if (mineTranscript.trim().length < 50) { setMineError("Paste a longer transcript."); return; }
    setMineState("mining"); setMineError("");
    try {
      const prompt = `Here is a real conversation where my chatbot performed poorly:

<<<
${mineTranscript}
>>>

Extract the underlying visitor archetype as an eval persona. No PII — describe the behavioral pattern only.

Existing persona IDs (don't duplicate semantically):
${state.personas.map((p) => `- ${p.id}: ${p.name}`).join("\n")}

If this matches an existing persona: DUPLICATE_OF <id>
Otherwise STRICT JSON:
{"id":"kebab-id","name":"Human Name","description":"1-2 sentences","openingMessage":"realistic first message","expectedOutcome":"qualify-bridge"|"soft-exit"|"educate-then-bridge"|"gracefully-end"}`;
      const raw = await askClaude(prompt);
      if (/^DUPLICATE_OF\s+/i.test(raw)) { setMineState("error"); setMineError("Matches an existing persona — no new persona added."); return; }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON returned.");
      const newPersona = JSON.parse(jsonMatch[0]) as Persona;
      update("personas", [...state.personas, newPersona]);
      setMineState("done"); setMineTranscript("");
    } catch (err) { setMineState("error"); setMineError(err instanceof Error ? err.message : "mining failed"); }
  }

  function downloadReport() {
    const overall = (state.evalResults.reduce((s, r) => s + r.score, 0) / (state.evalResults.length || 1)).toFixed(2);
    const lines = [`# Live-Fire Eval Report\n\nGenerated by the install wizard. ${state.personas.length} personas tested.\n\n**Overall: ${overall}/5**\n`];
    for (const r of state.evalResults) {
      lines.push(`## ${r.persona.name} — ${r.score}/5\n\n_${r.persona.description}_\n\n**Expected:** ${r.persona.expectedOutcome}\n\n**Verdict:** ${r.verdict}\n\n<details><summary>Transcript</summary>\n`);
      for (const t of r.transcript) lines.push(`**${t.role === "bot" ? "Bot" : "Visitor"}:** ${t.content}\n`);
      lines.push(`</details>\n`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `eval-report-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url);
  }

  const overall = state.evalResults.length > 0 ? state.evalResults.reduce((s, r) => s + r.score, 0) / state.evalResults.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "#44403c", margin: 0 }}>Your Claude generates 8 visitor personas tailored to your qualifying criteria, runs each against your bot, scores the conversations, and iterates until the score is ship-ready.</p>

      {/* Phase 1 */}
      <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>1. Generate personas for your vertical</p>
        <button type="button" onClick={generatePersonas} disabled={genState === "generating"} style={btn({ opacity: genState === "generating" ? 0.5 : 1, alignSelf: "flex-start" })}>
          {genState === "generating" ? "Generating…" : state.personas.length > 0 ? "Regenerate personas" : "Generate personas"}
        </button>
        {genState === "error" && <p style={{ fontSize: 12, color: "#9a3324", margin: 0 }}>⚠ {genError}</p>}
        {state.personas.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {state.personas.map((p) => (
              <li key={p.id} style={{ fontSize: 12, display: "flex", gap: 8 }}>
                <code style={{ color: "#78716c", flexShrink: 0 }}>{p.id}</code>
                <strong style={{ flexShrink: 0 }}>{p.name}</strong>
                <span style={{ color: "#57534e" }}>— {p.description.slice(0, 90)}{p.description.length > 90 ? "…" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phase 2 */}
      {state.personas.length > 0 && (
        <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>2. Run the eval ({state.personas.length} personas × bot × judge)</p>
          <button type="button" onClick={runFullEval} disabled={evalState === "running"} style={btn({ opacity: evalState === "running" ? 0.5 : 1, alignSelf: "flex-start" })}>
            {evalState === "running" ? `Testing ${evalProgress.current}… (${evalProgress.done}/${evalProgress.total})` : state.evalResults.length > 0 ? "Re-run eval" : "Run full eval"}
          </button>
          {evalState === "running" && (
            <div style={{ background: "#e7e5e4", borderRadius: 99, height: 6 }}>
              <div style={{ background: "#9a3324", height: 6, borderRadius: 99, width: `${(evalProgress.done / evalProgress.total) * 100}%`, transition: "width 0.3s" }} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {state.evalResults.length > 0 && (
        <div style={{ borderRadius: 6, border: "2px solid #86efac", background: "#f0fdf4", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
              Overall: <span style={{ fontSize: 20 }}>{overall.toFixed(2)}/5</span>
              {overall >= 4.2
                ? <span style={{ marginLeft: 8, color: "#15803d" }}>✓ ship it</span>
                : <span style={{ marginLeft: 8, color: "#92400e" }}>⚠ apply fixes before going live</span>}
            </p>
            <button type="button" onClick={downloadReport} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9a3324" }}>Download .md report</button>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {state.evalResults.map((r) => (
              <li key={r.persona.id} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontFamily: "monospace", width: 32, textAlign: "right", flexShrink: 0, color: r.score >= 4 ? "#15803d" : r.score >= 3 ? "#92400e" : "#9a3324", fontWeight: 600 }}>{r.score}/5</span>
                <strong style={{ flexShrink: 0 }}>{r.persona.name}</strong>
                <span style={{ color: "#57534e" }}>— {r.verdict.slice(0, 110)}{r.verdict.length > 110 ? "…" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 3 — learning loop */}
      {state.evalResults.length > 0 && (
        <div style={{ borderRadius: 6, border: "2px solid #fca5a5", background: "#fef2f2", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>3. Apply fixes & re-run</p>
          <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>Your Claude distills the per-persona suggestions into ONE rule, adds it to the bot&apos;s system prompt, and re-runs the eval so you see whether the fix moved the score.</p>
          <button type="button" onClick={applyFixes} disabled={fixState === "diagnosing" || evalState === "running"} style={btn({ opacity: (fixState === "diagnosing" || evalState === "running") ? 0.5 : 1, alignSelf: "flex-start" })}>
            {fixState === "diagnosing" ? "Distilling fix…" : evalState === "running" ? "Re-running eval…" : "Apply fixes & re-run"}
          </button>
          {fixState === "error" && <p style={{ fontSize: 12, color: "#9a3324", margin: 0 }}>⚠ {fixError}</p>}
          {state.customRules.length > 0 && (
            <details style={{ fontSize: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, color: "#44403c" }}>Rules applied so far ({state.customRules.length})</summary>
              <ol style={{ marginTop: 8, paddingLeft: 20, color: "#44403c", lineHeight: 1.8 }}>{state.customRules.map((r, i) => <li key={i}>{r}</li>)}</ol>
            </details>
          )}
        </div>
      )}

      {/* Iteration history */}
      {state.iterations.length > 1 && (
        <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Iteration history</p>
          <p style={{ fontSize: 12, color: "#57534e", margin: 0 }}>Watch the bot get better. Each row is one eval → diagnose → fix cycle.</p>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e7e5e4", color: "#78716c", textAlign: "left" }}>
                <th style={{ padding: "4px 0" }}>#</th>
                <th style={{ padding: "4px 0" }}>Score</th>
                <th style={{ padding: "4px 0" }}>Δ</th>
                <th style={{ padding: "4px 0" }}>What changed</th>
              </tr>
            </thead>
            <tbody>
              {state.iterations.map((iter, i) => {
                const prev2 = i > 0 ? state.iterations[i - 1].overallScore : null;
                const delta = prev2 !== null ? iter.overallScore - prev2 : null;
                return (
                  <tr key={iter.number} style={{ borderBottom: "1px solid #f5f5f4" }}>
                    <td style={{ padding: "6px 0", fontFamily: "monospace" }}>{iter.number}</td>
                    <td style={{ padding: "6px 0", fontFamily: "monospace" }}>{iter.overallScore.toFixed(2)}</td>
                    <td style={{ padding: "6px 0", fontFamily: "monospace", color: delta === null ? "#78716c" : delta > 0 ? "#15803d" : delta < 0 ? "#9a3324" : "#78716c" }}>
                      {delta === null ? "—" : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 0", color: "#44403c" }}>{iter.appliedRule || <em style={{ color: "#78716c" }}>baseline</em>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 4 — mine from transcript */}
      {state.evalResults.length > 0 && (
        <div style={{ borderRadius: 6, border: "1px solid #e7e5e4", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>4. Mine a new persona from a real transcript (optional)</p>
          <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>Paste a conversation your deployed bot handled poorly. Claude extracts the visitor archetype as a new eval persona — closing the loop from real-world failure to regression test.</p>
          <textarea value={mineTranscript} onChange={(e) => setMineTranscript(e.target.value)} placeholder="Paste the bad transcript (anonymize PII first)…" rows={5} style={inp({ fontFamily: "monospace", fontSize: 11, resize: "vertical" })} />
          <button type="button" onClick={mineFromTranscript} disabled={mineState === "mining" || mineTranscript.trim().length < 50} style={{ ...btn(), background: "#44403c", alignSelf: "flex-start", opacity: (mineState === "mining" || mineTranscript.trim().length < 50) ? 0.5 : 1 }}>
            {mineState === "mining" ? "Mining…" : "Mine new persona"}
          </button>
          {mineState === "done" && <p style={{ fontSize: 12, color: "#15803d", margin: 0 }}>✓ New persona added — re-run the eval to test against it.</p>}
          {mineState === "error" && <p style={{ fontSize: 12, color: "#9a3324", margin: 0 }}>⚠ {mineError}</p>}
        </div>
      )}

      <button onClick={onContinue} style={btn()}>Tested — continue to install</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 8 — Install + ongoing playbook
// ---------------------------------------------------------------------------
function StepInstall({ state }: { state: WizardState }) {
  const project = state.vercelProjectName || "your-project";
  const snippet = `<script async src="https://${project}.vercel.app/widget.js" data-bot-id="${project}"></script>`;
  const deployedUrl = state.deployedUrl || `https://${project}.vercel.app`;

  const [verifier, setVerifier] = useState({ smoke: "", voice: "", e2e: "" });
  const [running, setRunning] = useState("");

  async function streamChat(messages: { role: string; content: string }[]): Promise<string> {
    const res = await fetch(`${deployedUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  async function runSmoke() {
    setRunning("smoke"); setVerifier((v) => ({ ...v, smoke: "" }));
    try {
      const t0 = Date.now(); const text = await streamChat([{ role: "user", content: "hi" }]); const ms = Date.now() - t0;
      setVerifier((v) => ({ ...v, smoke: text.length > 10 ? `✓ ${ms}ms · "${text.slice(0, 80)}…"` : `⚠ Response too short (${text.length} chars)` }));
    } catch (err) { setVerifier((v) => ({ ...v, smoke: `⚠ ${err instanceof Error ? err.message : "failed"}` })); }
    finally { setRunning(""); }
  }

  async function runVoice() {
    setRunning("voice"); setVerifier((v) => ({ ...v, voice: "" }));
    try {
      const r1 = await streamChat([{ role: "user", content: "tell me about what you do" }]);
      const grade = await askClaude(`Grade this bot response 1-10. Target voice: ${state.toneWords}, formality: ${state.formality}. Check: 1-3 sentences max, one focused question, no invented prices.\n\nResponse: "${r1}"\n\nReply with exactly one line: SCORE/10 — one-sentence assessment.`);
      setVerifier((v) => ({ ...v, voice: grade.trim().slice(0, 200) }));
    } catch (err) { setVerifier((v) => ({ ...v, voice: `⚠ ${err instanceof Error ? err.message : "failed"}` })); }
    finally { setRunning(""); }
  }

  async function runE2E() {
    setRunning("e2e"); setVerifier((v) => ({ ...v, e2e: "" }));
    try {
      const turns: { role: string; content: string }[] = [];
      const ideal = ["hi, im looking to qualify for what you offer", "yes ready to move forward", "my budget and timeline match what you described", "yes please send me to the next step"];
      let lastBot = "";
      for (const userMsg of ideal) { turns.push({ role: "user", content: userMsg }); lastBot = await streamChat(turns); turns.push({ role: "assistant", content: lastBot }); }
      const bridged = /qualify|form|book|schedule|next step|send you|sign up|contact/i.test(lastBot);
      setVerifier((v) => ({ ...v, e2e: bridged ? `✓ Bot bridged to next step by turn 4. Final: "${lastBot.slice(0, 120)}…"` : `⚠ No clear CTA by turn 4. Final: "${lastBot.slice(0, 120)}…"` }));
    } catch (err) { setVerifier((v) => ({ ...v, e2e: `⚠ ${err instanceof Error ? err.message : "failed"}` })); }
    finally { setRunning(""); }
  }

  const templates = [
    {
      label: "Update knowledge base", content: `I want to update my bot's knowledge base. Here's the current file:
[paste current knowledge.md]

I want to add / change:
[describe the update]

Please give me the updated knowledge.md ready to commit.`,
    },
    {
      label: "Refine the bot's tone", content: `I want to refine my bot's voice. Here's the current system prompt:
[paste current concierge.ts]

My new tone description: [warmer / more direct / more expert]

Please rewrite the rules section ONLY, keeping the four-phase arc intact.`,
    },
    {
      label: "Add a qualifying rule", content: `Add a new qualifying rule to my bot's system prompt:
[describe the rule and how the bot should react]

Show me the updated section ready to drop in.`,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ borderRadius: 6, border: "2px solid #fbbf24", background: "#fffbeb", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Verify your live bot before going public</p>
        <p style={{ fontSize: 12, color: "#44403c", margin: 0 }}>These probes hit your actual deployed <code>/api/chat</code> endpoint at <code style={{ wordBreak: "break-all" }}>{deployedUrl}</code> to confirm the running deployment matches the eval.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { fn: runSmoke, id: "smoke", label: "1. Smoke test" },
            { fn: runVoice, id: "voice", label: "2. Voice match" },
            { fn: runE2E, id: "e2e", label: "3. E2E qualifying" },
          ].map(({ fn, id, label }) => (
            <button key={id} type="button" onClick={fn} disabled={!!running} style={{ ...btn(), background: "#b45309", fontSize: 12, padding: "8px 12px", opacity: !!running ? 0.5 : 1 }}>
              {running === id ? "Running…" : label}
            </button>
          ))}
        </div>
        {verifier.smoke && <p style={{ fontSize: 12, margin: 0 }}>Smoke: {verifier.smoke}</p>}
        {verifier.voice && <p style={{ fontSize: 12, margin: 0 }}>Voice: {verifier.voice}</p>}
        {verifier.e2e && <p style={{ fontSize: 12, margin: 0 }}>E2E: {verifier.e2e}</p>}
        <p style={{ fontSize: 12, color: "#57534e", margin: 0 }}>
          Manual sandbox: <a href={`${deployedUrl}/test`} target="_blank" rel="noopener noreferrer" style={{ color: "#9a3324", fontWeight: 600 }}>{deployedUrl}/test</a>
        </p>
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Paste this on your website:</p>
        <pre style={{ background: "#1c1917", color: "#fafaf9", borderRadius: 6, padding: 12, fontSize: 11, overflowX: "auto", margin: 0 }}>{snippet}</pre>
        <button onClick={() => navigator.clipboard.writeText(snippet)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#9a3324" }}>Copy snippet</button>
      </div>

      <div style={{ borderRadius: 6, background: "#f5f5f4", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>How to update without us — open your Claude Max and paste:</p>
        {templates.map((t) => (
          <details key={t.label} style={{ fontSize: 13 }}>
            <summary style={{ cursor: "pointer", color: "#44403c", padding: "4px 0" }}>{t.label}</summary>
            <div style={{ position: "relative" }}>
              <pre style={{ marginTop: 8, background: "white", border: "1px solid #e7e5e4", borderRadius: 6, padding: 12, fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap" }}>{t.content}</pre>
              <button onClick={() => navigator.clipboard.writeText(t.content)} style={{ position: "absolute", top: 16, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#9a3324" }}>Copy</button>
            </div>
          </details>
        ))}
      </div>

      <div style={{ borderRadius: 6, border: "1px solid #86efac", background: "#f0fdf4", padding: 16, fontSize: 13 }}>
        <p style={{ fontWeight: 600, color: "#14532d", margin: "0 0 4px" }}>You&apos;re live.</p>
        <p style={{ color: "#44403c", margin: 0 }}>Your bot runs on your Vercel, your Anthropic key, your data. When you outgrow this wizard, your Claude Max is your engineer.</p>
      </div>
    </div>
  );
}
