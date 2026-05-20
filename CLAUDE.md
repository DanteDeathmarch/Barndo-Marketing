---
name: BarndoBuilt
description: Customer-owned conversion-chatbot template repo. Bot runtime + 9 Skills + 5 routines + 18-persona eval suite + install wizard. Each customer forks → owns the deployment.
---

# Project context

This repo is a **template** for a customer-owned conversion-qualifying
chatbot. A customer walks through the install wizard, ends up with their
own deployment on their own stack (their Vercel, their Anthropic API key,
their data), and maintains it via their Claude Max + a bundle of skills
and scheduled routines.

We do not host customer bots. We do not store customer leads. We do not
proxy customer API calls. Each install is independent and owned by the
customer forever.

The first install target is Groundwork
(`https://groundwork-draft.vercel.app`) — a barndominium-vertical
customer who already has a public marketing site of their own. The bot
embeds onto their existing site as a `<script>` tag widget.

---

## What's in the repo

```
app/
  page.tsx                 Template landing page (links to /install-wizard + GitHub)
  install-wizard/page.tsx  Customer-facing 8-step onboarding
  api/
    chat/route.ts          Streaming Claude concierge (Sonnet 4.6, prompt-cached, A/B aware)
    lead/route.ts          Score + tier + (optional) Notion write + (optional) Resend alert
    batch/assess/route.ts  POST: pull "New" leads, submit Message Batch
    batch/collect/route.ts POST: write briefings back when batch ends
    wizard/scan-brand/     Server-side site scrape for wizard Step 3
    wizard/test-webhook/   Webhook ping with sample payload for Step 5
components/
  ConciergeWidget.tsx      The actual chat widget; what customers embed
lib/
  concierge.ts             System prompt + KB; A/B variants (A=prod, B=candidate)
  scoring.ts               Server-side lead scoring (single source of truth)
  notion.ts                Notion read/write helpers
  email.ts                 Resend instant-alert
  batch.ts                 Anthropic Message Batches integration
  wizard-steps.ts          Step definitions + state shape for the install wizard
  lessons-learned.md       The bot's institutional memory (seed file)
proxy.ts                   Sets the bb_variant A/B cookie
skills/                    9 maintenance workflows the customer's Claude Max runs
routines/                  5 scheduled-routine JSON templates (RemoteTrigger API)
scripts/evals/             18-persona × 6-criterion eval harness (npm run evals)
```

## Environment variables

See `.env.example`. The minimum to run the wizard is none — every dependent
feature stays gracefully off until its key is provided.

