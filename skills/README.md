# Bundled Skills

Every install of this chatbot ships with this `/skills/` folder. These are
the workflows the customer's **Claude Max** uses to maintain and evolve the
bot over time — no engineer needed.

Some of these Skills also have a matching **scheduled routine** under
`/routines/` that runs the same workflow on a cron (daily / weekly /
monthly) using the customer's Anthropic API key on Anthropic's
RemoteTrigger API. Those routines email the owner with findings and
proposed changes; the owner stays in control via an approval gate before
anything goes live.

## On-demand skills (customer's Claude Max runs these)

| Skill | When to use it |
|---|---|
| [`update-kb`](./update-kb/SKILL.md) | Add to or change the bot's `knowledge.md` |
| [`refine-tone`](./refine-tone/SKILL.md) | Adjust the bot's voice without breaking the conversation arc |
| [`add-qualifying-rule`](./add-qualifying-rule/SKILL.md) | Add or change lead scoring / disqualifying signals |
| [`ab-test-prompt`](./ab-test-prompt/SKILL.md) | Safely test a prompt change as variant B against production variant A |
| [`mine-transcripts-to-personas`](./mine-transcripts-to-personas/SKILL.md) | Turn real failed conversations into durable eval personas |

## Scheduled skills (run on a routine + on demand)

| Skill | Routine cadence | What it does |
|---|---|---|
| [`self-audit`](./self-audit/SKILL.md) | Daily | Health-check the bot, webhook, reporting pipeline; flag anomalies |
| [`lessons-learned`](./lessons-learned/SKILL.md) | Daily | Read recent failures, propose prompt/KB tweaks, log to lessons file |
| [`research-niche`](./research-niche/SKILL.md) | Weekly | Research the bot's niche; propose KB additions with sources |
| [`ab-test-prompt`](./ab-test-prompt/SKILL.md) | Weekly (when an experiment is active) | Compare A vs B on real traffic + eval, propose promote/revert/continue |
| [`live-fire-test`](./live-fire-test/SKILL.md) | Monthly | Run the persona eval suite, surface regressions |

## The refinement loop

Five of these skills compose into a closed iteration cycle:

```
real conversations
   ↓
lessons-learned (daily)
   ↓ identifies failure clusters (3+ instances)
mine-transcripts-to-personas (auto-invoked by daily routine)
   ↓ proposes new eval persona for the archetype
owner adds persona + applies proposed fix in one commit
   ↓
live-fire-test (run on demand, monthly cron)
   ↓ confirms fix passes new persona + no regression
ab-test-prompt (when the change is large enough to warrant)
   ↓ tests B vs A on real traffic
weekly ab-evaluator routine recommends promote / revert
   ↓
back to top, with a more capable bot
```

The bot's regression test gradually becomes a record of every weird
visitor it has ever encountered. After 90 days the persona library is
worth more than the original prompt.

## How to use a skill

### From your Claude Max conversation (the most common path)
1. Open your Claude Max chat where you primed the bootstrap prompt (step 1 of the install wizard).
2. Paste the relevant Skill's **Template** section.
3. Fill in the bracketed placeholders.
4. Claude returns the edit ready to commit to your GitHub.

### From a scheduled routine
The wizard provisioned a routine on your Anthropic account when you installed.
You don't run anything manually — it fires on its cron schedule and emails you.

### From Claude Code (engineer-flavored)
If you've installed Claude Code locally, `/<skill-name>` invokes the same prompt with the right context loaded.

## Anatomy of a skill file

Each `SKILL.md` follows this shape:

```yaml
---
name: skill-name
description: one-line description (used to decide relevance)
---

# Skill title

Short explanation of what this skill does and why.

## When to use it

The triggering situation.

## Inputs

What the customer needs to provide.

## Template

The prompt template they paste into Claude.

## Output

What the skill returns.
```
