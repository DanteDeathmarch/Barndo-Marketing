import { cookies } from "next/headers";
import Link from "next/link";
import CTAButton from "@/components/CTAButton";
import { STATE_LIST } from "@/lib/states";

const HEADLINES: Record<string, { h1: string; sub: string }> = {
  A: {
    h1: "You Have the Land. Now Build the Life.",
    sub: "Custom barndominiums designed and built on your property — one team, one contract, from first rendering to move-in day.",
  },
  B: {
    h1: "One Contract. Design Through Move-In.",
    sub: "Stop juggling a designer, an engineer, and three contractors. We match landowners with a builder who handles the whole barndo build in-house.",
  },
};

export default async function HomePage() {
  const variant = (await cookies()).get("bb_variant")?.value ?? "A";
  const copy = HEADLINES[variant] ?? HEADLINES.A;

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-sand to-cream">
        <div className="container-x py-20 sm:py-28 text-center max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-rust">
            Texas · Tennessee · Oklahoma · Louisiana
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-ink">
            {copy.h1}
          </h1>
          <p className="mt-5 text-lg text-charcoal">{copy.sub}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CTAButton>See If My Land Qualifies</CTAButton>
            <Link
              href="/how-it-works"
              className="inline-block rounded-md px-6 py-3 text-base font-semibold text-charcoal hover:text-rust"
            >
              How It Works →
            </Link>
          </div>
          <p className="mt-6 text-sm text-steel">
            Takes about 90 seconds · No obligation · Vetted regional builders
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="container-x py-16 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink">
          Most barndo projects fall apart before they start
        </h2>
        <p className="mt-4 text-charcoal">
          You find a designer. They hand you to an engineer. The engineer
          recommends a builder. The builder subs out the steel work. Suddenly
          four companies each point at the other when something goes wrong — and
          your budget and timeline disappear.
        </p>
        <p className="mt-4 text-charcoal">
          The problem isn&apos;t building a barndo. It&apos;s building one with a
          team that was never built to work together.
        </p>
      </section>

      {/* Solution */}
      <section className="bg-sand/50">
        <div className="container-x py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center">
            One company. Every step. Zero handoffs.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                t: "Custom 3D Design",
                d: "See your barndo before a nail is driven — built around your land, style, and budget.",
              },
              {
                t: "Land & Site Evaluation",
                d: "Builders who know local terrain, codes, and conditions. No costly surprises after breaking ground.",
              },
              {
                t: "Financing Connections",
                d: "Barndo financing is different. Get connected with lenders who understand steel-frame construction loans.",
              },
              {
                t: "Turnkey Construction",
                d: "Steel framing, foundation, full build-out. One team, one schedule, one number to call.",
              },
            ].map((c) => (
              <div
                key={c.t}
                className="rounded-lg bg-cream border border-sand p-5"
              >
                <h3 className="font-semibold text-ink">{c.t}</h3>
                <p className="mt-2 text-sm text-charcoal">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* States */}
      <section className="container-x py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center">
          Find your state
        </h2>
        <p className="mt-3 text-center text-charcoal">
          We match landowners with builders who know your region.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATE_LIST.map((s) => (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="rounded-lg border border-sand bg-cream p-5 hover:border-rust transition-colors"
            >
              <h3 className="font-semibold text-ink">{s.name}</h3>
              <p className="mt-2 text-sm text-charcoal">{s.tagline}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-rust">
                View {s.name} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-rust">
        <div className="container-x py-16 text-center max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-cream">
            Your land is ready. Are you?
          </h2>
          <p className="mt-4 text-cream/90">
            If you own acreage in Texas, Tennessee, Oklahoma, or Louisiana and
            want to build in the next 6–18 months — let&apos;s match you with the
            right builder.
          </p>
          <div className="mt-7">
            <CTAButton variant="light">
              Check If I Qualify — 90 Seconds
            </CTAButton>
          </div>
        </div>
      </section>
    </>
  );
}
