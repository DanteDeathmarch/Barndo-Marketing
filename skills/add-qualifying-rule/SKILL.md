---
name: add-qualifying-rule
description: Add or change lead-scoring criteria, disqualifying signals, or branch logic without breaking existing scoring
---

# Add Qualifying Rule

The bot's qualifying logic lives in two places:
- The scoring rubric inside `lib/concierge.ts` (the bot reads this when
  deciding when to bridge to the form)
- The actual scoring math in `lib/scoring.ts` (server-side, runs on
  every lead submission)

This skill keeps the two in sync.

## When to use it

- You learned a new "great lead" signal (e.g. "ready in 60 days = +20")
- A persona is sneaking through that shouldn't (need a disqualifier)
- Your tier thresholds are off (too many B-tier; raise the bar)
- A new product line / region / vertical changes what qualifies

## Inputs

1. The **current** `lib/concierge.ts` AND `lib/scoring.ts` (paste both)
2. The **rule** you want to add or change (plain English)
3. Optional: a transcript example showing the signal you want to capture

## Template

```
I'm adding/changing a qualifying rule for my [BUSINESS] chatbot.

Current lib/concierge.ts:
<<<
[paste]
>>>

Current lib/scoring.ts:
<<<
[paste]
>>>

The rule I want:
[describe — what signal, how much weight, qualifying or disqualifying,
and what behavior change you want in the bot]

Example conversation (optional):
[paste a transcript showing the kind of visitor this rule should catch]

Please:
1. Return BOTH updated files.
2. Add the rule to the scoring rubric IN THE SYSTEM PROMPT so the bot
   knows about it during conversation (visible in lib/concierge.ts).
3. Add the matching scoring change to lib/scoring.ts so server-side
   tiering reflects it.
4. Keep all existing rules unless I asked you to change them.
5. After both files, give me:
   - A 3-bullet summary of what changed
   - Two example leads (one that would be affected, one that wouldn't)
     showing how scoring shifts
```

## Output

Two updated files + a summary + worked examples. Commit both files together.

## Tradeoffs to think about before adding a rule

- **Tighter qualification = fewer leads, higher conversion.** Be honest
  with yourself about which direction your funnel needs.
- **Stacking too many rules = brittle scoring.** If the bot has 12+
  weighted signals, the scoring becomes opaque. Keep to ~8 core signals.
- **Negative signals are easier to test.** A new disqualifier is lower
  risk than a new positive weight; if it's wrong, you only lose leads
  you wouldn't have closed anyway.
