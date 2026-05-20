# Barndo-Marketing — Customer-Owned Conversion Bot

A complete, customer-owned chatbot platform packaged as a forkable
template. A customer walks through the install wizard and ends up with
their own conversion-qualifying chatbot deployed on their stack (their
Vercel, their Anthropic API key, their data), maintained by their Claude
Max through a bundle of skills and self-running improvement routines.

The customer embeds the chatbot widget on **their existing website** via
a `<script>` tag — we don't host their public site.

---

## What ships in this template

| Layer | What | Where |
|---|---|---|
| **Chatbot runtime** | Streaming AI concierge — discovery-led, prompt-cached, A/B variant aware, four-phase conversation arc | `app/api/chat/` + `lib/concierge.ts` + `components/ConciergeWidget.tsx` |
| **Lead pipeline** | `/api/lead` scores + writes to Notion + sends Resend instant alert + POSTs to customer webhook | `app/api/lead/` + `lib/scoring.ts` + `lib/notion.ts` + `lib/email.ts` |
| **Message Batches** | `/api/batch/*` — daily AI builder-briefing generation at 50% cost | `app/api/batch/` + `lib/batch.ts` |
| **Eval harness** | 18 personas × 6-criterion judge, supports `--variant=A | B | both` | `scripts/evals/` |
| **9 Skills** | Workflows the customer's Claude Max runs to maintain the bot | `skills/` |
| **5 Routines** | Scheduled cron jobs on the customer's Anthropic account | `routines/` |
| **Install wizard** | Customer-facing 8-step setup at `/install-wizard` | `app/install-wizard/` |

## Quick start (dev)

```bash
npm install
cp .env.example .env.local       # then fill in keys
npm run dev                      # site at http://localhost:3000
npm run build                    # production check
npm run evals                    # conversation evals against current prompt
npm run evals -- --variant=both  # side-by-side A vs B with winner recommendation
```

## Required environment variables

See `.env.example`. Minimum to deploy: just `BATCH_SECRET`. Everything
else gates features that stay off (gracefully) until the key arrives.

| Var | What it unlocks |
|---|---|
| `ANTHROPIC_API_KEY` | The concierge chatbot + Message Batches lead assessment + evals |
| `NOTION_TOKEN` + `NOTION_LEADS_DB_ID` | Persisting leads to Notion (the daily CEO routine reads from here) |
| `RESEND_API_KEY` + `LEAD_ALERT_FROM/TO` | Instant lead-alert emails |
| `BATCH_SECRET` | Protects `/api/batch/*` (required) |

## The product architecture

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
        │ THE DEPLOYED BOT                          │
        │ - /widget (chat UI)                       │
        │ - /api/chat (Sonnet 4.6, prompt-cached)   │
        │ - /api/lead (score → customer webhook)    │
        │ - A/B variant cookie (proxy.ts)           │
        └──────────────────────────────────────────┘
                       │
                       ├─→ /skills/ (maintenance workflows)
                       ├─→ /routines/ (scheduled crons)
                       ├─→ /scripts/evals/ (regression test)
                       └─→ /lib/lessons-learned.md (institutional memory)
                       
                       │ feedback loop:
                       │
        real conversation → daily-improvement → mining →
        new persona → fix → live-fire-test passes →
        ab-test-prompt verifies on real traffic →
        promoted → smarter bot → back to top
```

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, design rationale,
and per-component spec.

## The 9 Skills (read [skills/README.md](./skills/README.md))

**On-demand** (customer's Claude Max runs these from a paste-ready template):
- `update-kb` — add/edit `lib/knowledge.md` without breaking structure
- `refine-tone` — rewrite the bot's voice (never touches KB or phase arc)
- `add-qualifying-rule` — keep `scoring.ts` and the system prompt in sync
- `ab-test-prompt` — safely test prompt changes as variant B vs production A
- `mine-transcripts-to-personas` — turn real failures into durable eval personas

**Scheduled + on-demand**:
- `self-audit` (daily) — health card, anomaly detection
- `lessons-learned` (daily) — diagnose failures, propose fixes, log to `lib/lessons-learned.md`
- `research-niche` (weekly) — research the customer's vertical, propose KB additions
- `live-fire-test` (monthly) — run the eval suite, surface regressions

## The 5 Routines (read [routines/README.md](./routines/README.md))

Provisioned on the customer's Anthropic account via the RemoteTrigger API.
None auto-commit changes. All email the owner with proposed edits + the
exact file changes, which the owner approves via the matching Skill
template in Claude Max.

| Routine | Cron | Skill it runs |
|---|---|---|
| `daily-audit.json` | Daily 12 UTC | `self-audit` |
| `daily-improvement.json` | Daily 13 UTC | `lessons-learned` + `mine-transcripts-to-personas` (clusters of 3+) |
| `weekly-research.json` | Mon 14 UTC | `research-niche` |
| `weekly-ab-evaluator.json` | Mon 16 UTC | `ab-test-prompt` Phase 3 (skips if no active experiment) |
| `monthly-eval.json` | 1st 15 UTC | `live-fire-test` against both variants |

Cost: roughly **$18–59/month** for all five routines on the customer's
Anthropic bill, on top of live bot runtime.

## The install wizard

`/install-wizard` is the customer-facing onboarding. Eight steps,
client-side state in `localStorage`, never sends data to our servers:

1. **Account prep** — Claude Max, Anthropic key, Vercel, Replit, GitHub + tech-stack checks + bootstrap prompt for the customer's Claude
2. **API key** — pasted, stored client-side only
3. **Brand** — scans the customer's existing site (`/api/wizard/scan-brand`) to pre-fill colors, logo, tagline; manual overrides available
4. **Knowledge base** — paste SOPs/FAQs/docs; gets restructured into `knowledge.md`
5. **Qualifying criteria + webhook** — defines lead destination + qualifying signals
6. **Fork + deploy** — Replit template → Vercel via env vars
7. **Live-fire test** — runs the eval suite against the configured bot
8. **Install + ongoing playbook** — script tag + paste-ready Claude Max templates

## How the bot stays good over time

The five scheduled routines + nine skills compose into a closed loop:

1. Real conversations land in the bot
2. Daily improvement routine clusters failures
3. Mining skill turns clusters of 3+ into new eval personas
4. Owner applies the proposed fix
5. Live-fire test confirms the fix passes the new persona + no regression
6. For non-trivial changes, ab-test-prompt runs B vs A on real traffic
7. Weekly evaluator recommends promote/revert
8. The eval persona library, the lessons-learned log, and the prompt all
   ratchet up over time. The bot's regression test becomes the record
   of every weird visitor it has ever encountered.

## Project status

| Status | What |
|---|---|
| ✅ Live | Chatbot runtime, lead pipeline, eval harness, 9 skills, 5 routines, A/B variant infrastructure, brand scanner, webhook tester, install wizard |
| 🔄 In progress | Polish on wizard Steps 4/7/8, Replit template repo, single-file Claude.ai artifact extraction |
| 📋 Future | Per-tenant deployment of the bot (current model is fork-and-deploy per customer) |

## License + ownership

Each customer who installs from this template owns their resulting
deployment fully — their Vercel, their Anthropic costs, their data,
their decisions. This template repo is the source we ship from; what
they fork is theirs.
