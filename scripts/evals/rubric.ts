// Scoring rubric the judge applies to every finished conversation.

export const RUBRIC_CRITERIA = [
  {
    key: "brevity",
    label: "Brevity",
    description:
      "Every bot turn is roughly 1–3 sentences. Long paragraphs are a fail even if the content is good.",
  },
  {
    key: "one_question",
    label: "One focused question per turn",
    description:
      "Each bot turn ends with at most one focused question (never multi-choice menus, never two stacked questions). Exception: vision-statement turn and bridge turn intentionally omit the question.",
  },
  {
    key: "listens",
    label: "Listens and reflects",
    description:
      "Bot uses the visitor's specific words/details back to them. They feel heard, not interrogated.",
  },
  {
    key: "phase_arc",
    label: "Follows the discovery → vision → bridge arc",
    description:
      "Bot moves through phases appropriately for THIS persona. Strong fits should reach vision + /qualify bridge by turn 6–8. Bad-fits should be handled gracefully without forcing the form. Tire-kickers should be educated then gently invited.",
  },
  {
    key: "honesty",
    label: "No invented facts",
    description:
      "Bot never invents prices, builders, lender names, or guarantees. Uses ranges and says a builder confirms after a site visit. Never claims to be a builder.",
  },
  {
    key: "outcome",
    label: "Appropriate outcome for the persona",
    description:
      "The conversation ends in the right place for this specific persona's expected outcome (qualify-bridge / soft-exit / educate-then-bridge / gracefully-end).",
  },
] as const;

export type RubricKey = (typeof RUBRIC_CRITERIA)[number]["key"];

export interface JudgeScore {
  brevity: number; // 1-5
  one_question: number;
  listens: number;
  phase_arc: number;
  honesty: number;
  outcome: number;
  overall: number; // 1-5 weighted
  key_issues: string[]; // 1-3 specific issues with quotes
  suggested_prompt_edit: string; // one concrete edit to lib/concierge.ts if there's a recurring problem
}

export function buildJudgeSystemPrompt(): string {
  const criteria = RUBRIC_CRITERIA.map(
    (c, i) => `${i + 1}. **${c.label}** (${c.key}): ${c.description}`
  ).join("\n");

  return `
You are evaluating a chatbot conversation. The chatbot is the BarndoBuilt
Concierge — a discovery-led intake bot for a barndominium lead-matching
service. It is supposed to follow a four-phase arc: open → discovery (one
focused question per turn, reflect visitor's words) → vision statement →
bridge to a 90-second qualification form.

You will be given the conversation transcript and the persona profile that
defined how the synthetic visitor behaved.

Score each criterion from 1 (terrible) to 5 (excellent):

${criteria}

Then return STRICT JSON only — no preamble, no markdown fences. Shape:

{
  "brevity": <1-5>,
  "one_question": <1-5>,
  "listens": <1-5>,
  "phase_arc": <1-5>,
  "honesty": <1-5>,
  "outcome": <1-5>,
  "overall": <1-5>,
  "key_issues": ["<specific issue 1, quote if useful>", "..."],
  "suggested_prompt_edit": "<one concrete edit to the bot's system prompt that would address the biggest issue, or empty string if the conversation was fine>"
}
`.trim();
}
