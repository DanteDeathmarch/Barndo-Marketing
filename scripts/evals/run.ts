// Conversation eval harness.
//
// For each persona:
//   1. Run a multi-turn conversation between the BarndoBuilt concierge
//      (Sonnet 4.6, production system prompt) and the persona (Haiku 4.5,
//      synthetic visitor).
//   2. Stop when the bot bridges to /qualify, the persona disengages, or
//      we hit MAX_TURNS.
//   3. Pass the transcript + persona to a judge (Sonnet 4.6) and collect
//      rubric scores + a suggested prompt edit.
//   4. Write everything to a dated markdown report.
//
// Run:   npm run evals
// Cost:  ~$1–3 per full run (15 personas).

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONCIERGE_SYSTEM } from "../../lib/concierge.ts";
import { PERSONAS, type Persona } from "./personas.ts";
import { buildJudgeSystemPrompt, type JudgeScore } from "./rubric.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "..", "evals-reports");

const BOT_MODEL = "claude-sonnet-4-6";
const PERSONA_MODEL = "claude-haiku-4-5";
const JUDGE_MODEL = "claude-sonnet-4-6";

const MAX_TURNS = 10;

interface Turn {
  role: "persona" | "bot";
  content: string;
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error(
    "ANTHROPIC_API_KEY is not set. Add it to .env.local or your shell env."
  );
  process.exit(1);
}

const client = new Anthropic();

async function botTurn(transcript: Turn[]): Promise<string> {
  const messages = transcript.map((t) => ({
    role: t.role === "persona" ? "user" : ("assistant" as const),
    content: t.content,
  })) as Anthropic.MessageParam[];

  const res = await client.messages.create({
    model: BOT_MODEL,
    max_tokens: 700,
    system: [
      {
        type: "text",
        text: CONCIERGE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text : "";
}

async function personaTurn(
  persona: Persona,
  transcript: Turn[]
): Promise<string> {
  // From the persona LLM's point of view, IT is the assistant (the visitor)
  // and the BOT'S messages are "user" turns. Inversion is intentional.
  const messages = transcript.map((t) => ({
    role: t.role === "bot" ? "user" : ("assistant" as const),
    content: t.content,
  })) as Anthropic.MessageParam[];

  const system = `
You are a synthetic website visitor testing a chatbot. Stay completely in
character — do not break character, do not offer to help, do not say you are
an AI. You are the VISITOR; the other side is the chatbot.

Respond in 1–2 short sentences, the way a real person would type into a chat
widget. Be natural, not theatrical. If the bot satisfies your need and you'd
move on, you can say something like "thanks, I'll fill out the form" or
"sounds good." If you're done or annoyed, you can disengage briefly.

Your persona for this conversation:

${persona.description}

Reply ONLY with your next chat message. No quotes, no narration, no labels.
`.trim();

  const res = await client.messages.create({
    model: PERSONA_MODEL,
    max_tokens: 200,
    system,
    messages,
  });

  const text = res.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text.trim() : "";
}

function isTerminal(botText: string, personaText: string): boolean {
  const bot = botText.toLowerCase();
  const persona = personaText.toLowerCase();
  if (bot.includes("/qualify")) return true;
  if (
    /\b(thanks|thank you|bye|goodbye|talk later|i'?ll think|maybe later)\b/.test(
      persona
    )
  ) {
    return true;
  }
  return false;
}

async function runConversation(persona: Persona): Promise<Turn[]> {
  const transcript: Turn[] = [
    { role: "persona", content: persona.openingMessage },
  ];

  for (let i = 0; i < MAX_TURNS; i++) {
    const bot = await botTurn(transcript);
    transcript.push({ role: "bot", content: bot });

    // Maybe the bot already bridged
    if (isTerminal(bot, "")) break;
    if (i === MAX_TURNS - 1) break;

    const personaMsg = await personaTurn(persona, transcript);
    transcript.push({ role: "persona", content: personaMsg });

    if (isTerminal(bot, personaMsg)) break;
  }

  return transcript;
}

async function judge(persona: Persona, transcript: Turn[]): Promise<JudgeScore> {
  const transcriptText = transcript
    .map(
      (t) =>
        `${t.role === "persona" ? "VISITOR" : "BOT"}: ${t.content}`
    )
    .join("\n\n");

  const user = `
## Persona
- Name: ${persona.name}
- Description: ${persona.description}
- Expected outcome: ${persona.expectedOutcome}
- Notes for evaluator: ${persona.notes}

## Transcript

${transcriptText}

Score and return JSON only.
`.trim();

  const res = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 800,
    system: buildJudgeSystemPrompt(),
    messages: [{ role: "user", content: user }],
  });

  const text = res.content.find((b) => b.type === "text");
  const raw = text && text.type === "text" ? text.text : "";

  // Strip any accidental fences and parse
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned) as JudgeScore;
  } catch {
    return {
      brevity: 0,
      one_question: 0,
      listens: 0,
      phase_arc: 0,
      honesty: 0,
      outcome: 0,
      overall: 0,
      key_issues: [`Judge failed to return parseable JSON. Raw: ${raw.slice(0, 200)}`],
      suggested_prompt_edit: "",
    };
  }
}

