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
lives at `C:\Users\greg\.claude\plans\great-site-architecture-batch-get-memoized-shannon.md`.
Copy that file into this repo as `docs/architecture-plan.md` if you want it
travelling with the code.
