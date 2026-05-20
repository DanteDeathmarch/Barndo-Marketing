# Your own qualifying chatbot. On your stack. Forever.

A conversion concierge that lives on your website, qualifies visitors through
conversation (not forms), and routes hot leads into your CRM. You own every
piece of it — your data never touches us.

---

## What you get

A chat widget that drops onto your site with one `<script>` tag.

Behind it: a Claude Sonnet 4.6 bot configured to *your* voice, *your*
qualifying criteria, and *your* knowledge base. It runs a four-phase
discovery arc — opens with a question, draws out specifics one at a time,
reflects the visitor's situation back as a vision statement, then bridges
to your CTA (book / form / quote).

It's not generic. It speaks like you, knows what you sell, and knows what
a good lead looks like for *your* business.

---

## How you install it (about 20 minutes)

1. **Open the install artifact** in your Claude.ai account
2. **Answer 8 short steps** — your brand, voice, knowledge, qualifying signals, lead destination
3. **Deploy** — your Claude orchestrates the fork + Vercel deploy if you have the right MCP connectors, or you click through the standard Vercel import flow
4. **Verify** — three buttons in the artifact probe the live deployment to confirm it actually works
5. **Paste the script tag** on your site

You're live. The bot runs on **your** Vercel, calls **your** Anthropic API,
writes leads to **your** CRM. We have no servers in the loop.

---

## How it gets smarter (without you doing engineering)

Five scheduled routines run on your Anthropic account automatically:

- **Daily audit** — health check, anomaly detection, live conversation probe
- **Daily improvement** — clusters failed conversations, mines new test personas, proposes prompt fixes
- **Weekly research** — researches your niche, proposes new things the bot should know
- **Weekly A/B evaluator** — when you're testing a prompt change, recommends promote/revert based on real traffic
- **Monthly eval** — runs the 18-persona regression test, catches drift

All of them email **proposed changes** to you. None auto-edit your bot.
You approve every change by pasting the proposal into your Claude Max
with the matching skill template — the diff comes back ready to commit.

The bot's regression test grows with every real failure. After 90 days,
it's catching weird visitors no synthetic test could have invented.

---

## What it costs you

| Item | Cost | Where it lives |
|---|---|---|
| Vercel hosting | Free tier covers most builders | Your Vercel |
| Bot runtime | ~$0.01–0.05 per conversation | Your Anthropic API |
| 5 scheduled routines | ~$18–59/month | Your Anthropic API |
| Your maintenance time | ~15 min/week using Claude Max | You |

Nothing flows through us. Cancel us tomorrow — the bot keeps running.

---

## What makes this different

| Most chatbot products | This |
|---|---|
| Hosted by the vendor | Hosted by you |
| Your data on their servers | Your data on your servers |
| Locked in by infrastructure | Cancel anytime, keeps running |
| Generic prompt + your FAQ | Trained on your SOPs, transcripts, qualifying logic |
| Static — gets stale | Self-improves via scheduled routines on your account |
| Test in production | 18-persona eval suite + live probes run before you ship |
| Black box behavior | Every conversation, every fix, every score in your GitHub |

---

## What I deliver

- A published Claude.ai artifact (the install wizard) — your link to share
- The complete template repo on your GitHub
- Your first deploy verified end-to-end (smoke, voice match, E2E qualifying)
- A 30-minute handoff call walking through the maintenance loop with your Claude Max

After that, the bot is yours.

---

## Honest about fit

**This is right for you if:** you're comfortable with your team using Claude Max
to iterate on the bot weekly, you want the bot to keep getting smarter without
hiring an engineer, and data sovereignty matters to you.

**This is not right for you if:** you want a fully-hands-off "set and forget"
chatbot, or you don't have anyone on your team who'll use Claude Max regularly.
A simpler hosted chatbot product is a better fit in that case.

---

*Built for builders who want infrastructure they own — not subscriptions
that own them.*
