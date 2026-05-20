import ConciergeWidget from "@/components/ConciergeWidget";

// Bare manual-test sandbox. After the customer deploys, they open this
// route at https://<their-bot>.vercel.app/test, have a real conversation
// with the live chatbot (real /api/chat, real streaming, real env vars,
// real ANTHROPIC_API_KEY consumption), and confirm it behaves like the
// pre-deploy eval said it would.
//
// Delete this route in production if you don't want a public sandbox —
// it's gated only by being unlinked from anywhere else.

export const metadata = { title: "Bot sandbox" };

export default function TestSandbox() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-stone-50">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-wider text-red-800 font-semibold">
          Sandbox
        </p>
        <h1 className="mt-3 text-2xl font-bold">Live bot test</h1>
        <p className="mt-3 text-sm text-stone-700">
          Open the concierge widget in the corner and have a real conversation.
          This is the deployed bot hitting <code>/api/chat</code> — the same
          endpoint your visitors will use.
        </p>
        <ul className="mt-6 text-sm text-stone-700 space-y-1.5 text-left mx-auto inline-block">
          <li>· Confirm responses stream in 1–3 sentences</li>
          <li>· Confirm it asks one focused question per turn</li>
          <li>· Confirm it reaches a vision statement + bridge by turn 6</li>
          <li>· Confirm it doesn&apos;t invent prices or guarantees</li>
        </ul>
        <p className="mt-6 text-xs text-stone-500">
          If anything is off, run <code>npm run evals -- --variant=both</code>{" "}
          locally to diagnose, or paste a bad transcript into your Claude Max
          with the <code>lessons-learned</code> skill template.
        </p>
      </div>
      <ConciergeWidget />
    </div>
  );
}
