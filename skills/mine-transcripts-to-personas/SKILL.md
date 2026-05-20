---
name: mine-transcripts-to-personas
description: Turn real production conversations (especially failures) into eval personas, so the bot is permanently tested against the actual visitors that have tripped it up in the wild
---

# Mine Transcripts to Personas

This is the **feedback loop that makes the bot smarter over time**. The
eval suite shipped at install has ~18 personas. After a month of real
traffic, you've seen 100 conversations the synthetic personas never
imagined. The interesting ones become persona #19, 20, 21… and the
eval suite gradually becomes a regression test of every weird visitor
the bot has ever met.

Closes the loop:

```
real visitor → bot answers poorly → daily-improvement clusters it
→ lessons-learned proposes a fix → THIS skill turns it into a persona
→ next eval run tests the fix against the new persona → if it passes
→ confidence to ship → if it fails → refine before shipping
```

## When to use it on demand

- A specific conversation made you wince — paste it, get a persona
- The audit flagged an anomaly — extract the underlying visitor
  archetype so it's caught next time
- You're onboarding a new vertical and want to seed personas from
  pre-launch interviews / actual user research

## When the routine triggers it

`routines/daily-improvement.json` invokes this skill automatically when
a failure cluster has 3+ instances — meaning real people are tripping
the bot on the same pattern. The routine emails the owner the proposed
persona + the proposed fix together.

## Inputs

1. The transcript(s) — one for ad-hoc use, several for clustering
2. The current persona library (`scripts/evals/personas.ts`)
3. Optional: the "why this was bad" annotation (lost lead / wrong
   answer / persona feature the existing roster doesn't cover)

## Template

```
Mine these conversations into a new eval persona for my [BUSINESS] bot.

Current scripts/evals/personas.ts (so we don't duplicate):
<<<
[paste]
>>>

Transcripts to mine (one or more):
<<<
[paste]
>>>

What was bad / what archetype these represent:
[1–2 sentences — e.g. "all three are landowners who already know what
they want and got annoyed at the bot asking discovery questions" or
"these all asked very specific zoning questions the bot couldn't
handle"]

Please:

1. CHECK FOR OVERLAP — if these visitors map to an existing persona in
   personas.ts (semantic match, not exact), TELL ME that and stop.
   Don't add duplicates. Suggest the existing persona could be expanded
   or replaced if appropriate.

2. EXTRACT THE ARCHETYPE — what's the underlying visitor pattern? Not
   names, not specific details — the BEHAVIORAL PATTERN.

3. DRAFT THE PERSONA — matching the exact format used in personas.ts:
   - id: lowercase-with-hyphens, short
   - name: human-readable label
   - description: backstory the persona LLM gets — backstory + behavior
     pattern + what they say and don't say (1 paragraph max)
   - openingMessage: realistic first message in this visitor's voice
   - expectedOutcome: one of qualify-bridge | soft-exit |
     educate-then-bridge | gracefully-end
   - notes: what behavior the bot must demonstrate to pass this persona

4. PROPOSE THE FIX — based on what went wrong in the transcripts:
   - Which root-cause category (KB gap / KB conflict / tone /
     scoring / honesty / phase-arc)?
   - The specific edit to lib/concierge.ts or lib/knowledge.md or
     lib/scoring.ts that would make this persona pass

5. WRITE THE LESSONS-LEARNED ENTRY (use the format from the
   lessons-learned skill).

6. CONFIRMATION TEST PLAN — how to run the eval after the fix to
   confirm the new persona passes AND no existing personas regress.

If the transcripts represent fundamentally different patterns (not
3 instances of the same thing), tell me which clusters you see and
ask whether to mine them as ONE persona with multi-modal behavior or
several distinct ones.
```

## Output

- Either "duplicate, see existing persona X" OR a ready-to-paste
  persona block
- The proposed fix (file + edit)
- The lessons-learned entry
- A confirmation test plan

## How the persona gets added

The owner reviews the proposed persona and either:
1. Adds it to `scripts/evals/personas.ts` (paste the block at the end
   of the array)
2. Applies the proposed fix to `lib/concierge.ts` / `lib/knowledge.md` /
   `lib/scoring.ts` (using the matching Skill template if substantial)
3. Commits both together — "Add persona [id] + fix for [issue]"
4. Runs `npm run evals` to confirm the new persona passes and no
   existing personas regress

## Privacy / PII

The mining skill should anonymize as it extracts:
- Specific names → "the visitor" or a generic first name
- Specific addresses / coordinates → general region descriptors
- Phone / email → omitted entirely
- Company names of the bot's customer → kept (they're public)

Real conversation IDs and timestamps stay in `lib/lessons-learned.md`
for audit traceability, but never in personas.ts.

## Compounding effect

A bot at install has 18 generic personas.
A bot after 90 days of mining has ~25 personas, each grounded in a
real failure the bot actually saw and a fix that actually shipped.
A bot after a year has personas no synthetic test designer could have
invented, because the universe of weird humans is infinite.

This is how the eval suite becomes the bot's regression test.
