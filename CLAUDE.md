# BarndoBuilt — Project Context

A lead-generation business that captures rural landowners in **Texas, Tennessee,
Oklahoma, Louisiana** who want to build custom barndominiums, scores them, and
sells qualified leads to Complete Barndo Solutions (CBS) — and, later, other
builders. The website is the front door. An autonomous "CEO" routine runs the
business daily.

> **Branding note.** BarndoBuilt is our own neutral brand. We do **not** have a
> signed agreement with CBS yet — never present the site as their official
> property. Once an agreement is signed, branding could change.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- Deployed to **Vercel** (target subdomain: `barndobuilt.vercel.app`)
- **Notion** as the lead datastore (CEO routine reads it via MCP)
- **Resend** for instant lead-alert emails
- **Anthropic SDK** for the AI concierge and Message Batches lead assessment
- A/B variant cookie via `proxy.ts` (Next 16's renamed middleware)

---

## Repository layout

```
app/
  layout.tsx               Shell + mounts ConciergeWidget
  page.tsx                 Hub (A/B headline variants A and B)
  [state]/page.tsx         /texas /tennessee /oklahoma /louisiana
  qualify/page.tsx         Multi-step paginated form
  thank-you/page.tsx       Post-submit
  how-it-works/page.tsx
  privacy/, terms/
  api/
    lead/route.ts          POST: score + write Notion + Resend alert
    chat/route.ts          POST: streaming Claude concierge
    batch/assess/route.ts  POST: pull "New" leads, submit Message Batch
    batch/collect/route.ts POST: write briefings back to Notion when batch ends
components/
  Header, Footer, CTAButton
  ConciergeWidget          Sitewide chatbot
  QualifyWizard            5-step form, localStorage progress
lib/
  states.ts                TX/TN/OK/LA static data
  scoring.ts               Server-side lead scoring (single source of truth)
  form-options.ts          Shared form choice values
  notion.ts                writeLeadToNotion, readLeadsByStatus, update helpers
  email.ts                 Resend instant-alert
  concierge.ts             Concierge system prompt + knowledge base
  batch.ts                 Anthropic Message Batches integration
proxy.ts                   Sets the bb_variant A/B cookie
```

---

## Environment variables

Required for the relevant feature; see `.env.example` for the canonical list.

| Var | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | concierge + batch | Claude API |
| `NOTION_TOKEN` | lead pipeline | Notion integration token |
| `NOTION_LEADS_DB_ID` | lead pipeline | The Leads database ID |
| `RESEND_API_KEY` | instant alerts | Transactional email |
| `LEAD_ALERT_FROM` / `LEAD_ALERT_TO` | instant alerts | Sender / owner inbox |
| `BATCH_SECRET` | batch routes | Required — routes 503 until set |

`.env.local` is gitignored; `.env.example` is committed.

---

## Lead pipeline

```
form / concierge → /api/lead → score + tier → Notion (Status=New) → Resend alert
                                                  ↓
              CEO routine (daily) reads "New" → status updates, emails, etc.
              /api/batch/assess pulls "New" → submits Message Batch (50% cost)
              /api/batch/collect writes briefing → Notion (Status=Assessed)
```

**Scoring rubric** (mirrored in `lib/scoring.ts` and `lib/batch.ts` system prompt):

- Owns land outright: +30 · Land financed: +20
- Timeline ≤12mo: +25 · 18mo+ / exploring: −20
- Budget $150k+: +20
- TX or TN: +15
- 5+ acres: +10
- "Knows what they want, needs a builder": +15

Tiers: A ≥85 ($300–500/lead), B 50–84 ($150–250/lead), Nurture <50.

---

## Notion "Leads" database

Properties used by the code (create these exactly):

| Property | Type |
|---|---|
| Name | title |
| State | select (TX, TN, OK, LA, OTHER) |
| Land Status | rich text |
| Acreage | rich text |
| Timeline | rich text |
| Build Stage | rich text |
| Budget | rich text |
| Score | number |
| Tier | select (A, B, Nurture) |
| Status | select (New, Assessing, Assessed, Nurture, Sold, ...) |
| Source | rich text |
| Phone | phone |
| Email | email |
| Best Time | rich text |
| Submitted At | date |
| Briefing | rich text *(filled by batch collect)* |

The Notion integration must be shared with this database AND with the workspace
that the CEO routine's MCP connector uses.

---

## The autonomous CEO routine

Cloud routine ID: **`trig_01Hzz7YTK4dBufyZqTz3xFFs`**
(dashboard: https://claude.ai/code/routines/trig_01Hzz7YTK4dBufyZqTz3xFFs)

- Runs daily at 9:00 AM America/Mexico_City (`0 15 * * *` UTC)
- Connectors: Gmail (CBS outreach + owner digest), Notion (Leads + ops log), Google Drive
- Maintains a **Decision Calendar** with default actions so the business never
  stalls waiting on a human:
  - Day 5: send initial CBS outreach (Email A)
  - Day 7: evaluate Meta CPL, shift if > $40
  - Day 10: send follow-up Email B if no CBS reply
  - Day 14: auto-promote A/B headline winner
  - Day 21: decide on county/metro SEO expansion
  - Day 30: full review email to owner
- Owner inbox: `handler@rebirthmultiverse.com`

The full system prompt for the routine is stored on the routine itself (set via
the RemoteTrigger API). To inspect or edit it, use the routines dashboard.

---

## Multi-step qualification form

5 paginated steps, easiest first, contact info last (`components/QualifyWizard.tsx`):

1. State (TX/TN/OK/LA/Other) — fail-fast disqualifier
2. Land ownership + acreage
3. Timeline + build stage
4. Budget
5. Contact info (name, phone, email, best time)

Partial progress saved to `localStorage` under `bb_qualify_progress`.
"Other" state → soft exit screen, no submit.

---

## AI concierge

Sitewide chat widget (`components/ConciergeWidget.tsx`) backed by
`POST /api/chat`. Model: `claude-sonnet-4-6` with prompt caching on the
system prompt + knowledge base in `lib/concierge.ts`. Streams responses.
Can act as a second lead-capture funnel (tagged `source: concierge`).

---

## A/B testing

`proxy.ts` sets a `bb_variant` cookie (A or B) 50/50 on first visit. The hub
renders one of two headline variants (`HEADLINES` in `app/page.tsx`). Variant
is written to each lead's Notion `Source` field so the CEO routine can compute
conversion by variant.

---

## Strategic context (for future sessions)

- **Target segment:** rural landowners in TX/TN/OK/LA who already own acreage
  and want to build within 6–18 months. Land = the #1 objection already removed.
- **Channels (planned):** Meta Ads (primary), Google Search (high-intent),
  cold email / direct mail to county property records (data play).
- **Revenue model:** lead arbitrage — sell scored leads to CBS at $400/Tier A,
  $200/Tier B. Goal: 50–100 qualified leads/month after ramp.
- **Open business decisions** managed by the CEO routine's Decision Calendar.

---

## Things deferred / not yet done

- Vercel deployment (needs interactive `vercel login`)
- Domain (running on a Vercel subdomain initially)
- Programmatic SEO expansion (county / metro pages) — Day-21 decision
- Segment-specific landing pages (`/veterans`, `/ag-families`) — Phase 2
- Signed lead-purchase agreement with CBS — Day-5/10 outreach in motion

---

## How to test locally

```
npm install
npm run dev
# Then POST a test lead:
curl -X POST http://localhost:3000/api/lead -H "Content-Type: application/json" \
  -d '{"state":"TX","landOwnership":"own-outright","acreage":"5-20",
       "timeline":"0-6mo","buildStage":"need-builder","budget":"300-500k",
       "firstName":"Test","lastName":"Lead","phone":"5125551234",
       "email":"test@example.com","bestTime":"morning","source":"form"}'
# → {"ok":true,"tier":"A"}
```

`npm run build` is the authoritative TypeScript + route check before pushing.

---

## Original plan

The full design rationale (site architecture, decision tradeoffs, build phases)
lives at `C:\Users\greg\.claude\plans\great-site-architecture-batch-get-memoized-shannon.md`
and is also copied into this repo as `docs/architecture-plan.md`.

---

## 2026-05 Strategic pivot (read this)

The business has been reframed from "BarndoBuilt is a consumer lead-gen brand
selling leads to CBS" to **chatbot-as-a-product sold to builders**, plus layered
lead-gen and adjacent niches:

1. **Phase 1 — Product.** Perfect the concierge chatbot, package it as an
   embed snippet, sell installs to builders. **First install target:
   Groundwork** (`https://groundwork-draft.vercel.app`).
2. **Phase 2 — Service.** Layer done-for-you lead-gen on top of the chatbot
   for installed customers.
3. **Phase 3 — Adjacent verticals.** Same chatbot, swapped knowledge base,
   sold to other verticals. Confirmed candidate: a "marketing for builders"
   B2B arm some customers operate, plus future verticals like nonprofit
   fundraising tools (gift-pyramid planner, see \`/gift-pyramid\`).

### Architecture decisions for the product phase

- **Install format:** \`<script>\` tag the customer pastes (Intercom-style).
- **Lead destination:** customer's system only (POST to a webhook they own).
  We never store their captured leads.
- **Knowledge base ownership:** we configure v1 from a customer questionnaire,
  they edit later via an admin UI (TBD).

### Eval-driven prompt iteration

The concierge is now under **conversation eval**. The harness in
\`scripts/evals/\` simulates 15 visitor personas against the production system
prompt, judges each conversation against a 6-criterion rubric, and writes a
dated markdown report.

Run: \`npm run evals\` (requires \`ANTHROPIC_API_KEY\` in \`.env.local\`).
Cost per full run: ~$1–3. Iterate on \`lib/concierge.ts\`, rerun, compare
aggregate scores. See \`scripts/evals/README.md\`.

Future Claude sessions: when tuning the chatbot, default to running an eval
before AND after the change, and include the score delta in the commit message.

---

## Customer-owned product architecture

This repo is now the **template** for a customer-owned chatbot install.
When a customer goes through \`/install-wizard\`, they walk through 8 steps
and end up with a copy of this codebase running on THEIR Vercel, using
THEIR Anthropic API key, with THEIR data. We never store or proxy.

Every install ships with three things that make the bot maintain itself:

### 1. \`/skills/\` — workflows the customer's Claude Max runs
Markdown SKILL.md files in \`/skills/<name>/\`. The customer pastes the
template section from a SKILL into their Claude Max chat and gets a
ready-to-commit edit back. See \`skills/README.md\`.

| Skill | Purpose | Variant |
|---|---|---|
| \`update-kb\` | Edit \`lib/knowledge.md\` | On-demand only |
| \`refine-tone\` | Rewrite tone rules in \`lib/concierge.ts\` (never touches arc or KB) | On-demand only |
| \`add-qualifying-rule\` | Add lead scoring / disqualifying signals; keeps \`scoring.ts\` and the system-prompt rubric in sync | On-demand only |
| \`self-audit\` | Daily health check: webhook, logging, anomalies, reporting | On-demand + daily routine |
| \`lessons-learned\` | Diagnose bad transcripts, propose fixes, append to \`lib/lessons-learned.md\` | On-demand + daily routine |
| \`research-niche\` | Research the customer's vertical, propose KB additions | On-demand + weekly routine |
| \`live-fire-test\` | Run the eval suite from \`scripts/evals/\` against current prompt | On-demand + monthly routine |

### 2. \`/routines/\` — scheduled cron jobs on the customer's Anthropic account
JSON configs the wizard provisions via the RemoteTrigger API. They run on
the customer's API key, email the owner with findings + proposed changes,
and NEVER auto-commit anything except eval reports. See \`routines/README.md\`.

| Routine | Cron | Skill it runs |
|---|---|---|
| \`daily-audit.json\` | Daily 12 UTC | self-audit |
| \`daily-improvement.json\` | Daily 13 UTC | lessons-learned |
| \`weekly-research.json\` | Mon 14 UTC | research-niche |
| \`monthly-eval.json\` | 1st 15 UTC | live-fire-test |

Approval gate: every proposed change is emailed to the owner. They use
the matching on-demand Skill template in their Claude Max to get a clean
diff, then commit. The system never edits production prompts on its own.

### 3. \`lib/lessons-learned.md\` — the bot's institutional memory
Append-only log of every failure-and-fix. Newest at top. The
\`lessons-learned\` skill enforces a standard entry format. After 3–6 months
of use this becomes the most valuable doc in the repo — the answer to
"why did we set it up that way?" lives here.

### Install wizard

\`/install-wizard\` is the customer-facing onboarding. 8 steps, all client-
side, state persisted to localStorage. Step 1 includes the Claude Max
bootstrap prompt. Step 3 calls \`/api/wizard/scan-brand\` to extract brand
defaults from the customer's existing site. Step 7 reuses the eval harness.
Step 8 outputs the install snippet + the on-demand Skill templates.

The wizard's job is to set up the customer's deployment. Once they finish,
they own it forever and we have no operational involvement unless they
hire us for ongoing work.

### Adjacent verticals

The same architecture (deployed bot + bundled Skills + scheduled routines)
applies to any vertical. \`/gift-pyramid\` is the first non-barndo demo —
nonprofit capital-campaign planning. The Skills folder is vertical-
agnostic; \`lib/knowledge.md\` and \`lib/concierge.ts\` are the only things
that need to change per-vertical.
