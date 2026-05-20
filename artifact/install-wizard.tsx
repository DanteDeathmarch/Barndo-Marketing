/**
 * Customer-Owned Conversion Bot — Install Wizard (Artifact version)
 *
 * Single-file React component for pasting into Claude.ai as a published
 * artifact. Self-contained — no external imports, no API key required
 * to run, no data leaves the customer's browser.
 *
 * The customer's Claude (the conversation hosting this artifact) does
 * the AI work via window.claude.complete(). Plain forms handle the rest.
 * State persists to localStorage so the customer can leave and return.
 *
 * When this artifact finishes, the customer has:
 *  - A configured system prompt for their bot
 *  - A knowledge.md restructured from their raw notes
 *  - A scoring config for their qualifying criteria
 *  - A deploy command they paste into their terminal (or auto-deploys
 *    if their Claude has Vercel + GitHub MCP connectors attached)
 *  - The five "update with Claude Max" templates they keep forever
 */

import { useEffect, useState } from "react";

/* ---------- Types + step config (inlined; mirrors lib/wizard-steps.ts) ---------- */

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
  { id: "anthropic-key", num: 2, title: "Anthropic API key", blurb: "Paste your key. It stays in your browser's localStorage; never sent anywhere." },
  { id: "brand", num: 3, title: "Brand & voice", blurb: "Your Claude analyzes your existing site and pre-fills brand defaults. Override anything." },
  { id: "knowledge", num: 4, title: "Knowledge base", blurb: "Paste your SOPs / FAQs / docs. Your Claude restructures them into a clean knowledge.md." },
  { id: "qualifying", num: 5, title: "Qualifying & lead destination", blurb: "Define your good-lead signals + where leads should land." },
  { id: "deploy", num: 6, title: "Deploy", blurb: "Download the configured bundle or let your Claude orchestrate the Vercel deploy if you have the MCP connectors attached." },
  { id: "test", num: 7, title: "Live-fire test", blurb: "Your Claude role-plays the bot's hardest visitor personas against your config before any real customer sees it." },
  { id: "install", num: 8, title: "Install + ongoing playbook", blurb: "One script tag for your site, plus the five Claude Max templates you keep forever." },
];

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
};

const STORAGE_KEY = "conversion_bot_wizard_v1";

/* ---------- window.claude.complete helper (only available inside Claude.ai artifacts) ---------- */

declare global {
  interface Window {
    claude?: { complete: (prompt: string) => Promise<string> };
  }
}

async function askClaude(prompt: string): Promise<string> {
  if (typeof window === "undefined" || !window.claude?.complete) {
    throw new Error(
      "This artifact uses window.claude.complete, which is only available when running inside a Claude.ai conversation."
    );
  }
  return window.claude.complete(prompt);
}

/* ---------- Bootstrap prompt + bundled-skills constants (copy-paste-ready) ---------- */

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

/* ---------- Main wizard ---------- */

