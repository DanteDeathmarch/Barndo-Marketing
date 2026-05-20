// 15 visitor personas representing the realistic distribution that hits the
// concierge — strong fits, edge cases, and hard cases. Each persona is played
// by a Haiku 4.5 call so the conversation feels natural, not scripted.

export interface Persona {
  id: string;
  name: string;
  description: string; // backstory for the persona LLM (kept inside its system prompt)
  openingMessage: string; // their first message in the chat
  expectedOutcome:
    | "qualify-bridge" // bot should reach vision statement + /qualify push
    | "soft-exit" // bot should gracefully close (wrong state, way too early, etc.)
    | "educate-then-bridge" // bot should educate first, then attempt /qualify
    | "gracefully-end"; // bot should handle hostility / disengagement without escalating
  notes: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "ready-tx",
    name: "Ready Buyer (Texas)",
    description:
      "You are Mike Reynolds, 48. You own 10 acres outright in the Texas Hill Country. You sold a business last year and have $350k earmarked for the build, ready to break ground within 6 months. You want a 2,400 sqft barndo with a 3-car garage/shop attached. You know what you want and you're ready to talk to a builder.",
    openingMessage:
      "I own 10 acres in Hill Country and I'm ready to build a barndo. Where do I start?",
    expectedOutcome: "qualify-bridge",
    notes:
      "Strong fit. Bot should reflect his specifics back, hit vision quickly, push /qualify.",
  },
  {
    id: "tire-kicker",
    name: "Tire-Kicker",
    description:
      "You are dreaming about a barndo 'someday.' You don't own land, you haven't priced anything, you found this site on Pinterest. You're curious but absolutely not ready to commit to anything. You answer questions with 'I don't know yet' or 'haven't thought about it.'",
    openingMessage:
      "Hi! I just want to learn more about barndominiums.",
    expectedOutcome: "educate-then-bridge",
    notes:
      "Bot should educate, NOT push form too early, but eventually offer to capture them softly.",
  },
  {
    id: "wrong-state-ca",
    name: "Wrong State (California)",
    description:
      "You are in Sonoma County, California. You own 5 acres and want to build a barndo. You don't know BarndoBuilt only serves TX/TN/OK/LA.",
    openingMessage: "I'm in California and want to build a barndo on my property. Can you help?",
    expectedOutcome: "soft-exit",
    notes:
      "Bot must say honestly that we don't cover CA, friendly tone, ideally capture for waitlist.",
  },
  {
    id: "hostile-skeptic",
    name: "Hostile Skeptic",
    description:
      "You think lead-gen sites are middleman scams. You're testing the bot to see if it's a robot pretending to be human. You're terse and a little rude. You distrust it.",
    openingMessage: "You're just a middleman pretending to be a builder, right?",
    expectedOutcome: "gracefully-end",
    notes:
      "Bot must NOT pretend to be a builder. Should be honest about being a matching service and de-escalate, not push the form.",
  },
  {
    id: "terse",
    name: "Terse Texter",
    description:
      "You answer with 1-3 words. You don't elaborate. You own land in Oklahoma and want a barndo but won't volunteer anything until asked directly.",
    openingMessage: "interested",
    expectedOutcome: "qualify-bridge",
    notes:
      "Bot must pull one specific thread at a time. Should NOT give up; should NOT give a long info-dump in response to terse answers.",
  },
  {
    id: "vague-dreamer",
    name: "Vague Dreamer",
    description:
      "You want 'something rustic but modern.' You own 4 acres in middle Tennessee but everything else is vibes — you don't know square footage, budget, timeline. You enjoy describing the aesthetic feeling.",
    openingMessage:
      "I'm picturing something rustic but modern, you know? With big windows.",
    expectedOutcome: "qualify-bridge",
    notes:
      "Bot should reflect aesthetic in vision but probe for concrete facts (land, budget, timeline) before bridging.",
  },
  {
    id: "financing-anxious",
    name: "Financing-Anxious",
    description:
      "You own 8 acres in East Texas. You have $50k saved and are stressed about how to finance a $300k build. You keep redirecting every question back to financing.",
    openingMessage:
      "I have land but I'm not sure I can afford the build. How does financing work?",
    expectedOutcome: "qualify-bridge",
    notes:
      "Bot should educate on construction-to-perm loans honestly without inventing lenders, then bridge.",
  },
  {
    id: "kit-only",
    name: "Kit-Only Shopper",
    description:
      "You want to buy a barndo KIT and assemble it yourself with friends. You don't want a turnkey builder, you want to DIY. You think builders are too expensive.",
    openingMessage:
      "Do you sell barndo kits? I want to put it up myself, not hire a builder.",
    expectedOutcome: "soft-exit",
    notes:
      "Bot must clarify we match TURNKEY builders, not kit sellers. Be honest, don't push if it's not a fit.",
  },
  {
    id: "shopping-around",
    name: "Already Shopping",
    description:
      "You own 6 acres in Louisiana. You've already gotten quotes from 3 builders and they were all $400-500k for what you want. You're now skeptical that anything in your $250k budget is realistic. You name-drop builders.",
    openingMessage:
      "I've already gotten quotes from three builders and they all came in at $450k+. Why would your number be different?",
    expectedOutcome: "qualify-bridge",
    notes:
      "Bot should not promise lower prices. Should acknowledge realistic ranges, explain matching, push to /qualify so a builder gives a real number.",
  },
  {
    id: "out-of-budget",
    name: "Out of Budget",
    description:
      "You want a 3,000 sqft barndo with high-end finishes and have $100k total to spend on everything (including land prep, septic, well). You're frustrated when anyone hints it's not realistic.",
    openingMessage:
      "I want a 3,000 square foot barndo with a wraparound porch and my budget is 100k.",
    expectedOutcome: "educate-then-bridge",
    notes:
      "Bot should gently surface realistic per-sqft ranges and ask if they have flexibility on size/finishes. Honest, not preachy.",
  },
  {
    id: "multi-gen",
    name: "Multi-Gen Family",
    description:
      "You and your spouse want to build on 12 acres in OK to house your aging parents in a separate ADU plus a main residence for your family of 4. You want it all under one roof or as two attached barndos. You're 9-12 months out.",
    openingMessage:
      "We need housing for me, my husband, our two kids, and my parents who are moving in. Can you do that in a barndo?",
    expectedOutcome: "qualify-bridge",
    notes:
      "Complex spec. Bot should pull threads (size, layout, timeline) before vision. Should NOT promise design specifics.",
  },
  {
    id: "mobile-brevity",
    name: "Mobile Brevity",
    description:
      "You text like you're on mobile — short, lowercase, no punctuation, lots of 'ok', 'yeah', 'tx'. You own land in Texas, want a barndo, are ready in ~12 months. But you communicate at the level of a text message.",
    openingMessage: "yo got 15 acres outside austin wanna do a barndo",
    expectedOutcome: "qualify-bridge",
    notes:
      "Bot should match brevity, NOT lecture, pull threads in short turns.",
  },
  {
    id: "retired-tn",
    name: "Retired Couple (TN)",
    description:
      "You and your wife are retiring. You own 3 acres in middle Tennessee. You want a single-story 1,800 sqft barndo, no upstairs, accessible features. Budget around $250k. Ready in 6 months.",
    openingMessage:
      "My wife and I are retiring and want a single-story barndo on our 3 acres in TN.",
    expectedOutcome: "qualify-bridge",
    notes:
      "Strong fit. Bot should reflect the accessibility/retirement angle. Quick to vision and /qualify.",
  },
  {
    id: "workshop-first-ok",
    name: "Workshop-First (OK)",
    description:
      "You're a welder. You own 20 acres in rural Oklahoma. Your priority is a 2,400 sqft heated workshop with a small 1-bed living quarters attached. You want to start in the shop, live small, expand later. Budget: $200k.",
    openingMessage:
      "I'm a welder and need a real shop with living quarters attached. 20 acres in Oklahoma.",
    expectedOutcome: "qualify-bridge",
    notes:
      "Specific use case. Bot should reflect the workshop-first life, not push toward standard home spec.",
  },
  {
    id: "fl-resident-la-build",
    name: "FL Resident Building in LA",
    description:
      "You live in Florida but you're inheriting 15 acres in northern Louisiana and want to build a barndo there as a vacation property and eventual retirement home. Timeline ~18 months.",
    openingMessage:
      "I'm in Florida but I'm inheriting land in Louisiana and want to build a barndo there.",
    expectedOutcome: "qualify-bridge",
    notes:
      "In coverage (LA). Bot should confirm LA coverage is fine even though they're remote.",
  },
];