| Var | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `/api/chat`, `/api/batch`, evals | Claude API |
| `NOTION_TOKEN` + `NOTION_LEADS_DB_ID` | `/api/lead` | Lead persistence (optional — leads also fire the customer's webhook) |
| `RESEND_API_KEY` + `LEAD_ALERT_FROM/TO` | `/api/lead` | Instant lead-alert emails |
| `BATCH_SECRET` | `/api/batch/*` | Protects the cost-bearing batch endpoints (returns 503 until set) |

`.env.local` is gitignored. `.env.example` is committed.

---

## Architecture: customer owns everything

```
                ┌──────────────────────────────────────────┐
                │ CUSTOMER OWNS EVERYTHING                  │
                │ Their Claude Max, API key, Vercel,        │
                │ Replit, GitHub, data                       │
                └──────────────────────────────────────────┘
                       │
                       │ fork template (this repo)
                       ▼
        ┌──────────────────────────────────────────┐
        │ THEIR DEPLOYED BOT (their Vercel)         │
        │ - widget (chat UI, A/B variant cookie)    │
        │ - /api/chat (Sonnet 4.6, prompt-cached)   │
        │ - /api/lead (score → customer webhook)    │
        └──────────────────────────────────────────┘
                       │
                       ├─→ skills/ (workflows their Claude Max runs)
                       ├─→ routines/ (scheduled crons on their account)
                       ├─→ scripts/evals/ (their regression test, grows over time)
                       └─→ lib/lessons-learned.md (their bot's institutional memory)
                       
                       │ refinement loop:
                       │
        real conversation → daily-improvement → mining →
        new persona → fix → live-fire-test passes →
        ab-test-prompt verifies on real traffic →
        promoted → smarter bot → back to top
```

---

## The 9 Skills

Files in `skills/<name>/SKILL.md`. Each has paste-ready prompt templates
the customer's Claude Max runs to maintain the bot.

| Skill | Purpose | When it runs |
|---|---|---|
| `update-kb` | Edit `lib/knowledge.md` without breaking structure | On demand |
| `refine-tone` | Rewrite the bot's voice (never touches KB or phase arc) | On demand |
| `add-qualifying-rule` | Keep `scoring.ts` and the system-prompt rubric in sync | On demand |
| `ab-test-prompt` | Test a prompt change as variant B vs production A | On demand + weekly routine when active |
| `mine-transcripts-to-personas` | Turn real failed conversations into durable eval personas | On demand + auto-invoked daily for clusters of 3+ |
| `self-audit` | Health card: webhook, logging, anomalies, reporting | On demand + daily routine |
| `lessons-learned` | Diagnose failures, propose fixes, append to lessons file | On demand + daily routine |
| `research-niche` | Research the customer's vertical, propose KB additions | On demand + weekly routine |
| `live-fire-test` | Run the eval suite with `--variant=A | B | both` | On demand + monthly routine |

See `skills/README.md`.

## The 5 scheduled Routines

Provisioned on the customer's Anthropic account via the RemoteTrigger API
at install. None auto-commit anything except the monthly eval report.
All email proposals to the owner; the owner approves via the matching
Skill template.

| Routine | Cron | Skill it runs |
|---|---|---|
| `daily-audit.json` | Daily 12 UTC | `self-audit` |
| `daily-improvement.json` | Daily 13 UTC | `lessons-learned` + `mine-transcripts-to-personas` (clusters of 3+) |
| `weekly-research.json` | Mon 14 UTC | `research-niche` |
| `weekly-ab-evaluator.json` | Mon 16 UTC | `ab-test-prompt` Phase 3 — skips if B === A |
| `monthly-eval.json` | 1st 15 UTC | `live-fire-test` (both variants) |

Cost on the customer's Anthropic bill: roughly **$18–59/month** for all
five. See `routines/README.md`.

---

## A/B variant infrastructure

- `lib/concierge.ts` exports `CONCIERGE_SYSTEM_A` (production) and
  `CONCIERGE_SYSTEM_B` (experimental candidate). B = A by default.
- `proxy.ts` sets `bb_variant` cookie 50/50 on first visit.
- `/api/chat` reads the cookie, calls `getConciergeSystem(variant)`.
- Lead rows carry the variant (in Source field) for conversion-by-variant.
- `npm run evals -- --variant=both` runs both prompts side-by-side and
  outputs a winner recommendation.

When the customer wants to test a change: they edit B's content (via the
`refine-tone` or `add-qualifying-rule` skill template), deploy, wait for
the `weekly-ab-evaluator` routine to recommend promote/revert/continue.

---

## Eval harness

`scripts/evals/` — 18-persona × 6-criterion judge. Each run produces a
dated markdown report in `evals-reports/` with aggregate scores, top
failure modes, and proposed prompt edits.

```
npm run evals                       # variant A only
npm run evals -- --variant=B        # variant B only
npm run evals -- --variant=both     # side-by-side with winner recommendation
```

Cost: ~$1–4 per full run. Iterate on `lib/concierge.ts`, rerun, compare.
See `scripts/evals/README.md` for the run-on-Replit path too.

---

## Notion Leads database (optional but recommended)

Properties used when `NOTION_TOKEN` + `NOTION_LEADS_DB_ID` are set:

| Property | Type |
|---|---|
| Name | title |
| State | select |
| Land Status, Acreage, Timeline, Build Stage, Budget, Best Time, Source | rich text |
| Score | number |
| Tier, Status | select |
| Phone | phone |
| Email | email |
| Submitted At | date |
| Briefing | rich text *(filled by batch collect)* |

The integration token needs read+write access to the database. Without
Notion configured, the bot still works — leads just POST to the
customer's webhook (set in wizard Step 5) and that's the durable record.

---

## How the bot stays good over time

```
real conversations
   ↓
daily-improvement routine (auto)
   ↓ identifies failure clusters
mine-transcripts-to-personas (auto for clusters of 3+)
   ↓ proposes new eval persona for the failing archetype
owner adds persona + applies proposed fix in one commit
   ↓
live-fire-test (monthly cron, or on demand)
   ↓ confirms fix passes new persona + no regression
ab-test-prompt (when the change is large enough)
   ↓ tests B vs A on real traffic
weekly-ab-evaluator routine recommends promote / revert
   ↓
back to top, with a more capable bot
```

The eval suite ships at 18 generic personas and grows organically as
the bot encounters real visitors. After ~90 days of mining, the persona
library is grounded in actual production failures and fixes that have
actually shipped — making it the bot's regression test.

---

## How to verify locally

```bash
npm install
npm run build        # type check + route registration
npm run lint         # zero errors expected
```

To test the eval harness end-to-end:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run evals
```

To test the wizard:

```bash
npm run dev
# open http://localhost:3000/install-wizard
```
