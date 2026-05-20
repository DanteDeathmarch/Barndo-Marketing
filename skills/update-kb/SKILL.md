---
name: update-kb
description: Add to or change the bot's knowledge.md without breaking its tone, structure, or honesty rules
---

# Update Knowledge Base

The bot's knowledge lives in `lib/knowledge.md` (or `lib/concierge.ts` if
inlined). This skill lets your Claude Max regenerate the file with new or
changed information without losing what's working.

## When to use it

- You added a new service, product, region, or FAQ
- A policy changed (pricing, terms, financing, scheduling)
- The bot is answering something wrong, vague, or out of date
- You want to consolidate scattered notes into the KB

## Inputs

1. The **current** `knowledge.md` (paste it)
2. The **change** you want, in plain English (a paragraph is fine)
3. Optional: source notes (an SOP, an email, a transcript, a doc dump)

## Template

```
I'm updating the knowledge base for my [BUSINESS] chatbot.

Current knowledge.md:
<<<
[paste current knowledge.md]
>>>

The change I want:
[describe the change — what to add, edit, or remove, and why]

Source material (optional):
<<<
[paste any notes, SOPs, transcripts, or docs the update should incorporate]
>>>

Please:
1. Return the FULL updated knowledge.md ready to commit.
2. Keep section structure, headings, and conversational tone unchanged.
3. Never invent prices, lender names, or guarantees. Use ranges if needed
   and note "a [role] confirms after [event]" for specifics.
4. After the file, give me a brief change summary (3 bullets max) so I can
   write the commit message.
```

## Output

A drop-in replacement for `lib/knowledge.md` plus a 3-bullet change summary.
Commit it to your GitHub; your Vercel will auto-redeploy.

## Common mistakes the bot makes that this skill fixes

- The KB says "we offer X" but a builder/policy changed → outdated answer
- A new FAQ keeps coming up → bot is improvising → KB needs the answer baked in
- Two sections conflict (someone edited one but not the other) → bot picks one inconsistently
