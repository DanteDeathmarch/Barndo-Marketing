---
name: live-fire-test
description: Run the persona eval suite against the current bot config — catch regressions, surface failure modes, and propose targeted fixes
---

# Live-Fire Test

The bot is tested against a roster of synthetic visitor personas — good
customer, bad customer, qualified, unqualified, overqualified, rude,
highly qualified, time-waster tire-kicker, edge cases. Each persona is
played by a separate LLM call. A judge LLM scores every conversation
against a 6-criterion rubric. The runner adapts: if persona verdicts are
split, it doubles the test count until 3 consecutive rounds agree on the
failure mode.

The mechanics live in `scripts/evals/` — runner, personas, rubric. This
skill is the customer-facing wrapper.

## When to use it on demand

- You just committed a prompt change → run before pushing to confirm no
  regression
- Conversations look weird in production → suspect a tier of failures
- Onboarding a new install → establish a baseline score
- Quarterly check — even with no changes, the world changes

## When the scheduled routine runs it

Monthly, fully automated. Emails the owner the aggregate score, the
deltas vs. last month, and the top 3 failure modes with proposed
prompt edits.

## Inputs

The runner is self-contained — it pulls the current system prompt from
`lib/concierge.ts` and the persona library from `scripts/evals/personas.ts`.
No paste required for the scheduled version.

For on-demand use:

1. The persona ID (or "all") you want to test against
2. Iteration count (defaults: 1 if persona verdicts are clear; auto-doubles up to 8 if results are split)
3. Optional: a custom persona definition (one-off test of a specific edge case)

## Template (on-demand)

```
Run the live-fire test for my [BUSINESS] chatbot.

Personas to test:
[list IDs, or "all" for the full roster]

Iterations per persona:
[default 1 — runner will auto-double on split verdicts]

Configuration under test:

lib/concierge.ts:
<<<
[paste current concierge.ts]
>>>

Optional custom persona:
[paste a persona definition matching the format in scripts/evals/personas.ts]

Run the runner, judge each conversation, aggregate, and report:

# Live-Fire Test — [DATE]

## Aggregate vs last run
| Criterion | This run | Last run | Delta |

## Persona-level results
For each persona:
- Verdict pattern (e.g. "3/3 passed", "2/4 passed — failure mode: X")
- Sample failing transcript if any
- Suggested prompt edit (1 sentence per fix)

## Top 3 failure modes (ranked by impact)
- [pattern] — [proposed fix] — [estimated improvement]

## Recommendation
Either: "ship it" (overall > 4.2 across the board)
Or: "fix [item] before next deploy" (with the specific edit)
```

## Output

The same markdown report the runner writes today (see
`evals-reports/`), wrapped with the deltas-vs-last-run logic.

## Adaptive iteration logic

The runner doesn't always run N times per persona. It starts with 1 round.
If a persona's verdict is unanimous (judge gave the same overall score
within ±0.5), it stops. If split:

- Run a 2nd round
- If still split, double to 4
- Double again to 8 (cap)
- Once 3 consecutive rounds produce the same verdict, lock in that as
  the persona's "true" score and stop

This catches both stable wins and stable losses without burning tokens
on personas that are clearly working.

## Cost note

Typical run: 15 personas × 1–2 rounds = ~$1–3 in API. Worst-case adaptive
run hitting cap on 5 personas: ~$8. The routine config sets a hard cost
ceiling per run.

## Tie-in to lessons-learned

When the test surfaces a new failure mode, the routine automatically
opens a draft entry in `lib/lessons-learned.md` linking the failing
persona transcript to the proposed fix. The owner approves before commit.