function fmtTranscript(transcript: Turn[]): string {
  return transcript
    .map(
      (t) =>
        `**${t.role === "persona" ? "Visitor" : "Bot"}:** ${t.content}`
    )
    .join("\n\n");
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function main() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = path.join(REPORTS_DIR, `eval-${stamp}.md`);

  console.log(`Running evals — ${PERSONAS.length} personas, max ${MAX_TURNS} turns each.`);
  console.log(`Bot=${BOT_MODEL}  Persona=${PERSONA_MODEL}  Judge=${JUDGE_MODEL}\n`);

  const results: { persona: Persona; transcript: Turn[]; score: JudgeScore }[] =
    [];

  for (const persona of PERSONAS) {
    process.stdout.write(`▶ ${persona.id.padEnd(22)} `);
    try {
      const transcript = await runConversation(persona);
      const score = await judge(persona, transcript);
      results.push({ persona, transcript, score });
      console.log(`overall=${score.overall}  turns=${transcript.length}`);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Aggregate
  const overall = avg(results.map((r) => r.score.overall));
  const byCriterion = {
    brevity: avg(results.map((r) => r.score.brevity)),
    one_question: avg(results.map((r) => r.score.one_question)),
    listens: avg(results.map((r) => r.score.listens)),
    phase_arc: avg(results.map((r) => r.score.phase_arc)),
    honesty: avg(results.map((r) => r.score.honesty)),
    outcome: avg(results.map((r) => r.score.outcome)),
  };

  const edits = results
    .map((r) => r.score.suggested_prompt_edit)
    .filter((e) => e && e.trim().length > 0);

  // Build markdown
  const lines: string[] = [];
  lines.push(`# BarndoBuilt Concierge Eval — ${stamp}`);
  lines.push("");
  lines.push(`Personas: ${PERSONAS.length}  ·  Bot: \`${BOT_MODEL}\`  ·  Persona: \`${PERSONA_MODEL}\`  ·  Judge: \`${JUDGE_MODEL}\``);
  lines.push("");
  lines.push(`## Aggregate scores`);
  lines.push("");
  lines.push(`| Criterion | Avg (1–5) |`);
  lines.push(`|---|---|`);
  lines.push(`| **Overall** | **${overall.toFixed(2)}** |`);
  lines.push(`| Brevity | ${byCriterion.brevity.toFixed(2)} |`);
  lines.push(`| One focused question | ${byCriterion.one_question.toFixed(2)} |`);
  lines.push(`| Listens & reflects | ${byCriterion.listens.toFixed(2)} |`);
  lines.push(`| Phase arc | ${byCriterion.phase_arc.toFixed(2)} |`);
  lines.push(`| Honesty | ${byCriterion.honesty.toFixed(2)} |`);
  lines.push(`| Outcome | ${byCriterion.outcome.toFixed(2)} |`);
  lines.push("");
  lines.push(`## Suggested prompt edits (deduped)`);
  lines.push("");
  if (edits.length === 0) {
    lines.push("_None — judge had no consolidated edits to suggest._");
  } else {
    const seen = new Set<string>();
    for (const e of edits) {
      const key = e.toLowerCase().slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`- ${e}`);
    }
  }
  lines.push("");
  lines.push(`## Conversations`);
  lines.push("");
  for (const r of results) {
    lines.push(`### ${r.persona.name} \`${r.persona.id}\``);
    lines.push("");
    lines.push(`Expected: \`${r.persona.expectedOutcome}\`  ·  Overall: **${r.score.overall}**  ·  brevity ${r.score.brevity} · question ${r.score.one_question} · listens ${r.score.listens} · arc ${r.score.phase_arc} · honesty ${r.score.honesty} · outcome ${r.score.outcome}`);
    lines.push("");
    if (r.score.key_issues.length > 0) {
      lines.push(`**Issues:**`);
      for (const k of r.score.key_issues) lines.push(`- ${k}`);
      lines.push("");
    }
    lines.push(`<details><summary>Transcript</summary>`);
    lines.push("");
    lines.push(fmtTranscript(r.transcript));
    lines.push("");
    lines.push(`</details>`);
    lines.push("");
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\n✓ Report written to ${outPath}`);
  console.log(`Overall score: ${overall.toFixed(2)} / 5`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
