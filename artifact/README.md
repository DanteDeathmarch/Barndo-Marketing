# Artifact Delivery

The customer-facing version of the install wizard, packaged as a single
React file that pastes directly into Claude.ai as a published artifact.

## Why this exists

Vercel-clicking is friction. Every step where the customer leaves the
Claude conversation to click through dashboards is a step where they
question whether they understand what they're getting.

The artifact model:
- Customer opens **one link** in their Claude.ai account
- Their Claude (Max subscription) does the AI work
- localStorage holds state — nothing touches our servers
- The artifact ends by handing the customer a single command to run,
  OR (when they have the right MCP connectors attached) by orchestrating
  the deploy autonomously

## How to ship it

1. Open Claude.ai → new conversation
2. Tell Claude "build me an artifact from this file" and paste
   [`install-wizard.tsx`](./install-wizard.tsx)
3. Claude.ai creates the artifact and gives you a shareable URL
4. Send the URL to the customer; they open it in their Claude

## What the artifact uses

| Capability | How |
|---|---|
| AI calls (brand analysis, KB restructuring, eval personas) | `window.claude.complete(prompt)` — uses the customer's Claude conversation context, no API key needed in the artifact |
| State persistence | `localStorage` — survives refresh/close in the customer's browser |
| External fetches (webhook test) | `fetch()` from the artifact directly (CORS permitting) or delegated to the customer's Claude |
| Deploy bundle download | `<a download>` with a blob URL — gives the customer the files to put in their fork |
| MCP-driven deploy (aspirational) | If the customer has Vercel + GitHub MCP connectors attached, the artifact prompts their Claude to use them. Falls back to the manual command if not. |

## Migration status

| Step | Status |
|---|---|
| 1. Account prep + bootstrap prompt | ✅ ported (no AI calls) |
| 2. Anthropic API key | ✅ ported (no AI calls — just stored in localStorage) |
| 3. Brand scan | 🔄 uses `window.claude.complete` to fetch+analyze customer's site |
| 4. Knowledge base restructure | 🔄 uses `window.claude.complete` to clean raw paste into markdown |
| 5. Qualifying + webhook test | 🔄 `fetch()` direct from artifact; CORS fallback delegates to Claude |
| 6. Deploy bundle | 🔄 generates downloadable ZIP + shell-command alternative |
| 7. Live-fire test | 🔄 uses `window.claude.complete` to simulate persona conversations |
| 8. Install + ongoing | ✅ ported (no AI calls) |

## Why we keep the Next.js version too

The Next.js wizard at `/install-wizard` stays as:
- A reference implementation we iterate on with full dev tooling
- A demo URL we can deploy publicly for prospects who want to see it before they commit to opening the artifact
- A fallback for customers without Claude Max subscriptions

The artifact is the **preferred** delivery path; the deployed page is the **fallback** path. Both stay in sync — when the wizard logic changes, both update.
