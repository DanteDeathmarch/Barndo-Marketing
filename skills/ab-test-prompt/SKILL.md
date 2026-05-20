---
name: ab-test-prompt
description: Manage A/B testing of the bot's system prompt — set up a candidate (variant B), compare it to production (variant A) on both real-traffic conversion and the eval suite, and propose a promotion or rollback when the data is in
---

# A/B Test Prompt

Tests prompt changes against production safely. Variant A stays untouched
and runs for 50% of visitors. Variant B is the candidate change and runs
for the other 50%. After enough data, the system proposes which one wins.

This is the **only** safe way to make non-trivial prompt changes in
production. Untested edits to a working prompt cost you conversions you
can't see.

## When to use it

- You have a hypothesis: "the bot should bridge to /qualify earlier"
- A lessons-learned cluster pointed at a system-prompt weakness
- The monthly eval surfaced a recurring failure mode
- You're curious whether a tone change converts better

## When NOT to use it

- Pure bug fixes (e.g. the bot invented a price → just fix it on A)
- KB-only changes (use `update-kb`, no need to A/B test facts)
- Anything urgent (A/B testing takes 1–4 weeks of real traffic)

## Three phases

### Phase 1 — Set up the candidate

```
I want to A/B test a change to my [BUSINESS] chatbot.

Hypothesis:
[1 sentence — "if we do X, then conversion to /qualify should increase
because Y"]

Current lib/concierge.ts (with CONCIERGE_SYSTEM_A and _B both equal):
<<<
[paste]
>>>

The specific change to test in variant B:
[describe in plain English — what should B do differently from A]

Please:
1. Return updated lib/concierge.ts with CONCIERGE_SYSTEM_B modified to
   reflect the hypothesis. Keep A untouched.
2. The change to B should be the SMALLEST POSSIBLE edit that tests the
   hypothesis. Not three changes — one.
3. After the file, give me:
   - A one-paragraph summary of what's different in B
   - The metric to watch (conversion rate / Tier-A rate / persona X
     pass rate / etc.)
   - The minimum sample size needed for the data to be trustworthy
     (use 200 conversations per variant as a default if you don't
     have a domain reason to pick a different number)
```

### Phase 2 — Run the eval suite on both

After deploying the variant change but before waiting for real traffic,
sanity-check that B doesn't regress on the eval suite:

```
npm run evals -- --variant=both
```

The report includes side-by-side A vs B scores and a recommendation. If
B regresses meaningfully on eval (Δ ≥ −0.2 on overall), STOP — don't
ship the experiment to real traffic, refine B first.

### Phase 3 — Decide based on real traffic

Run weekly during the experiment (see `routines/weekly-ab-evaluator.json`
for the automated version). Or run on demand:

```
I'm reviewing the A/B test for my [BUSINESS] chatbot.

Variant A conversation count last [N] days: [count]
Variant B conversation count last [N] days: [count]

Variant A conversion to qualified lead: [rate or count]
Variant B conversion to qualified lead: [rate or count]

[Optional: other metrics — Tier-A rate, average score, drop-off step]

Recent eval scores:
- Variant A overall: [score]
- Variant B overall: [score]

Please:
1. Compute statistical significance (chi-square or two-proportion z-test
   if you have raw counts; rough back-of-envelope is fine for small
   samples).
2. Note if either variant is suspiciously off (e.g. B has half the
   conversations of A → routing problem, not a real result).
3. Recommend ONE of:
   - PROMOTE B (B is meaningfully better) — give me the file edit to
     copy B's content into A's slot
   - REVERT B (A is meaningfully better, or B regressed) — give me the
     file edit to reset CONCIERGE_SYSTEM_B = CONCIERGE_SYSTEM_A
   - CONTINUE (not enough data yet) — tell me how many more
     conversations until a decision is possible
   - INCONCLUSIVE (variants are tied within noise) — recommend reverting
     B and trying a different hypothesis
4. If promoting, write the new lessons-learned.md entry describing what
   was tested, the result, and the metric.
```

## Promotion workflow (when B wins)

1. Run the Phase 3 prompt → get the file edit
2. Copy B's content into A
3. Reset B = A (so the next experiment starts from the new baseline)
4. Commit with message: "Promote A/B test: [hypothesis]" + the lessons-learned entry
5. Run the full eval suite one more time on A to baseline
6. Wait until you have a new hypothesis before touching B again

## What the weekly routine does

`routines/weekly-ab-evaluator.json` runs this skill every Monday on the
customer's Anthropic account. It pulls conversation counts and outcomes
from the lead pipeline, computes the metrics, runs the recommendation,
and emails the owner — but never auto-promotes. The owner still does
the file edit + commit, with the matching Claude Max template.

## Common A/B testing mistakes this skill prevents

- **Calling a winner with 30 conversations** (noise). Force minimum sample sizes.
- **Multiple simultaneous experiments** that contaminate each other. One change at a time in B.
- **Promoting without rolling back the cookie**. Reset B = A after promotion so 100% of new traffic goes to the new baseline.
- **Eval regression hidden by traffic noise.** The pre-flight eval catches "B is meaningfully worse on personas" even before real traffic arrives.
