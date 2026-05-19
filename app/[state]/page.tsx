import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";
import { STATES, STATE_LIST, isStateSlug } from "@/lib/states";

export function generateStaticParams() {
  return STATE_LIST.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  if (!isStateSlug(state)) return {};
  const data = STATES[state];
  return {
    title: `Build a Barndominium in ${data.name} | BarndoBuilt`,
    description: data.tagline,
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  if (!isStateSlug(state)) notFound();
  const data = STATES[state];
  const qualifyHref = `/qualify?state=${data.code}`;

  return (
    <>
      <section className="bg-gradient-to-b from-sand to-cream">
        <div className="container-x py-20 text-center max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-rust">
            {data.name}
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            Build a Custom Barndominium in {data.name}
          </h1>
          <p className="mt-5 text-lg text-charcoal">{data.tagline}</p>
          <div className="mt-8">
            <CTAButton href={qualifyHref}>
              See If My {data.name} Land Qualifies
            </CTAButton>
          </div>
          <p className="mt-6 text-sm text-steel">
            90 seconds · No obligation · {data.name} regional builders
          </p>
        </div>
      </section>

      <section className="container-x py-16 max-w-3xl">
        <p className="text-lg text-charcoal">{data.intro}</p>
        <div className="mt-8 rounded-lg border border-sand bg-sand/40 p-5">
          <h2 className="font-semibold text-ink">
            What matters on {data.name} land
          </h2>
          <p className="mt-2 text-charcoal">{data.landNote}</p>
        </div>
      </section>

      <section className="bg-sand/50">
        <div className="container-x py-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-ink">
            Areas we serve across {data.name}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {data.metros.map((m) => (
              <span
                key={m}
                className="rounded-full bg-cream border border-sand px-4 py-1.5 text-sm text-charcoal"
              >
                {m}
              </span>
            ))}
          </div>
          <p className="mt-6 text-charcoal">
            Wherever your tract sits in {data.name}, we match you with a builder
            who handles design, engineering, and construction under one
            contract — no juggling subcontractors.
          </p>
        </div>
      </section>

      <section className="bg-rust">
        <div className="container-x py-16 text-center max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-cream">
            Ready to build on your {data.name} land?
          </h2>
          <p className="mt-4 text-cream/90">
            Answer five quick questions and we&apos;ll connect you with the right
            {" "}
            {data.name} builder.
          </p>
          <div className="mt-7">
            <CTAButton href={qualifyHref} variant="light">
              Check If I Qualify
            </CTAButton>
          </div>
        </div>
      </section>
    </>
  );
}
