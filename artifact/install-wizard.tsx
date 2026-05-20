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
  // A single trip through eval → diagnose → fix → re-eval. Snapshots what
  // changed and the score delta, so the customer can see the bot getting
  // better over time and roll back if a change made things worse.
  number: number;
  timestamp: string;
  overallScore: number;
  appliedRule: string; // The rule we added to the bot in this iteration (empty for the baseline iteration 1)
  rationale: string; // One sentence: why this rule, based on the prior eval failures
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
  // Iteration loop state — every applied fix accumulates here so future
  // sessions, the deployed routines, and the lessons-learned log all see
  // the same chronology of changes.
  customRules: string[]; // Each entry is one rule added through the iteration loop. Concatenated into the system prompt.
  iterations: Iteration[]; // History of eval → fix → re-eval cycles
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
            {step.id === "test" && <StepTest state={state} update={update} onContinue={() => markComplete("test", "install")} />}
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
          Claude what you&apos;re installing so it knows what workflows to be
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
  const [mcpState, setMcpState] = useState<"unknown" | "checking" | "available" | "unavailable">("unknown");
  const [deployState, setDeployState] = useState<"idle" | "running" | "done" | "failed">("idle");
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [deployError, setDeployError] = useState("");

  const env = `ANTHROPIC_API_KEY=${state.anthropicKey ? "<your key from step 2>" : "(set in step 2)"}
LEAD_WEBHOOK_URL=${state.webhookUrl || "(set in step 5)"}
BRAND_COLOR=${state.brandColor}
BRAND_LOGO_URL=${state.logoUrl || ""}
TONE_WORDS=${state.toneWords}
FORMALITY=${state.formality}
BUSINESS_NAME=${state.vercelProjectName || "your-business"}`;

  function logLine(line: string) {
    setDeployLog((l) => [...l, line]);
  }

  async function checkMcp() {
    setMcpState("checking");
    try {
      const probe = await askClaude(
        `Do you currently have access to MCP tools for BOTH Vercel AND GitHub (the connectors that let you create Vercel projects and manage GitHub repos via tool calls)? Reply with exactly one word: YES or NO.`
      );
      const answer = probe.trim().toUpperCase();
      setMcpState(answer.startsWith("YES") ? "available" : "unavailable");
    } catch {
      setMcpState("unavailable");
    }
  }

  async function autoDeploy() {
    if (!state.vercelProjectName.trim()) {
      setDeployError("Set a Vercel project name first.");
      return;
    }
    setDeployState("running");
    setDeployLog([]);
    setDeployError("");

    try {
      logLine("Asking your Claude to fork the template repo into your GitHub…");
      const fork = await askClaude(
        `Use your GitHub MCP tool to fork the repository ${REPO} into the authenticated user's account. If asked for a new name, use "${state.vercelProjectName}". When done, reply with exactly one line in this format:
FORKED <full https URL of the new repo>
If anything blocks you (no GitHub tool, auth issue, repo exists already), reply with one line: FAIL <reason>`
      );
      const forkMatch = fork.match(/FORKED\s+(\S+)/i);
      if (!forkMatch) throw new Error(fork.replace(/^FAIL\s+/i, "").slice(0, 200));
      const forkUrl = forkMatch[1];
      logLine(`✓ Forked → ${forkUrl}`);

      logLine("Asking your Claude to create the Vercel project and link it to the fork…");
      const create = await askClaude(
        `Use your Vercel MCP tool to create a new project. Name: ${state.vercelProjectName}. Source: the GitHub repository ${forkUrl}. Framework preset: Next.js. When done, reply with exactly one line:
PROJECT <full vercel project URL like https://${state.vercelProjectName}.vercel.app>
If blocked, reply: FAIL <reason>`
      );
      const projectMatch = create.match(/PROJECT\s+(\S+)/i);
      if (!projectMatch) throw new Error(create.replace(/^FAIL\s+/i, "").slice(0, 200));
      const projectUrl = projectMatch[1];
      logLine(`✓ Project created → ${projectUrl}`);

      logLine("Setting environment variables on the Vercel project…");
      const setEnv = await askClaude(
        `Use your Vercel MCP tool to set these environment variables on the project "${state.vercelProjectName}" (Production environment). Set each one individually:

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

      logLine("Triggering a production deploy…");
      const deploy = await askClaude(
        `Use your Vercel MCP tool to trigger a production deploy of the project "${state.vercelProjectName}". Wait for the deploy to start. When started, reply with exactly:
DEPLOY_STARTED <inspection URL>
If blocked, reply: FAIL <reason>`
      );
      const deployMatch = deploy.match(/DEPLOY_STARTED\s+(\S+)/i);
      logLine(deployMatch ? `✓ Deploy started → inspect at ${deployMatch[1]}` : "✓ Deploy triggered");

      update("deployedUrl", projectUrl);
      setDeployState("done");
    } catch (err) {
      setDeployState("failed");
      setDeployError(err instanceof Error ? err.message : "deploy failed");
    }
  }

  const ready = state.vercelProjectName.trim().length > 2;

  return (
    <div className="space-y-5">
      {/* MCP check + auto-deploy */}
      <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3">
        <p className="font-semibold text-emerald-900 text-sm">
          ⚡ Auto-deploy (Vercel + GitHub MCP)
        </p>
        <p className="text-xs text-stone-700">
          If you have Vercel and GitHub MCP connectors attached to this Claude
          conversation, the wizard can orchestrate the entire fork + deploy
          + env-var setup for you. Zero terminal commands.
        </p>

        {mcpState === "unknown" && (
          <button type="button" onClick={checkMcp} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Check if my Claude has the connectors
          </button>
        )}
        {mcpState === "checking" && <p className="text-xs text-stone-600">Checking your Claude&apos;s tool access…</p>}
        {mcpState === "available" && (
          <div className="space-y-2">
            <p className="text-xs text-emerald-800 font-semibold">✓ Vercel + GitHub MCP detected.</p>
            <input type="text" value={state.vercelProjectName} onChange={(e) => update("vercelProjectName", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="Project name (lowercase, no spaces)" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono" />
            <button type="button" onClick={autoDeploy} disabled={!ready || deployState === "running"} className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              {deployState === "running" ? "Deploying…" : "Auto-deploy to my Vercel"}
            </button>
          </div>
        )}
        {mcpState === "unavailable" && (
          <p className="text-xs text-stone-600">
            No Vercel/GitHub MCP detected. Use Path A below — takes ~3 extra clicks but works without connectors.
            <button type="button" onClick={() => setMcpState("unknown")} className="ml-2 text-red-800 font-semibold hover:underline">
              Recheck
            </button>
          </p>
        )}

        {deployLog.length > 0 && (
          <div className="rounded-md bg-stone-900 text-stone-50 p-3 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
            {deployLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
        {deployState === "done" && state.deployedUrl && (
          <div className="rounded-md bg-white border border-emerald-300 p-3 text-sm">
            <strong className="text-emerald-800">✓ Deployed.</strong>{" "}
            <a href={state.deployedUrl} target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">
              {state.deployedUrl}
            </a>
          </div>
        )}
        {deployState === "failed" && (
          <p className="text-xs text-red-800">⚠ Auto-deploy stopped: {deployError}. Use Path A below to finish manually.</p>
        )}
      </div>

      {/* Manual path always shown as fallback */}
      <div className="rounded-md border border-stone-200 p-4">
        <p className="font-semibold text-sm mb-2">Path A — Fork to GitHub, import to Vercel (manual)</p>
        <ol className="list-decimal list-inside text-sm text-stone-700 space-y-1.5">
          <li>Open <a href={REPO} target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">the template repo</a> → Fork</li>
          <li>Go to <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-red-800 font-semibold hover:underline">vercel.com/new</a> → Import your fork</li>
          <li>Paste the env vars below into Vercel&apos;s Environment Variables pane</li>
          <li>Deploy. First build ~2 minutes.</li>
        </ol>
      </div>

      {!state.deployedUrl && (
        <label className="text-sm block">
          <span className="block font-semibold mb-1">Vercel project name</span>
          <input type="text" value={state.vercelProjectName} onChange={(e) => update("vercelProjectName", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="your-bot-name" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono" />
        </label>
      )}

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
          {state.deployedUrl ? "Continue to test →" : "Deployed manually — continue to test"}
        </button>
      )}
    </div>
  );
}

function StepTest({ state, update, onContinue }: { state: WizardState; update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void; onContinue: () => void }) {
  const [genState, setGenState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [genError, setGenError] = useState("");
  const [evalState, setEvalState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [evalError, setEvalError] = useState("");
  const [evalProgress, setEvalProgress] = useState({ done: 0, total: 0, current: "" });
  const [fixState, setFixState] = useState<"idle" | "diagnosing" | "applied" | "error">("idle");
  const [fixError, setFixError] = useState("");
  const [mineTranscript, setMineTranscript] = useState("");
  const [mineState, setMineState] = useState<"idle" | "mining" | "done" | "error">("idle");
  const [mineError, setMineError] = useState("");

  async function generatePersonas() {
    if (!state.qualifyingGoal.trim() || !state.qualifyingSignals.trim()) {
      setGenError("Fill in Step 5 first (qualifying goal + signals).");
      return;
    }
    setGenState("generating");
    setGenError("");
    try {
      const prompt = `Generate 8 visitor personas to stress-test a customer-qualifying chatbot. The bot's job: ${state.qualifyingGoal}. Qualifying signals (good lead): ${state.qualifyingSignals}. Disqualifying signals: ${state.disqualifyingSignals || "(none specified)"}.

Make the personas COVER the realistic distribution this bot will encounter:
- 2 strong fits (different sub-archetypes — e.g. ready-buyer vs returning-customer)
- 1 tire-kicker (curious, not ready, never commits)
- 1 wrong-fit (matches a disqualifying signal)
- 1 hostile/skeptic (rude but real intent underneath)
- 1 terse/mobile (1-3 word answers, hard to draw out)
- 1 overqualified (knows more than the bot; impatient with discovery)
- 1 time-waster (asks endless hypotheticals, never moves toward decision)

For EACH persona, return JSON. Output exactly ONE JSON array (no preamble, no markdown fences), each item shaped:
{"id": "kebab-case-id", "name": "Human Readable Name", "description": "1-2 sentence backstory + key behaviors", "openingMessage": "what they say first to the bot", "expectedOutcome": "qualify-bridge" | "soft-exit" | "educate-then-bridge" | "gracefully-end"}

Keep descriptions short. Output ONLY the JSON array.`;

      const raw = await askClaude(prompt);
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error("Claude didn't return a JSON array.");
      const personas = JSON.parse(arrMatch[0]) as Persona[];
      if (!Array.isArray(personas) || personas.length === 0) throw new Error("Empty persona list.");
      update("personas", personas);
      setGenState("done");
    } catch (err) {
      setGenState("error");
      setGenError(err instanceof Error ? err.message : "generation failed");
    }
  }

  function buildSystemPrompt(): string {
    // The customRules block accumulates fixes from the iteration loop —
    // each one a concrete rule the judge said would address a recurring
    // failure. Empty on first build, grows with every Apply Fixes cycle.
    const customRulesBlock =
      state.customRules.length > 0
        ? `\n\nAdditional rules learned from prior eval failures:\n${state.customRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : "";

    return `You are the conversion concierge for ${state.vercelProjectName || "this business"}. You behave like a knowledgeable, helpful guide — warm and direct, never pushy.

Voice: ${state.toneWords}. Formality: ${state.formality}.

Your job: ${state.qualifyingGoal}.

Qualifying signals (a good lead looks like): ${state.qualifyingSignals}.
Disqualifying signals (do not push these visitors to convert): ${state.disqualifyingSignals || "(none)"}.

Conversation rules:
- Keep replies 1-3 short sentences. No long paragraphs.
- End almost every turn with ONE focused question. Never a menu.
- Reflect the visitor's specific words back so they feel heard.
- Never invent prices, names, or guarantees. Use ranges; say a [role] confirms after [event].
- Follow a 4-phase arc: open (one curious question) → discovery (one thread per turn) → vision statement (synthesize their situation back) → bridge (point them to the next step).${customRulesBlock}

Knowledge base:
${state.knowledgeMarkdown || state.knowledgeRaw || "(no knowledge configured yet)"}`;
  }

  async function runFullEval() {
    if (state.personas.length === 0) {
      setEvalError("Generate personas first.");
      return;
    }
    setEvalState("running");
    setEvalError("");
    setEvalProgress({ done: 0, total: state.personas.length, current: "" });
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

Task: simulate a 5-turn conversation between this bot and this persona. The persona speaks first with the opening message. Stay strictly in character on both sides. The bot follows its system prompt. The persona behaves per their description.

Then score the bot on this rubric, 1-5 each (5 = excellent):
- brevity (bot turns are 1-3 sentences)
- one_question (each turn ends with at most one focused question)
- listens (bot reflects visitor's words back)
- phase_arc (open → discovery → vision → bridge, paced for this persona)
- honesty (no invented prices/names/guarantees)
- outcome (handled this persona's expected outcome correctly)

Return STRICT JSON, no preamble, no markdown fences, shape:
{"transcript":[{"role":"persona","content":"..."},{"role":"bot","content":"..."}, ...], "scores":{"brevity":N,"one_question":N,"listens":N,"phase_arc":N,"honesty":N,"outcome":N}, "overall":N, "verdict":"one-paragraph assessment", "suggestedEdit":"ONE concrete system-prompt rule (1-2 sentences) that would address the biggest issue, or empty string if no issue"}`;

        const raw = await askClaude(prompt);
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no json");
        const parsed = JSON.parse(jsonMatch[0]);
        results.push({
          persona: p,
          transcript: parsed.transcript ?? [],
          verdict: parsed.verdict ?? "(no verdict)",
          score: parsed.overall ?? 0,
          suggestedEdit: typeof parsed.suggestedEdit === "string" ? parsed.suggestedEdit.trim() : "",
        });
      } catch {
        results.push({ persona: p, transcript: [], verdict: "Eval call failed; skipped.", score: 0 });
      }
    }

    setEvalProgress({ done: state.personas.length, total: state.personas.length, current: "" });
    update("evalResults", results);

    // Log this eval as an iteration so the customer can see the score
    // progression across multiple loop cycles.
    const overallNow = results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
    const lastApplied = state.customRules[state.customRules.length - 1] ?? "";
    const iter: Iteration = {
      number: state.iterations.length + 1,
      timestamp: new Date().toISOString(),
      overallScore: Number(overallNow.toFixed(2)),
      appliedRule: lastApplied,
      rationale: lastApplied ? "Eval re-run after applying the rule above." : "Baseline eval — no fixes applied yet.",
    };
    update("iterations", [...state.iterations, iter]);
    setEvalState("done");
  }

  async function applyFixes() {
    // The learning loop: take the judge's per-persona suggested edits,
    // distill them into ONE concrete rule, add it to the bot's system
    // prompt, log the change as the next iteration, and re-run the eval
    // so the customer can see whether the fix actually moved the score.
    const edits = state.evalResults
      .map((r) => r.suggestedEdit)
      .filter((e): e is string => !!e && e.trim().length > 0 && e.toLowerCase() !== "(none)");
    if (edits.length === 0) {
      setFixError("Judge had no concrete edits to suggest. Try mining a new persona from a real transcript to surface new failure modes.");
      setFixState("error");
      return;
    }

    setFixState("diagnosing");
    setFixError("");
    try {
      const distillPrompt = `I just ran an eval on my chatbot. Here are the per-persona suggested system-prompt edits the judge proposed (one per persona that scored below 4/5):

${edits.map((e, i) => `${i + 1}. ${e}`).join("\n")}

These all reflect different failures from the same eval run. Look for the COMMON ROOT cause across them. Distill the most-impactful intervention into ONE concrete rule (1-2 sentences) I can add to the bot's "Additional rules" list. Prefer one focused rule over a kitchen sink.

Return STRICT JSON, no preamble, no fences:
{"rule":"the one rule, 1-2 sentences","rationale":"one sentence explaining why this rule addresses the failures"}`;

      const raw = await askClaude(distillPrompt);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Claude didn't return JSON for the fix.");
      const parsed = JSON.parse(jsonMatch[0]) as { rule?: string; rationale?: string };
      if (!parsed.rule || parsed.rule.trim().length < 5) throw new Error("Distilled rule was empty.");

      // Add the rule to customRules. Next runFullEval will pick it up via
      // buildSystemPrompt and the new score will land in iterations[].
      update("customRules", [...state.customRules, parsed.rule.trim()]);
      setFixState("applied");

      // Auto re-run the eval against the updated system prompt
      await runFullEval();
    } catch (err) {
      setFixState("error");
      setFixError(err instanceof Error ? err.message : "couldn't apply fix");
    }
  }

  async function mineFromTranscript() {
    if (mineTranscript.trim().length < 50) {
      setMineError("Paste a conversation transcript (at least a few lines).");
      return;
    }
    setMineState("mining");
    setMineError("");
    try {
      // Extract a new persona from a real bad conversation. The mining
      // loop: real production failure → durable eval persona → future
      // evals catch regressions on THIS exact archetype.
      const prompt = `Here is a real conversation transcript where my chatbot performed poorly:

<<<
${mineTranscript}
>>>

Extract the underlying VISITOR archetype as a new eval persona. Don't extract names, addresses, or PII — describe the behavioral pattern.

My existing persona IDs (don't duplicate semantically):
${state.personas.map((p) => `- ${p.id}: ${p.name}`).join("\n")}

If this transcript semantically matches an existing persona, reply with just: DUPLICATE_OF <id>
Otherwise return STRICT JSON for the new persona, shape:
{"id":"kebab-case-id","name":"Human Readable Name","description":"1-2 sentence backstory + key behaviors","openingMessage":"a realistic first message in this archetype's voice","expectedOutcome":"qualify-bridge" | "soft-exit" | "educate-then-bridge" | "gracefully-end"}`;

      const raw = await askClaude(prompt);
      if (/^DUPLICATE_OF\s+/i.test(raw)) {
        setMineState("error");
        setMineError(`This transcript semantically matches an existing persona — no new persona added. Use the existing one's failure to refine your fix.`);
        return;
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Claude didn't return JSON for the persona.");
      const newPersona = JSON.parse(jsonMatch[0]) as Persona;
      if (!newPersona.id || !newPersona.name) throw new Error("Persona was missing required fields.");

      update("personas", [...state.personas, newPersona]);
      setMineState("done");
      setMineTranscript("");
    } catch (err) {
      setMineState("error");
      setMineError(err instanceof Error ? err.message : "couldn't mine persona");
    }
  }

  function downloadReport() {
    const lines: string[] = [];
    lines.push(`# Live-Fire Eval Report`);
    lines.push(``);
    lines.push(`Generated by the install wizard against your current configuration. ${state.personas.length} personas tested.`);
    lines.push(``);
    const overall = state.evalResults.length > 0
      ? (state.evalResults.reduce((s, r) => s + r.score, 0) / state.evalResults.length).toFixed(2)
      : "0.00";
    lines.push(`**Overall: ${overall}/5**`);
    lines.push(``);
    for (const r of state.evalResults) {
      lines.push(`## ${r.persona.name} — ${r.score}/5`);
      lines.push(``);
      lines.push(`_${r.persona.description}_`);
      lines.push(``);
      lines.push(`**Expected:** ${r.persona.expectedOutcome}`);
      lines.push(``);
      lines.push(`**Verdict:** ${r.verdict}`);
      lines.push(``);
      lines.push(`<details><summary>Transcript</summary>`);
      lines.push(``);
      for (const t of r.transcript) {
        lines.push(`**${t.role === "bot" ? "Bot" : "Visitor"}:** ${t.content}`);
        lines.push(``);
      }
      lines.push(`</details>`);
      lines.push(``);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eval-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const overall = state.evalResults.length > 0
    ? state.evalResults.reduce((s, r) => s + r.score, 0) / state.evalResults.length
    : 0;

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-700">
        Your Claude generates 8 visitor personas tailored to your qualifying criteria, then runs each against your configured bot and scores the conversations. Full report downloadable as markdown.
      </p>

      {/* Phase 1: generate personas */}
      <div className="rounded-md border border-stone-200 p-4 space-y-3">
        <p className="font-semibold text-sm">1. Generate personas for your vertical</p>
        <button type="button" onClick={generatePersonas} disabled={genState === "generating"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
          {genState === "generating" ? "Generating…" : state.personas.length > 0 ? "Regenerate personas" : "Generate personas"}
        </button>
        {genState === "error" && <p className="text-xs text-red-800">⚠ {genError}</p>}
        {state.personas.length > 0 && (
          <ul className="text-xs space-y-1">
            {state.personas.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <code className="text-stone-500">{p.id}</code>
                <span className="font-semibold">{p.name}</span>
                <span className="text-stone-600">— {p.description.slice(0, 100)}{p.description.length > 100 ? "…" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phase 2: run full eval */}
      {state.personas.length > 0 && (
        <div className="rounded-md border border-stone-200 p-4 space-y-3">
          <p className="font-semibold text-sm">2. Run the eval ({state.personas.length} personas × bot × judge)</p>
          <button type="button" onClick={runFullEval} disabled={evalState === "running"} className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50">
            {evalState === "running" ? `Testing ${evalProgress.current}… (${evalProgress.done}/${evalProgress.total})` : state.evalResults.length > 0 ? "Re-run eval" : "Run full eval"}
          </button>
          {evalState === "error" && <p className="text-xs text-red-800">⚠ {evalError}</p>}
          {evalState === "running" && (
            <div className="w-full bg-stone-200 rounded-full h-2">
              <div className="bg-red-800 h-2 rounded-full transition-all" style={{ width: `${(evalProgress.done / evalProgress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {state.evalResults.length > 0 && (
        <div className="rounded-md border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">
              Overall: <span className="text-xl">{overall.toFixed(2)}/5</span>
              {overall >= 4.2 ? <span className="ml-2 text-emerald-800">✓ ship it</span> : <span className="ml-2 text-amber-800">⚠ refine before going live</span>}
            </p>
            <button type="button" onClick={downloadReport} className="text-xs font-semibold text-red-800 hover:underline">
              Download .md report
            </button>
          </div>
          <ul className="text-xs space-y-1">
            {state.evalResults.map((r) => (
              <li key={r.persona.id} className="flex items-baseline gap-2">
                <span className={"w-8 text-right font-mono " + (r.score >= 4 ? "text-emerald-700" : r.score >= 3 ? "text-amber-700" : "text-red-800")}>
                  {r.score}/5
                </span>
                <span className="font-semibold">{r.persona.name}</span>
                <span className="text-stone-600">— {r.verdict.slice(0, 120)}{r.verdict.length > 120 ? "…" : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase 3: The learning loop — apply fixes, re-run, watch the score move */}
      {state.evalResults.length > 0 && (
        <div className="rounded-md border-2 border-red-300 bg-red-50 p-4 space-y-3">
          <p className="font-semibold text-sm">
            3. Apply the judge&apos;s fixes and re-run
          </p>
          <p className="text-xs text-stone-700">
            The point isn&apos;t the report — it&apos;s the loop. Your Claude distills the per-persona suggestions into ONE concrete rule, adds it to your bot&apos;s system prompt, and re-runs the eval so you see whether the fix moved the score.
          </p>
          <button
            type="button"
            onClick={applyFixes}
            disabled={fixState === "diagnosing" || evalState === "running"}
            className="rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-red-900 disabled:opacity-50"
          >
            {fixState === "diagnosing" ? "Distilling fix…" : evalState === "running" ? "Re-running eval…" : "Apply fixes & re-run"}
          </button>
          {fixState === "error" && <p className="text-xs text-red-800">⚠ {fixError}</p>}

          {state.customRules.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-stone-700 font-semibold">
                Rules applied so far ({state.customRules.length})
              </summary>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-stone-700">
                {state.customRules.map((r, i) => <li key={i}>{r}</li>)}
              </ol>
            </details>
          )}
        </div>
      )}

      {/* Iteration history with score progression */}
      {state.iterations.length > 1 && (
        <div className="rounded-md border border-stone-200 p-4 space-y-2">
          <p className="font-semibold text-sm">Iteration history</p>
          <p className="text-xs text-stone-600">
            Watch the bot get better. Each row is one eval → diagnose → fix cycle.
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-left text-stone-500">
                <th className="py-1">#</th>
                <th className="py-1">Score</th>
                <th className="py-1">Δ</th>
                <th className="py-1">What changed</th>
              </tr>
            </thead>
            <tbody>
              {state.iterations.map((iter, i) => {
                const prev = i > 0 ? state.iterations[i - 1].overallScore : null;
                const delta = prev !== null ? iter.overallScore - prev : null;
                return (
                  <tr key={iter.number} className="border-b border-stone-100">
                    <td className="py-1.5 font-mono">{iter.number}</td>
                    <td className="py-1.5 font-mono">{iter.overallScore.toFixed(2)}</td>
                    <td className={"py-1.5 font-mono " + (delta === null ? "text-stone-400" : delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-800" : "text-stone-500")}>
                      {delta === null ? "—" : delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-stone-700">
                      {iter.appliedRule ? iter.appliedRule : <em className="text-stone-500">baseline</em>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 4: Mine a new persona from a real transcript */}
      {state.evalResults.length > 0 && (
        <div className="rounded-md border border-stone-200 p-4 space-y-3">
          <p className="font-semibold text-sm">
            4. Mine a new persona from a real transcript (optional)
          </p>
          <p className="text-xs text-stone-700">
            Paste a conversation your bot handled poorly in production (or any sample you want to stress-test). Claude extracts the underlying visitor archetype as a new eval persona. The next eval run tests against it — closing the loop from real-world failure to durable regression test.
          </p>
          <textarea
            value={mineTranscript}
            onChange={(e) => setMineTranscript(e.target.value)}
            placeholder="Paste the bad transcript (anonymize PII first if needed)…"
            rows={6}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-mono"
          />
          <button
            type="button"
            onClick={mineFromTranscript}
            disabled={mineState === "mining" || mineTranscript.trim().length < 50}
            className="rounded-md bg-stone-700 px-4 py-2 text-sm font-semibold text-stone-50 hover:bg-stone-800 disabled:opacity-50"
          >
            {mineState === "mining" ? "Mining…" : "Mine new persona"}
          </button>
          {mineState === "done" && <p className="text-xs text-emerald-700">✓ New persona added. Run eval again to test against it.</p>}
          {mineState === "error" && <p className="text-xs text-red-800">⚠ {mineError}</p>}
        </div>
      )}

      {/* Connect to the deployed routines so the customer knows the loop continues */}
      {state.iterations.length > 0 && (
        <div className="rounded-md bg-stone-100 p-4 text-xs text-stone-700 space-y-1">
          <p className="font-semibold text-stone-900">The loop doesn&apos;t stop when you close this wizard.</p>
          <p>
            After you deploy in Step 6, the bundled routines on YOUR Anthropic account keep this loop running:
          </p>
          <ul className="list-disc list-inside space-y-0.5 mt-1">
            <li><code>daily-improvement</code> mines real conversations and proposes new fixes</li>
            <li><code>mine-transcripts-to-personas</code> auto-runs for failure clusters of 3+</li>
            <li><code>monthly-eval</code> reruns the full eval and flags regressions</li>
            <li><code>weekly-ab-evaluator</code> tests prompt changes against real traffic</li>
          </ul>
          <p className="pt-1">Every rule in your current loop carries over: <code>state.customRules</code> from this wizard maps to the bundled <code>Additional rules</code> section the routines edit.</p>
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
