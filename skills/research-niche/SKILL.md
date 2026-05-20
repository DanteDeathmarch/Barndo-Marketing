---
name: research-niche
description: Weekly research pass on the bot's niche — competitors, news, changing customer questions — that proposes KB additions with sources
---

# Research Niche

The bot is only as smart as the world it knows about. This skill runs a
weekly research pass against the bot's niche and proposes KB additions
the owner can approve before they go live.

Runs as both:
- An **on-demand** Skill (paste current state, get a research dump)
- A **scheduled routine** (`routines/weekly-research.json`) that fires
  every Monday and emails the owner

## When to use it on demand

- You're entering a new geographic market or vertical
- A regulation or policy change is in the news
- A new competitor launched and you want to know what's different
- The bot is getting questions you don't have good KB answers for

## Inputs

1. The bot's **positioning** (a sentence — what it does, for whom, where)
2. The current `lib/knowledge.md`
3. Optional: a list of competitors or sources to start from
4. The recent "questions the bot couldn't answer well" list (from the
   audit or lessons-learned routine)

## Template

```
Run a weekly research pass for the [BUSINESS] chatbot.

Positioning:
[1 sentence — what we do, for whom, where]

Current knowledge.md:
<<<
[paste]
>>>

Known competitors / sources (optional):
[list — domains, brand names, news outlets we trust]

Recent unanswered questions (optional):
[paste anything the bot has been weak on lately]

Research scope for this pass:

1. **Niche news** — anything in the last 7 days the bot should know
   about (regulation changes, market moves, viral trends in the niche).
2. **Competitor changes** — new offerings, pricing changes, positioning
   shifts at the named competitors (and any new entrants we should
   know about).
3. **Question evolution** — what are people now asking about this niche
   that they weren't 6 months ago? (Reddit, forums, search trends if
   visible.)
4. **KB gaps** — based on the unanswered questions list, what facts is
   the bot missing?

Output format:

# Research — Week of [DATE RANGE]

## TL;DR (3 bullets max)
- ...

## News / changes worth knowing
- [item] — [why it matters to our bot] — [source URL]

## Competitor activity
- [competitor] — [what changed] — [implications for our positioning]

## New questions our visitors are likely to ask
- [question] — [why it's emerging now]

## Proposed KB additions
For each: the text to add (a paragraph), and which section of
knowledge.md it should go into.

## What NOT to add
Things that look interesting but are outside scope or unverified.
Important to keep the KB tight.

Cite sources for every claim. Use ranges, not absolutes, when summarizing
prices or stats from third parties.
```

## Output

A weekly research brief with sourced findings + proposed KB additions
the owner approves before committing.

## Approval gate (important)

The routine NEVER auto-commits research findings to the KB. The owner
reads the brief, picks which items to add, and uses the `update-kb`
skill (or just edits manually) to commit the changes. This prevents the
bot from drifting on bad sources or hallucinated facts.

## Cost note

Research with web search burns more tokens than the other skills.
Expect roughly $1–3 per weekly run depending on how much context the
bot needs (KB size, number of competitors tracked). Cap research depth
in the routine config if cost matters.
