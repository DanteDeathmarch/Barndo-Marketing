# Lessons Learned

This is the bot's institutional memory. Every time the bot got something
wrong, the root cause and the fix gets recorded here. Over time this
becomes the most valuable document in the repo — it tells the next
maintainer (you, your Claude Max, or a future engineer) what's been
tried, what worked, what didn't, and what NOT to undo.

## How to add an entry

Use the `lessons-learned` skill (see `/skills/lessons-learned/SKILL.md`).
The skill formats entries correctly and writes them here.

Manual entries also welcome — just follow the format below.

## Entry format

```markdown
## [YYYY-MM-DD] — [short title]

**What happened:** 1–2 sentences. Specific. Include conversation ID
if available.

**Root cause:** One of: KB gap · KB conflict · Tone/style failure ·
Scoring failure · Honesty failure · Phase-arc failure.

**Fix applied:** What was changed and where (commit hash if available).

**Verification:** How we'll know the fix worked.

---
```

## Reading order

Newest entries go at the top. Skim the top 5 before making any major
change to the system prompt or KB — they're the most recent failure
modes and you don't want to reintroduce something we already fixed.

---

## Entries

_No entries yet. The first one will land the first time the bot gets
something wrong and you run the `lessons-learned` skill on the
transcript. This is good. This is how the bot grows up._
