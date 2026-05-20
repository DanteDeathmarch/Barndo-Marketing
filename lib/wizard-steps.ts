// 8-step install wizard for the customer-owned chatbot product.
// Each step is rendered as one screen. The customer's state persists to
// localStorage so they can leave and come back. At the end, the wizard
// emits a config bundle the customer drops into THEIR Replit/Vercel/GitHub.

export type StepId =
  | "welcome"
  | "anthropic-key"
  | "brand"
  | "knowledge"
  | "qualifying"
  | "deploy"
  | "test"
  | "install";

export interface StepDef {
  id: StepId;
  num: number;
  title: string;
  blurb: string;
}

export const STEPS: StepDef[] = [
  {
    id: "welcome",
    num: 1,
    title: "Account prep",
    blurb:
      "Confirm you have (or create) your Claude Max, Anthropic API key, Vercel, Replit, and GitHub accounts. Everything we build lives on YOUR accounts. We never store your data.",
  },
  {
    id: "anthropic-key",
    num: 2,
    title: "Anthropic API key",
    blurb:
      "Paste your Anthropic API key. It stays in your browser — used to generate your .env file and to power the live-fire test later. Never sent to us.",
  },
  {
    id: "brand",
    num: 3,
    title: "Brand & voice",
    blurb:
      "Pick your colors, logo, and tone. The bot will feel like yours from the first hello.",
  },
  {
    id: "knowledge",
    num: 4,
    title: "Knowledge base",
    blurb:
      "Paste your SOPs, FAQs, pricing ranges, and any docs the bot should know. Your Claude (right here in this wizard) restructures it into a clean knowledge file.",
  },
  {
    id: "qualifying",
    num: 5,
    title: "Qualifying & lead destination",
    blurb:
      "Tell the bot what a great lead looks like, what disqualifies a visitor, and where qualified leads should go (your CRM webhook, Slack, email).",
  },
  {
    id: "deploy",
    num: 6,
    title: "Fork + deploy",
    blurb:
      "Fork the template Replit. Connect it to your Vercel. Paste the env vars we generated. First deploy live in under 5 minutes.",
  },
  {
    id: "test",
    num: 7,
    title: "Live-fire test",
    blurb:
      "Talk to your bot here in the wizard, plus three auto-run personas (ideal / edge case / hostile). Catch weird answers before any real visitor sees them.",
  },
  {
    id: "install",
    num: 8,
    title: "Install + ongoing playbook",
    blurb:
      "Paste one script tag on your site. The wizard hands you templates for using your Claude Max to evolve the bot over time — KB updates, prompt refinements, new qualifying rules.",
  },
];

export interface WizardState {
  currentStep: StepId;
  completed: StepId[];
  // Step 2
  anthropicKey: string;
  // Step 3
  brandColor: string;
  brandColorAccent: string;
  logoUrl: string;
  toneWords: string;
  formality: "casual" | "professional" | "warm";
  // Step 4
  knowledgeRaw: string;
  knowledgeMarkdown: string;
  // Step 5
  qualifyingGoal: string;
  qualifyingSignals: string;
  disqualifyingSignals: string;
  webhookUrl: string;
  // Step 6
  vercelProjectName: string;
  // Step 7
  testTranscripts: { persona: string; transcript: string; verdict: string }[];
}

export const INITIAL_STATE: WizardState = {
  currentStep: "welcome",
  completed: [],
  anthropicKey: "",
  brandColor: "#9a3324",
  brandColorAccent: "#1f1b16",
  logoUrl: "",
  toneWords: "warm, plainspoken, expert",
  formality: "warm",
  knowledgeRaw: "",
  knowledgeMarkdown: "",
  qualifyingGoal: "",
  qualifyingSignals: "",
  disqualifyingSignals: "",
  webhookUrl: "",
  vercelProjectName: "",
  testTranscripts: [],
};

export const STORAGE_KEY = "install_wizard_state_v1";