export default function InstallWizard() {
  const [state, setState] = useState<WizardState>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...INITIAL, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, loaded]);

  function update<K extends keyof WizardState>(key: K, val: WizardState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }
  function goTo(id: StepId) {
    setState((s) => ({ ...s, currentStep: id }));
  }
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

  if (!loaded) return <div className="p-6 text-stone-600">Loading…</div>;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="max-w-5xl mx-auto p-6 grid lg:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
            Install Wizard
          </h2>
          {STEPS.map((s) => {
            const isCurrent = s.id === state.currentStep;
            const isDone = state.completed.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => goTo(s.id)}
                className={
                  "w-full text-left rounded-md px-3 py-2 text-sm transition-colors " +
                  (isCurrent
                    ? "bg-red-800 text-stone-50 font-semibold"
                    : "hover:bg-stone-200 text-stone-700")
                }
              >
                <span
                  className={
                    "inline-block w-5 h-5 rounded-full text-xs leading-5 text-center mr-2 " +
                    (isDone
                      ? "bg-emerald-700 text-white"
                      : isCurrent
                      ? "bg-stone-50 text-red-800"
                      : "bg-stone-300 text-stone-600")
                  }
                >
                  {isDone ? "✓" : s.num}
                </span>
                {s.title}
              </button>
            );
          })}
          <button
            onClick={reset}
            className="w-full text-left rounded-md px-3 py-2 mt-6 text-xs text-stone-500 hover:text-red-800"
          >
            Reset wizard
          </button>
        </aside>

        <main className="bg-white border border-stone-200 rounded-lg p-7 max-w-2xl">
          <div className="text-sm text-stone-500">
            Step {step.num} of {STEPS.length}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{step.title}</h1>
          <p className="mt-2 text-stone-700">{step.blurb}</p>

          <div className="mt-6 border-t border-stone-200 pt-6">
            {step.id === "welcome" && <StepWelcome onContinue={() => markComplete("welcome", "anthropic-key")} />}
            {step.id === "anthropic-key" && <StepAnthropicKey value={state.anthropicKey} onChange={(v) => update("anthropicKey", v)} onContinue={() => markComplete("anthropic-key", "brand")} />}
            {step.id === "brand" && <StepBrand state={state} update={update} onContinue={() => markComplete("brand", "knowledge")} />}
            {step.id === "knowledge" && <StepKnowledge state={state} update={update} onContinue={() => markComplete("knowledge", "qualifying")} />}
            {step.id === "qualifying" && <StepQualifying state={state} update={update} onContinue={() => markComplete("qualifying", "deploy")} />}
            {step.id === "deploy" && <StepDeploy state={state} update={update} onContinue={() => markComplete("deploy", "test")} />}
            {step.id === "test" && <StepTest state={state} onContinue={() => markComplete("test", "install")} />}
            {step.id === "install" && <StepInstall state={state} />}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-stone-200 pt-5 text-sm">
            {prev ? (
              <button onClick={() => goTo(prev.id)} className="text-stone-500 hover:text-red-800 font-semibold">
                ← {prev.title}
              </button>
            ) : <span />}
            {next && state.completed.includes(state.currentStep) && (
              <button onClick={() => goTo(next.id)} className="text-stone-500 hover:text-red-800 font-semibold">
                {next.title} →
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- Step components ---------- */

function StepWelcome({ onContinue }: { onContinue: () => void }) {
  const accounts = [
    { name: "Claude Max", url: "https://claude.ai/upgrade", why: "You're already in it — this artifact runs inside your Claude conversation. Your Claude does all the AI work in this wizard." },
    { name: "Anthropic API key", url: "https://console.anthropic.com/settings/keys", why: "Your bot's runtime brain. Cents per conversation." },
    { name: "Vercel (free tier OK)", url: "https://vercel.com/signup", why: "Hosts your bot. Auto-deploys from GitHub." },
    { name: "GitHub", url: "https://github.com/join", why: "Source of truth for the bot's code." },
    { name: "Replit (optional)", url: "https://replit.com/", why: "In-browser editor + always-on background eval runner." },
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-stone-100 p-4 text-sm">
        <strong>You own everything.</strong> Your data never touches us.
        Your conversations live in your Vercel project. Your API costs go
        to your Anthropic account. Cancel us tomorrow and the bot keeps
        running on your stack.
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">A. Accounts</h3>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.name} className="rounded-md border border-stone-200 p-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{a.name}</span>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-red-800 text-xs font-semibold hover:underline">
                  Open ↗
                </a>
              </div>
              <p className="mt-1 text-stone-600 text-xs">{a.why}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-2">B. Prime your Claude (this conversation)</h3>
        <p className="text-xs text-stone-700 mb-2">
          Copy this and paste it as your next message to Claude. It tells
          Claude what you're installing so it knows what workflows to be
          ready for.
        </p>
        <pre className="bg-stone-900 text-stone-50 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{BOOTSTRAP_PROMPT}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(BOOTSTRAP_PROMPT)}
          className="mt-2 text-xs font-semibold text-red-800 hover:underline"
        >
          Copy bootstrap prompt
        </button>
      </div>

      <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
        Everything ready — continue
      </button>
    </div>
  );
}

function StepAnthropicKey({ value, onChange, onContinue }: { value: string; onChange: (v: string) => void; onContinue: () => void }) {
  const looksValid = value.startsWith("sk-ant-") && value.length > 30;
  return (
    <div className="space-y-4">
      <ol className="text-sm text-stone-700 list-decimal list-inside space-y-1">
        <li>Open <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">console.anthropic.com → API Keys</a></li>
        <li>Create a key named <code>bot-runtime</code></li>
        <li>Paste it below</li>
      </ol>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder="sk-ant-…" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm" />
      <p className="text-xs text-stone-500">Stored only in this browser&apos;s localStorage. Never sent anywhere.</p>
      {looksValid && (
        <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
          Key saved — continue
        </button>
      )}
    </div>
  );
}

function StepBrand({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "scanned" | "error">("idle");
  const [scanError, setScanError] = useState("");

  async function scanWithClaude() {
    if (!state.siteUrl.trim()) return;
    setScanState("scanning");
    setScanError("");
    try {
      const prompt = `I'm setting up a chatbot for the business at this URL: ${state.siteUrl}

Please fetch the page and extract:
- title (the og:title or <title>)
- tagline (the og:description or meta description or first H1)
- primaryColor (a hex like #9a3324, sampled from theme-color, logo image, or the most prominent CSS color)
- logoUrl (the og:image or a logo img URL, absolute)

Return ONLY a JSON object on a single line, no preamble, no markdown fences. Shape:
{"title":"...","tagline":"...","primaryColor":"#hex","logoUrl":"https://..."}

If a field is unknown, use an empty string for it.`;

      const raw = await askClaude(prompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Claude didn't return JSON — try again");
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; tagline?: string; primaryColor?: string; logoUrl?: string };

      if (parsed.title) update("siteTitle", parsed.title);
      if (parsed.tagline) update("siteTagline", parsed.tagline);
      if (parsed.primaryColor && /^#[0-9a-f]{3,8}$/i.test(parsed.primaryColor)) update("brandColor", parsed.primaryColor);
      if (parsed.logoUrl) update("logoUrl", parsed.logoUrl);
      setScanState("scanned");
    } catch (err) {
      setScanState("error");
      setScanError(err instanceof Error ? err.message : "scan failed");
    }
  }

  const ready = state.toneWords.trim().length > 0;
  return (
    <div className="space-y-5">
      <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
        <label className="text-sm block">
          <span className="block font-semibold mb-1">Your website URL (your Claude will scan it)</span>
          <div className="flex gap-2">
            <input type="url" value={state.siteUrl} onChange={(e) => update("siteUrl", e.target.value)} placeholder="https://yourcompany.com" className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
            <button type="button" onClick={scanWithClaude} disabled={!state.siteUrl.trim() || scanState === "scanning"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
              {scanState === "scanning" ? "Scanning…" : "Scan with Claude"}
            </button>
          </div>
        </label>
        {scanState === "scanned" && <p className="mt-2 text-xs text-emerald-700">✓ Scanned. Fields below are pre-filled — edit anything.</p>}
        {scanState === "error" && <p className="mt-2 text-xs text-red-800">⚠ {scanError}</p>}
        {state.siteTitle && (
          <div className="mt-3 text-xs space-y-1">
            <div><strong>Title:</strong> {state.siteTitle}</div>
            {state.siteTagline && <div><strong>Tagline:</strong> {state.siteTagline}</div>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold mb-1">Brand color</span>
          <input type="color" value={state.brandColor} onChange={(e) => update("brandColor", e.target.value)} className="w-full h-10 rounded border border-stone-300" />
        </label>
        <label className="text-sm">
          <span className="block font-semibold mb-1">Text color</span>
          <input type="color" value={state.brandColorAccent} onChange={(e) => update("brandColorAccent", e.target.value)} className="w-full h-10 rounded border border-stone-300" />
        </label>
      </div>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Logo URL (optional)</span>
        <input type="url" value={state.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://yourcompany.com/logo.png" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Tone words (3–5 adjectives)</span>
        <input type="text" value={state.toneWords} onChange={(e) => update("toneWords", e.target.value)} placeholder="warm, plainspoken, expert" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Formality</span>
        <select value={state.formality} onChange={(e) => update("formality", e.target.value as WizardState["formality"])} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
          <option value="casual">Casual (texting voice)</option>
          <option value="warm">Warm (showroom employee)</option>
          <option value="professional">Professional (consultant)</option>
        </select>
      </label>

      <div className="rounded-lg border border-stone-200 p-4" style={{ backgroundColor: state.brandColor + "15" }}>
        <p className="text-xs text-stone-500 mb-1">Preview</p>
        <div className="rounded-md p-3 text-sm" style={{ backgroundColor: state.brandColor, color: state.brandColorAccent }}>
          <strong>Concierge:</strong> Hey — tell me what you&apos;re working on and I&apos;ll help shape it.
        </div>
      </div>

      {ready && (
        <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
          Save brand — continue
        </button>
      )}
    </div>
  );
}

function StepKnowledge({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [restructureState, setRestructureState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [restructureError, setRestructureError] = useState("");

  async function restructure() {
    if (state.knowledgeRaw.trim().length < 50) return;
    setRestructureState("working");
    setRestructureError("");
    try {
      const prompt = `Restructure this raw knowledge dump into a clean knowledge.md file for a customer-qualifying chatbot.

Rules:
- Use ## headings for sections (What we do / Pricing / Process / Financing / FAQ / Coverage / etc — whatever sections naturally fit)
- Keep facts verbatim from the source — do NOT invent prices, lender names, or guarantees
- Use ranges for any number that varies (e.g. "$150-300k") and note "a [role] confirms after [event]" for specifics
- Omit duplicate content
- Plain markdown only, no front-matter
- Return ONLY the markdown, no preamble, no explanation

Raw text to restructure:
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
    <div className="space-y-4">
      <p className="text-sm text-stone-700">
        Paste your SOPs, FAQs, pricing notes, &quot;things customers always ask&quot; — anything the bot should know. Don&apos;t worry about formatting; your Claude cleans it up.
      </p>
      <textarea value={state.knowledgeRaw} onChange={(e) => update("knowledgeRaw", e.target.value)} placeholder="Paste raw notes, doc dumps, FAQ lists, transcripts…" rows={10} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono" />

      {ready && (
        <div className="flex gap-2">
          <button type="button" onClick={restructure} disabled={restructureState === "working"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
            {restructureState === "working" ? "Restructuring…" : "Restructure with Claude"}
          </button>
          <button type="button" onClick={onContinue} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-red-800">
            Skip restructuring — continue
          </button>
        </div>
      )}

      {restructureState === "error" && <p className="text-xs text-red-800">⚠ {restructureError}</p>}

      {state.knowledgeMarkdown && (
        <div className="rounded-md border border-stone-200">
          <div className="flex items-center justify-between p-3 border-b border-stone-200">
            <p className="font-semibold text-sm">Restructured knowledge.md (review + edit)</p>
            <button type="button" onClick={() => navigator.clipboard.writeText(state.knowledgeMarkdown)} className="text-xs font-semibold text-red-800 hover:underline">
              Copy
            </button>
          </div>
          <textarea value={state.knowledgeMarkdown} onChange={(e) => update("knowledgeMarkdown", e.target.value)} rows={14} className="w-full text-xs font-mono p-3 border-0 rounded-b-md" />
        </div>
      )}

      {state.knowledgeMarkdown && (
        <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
          Looks good — continue
        </button>
      )}
    </div>
  );
}

function StepQualifying({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [webhookState, setWebhookState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [webhookMsg, setWebhookMsg] = useState("");

  async function testWebhook() {
    if (!state.webhookUrl.trim()) return;
    setWebhookState("testing");
    try {
      const samplePayload = {
        source: "wizard-test",
        test: true,
        lead: { firstName: "Test", state: "TX", tier: "A", score: 115 },
      };
      const res = await fetch(state.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(samplePayload),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setWebhookState("ok");
        setWebhookMsg(`✓ ${res.status} — your endpoint accepted the sample payload.`);
      } else {
        setWebhookState("fail");
        setWebhookMsg(`${res.status} — your endpoint rejected the payload. Check auth headers / required fields.`);
      }
    } catch (err) {
      setWebhookState("fail");
      const msg = err instanceof Error ? err.message : "request failed";
      setWebhookMsg(msg.includes("CORS") || msg.includes("Failed to fetch")
        ? "Browser blocked the request (CORS). Test via your Claude or by hitting the endpoint from your own server."
        : msg);
    }
  }

  const ready = state.qualifyingGoal.trim().length > 5 && state.qualifyingSignals.trim().length > 5;
  return (
    <div className="space-y-4">
      <label className="text-sm block">
        <span className="block font-semibold mb-1">What is this bot trying to get the visitor to do?</span>
        <input type="text" value={state.qualifyingGoal} onChange={(e) => update("qualifyingGoal", e.target.value)} placeholder="Book a 30-min consult / fill out qualify form / request a quote" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Qualifying signals (what a good lead looks like)</span>
        <textarea value={state.qualifyingSignals} onChange={(e) => update("qualifyingSignals", e.target.value)} placeholder="Owns land · timeline under 12 months · budget over $150k · in TX/TN/OK/LA" rows={3} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Disqualifying signals</span>
        <textarea value={state.disqualifyingSignals} onChange={(e) => update("disqualifyingSignals", e.target.value)} placeholder="No land yet · 18+ months out · wants a kit not a builder" rows={2} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold mb-1">Lead webhook URL</span>
        <div className="flex gap-2">
          <input type="url" value={state.webhookUrl} onChange={(e) => { update("webhookUrl", e.target.value); setWebhookState("idle"); }} placeholder="https://your-crm.com/api/leads OR Zapier / Make webhook" className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono" />
          <button type="button" onClick={testWebhook} disabled={!state.webhookUrl.trim() || webhookState === "testing"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
            {webhookState === "testing" ? "Testing…" : "Test"}
          </button>
        </div>
      </label>
      {webhookState !== "idle" && webhookMsg && (
        <div className={"rounded-md p-3 text-xs " + (webhookState === "ok" ? "bg-emerald-50 border border-emerald-300 text-emerald-800" : "bg-red-50 border border-red-300 text-red-800")}>
          {webhookMsg}
        </div>
      )}
      {ready && (
        <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
          Save criteria — continue
        </button>
      )}
    </div>
  );
}

function StepDeploy({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const REPO = "https://github.com/DanteDeathmarch/Barndo-Marketing";
  const env = `ANTHROPIC_API_KEY=${state.anthropicKey ? "<your key from step 2>" : "(set in step 2)"}
LEAD_WEBHOOK_URL=${state.webhookUrl || "(set in step 5)"}
BRAND_COLOR=${state.brandColor}
BRAND_LOGO_URL=${state.logoUrl || ""}
TONE_WORDS=${state.toneWords}
FORMALITY=${state.formality}
BUSINESS_NAME=${state.vercelProjectName || "your-business"}`;

  const ready = state.vercelProjectName.trim().length > 2;
  return (
    <div className="space-y-5">
      <div className="rounded-md bg-stone-100 p-4 text-sm">
        <strong>Best path:</strong> if you have the Vercel and GitHub MCP connectors attached to your Claude, tell your Claude &quot;deploy this bot to my Vercel using these env vars&quot; and it&apos;ll orchestrate the whole thing. Otherwise use Path A below.
      </div>

      <div className="rounded-md border border-stone-200 p-4">
        <p className="font-semibold text-sm mb-2">Path A — Fork to GitHub, import to Vercel</p>
        <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1.5">
          <li>Open <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">the template repo</a> → Fork</li>
          <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">vercel.com/new</a> → Import your fork</li>
          <li>Paste the env vars below into Vercel&apos;s Environment Variables pane</li>
          <li>Deploy. First build ~2 minutes.</li>
        </ol>
      </div>

      <label className="text-sm block">
        <span className="block font-semibold mb-1">Vercel project name</span>
        <input type="text" value={state.vercelProjectName} onChange={(e) => update("vercelProjectName", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="your-bot-name" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono" />
      </label>

      <div className="rounded-md border border-stone-200">
        <div className="flex items-center justify-between p-3 border-b border-stone-200">
          <p className="font-semibold text-sm">Env vars to paste in Vercel</p>
          <button type="button" onClick={() => navigator.clipboard.writeText(env)} className="text-xs font-semibold text-red-800 hover:underline">
            Copy all
          </button>
        </div>
        <pre className="text-xs bg-stone-900 text-stone-50 p-3 overflow-x-auto rounded-b-md">{env}</pre>
      </div>

      {ready && (
        <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
          Deployed — continue to test
        </button>
      )}
    </div>
  );
}

function StepTest({ state, onContinue }: { state: WizardState; onContinue: () => void }) {
  const [running, setRunning] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  async function runQuickEval() {
    setRunning(true);
    setError("");
    setTranscript("");
    try {
      const prompt = `You are running a quick live-fire test on a customer-qualifying chatbot.

The bot's job: ${state.qualifyingGoal || "qualify visitors and bridge them to the next step"}
Qualifying signals: ${state.qualifyingSignals}
Disqualifying signals: ${state.disqualifyingSignals}
Voice: ${state.toneWords}, formality: ${state.formality}

Simulate a brief 4-turn conversation between THIS bot (configured as above) and ONE persona of each of these archetypes:

1. IDEAL CUSTOMER — fits all qualifying signals, ready to convert
2. EDGE CASE — partial fit, ambiguous
3. WRONG-FIT — fits a disqualifying signal

For each, format like:
### [Persona name]
**Visitor:** opening message
**Bot:** response (1-3 sentences max)
**Visitor:** reply
**Bot:** response

Then end with a one-paragraph verdict: did the bot handle this persona well? What would you change in the system prompt?

Keep total output under 600 words. Be concrete and useful.`;

      const out = await askClaude(prompt);
      setTranscript(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "test failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-700">
        Your Claude role-plays three persona archetypes (ideal, edge case, wrong-fit) against your bot&apos;s current config. Catches obvious problems before any real visitor sees them.
      </p>
      <p className="text-xs text-stone-500">
        For the full 18-persona regression suite, run <code>npm run evals</code> from your forked repo after Step 6.
      </p>

      <button onClick={runQuickEval} disabled={running} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
        {running ? "Running…" : "Run quick test"}
      </button>

      {error && <p className="text-xs text-red-800">⚠ {error}</p>}

      {transcript && (
        <div className="rounded-md border border-stone-200 p-4 text-sm whitespace-pre-wrap font-mono text-xs max-h-[400px] overflow-y-auto">
          {transcript}
        </div>
      )}

      <button onClick={onContinue} className="rounded-md bg-red-800 px-5 py-2.5 text-sm font-semibold text-stone-50 hover:bg-red-900">
        Tested — continue to install
      </button>
    </div>
  );
}

function StepInstall({ state }: { state: WizardState }) {
  const project = state.vercelProjectName || "your-project";
  const snippet = `<script async src="https://${project}.vercel.app/widget.js" data-bot-id="${project}"></script>`;
  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold text-sm mb-1">Paste this on your website:</p>
        <pre className="bg-stone-900 text-stone-50 rounded p-3 text-xs overflow-x-auto">{snippet}</pre>
        <button onClick={() => navigator.clipboard.writeText(snippet)} className="mt-2 text-xs font-semibold text-red-800 hover:underline">
          Copy snippet
        </button>
      </div>

      <div className="rounded-lg bg-stone-100 p-4 text-sm space-y-2">
        <p className="font-semibold">How to update without us — open your Claude Max and paste:</p>
        <details>
          <summary className="cursor-pointer text-stone-700">Template: update knowledge base</summary>
          <pre className="mt-2 bg-white border border-stone-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`I want to update my bot's knowledge base. Here's the current file:
[paste current knowledge.md]

I want to add / change:
[describe the update]

Please give me the updated knowledge.md ready to commit.`}</pre>
        </details>
        <details>
          <summary className="cursor-pointer text-stone-700">Template: refine the bot&apos;s tone</summary>
          <pre className="mt-2 bg-white border border-stone-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`I want to refine my bot's voice. Here's the current system prompt:
[paste current concierge.ts]

My new tone description: [warmer / more direct / more expert]

Please rewrite the rules section ONLY, keeping the four-phase arc intact.`}</pre>
        </details>
        <details>
          <summary className="cursor-pointer text-stone-700">Template: add a qualifying rule</summary>
          <pre className="mt-2 bg-white border border-stone-200 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">{`Add a new qualifying rule to my bot's system prompt:
[describe the rule and how the bot should react]

Show me the updated section ready to drop in.`}</pre>
        </details>
      </div>

      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm">
        <p className="font-semibold text-emerald-800">You&apos;re live.</p>
        <p className="mt-1 text-stone-700">
          Your bot runs on your Vercel, your Anthropic key, your data. When you outgrow this wizard, your Claude Max is your engineer.
        </p>
      </div>
    </div>
  );
}
