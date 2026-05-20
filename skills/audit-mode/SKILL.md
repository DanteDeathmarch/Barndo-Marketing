---
name: audit-mode
description: Toggle between manual approval (owner reviews every proposed change) and autonomous mode (routines commit changes themselves). Documents the circuit breakers that auto-flip back to manual on drift.
---

# Audit Mode

Every scheduled routine asks the same question: do I email a proposal,
or apply the change myself and email what I did? That's the audit-mode
toggle.

The toggle is one env var on your Vercel project. The customer's
Claude Max can flip it via this skill template — and the circuit
breakers below can flip it automatically when things drift.

## The two modes

### `AUDIT_MODE=manual` (default — recommended for the first 30 days)

- Routines email **proposals** with the exact file edits
- Owner reviews each proposal in their inbox
- Owner pastes into Claude Max with the matching skill (update-kb,
  refine-tone, add-qualifying-rule) → gets a clean diff → commits
- Nothing changes in production without a human in the loop
- Cost: 15–20 min/week of owner attention

### `AUDIT_MODE=autonomous` (set-and-forget — turn on after 30 days of trust)

- Routines commit changes themselves via the GitHub MCP
- Pre-flight gate: every change runs the live-fire-test first. If overall
  score drops > 0.2 vs the baseline, **abort and email a proposal instead**.
- Hard-coded "always manual" exclusions regardless of mode:
  - A/B variant promotion (real money on the line)
  - Scoring rule changes that shift tier thresholds by > 10%
  - Anything flagged "honesty failure" as the root cause
  - Tone changes that touch the four-phase arc structure
- Owner gets a **daily digest** email: "Last 24h, I did X, Y, Z. Eval
  delta +0.04. Roll back any of these by [link]."

## Circuit breakers (auto-flip → manual)

Set in env vars (see `.env.example`). The daily-audit routine checks
these at the start of every run. If ANY trip, `AUDIT_MODE` is overridden
to `manual` for that run AND the daily email opens with a 🔴 card naming
which threshold tripped and which recent change to roll back.

| Breaker | Default | Trips when |
|---|---|---|
| `AUDIT_FLIP_EVAL_DROP` | 0.3 | Overall eval score drops by > 0.3 between runs |
| `AUDIT_FLIP_CONVERSION_DROP` | 0.3 | Week-over-week conversion rate drops by > 30% |
| `AUDIT_FLIP_ANOMALY_DAYS` | 3 | 3 consecutive daily audits flagged anomalies |
| `AUDIT_FLIP_HONESTY_FAIL` | 1 | Any "honesty failure" lessons-learned entry created |
| `AUDIT_FLIP_RULES_PER_MONTH` | 5 | More than 5 customRules added in 30 days (rapid drift) |

When any breaker trips:
1. `AUDIT_MODE` flips to `manual` immediately for subsequent routine runs
2. Owner gets a 🔴 alert with the specific breaker, the change that
   correlates with it, and the rollback command
3. Routines stay in manual until the owner explicitly re-enables
   autonomous (they edit the env var)

## Toggling on demand

```
I want to switch my bot's audit mode from [current] to [target].

Current AUDIT_MODE in my Vercel project: [current]
Reason for the switch: [why]
Recent eval scores (last 3 runs):
- [run 1]: overall N
- [run 2]: overall N
- [run 3]: overall N
Days since deploy: [N]

Please:
1. Confirm I should make the switch given the eval trend (warn me if
   scores are trending down or if I'm under 30 days of deploy)
2. If green light, give me the Vercel CLI command to update the env var
3. Tell me what I should watch for in the first week after the switch
```

## How this competes with set-and-forget products

The autonomous mode + circuit breaker combination is the answer to "I
just want it to work." Customer ships, flips to autonomous after 30
days, then forgets — until the bot drifts beyond a threshold, at which
point manual mode comes back automatically and they get one clear
email. Hands-off when it's working, hands-on the moment it isn't.

That's a strictly stronger position than "always autonomous, always
quietly drifting" (what cheap chatbot products give you) AND than
"always manual, always asking you" (what the safe enterprise products
give you).
