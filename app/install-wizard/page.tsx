"use client";

// Customer-owned install wizard.
//
// This page walks a customer end-to-end through setting up their own
// conversion-qualifying chatbot on THEIR accounts:
// Claude Max + Anthropic API key + Replit + Vercel + GitHub.
//
// We never store their data. Wizard state lives in localStorage in their
// browser. Outputs are config files / snippets they paste into their own
// stack.
//
// This Next.js page is the iterative dev surface. Once stable, we extract
// a single self-contained React file that pastes directly into Claude.ai
// as a published artifact.

import { useEffect, useMemo, useState } from "react";
import {
  STEPS,
  STORAGE_KEY,
  INITIAL_STATE,
  type WizardState,
  type StepId,
} from "@/lib/wizard-steps";

export default function InstallWizardPage() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [loaded, setLoaded] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...INITIAL_STATE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Persist
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

  function markComplete(id: StepId, nextId?: StepId) {
    setState((s) => ({
      ...s,
      completed: s.completed.includes(id) ? s.completed : [...s.completed, id],
      currentStep: nextId ?? s.currentStep,
    }));
  }

  function resetAll() {
    if (!confirm("Reset all wizard state? Your inputs will be lost.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(INITIAL_STATE);
  }

  const currentIdx = STEPS.findIndex((s) => s.id === state.currentStep);
  const currentStep = STEPS[currentIdx];
  const nextStep = STEPS[currentIdx + 1];
  const prevStep = STEPS[currentIdx - 1];

  if (!loaded) {
    return <div className="container-x py-12 text-charcoal">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="container-x py-10 grid lg:grid-cols-[260px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="space-y-1">
          <h2 className="text-sm font-semibold text-steel uppercase tracking-wider mb-3">
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
                    ? "bg-rust text-cream font-semibold"
                    : "hover:bg-sand/60 text-charcoal")
                }
              >
                <span
                  className={
                    "inline-block w-5 h-5 rounded-full text-xs leading-5 text-center mr-2 " +
                    (isDone
                      ? "bg-pine text-cream"
                      : isCurrent
                      ? "bg-cream text-rust"
                      : "bg-sand text-steel")
                  }
                >
                  {isDone ? "✓" : s.num}
                </span>
                {s.title}
              </button>
            );
          })}
          <button
            onClick={resetAll}
            className="w-full text-left rounded-md px-3 py-2 mt-6 text-xs text-steel hover:text-rust"
          >
            Reset wizard
          </button>
        </aside>

        {/* Main panel */}
        <main className="bg-cream border border-sand rounded-lg p-7 max-w-2xl">
          <div className="text-sm text-steel">
            Step {currentStep.num} of {STEPS.length}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-ink">{currentStep.title}</h1>
          <p className="mt-2 text-charcoal">{currentStep.blurb}</p>

          <div className="mt-6 border-t border-sand pt-6">
            {state.currentStep === "welcome" && (
              <StepWelcome onContinue={() => markComplete("welcome", "anthropic-key")} />
            )}
            {state.currentStep === "anthropic-key" && (
              <StepAnthropicKey
                value={state.anthropicKey}
                onChange={(v) => update("anthropicKey", v)}
                onContinue={() => markComplete("anthropic-key", "brand")}
              />
            )}
            {state.currentStep === "brand" && (
              <StepBrand
                state={state}
                update={update}
                onContinue={() => markComplete("brand", "knowledge")}
              />
            )}
            {state.currentStep === "knowledge" && (
              <StepKnowledge
                state={state}
                update={update}
                onContinue={() => markComplete("knowledge", "qualifying")}
              />
            )}
            {state.currentStep === "qualifying" && (
              <StepQualifying
                state={state}
                update={update}
                onContinue={() => markComplete("qualifying", "deploy")}
              />
            )}
            {state.currentStep === "deploy" && (
              <StepDeploy
                state={state}
                update={update}
                onContinue={() => markComplete("deploy", "test")}
              />
            )}
            {state.currentStep === "test" && (
              <StepTest onContinue={() => markComplete("test", "install")} />
            )}
            {state.currentStep === "install" && <StepInstall state={state} />}
          </div>

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between border-t border-sand pt-5 text-sm">
            {prevStep ? (
              <button
                onClick={() => goTo(prevStep.id)}
                className="text-steel hover:text-rust font-semibold"
              >
                ← {prevStep.title}
              </button>
            ) : (
              <span />
            )}
            {nextStep && state.completed.includes(state.currentStep) && (
              <button
                onClick={() => goTo(nextStep.id)}
                className="text-steel hover:text-rust font-semibold"
              >
                {nextStep.title} →
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
    { name: "Claude Max", url: "https://claude.ai/upgrade", why: "You'll use Claude to update your bot's SOPs, KB, and prompt over time. No engineer needed." },
    { name: "Anthropic API key", url: "https://console.anthropic.com/settings/keys", why: "Your bot's runtime brain. Pay-as-you-go for chats. Cheap (cents per conversation)." },
    { name: "Vercel (free tier OK)", url: "https://vercel.com/signup", why: "Hosts your bot. Auto-deploys from your GitHub. Free unless you're huge." },
    { name: "Replit", url: "https://replit.com/", why: "One-click fork of our template; in-browser editing if you want it." },
    { name: "GitHub", url: "https://github.com/join", why: "Source of truth. Vercel watches it; you control history." },
  ];

  const recommendedSkills = [
    { name: "copywriting", why: "Refining the bot's voice when you want it sharper" },
    { name: "customer-research", why: "Mining your own conversation transcripts for patterns" },
    { name: "sales-enablement", why: "Building objection-handling additions to the KB" },
    { name: "page-cro", why: "Optimizing the landing pages your bot drives traffic to" },
    { name: "ab-test-setup", why: "Running structured experiments on variant prompts" },
  ];

  const stackChecks = [
    { name: "gh CLI", how: "winget install GitHub.cli (Windows) · brew install gh (Mac)" },
    { name: "vercel CLI", how: "npx vercel — no install, runs first time" },
    { name: "Node.js 20+", how: "nodejs.org/download — required for local edits" },
    { name: "Git", how: "git-scm.com/download — Vercel needs your repo to deploy" },
  ];

  const bootstrapPrompt = `I am installing the [BOT NAME] customer-qualifying chatbot on my own stack.
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

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-sand bg-sand/40 p-4 text-sm text-charcoal">
        <strong className="text-ink">You own everything.</strong> Your data
        never touches us. Your conversations live in your Vercel project. Your
        API costs go to your Anthropic account. Cancel us tomorrow and the bot
        keeps running on your stack.
      </div>

      {/* Accounts */}
      <div>
        <h3 className="font-semibold text-ink text-sm mb-2">A. Accounts</h3>
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li
              key={a.name}
              className="rounded-md border border-sand p-3 text-sm"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-ink">{a.name}</span>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rust text-xs font-semibold hover:underline"
                >
                  Open ↗
                </a>
              </div>
              <p className="mt-1 text-charcoal text-xs">{a.why}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Tech stack */}
      <div>
        <h3 className="font-semibold text-ink text-sm mb-2">
          B. Tech stack on your machine
        </h3>
        <ul className="space-y-2">
          {stackChecks.map((s) => (
            <li
              key={s.name}
              className="rounded-md border border-sand p-3 text-sm"
            >
              <div className="font-semibold text-ink">{s.name}</div>
              <code className="text-xs text-charcoal">{s.how}</code>
            </li>
          ))}
        </ul>
      </div>

      {/* Skills */}
      <div>
        <h3 className="font-semibold text-ink text-sm mb-2">
          C. Recommended Claude Code Skills (have these available)
        </h3>
        <ul className="space-y-2">
          {recommendedSkills.map((s) => (
            <li
              key={s.name}
              className="rounded-md border border-sand p-3 text-sm"
            >
              <code className="font-semibold text-rust">/{s.name}</code>
              <span className="text-charcoal text-xs ml-2">{s.why}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-steel mt-2">
          The Skills bundled with your installed bot (
          <code>update-kb</code>, <code>refine-tone</code>,{" "}
          <code>self-audit</code>, <code>live-fire-test</code>,{" "}
          <code>research-niche</code>, <code>lessons-learned</code>) ship in
          your repo automatically — you don&apos;t need to install those
          separately.
        </p>
      </div>

      {/* Bootstrap prompt */}
      <div>
        <h3 className="font-semibold text-ink text-sm mb-2">
          D. Prime your Claude Max conversation
        </h3>
        <p className="text-xs text-charcoal mb-2">
          Open a new chat in Claude Max and paste this. It tells your Claude
          what we&apos;re installing and what workflows to be ready for. Then
          come back here.
        </p>
        <pre className="bg-ink text-cream rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{bootstrapPrompt}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(bootstrapPrompt)}
          className="mt-2 text-xs font-semibold text-rust hover:underline"
        >
          Copy bootstrap prompt
        </button>
      </div>

      <button
        onClick={onContinue}
        className="mt-4 rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
      >
        Everything ready — continue
      </button>
    </div>
  );
}

function StepAnthropicKey({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  const looksValid = value.startsWith("sk-ant-") && value.length > 30;
  return (
    <div className="space-y-4">
      <ol className="text-sm text-charcoal list-decimal list-inside space-y-1">
        <li>
          Open{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rust font-semibold hover:underline"
          >
            console.anthropic.com → API Keys
          </a>
        </li>
        <li>Click <strong>Create Key</strong>, name it <code>bot-runtime</code></li>
        <li>Copy the key and paste it below</li>
      </ol>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="sk-ant-…"
        className="w-full rounded-md border border-sand bg-cream px-3 py-2.5 font-mono text-sm outline-none focus:border-rust"
      />
      <p className="text-xs text-steel">
        Stored only in your browser&apos;s localStorage. Never sent to our
        servers. You can clear it any time with &quot;Reset wizard&quot; at the
        bottom of the sidebar.
      </p>
      {looksValid && (
        <button
          onClick={onContinue}
          className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
        >
          Key saved — continue
        </button>
      )}
    </div>
  );
}

function StepBrand({
  state,
  update,
  onContinue,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onContinue: () => void;
}) {
  const [scanState, setScanState] = useState<
    "idle" | "scanning" | "scanned" | "error"
  >("idle");
  const [scanError, setScanError] = useState("");

  async function scanSite() {
    if (!state.siteUrl.trim()) return;
    setScanState("scanning");
    setScanError("");
    try {
      const res = await fetch("/api/wizard/scan-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.siteUrl }),
      });
      const data = await res.json();
      if (!data.ok) {
        setScanState("error");
        setScanError(data.error ?? "Scan failed");
        return;
      }
      const b = data.brand;
      update("siteTitle", b.title ?? "");
      update("siteTagline", b.tagline ?? "");
      update("siteFonts", b.fontHints ?? []);
      if (b.themeColor && /^#[0-9a-f]{3,8}$/i.test(b.themeColor)) {
        update("brandColor", b.themeColor);
      }
      if (b.logoUrl) update("logoUrl", b.logoUrl);
      else if (b.faviconUrl) update("logoUrl", b.faviconUrl);
      setScanState("scanned");
    } catch (err) {
      setScanState("error");
      setScanError(err instanceof Error ? err.message : "Scan failed");
    }
  }

  const ready = state.toneWords.trim().length > 0;
  return (
    <div className="space-y-5">
      {/* Site scan */}
      <div className="rounded-md border border-sand bg-sand/30 p-4">
        <label className="text-sm block">
          <span className="block font-semibold text-ink mb-1">
            Your website URL (we&apos;ll scan it to pre-fill defaults)
          </span>
          <div className="flex gap-2">
            <input
              type="url"
              value={state.siteUrl}
              onChange={(e) => update("siteUrl", e.target.value)}
              placeholder="https://yourcompany.com"
              className="flex-1 rounded-md border border-sand bg-cream px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={scanSite}
              disabled={!state.siteUrl.trim() || scanState === "scanning"}
              className="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-cream hover:bg-rust-dark disabled:opacity-50"
            >
              {scanState === "scanning" ? "Scanning…" : "Scan site"}
            </button>
          </div>
        </label>
        {scanState === "scanned" && (
          <p className="mt-2 text-xs text-pine">
            ✓ Scanned. Fields below are pre-filled from your site; edit anything you want.
          </p>
        )}
        {scanState === "error" && (
          <p className="mt-2 text-xs text-rust">⚠ {scanError}</p>
        )}
        {state.siteTitle && (
          <div className="mt-3 text-xs text-charcoal space-y-1">
            <div>
              <strong>Title:</strong> {state.siteTitle}
            </div>
            {state.siteTagline && (
              <div>
                <strong>Tagline:</strong> {state.siteTagline}
              </div>
            )}
            {state.siteFonts.length > 0 && (
              <div>
                <strong>Fonts:</strong> {state.siteFonts.slice(0, 3).join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="block font-semibold text-ink mb-1">Brand color</span>
          <input
            type="color"
            value={state.brandColor}
            onChange={(e) => update("brandColor", e.target.value)}
            className="w-full h-10 rounded border border-sand"
          />
        </label>
        <label className="text-sm">
          <span className="block font-semibold text-ink mb-1">Text color</span>
          <input
            type="color"
            value={state.brandColorAccent}
            onChange={(e) => update("brandColorAccent", e.target.value)}
            className="w-full h-10 rounded border border-sand"
          />
        </label>
      </div>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">Logo URL (optional)</span>
        <input
          type="url"
          value={state.logoUrl}
          onChange={(e) => update("logoUrl", e.target.value)}
          placeholder="https://yourcompany.com/logo.png"
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          Tone words (3–5 adjectives describing voice)
        </span>
        <input
          type="text"
          value={state.toneWords}
          onChange={(e) => update("toneWords", e.target.value)}
          placeholder="warm, plainspoken, expert"
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">Formality</span>
        <select
          value={state.formality}
          onChange={(e) =>
            update("formality", e.target.value as WizardState["formality"])
          }
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        >
          <option value="casual">Casual (texting voice)</option>
          <option value="warm">Warm (showroom employee)</option>
          <option value="professional">Professional (consultant)</option>
        </select>
      </label>

      {/* Live preview */}
      <div
        className="rounded-lg border border-sand p-4"
        style={{ backgroundColor: state.brandColor + "15" }}
      >
        <p className="text-xs text-steel mb-1">Preview</p>
        <div
          className="rounded-md p-3 text-sm"
          style={{
            backgroundColor: state.brandColor,
            color: state.brandColorAccent,
          }}
        >
          <strong>Concierge:</strong> Hey — tell me what you&apos;re working on
          and I&apos;ll help shape it.
        </div>
      </div>

      {ready && (
        <button
          onClick={onContinue}
          className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
        >
          Save brand — continue
        </button>
      )}
    </div>
  );
}

function StepKnowledge({
  state,
  update,
  onContinue,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onContinue: () => void;
}) {
  const ready = state.knowledgeRaw.trim().length > 50;
  return (
    <div className="space-y-4">
      <p className="text-sm text-charcoal">
        Paste your SOPs, FAQs, pricing notes, &quot;things customers ask&quot;
        — anything the bot should know. Don&apos;t worry about formatting; we
        can use your Claude to clean it up.
      </p>
      <textarea
        value={state.knowledgeRaw}
        onChange={(e) => update("knowledgeRaw", e.target.value)}
        placeholder="Paste raw notes, doc dumps, FAQ lists, transcripts…"
        rows={10}
        className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm font-mono"
      />
      <div className="rounded-md bg-sand/40 p-3 text-xs text-charcoal space-y-2">
        <p>
          <strong>After this step:</strong> open your Claude Max (the one you
          primed in step 1) and paste your <code>update-kb</code> Skill
          template along with the raw text you entered here. Claude restructures
          it into a clean <code>knowledge.md</code> ready to commit to your
          forked repo.
        </p>
        <p>
          See <code>skills/update-kb/SKILL.md</code> in your repo for the exact
          template wording.
        </p>
      </div>
      {ready && (
        <button
          onClick={onContinue}
          className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
        >
          Save KB — continue
        </button>
      )}
    </div>
  );
}

function StepQualifying({
  state,
  update,
  onContinue,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onContinue: () => void;
}) {
  const [webhookState, setWebhookState] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const [webhookMsg, setWebhookMsg] = useState("");

  async function testWebhook() {
    if (!state.webhookUrl.trim()) return;
    setWebhookState("testing");
    setWebhookMsg("");
    try {
      const res = await fetch("/api/wizard/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: state.webhookUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        setWebhookState("ok");
        setWebhookMsg(
          `✓ ${data.status} in ${data.elapsedMs}ms — your CRM accepted the sample payload.`
        );
      } else {
        setWebhookState("fail");
        setWebhookMsg(
          `${data.status ? `${data.status} — ` : ""}${data.error ?? data.hint ?? "Failed"}`
        );
      }
    } catch (err) {
      setWebhookState("fail");
      setWebhookMsg(err instanceof Error ? err.message : "request failed");
    }
  }

  const ready =
    state.qualifyingGoal.trim().length > 5 &&
    state.qualifyingSignals.trim().length > 5;
  return (
    <div className="space-y-4">
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          What is this bot trying to get the visitor to do?
        </span>
        <input
          type="text"
          value={state.qualifyingGoal}
          onChange={(e) => update("qualifyingGoal", e.target.value)}
          placeholder="Book a 30-min consult / fill out qualify form / request a quote"
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          Qualifying signals (what a good lead looks like)
        </span>
        <textarea
          value={state.qualifyingSignals}
          onChange={(e) => update("qualifyingSignals", e.target.value)}
          placeholder="Owns land · timeline under 12 months · budget over $150k · in TX/TN/OK/LA"
          rows={3}
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          Disqualifying signals (don&apos;t push these visitors to convert)
        </span>
        <textarea
          value={state.disqualifyingSignals}
          onChange={(e) => update("disqualifyingSignals", e.target.value)}
          placeholder="No land yet · 18+ months out · wants a kit not a builder"
          rows={2}
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm"
        />
      </label>
      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          Lead webhook URL (where qualified leads POST to)
        </span>
        <div className="flex gap-2">
          <input
            type="url"
            value={state.webhookUrl}
            onChange={(e) => {
              update("webhookUrl", e.target.value);
              setWebhookState("idle");
            }}
            placeholder="https://your-crm.com/api/leads OR Zapier / Make webhook"
            className="flex-1 rounded-md border border-sand bg-cream px-3 py-2 text-sm font-mono"
          />
          <button
            type="button"
            onClick={testWebhook}
            disabled={!state.webhookUrl.trim() || webhookState === "testing"}
            className="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-cream hover:bg-rust-dark disabled:opacity-50"
          >
            {webhookState === "testing" ? "Testing…" : "Test"}
          </button>
        </div>
      </label>
      {webhookState !== "idle" && webhookMsg && (
        <div
          className={
            "rounded-md p-3 text-xs " +
            (webhookState === "ok"
              ? "bg-pine/10 border border-pine/40 text-pine"
              : "bg-rust/10 border border-rust/40 text-rust")
          }
        >
          {webhookMsg}
        </div>
      )}
      {ready && (
        <button
          onClick={onContinue}
          className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
        >
          Save criteria — continue
        </button>
      )}
    </div>
  );
}

function StepDeploy({
  state,
  update,
  onContinue,
}: {
  state: WizardState;
  update: <K extends keyof WizardState>(k: K, v: WizardState[K]) => void;
  onContinue: () => void;
}) {
  const TEMPLATE_REPO =
    "https://github.com/DanteDeathmarch/Barndo-Marketing";
  const ready = state.vercelProjectName.trim().length > 2;

  const envVars = `ANTHROPIC_API_KEY=${state.anthropicKey ? "<paste your key from step 2>" : "(set in step 2 first)"}
LEAD_WEBHOOK_URL=${state.webhookUrl || "(set in step 5 first)"}
BRAND_COLOR=${state.brandColor}
BRAND_LOGO_URL=${state.logoUrl || ""}
TONE_WORDS=${state.toneWords}
FORMALITY=${state.formality}
BUSINESS_NAME=${state.vercelProjectName || "your-business"}`;

  return (
    <div className="space-y-5">
      {/* Path A: Vercel direct from GitHub */}
      <div className="rounded-md border border-sand p-4">
        <p className="font-semibold text-ink text-sm mb-2">
          Path A — Fork to your GitHub, import to your Vercel (recommended)
        </p>
        <ol className="list-decimal list-inside text-sm text-charcoal space-y-1.5">
          <li>
            Open{" "}
            <a
              href={TEMPLATE_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust font-semibold hover:underline"
            >
              the template repo
            </a>{" "}
            and click <strong>Fork</strong> — fork into your GitHub account
          </li>
          <li>
            Go to{" "}
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust font-semibold hover:underline"
            >
              vercel.com/new
            </a>{" "}
            → <strong>Import</strong> next to your forked repo
          </li>
          <li>
            In the Vercel project settings, paste the env vars below into{" "}
            <strong>Environment Variables</strong>
          </li>
          <li>
            Click <strong>Deploy</strong> — first build takes ~2 minutes
          </li>
        </ol>
      </div>

      {/* Path B: Replit */}
      <div className="rounded-md border border-sand p-4">
        <p className="font-semibold text-ink text-sm mb-2">
          Path B — Replit (if you want an in-browser editor)
        </p>
        <ol className="list-decimal list-inside text-sm text-charcoal space-y-1.5">
          <li>
            Sign in to{" "}
            <a
              href="https://replit.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rust font-semibold hover:underline"
            >
              replit.com
            </a>{" "}
            → <strong>Import from GitHub</strong>
          </li>
          <li>
            Paste{" "}
            <code className="text-xs bg-sand/60 px-1 rounded">
              {TEMPLATE_REPO}
            </code>{" "}
            and choose your fork (Replit will offer to clone it for you)
          </li>
          <li>
            Add your env vars to the Replit <strong>Secrets</strong> pane
          </li>
          <li>
            Hit <strong>Run</strong>. To go live, click{" "}
            <strong>Deploy → Connect Vercel</strong> from inside Replit
          </li>
        </ol>
        <p className="mt-2 text-xs text-steel">
          Tip: Replit also gives you a one-click way to run{" "}
          <code>npm run evals</code> in the background on a schedule —
          handy for monthly regression testing without burning your laptop.
        </p>
      </div>

      <label className="text-sm block">
        <span className="block font-semibold text-ink mb-1">
          Vercel project name (lowercase, no spaces)
        </span>
        <input
          type="text"
          value={state.vercelProjectName}
          onChange={(e) =>
            update(
              "vercelProjectName",
              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
            )
          }
          placeholder="groundwork-bot"
          className="w-full rounded-md border border-sand bg-cream px-3 py-2 text-sm font-mono"
        />
      </label>

      <div className="rounded-md border border-sand">
        <div className="flex items-center justify-between p-3 border-b border-sand">
          <p className="font-semibold text-ink text-sm">Env vars for Vercel</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(envVars)}
            className="text-xs font-semibold text-rust hover:underline"
          >
            Copy all
          </button>
        </div>
        <pre className="text-xs bg-ink text-cream rounded-b-md p-3 overflow-x-auto">
{envVars}
        </pre>
      </div>

      {ready && (
        <button
          onClick={onContinue}
          className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
        >
          Deployed — continue to test
        </button>
      )}
    </div>
  );
}

function StepTest({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-charcoal">
        Test your live bot against 18 synthetic personas before any real
        visitor sees it. Catches regressions, weird answers, persona-specific
        failures. The same harness re-runs monthly to catch drift.
      </p>

      <div className="rounded-md border border-sand p-4 text-sm space-y-3">
        <p className="font-semibold text-ink">
          Quick test (in your forked repo, locally or in Replit)
        </p>
        <pre className="bg-ink text-cream rounded p-3 text-xs overflow-x-auto">
{`npm install
echo 'ANTHROPIC_API_KEY=<your key>' > .env.local
npm run evals                       # variant A only
npm run evals -- --variant=both     # A vs B side-by-side`}
        </pre>
        <p className="text-xs text-charcoal">
          The eval report writes to <code>evals-reports/</code> with aggregate
          scores per criterion, the top failure modes, and proposed prompt
          edits. Aim for overall <strong>≥ 4.2/5</strong> before going live.
        </p>
      </div>

      <div className="rounded-md border border-sand p-4 text-sm space-y-2">
        <p className="font-semibold text-ink">
          What gets tested (18 personas)
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-charcoal">
          <li>• ready-tx (ideal buyer)</li>
          <li>• tire-kicker</li>
          <li>• wrong-state-ca</li>
          <li>• hostile-skeptic</li>
          <li>• terse-texter</li>
          <li>• vague-dreamer</li>
          <li>• financing-anxious</li>
          <li>• kit-only-shopper</li>
          <li>• already-shopping</li>
          <li>• out-of-budget</li>
          <li>• multi-gen-family</li>
          <li>• mobile-brevity</li>
          <li>• retired-tn</li>
          <li>• workshop-first-ok</li>
          <li>• fl-resident-la-build</li>
          <li>• overqualified-expert</li>
          <li>• rude-skeptic</li>
          <li>• time-waster</li>
        </ul>
        <p className="text-xs text-steel pt-2">
          Edit <code>scripts/evals/personas.ts</code> to tune the roster to
          YOUR niche. The monthly routine auto-mines new personas from real
          conversation failures over time.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="rounded-md bg-rust px-5 py-2.5 text-sm font-semibold text-cream hover:bg-rust-dark"
      >
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
        <p className="text-sm font-semibold text-ink mb-1">
          Paste this on your website:
        </p>
        <pre className="bg-ink text-cream rounded p-3 text-xs overflow-x-auto">
{snippet}
        </pre>
      </div>

      <div className="rounded-lg border border-sand bg-sand/40 p-4 text-sm">
        <p className="font-semibold text-ink mb-2">
          How to update without us — open Claude Max and paste one of these:
        </p>
        <details className="mb-2">
          <summary className="cursor-pointer text-charcoal">
            Template: update knowledge base
          </summary>
          <pre className="mt-2 bg-cream border border-sand rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`I want to update my bot's knowledge base. Here's the current file:

[paste current knowledge.md from your GitHub repo]

I want to add / change:

[describe the update in plain English]

Please give me the updated knowledge.md ready to commit.`}
          </pre>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-charcoal">
            Template: refine the bot's tone
          </summary>
          <pre className="mt-2 bg-cream border border-sand rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`I want to refine my bot's voice. Here's the current system prompt:

[paste current lib/concierge.ts from your repo]

My new tone description: [warmer / more direct / more expert / ...]

Please rewrite the rules section ONLY, keeping the four-phase arc intact.`}
          </pre>
        </details>
        <details>
          <summary className="cursor-pointer text-charcoal">
            Template: add a new qualifying rule
          </summary>
          <pre className="mt-2 bg-cream border border-sand rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`Add a new qualifying rule to my bot's system prompt:

[describe the new rule and how the bot should react]

Show me the updated section ready to drop in.`}
          </pre>
        </details>
      </div>

      <div className="rounded-lg border border-pine/40 bg-pine/10 p-4 text-sm">
        <p className="font-semibold text-pine">You&apos;re live.</p>
        <p className="mt-1 text-charcoal">
          Your bot is running on your Vercel, your Anthropic key, your data.
          When you outgrow this wizard, your Claude Max is your engineer.
        </p>
      </div>
    </div>
  );
}
