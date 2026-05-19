import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";

export const metadata: Metadata = {
  title: "How It Works | BarndoBuilt",
  description:
    "How BarndoBuilt matches landowners with vetted barndominium builders — three simple steps.",
};

const STEPS = [
  {
    n: "1",
    t: "Tell us about your land",
    d: "Answer five quick questions — your state, your land, your timeline, and your budget. It takes about 90 seconds.",
  },
  {
    n: "2",
    t: "We match you with a builder",
    d: "We connect you with a vetted builder serving your state — one who knows your county's codes, terrain, and lenders.",
  },
  {
    n: "3",
    t: "Get your custom plan",
    d: "Your builder designs around your land, vision, and budget — and handles design, engineering, and construction under one contract.",
  },
];

const FAQ = [
  {
    q: "Is BarndoBuilt a builder?",
    a: "No. We're a matching service. We connect serious landowners with vetted regional builders who handle the actual design and construction.",
  },
  {
    q: "What does it cost to get matched?",
    a: "Nothing. Getting matched is free and there's no obligation. You only move forward if you and the builder are a fit.",
  },
  {
    q: "What if I don't own land yet?",
    a: "You can still reach out — but the strongest fit is landowners ready to build within 6–18 months. Builders can sometimes help with land too.",
  },
  {
    q: "Which states do you cover?",
    a: "Texas, Tennessee, Oklahoma, and Louisiana today. More regions are on the way.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="container-x py-16 max-w-3xl text-center">
        <h1 className="text-4xl font-bold text-ink">How BarndoBuilt works</h1>
        <p className="mt-4 text-lg text-charcoal">
          One short form. One vetted builder. One contract from design to
          move-in.
        </p>
      </section>

      <section className="container-x max-w-3xl pb-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-lg border border-sand bg-cream p-5"
            >
              <div className="w-9 h-9 rounded-full bg-rust text-cream flex items-center justify-center font-bold">
                {s.n}
              </div>
              <h2 className="mt-3 font-semibold text-ink">{s.t}</h2>
              <p className="mt-2 text-sm text-charcoal">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x max-w-3xl py-12">
        <h2 className="text-2xl font-bold text-ink">Common questions</h2>
        <div className="mt-6 space-y-5">
          {FAQ.map((f) => (
            <div key={f.q} className="border-b border-sand pb-5">
              <h3 className="font-semibold text-ink">{f.q}</h3>
              <p className="mt-2 text-charcoal">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-rust">
        <div className="container-x py-14 text-center max-w-2xl">
          <h2 className="text-2xl font-bold text-cream">
            Ready to get matched?
          </h2>
          <div className="mt-6">
            <CTAButton variant="light">Check If I Qualify</CTAButton>
          </div>
        </div>
      </section>
    </>
  );
}
