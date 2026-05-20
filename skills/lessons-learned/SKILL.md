---
name: lessons-learned
description: Read recent bad conversations, identify root causes, propose system-prompt/KB fixes, and append to the durable lessons log so the bot does not repeat the same mistake
---

# Lessons Learned

This is the **gold / poison** loop — the thing that makes the bot grow up
instead of stay frozen at install-day quality. It runs as both:

- An **on-demand** Skill (paste a bad transcript, get a fix)
- A **scheduled routine** (`routines/daily-improvement.json`) that
  surveys the prior day, identifies patterns, and emails the owner with
  proposed prompt/KB edits

Every fix gets appended to `lib/lessons-learned.md` — a permanent log of
"what went wrong, why, what we changed, when." Over time this becomes
the bot's institutional memory.

## The `lessons-learned.md` log format

Every entry follows this structure:

```markdown
## [YYYY-MM-DD] — [short title]

**What happened:** 1–2 sentences. Be specific. Include conversation ID
if available.

**Root cause:** Why the bot got it wrong. One of:
- KB gap (the bot didn't know X)
- KB conflict (the bot saw two contradictory things and picked wrong)
- Tone/style failure (right info, wrong voice)
- Scoring failure (good lead got disqualified, or bad lead got pushed)
- Honesty failure (the bot invented something it shouldn't have)
- Phase-arc failure (pushed the form too early, or never bridged)

**Fix applied:** What was changed and where (commit hash if available).

**Verification:** How we'll know the fix worked. Usually "next eval run
on persona X should pass" or "watch for this pattern in the next week."

---
```

## When to use it on demand

- You read a transcript that made you wince — paste it, get the fix
- A customer or visitor complained about a specific interaction
- The audit (see `self-audit`) flagged an anomaly and you want to know why

## Inputs

1. The full transcript of the bad conversation
2. The current `lib/concierge.ts`
3. The current `lib/knowledge.md`
4. The current `lib/lessons-learned.md` (so you don't duplicate entries)
5. Optional: outcome data (did this lead convert? did the visitor complain?)

## Template

```
Diagnose this bad conversation from my [BUSINESS] chatbot and propose
a fix.

Transcript:
<<<
[paste the conversation]
>>>

Current lib/concierge.ts:
<<<
[paste]
>>>

Current lib/knowledge.md:
<<<
[paste]
>>>

Current lib/lessons-learned.md:
<<<
[paste]
>>>

Outcome / why this is bad:
[describe — e.g. "the visitor walked away frustrated" / "they were a
strong fit but got pushed to /qualify too early" / "the bot quoted a
price we don't actually offer"]

Please:
1. Diagnose root cause. Use one of the six categories from the lessons-
   learned format. Be honest about which one applies.
2. Propose the smallest possible fix that addresses it:
   - If KB gap: the new content to add to knowledge.md
   - If tone/style: the rule to add or change in concierge.ts
   - If scoring: the rule change for scoring.ts + concierge.ts
   - If honesty: the guardrail to add
   - If phase-arc: the arc rule to clarify
3. Write the new entry for lessons-learned.md using the format in the
   skill doc.
4. If a similar lesson is already in the log, just reference it and
   suggest tightening the existing rule rather than duplicating.
5. Tell me WHICH files to edit and exactly what to change.

If multiple root causes are tangled, name the primary one and note the
secondary causes but don't fix all of them at once — one issue per
lesson keeps the log readable.
```

## Output

- Root-cause diagnosis
- Specific file edits
- The new `lessons-learned.md` entry ready to append
- Verification criterion

## How the scheduled routine surfaces patterns

The daily routine doesn't just process individual transcripts — it
groups them. If three visitors in one day all asked about financing and
the bot's answers were vague, the routine doesn't write three lessons.
It writes one: "KB gap on financing options; the bot is improvising
across multiple conversations." That's the kind of pattern only the
aggregate view catches.

## Why this matters more than the others

A bot without `lessons-learned` is the same bot a year later. A bot
with `lessons-learned` accumulates institutional memory of every edge
case, every wrong answer, every misread tone. The log is the bot's
résumé.

When you (or your Claude Max) need to make a big change, the log is
the first thing to read — it tells you what's been tried, what worked,
what didn't, and what NOT to undo.
