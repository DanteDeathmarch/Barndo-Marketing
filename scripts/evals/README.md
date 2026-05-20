# Conversation Evals

Eval-driven prompt engineering for the BarndoBuilt Concierge chatbot.

## What this does

For each persona in `personas.ts`:
1. A synthetic visitor (Haiku 4.5) opens a chat with the concierge.
2. The concierge (Sonnet 4.6, our production system prompt from `lib/concierge.ts`) replies.
3. Visitor reacts in character, bot replies, repeating until either the bot
   bridges to `/qualify`, the visitor disengages, or 10 turns are hit.
4. A judge (Sonnet 4.6) scores the conversation against the rubric in
   `rubric.ts` and proposes one concrete prompt edit if there's a recurring issue.

Output: a dated markdown report in `/evals-reports/` with aggregate scores,
deduped suggested edits, and the full transcript of every conversation.

## Run it

```
# 1. Put a real key in .env.local
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> .env.local

# 2. Run
npm run evals
```

Cost per full run with 15 personas: roughly **$1–3** in API spend, takes
~5–10 minutes. Cheap enough to run after every prompt edit.

## Iteration loop

1. Run evals → read the report → note the suggested prompt edits and lowest-scoring criteria.
2. Edit `lib/concierge.ts`.
3. Re-run. Compare aggregate scores against the previous run.
4. Stop when overall score stabilizes at the target (aim ≥ 4.2/5 across all criteria).

## Personas

15 personas covering the realistic distribution:

| Group | Personas |
|---|---|
| Strong fits | `ready-tx`, `retired-tn`, `workshop-first-ok`, `fl-resident-la-build` |
| Discovery work needed | `vague-dreamer`, `financing-anxious`, `multi-gen`, `shopping-around` |
| Style edge cases | `terse`, `mobile-brevity` |
| Should be filtered politely | `wrong-state-ca`, `kit-only`, `out-of-budget` |
| Should be educated, not pushed | `tire-kicker` |
| Should be de-escalated | `hostile-skeptic` |

Add more personas in `personas.ts` as you learn what's tripping up the bot
in production.

## Rubric

Six criteria, each scored 1–5 by the judge:
- **Brevity** — bot turns are 1–3 sentences
- **One focused question** — never two stacked, never a menu
- **Listens & reflects** — uses visitor's specific words back
- **Phase arc** — open → discovery → vision → bridge, paced to the persona
- **Honesty** — no invented prices, lenders, builders, or guarantees
- **Outcome** — landed in the right place for THIS persona

See `rubric.ts` for the full definitions.

## Files

- `personas.ts` — visitor library
- `rubric.ts` — scoring criteria + judge system prompt
- `run.ts` — runner
- `/evals-reports/` — dated markdown reports (gitignored; commit specific snapshots manually if you want to track regression)
