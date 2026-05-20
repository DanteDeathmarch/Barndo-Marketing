---
name: refine-tone
description: Adjust the bot's voice (warmer, more direct, more expert, etc.) without breaking the four-phase conversation arc
---

# Refine Tone

The bot's voice lives in the **conversation rules** section of
`lib/concierge.ts` (the `CONCIERGE_SYSTEM` constant). This skill rewrites
just the rules — never touches the knowledge base or the phase arc.

## When to use it

- Visitors say the bot feels "too formal" / "too pushy" / "too generic"
- A high-value persona consistently disengages early
- You want to A/B test a tone shift before committing
- Your brand voice evolved and the bot is stuck in v1

## Inputs

1. The **current** `lib/concierge.ts` (paste it)
2. The **tone change** you want, in 1–2 sentences
3. Optional: an example sentence in the new voice ("say things more like THIS")

## Template

```
I'm refining the voice of my [BUSINESS] chatbot.

Current lib/concierge.ts:
<<<
[paste current concierge.ts]
>>>

Tone change I want:
[1–2 sentences — e.g. "warmer and less corporate; should feel like a
helpful friend who happens to know the industry, not a customer-service
rep"]

Voice exemplar (optional):
[paste 1–3 sentences in the new voice for grounding]

Please:
1. Return the FULL updated concierge.ts.
2. Modify ONLY the "Conversation rules" and tone-related sections.
3. Do NOT change the four-phase arc (open → discovery → vision → bridge).
4. Do NOT change the knowledge base or any factual content.
5. After the file, give me a one-paragraph summary of what changed and
   how it affects the bot's behavior.
```

## Output

A drop-in replacement for `lib/concierge.ts` + a change summary. Commit it.

## Safety guardrails

This skill never touches:
- The KB / `CONCIERGE_KNOWLEDGE`
- The phase arc structure (open → discovery → vision → bridge)
- Honesty rules (no invented prices, no claiming to be a builder, etc.)
- Scoring / qualifying rules

If you want to change those, use `update-kb` or `add-qualifying-rule`.
