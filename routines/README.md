# Scheduled Routines

These JSON files configure scheduled agents on the customer's Anthropic
account using the [RemoteTrigger API](https://docs.claude.com). They fire
on a cron schedule, run the matching Skill from `/skills/`, and email the
owner with findings + proposed changes.

| Routine | Cadence | Skill it runs | What lands in the owner's inbox |
|---|---|---|---|
| [daily-audit.json](./daily-audit.json) | Every day, 6am owner time | [`self-audit`](../skills/self-audit/SKILL.md) | Green/yellow/red health card + action items |
| [daily-improvement.json](./daily-improvement.json) | Every day, 7am owner time | [`lessons-learned`](../skills/lessons-learned/SKILL.md) | New lessons + proposed prompt/KB tweaks |
| [weekly-research.json](./weekly-research.json) | Monday, 8am owner time | [`research-niche`](../skills/research-niche/SKILL.md) | Sourced research brief + proposed KB additions |
| [monthly-eval.json](./monthly-eval.json) | 1st of month, 9am owner time | [`live-fire-test`](../skills/live-fire-test/SKILL.md) | Aggregate eval scores + deltas + top 3 failure modes |

## How the install wizard provisions these

When the customer completes the wizard, it:

1. Takes their Anthropic API key (collected in Step 2)
2. Reads each routine JSON template
3. Substitutes `{{TIMEZONE}}`, `{{OWNER_EMAIL}}`, `{{BUSINESS_NAME}}`,
   `{{ENVIRONMENT_ID}}`, and a fresh UUID per routine
4. POSTs each to `https://api.anthropic.com/v1/code/triggers` using the
   customer's key
5. Stores the returned `trigger_id` in the customer's repo at
   `routines/.installed.json` so future updates can find them

If a customer wants to install these manually (no wizard), see the
`Manual install` section below.

## Approval gate (important)

None of these routines auto-commit changes to the bot. They all email
the owner with **proposed** edits + the exact files/lines to change.
The owner reviews and either:
- Pastes the proposal into their Claude Max chat using the matching
  Skill template, gets back a clean diff, and commits it
- Edits the files directly
- Ignores it (the proposal stays in the inbox; no action = no change)

This prevents drift, hallucinated facts, and runaway changes from
landing in production without a human in the loop.

## Cost expectations

Rough monthly cost on the customer's Anthropic bill, per routine:

| Routine | Per-run cost | Monthly total |
|---|---|---|
| daily-audit | $0.10–0.30 | $3–9 |
| daily-improvement | $0.20–0.60 | $6–18 |
| weekly-research | $1–3 | $4–12 |
| monthly-eval | $2–8 | $2–8 |
| **All four routines** | | **~$15–47/mo** |

This is on top of the live bot's runtime cost (which depends on
conversation volume). Both are within the customer's Anthropic billing —
nothing flows through us.

## Manual install

If a customer wants to install a routine without using the wizard:

```bash
# 1. Get an environment_id from https://console.anthropic.com (one-time)
# 2. Edit the JSON template — replace {{...}} placeholders
# 3. POST it:
curl -X POST https://api.anthropic.com/v1/code/triggers \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d @daily-audit.json
```

Response includes the `trigger_id` they save for future updates.

## Editing a routine after install

To change the cron schedule, the system prompt, or the connectors:

1. Edit the JSON in `/routines/`
2. POST it to `/v1/code/triggers/{trigger_id}` (update endpoint)
3. Or use the [routines dashboard](https://claude.ai/code/routines) UI

Or just ask Claude Max — it can edit and re-POST for you.
