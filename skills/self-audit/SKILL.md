---
name: self-audit
description: Daily health check — webhook, conversation logging, anomaly detection, reporting pipeline. Outputs a green/yellow/red status card and an action list.
---

# Self Audit

Every morning, the bot audits itself. This skill defines what "healthy"
means and produces an actionable status card. It runs as both:

- An **on-demand** Skill (paste the template, get a one-time audit)
- A **scheduled routine** (see `routines/daily-audit.json`) that runs
  automatically on the customer's Anthropic account and emails the owner

## When to use it on demand

- A lead didn't show up where it should have
- The bot's been quiet for a stretch and you want to confirm it's still working
- Before a heavy marketing push (verify the funnel before turning on ad spend)
- After any change you committed (post-deploy sanity check)

## Inputs

1. Lead webhook URL
2. The last 24h of bot activity (transcript log file or a summary)
3. The reporting destination (CRM, Sheet, dashboard URL)
4. Recent commit log (so the auditor knows what changed)

## Template

```
Audit the [BUSINESS] chatbot. Today is [DATE].

System under audit:
- Vercel project: [project name + URL]
- Lead webhook: [URL]
- Reporting destination: [where leads should land]
- Last 24h activity log:
<<<
[paste recent transcripts OR a summary of conversation counts /
 conversion / errors]
>>>
- Recent commits (last 7 days):
<<<
[paste git log --oneline -10]
>>>

Run the standard audit:

A. WEBHOOK HEALTH
   - Send a test payload to the lead webhook. Did it return 2xx?
   - Latency under 2s?
   - Last 24h, did real leads reach the destination?

B. CONVERSATION LOGGING
   - Are conversations being stored where they should be?
   - Any blank / error transcripts in the last 24h?

C. ANOMALY DETECTION
   Compare today's metrics to the 7-day average. Flag if any are off
   by more than 40%:
   - Total conversations
   - Conversion rate (chat → qualified lead)
   - Tier-A lead count
   - Average conversation length
   - "Wrong-state" disqualifies (sanity check)

D. REPORTING PIPELINE
   - Are leads showing up in the customer's reporting tool?
   - Are the fields mapped correctly?
   - Is anything stuck or queued?

E. CHANGE-CORRELATION
   If anomalies exist, was there a commit in the last 24-72h that could
   explain it? Name the suspect commit if so.

Output format:

# Daily Audit — [DATE]

**Overall:** 🟢 Healthy / 🟡 Watch / 🔴 Action needed

## Webhook
- Status: ...
## Logging
- Status: ...
## Anomalies
- ... or "none detected"
## Reporting
- Status: ...
## Suspect commits
- ... or "n/a"

## Action items (ranked)
1. [most urgent action with explicit owner + deadline]
2. ...

End with one paragraph: "What you should know before you start your day."
```

## Output

A status card formatted as above + an action list. Easy to skim in 30 seconds.

## What the scheduled routine does differently

The cron version (see `routines/daily-audit.json`) runs at 6am customer
time and posts the same report into the customer's inbox (or Slack). It
calls the same webhook test, queries the same logs. The customer's only
job is reading the green/yellow/red header — if green, ignore; if not,
the action items are right there.
