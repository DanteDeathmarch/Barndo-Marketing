import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | BarndoBuilt",
};

export default function TermsPage() {
  return (
    <div className="container-x py-16 max-w-2xl">
      <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-charcoal">
        <p>
          By using BarndoBuilt, you agree to these terms. Please read them
          before submitting the qualification form.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">Our service</h2>
        <p>
          BarndoBuilt is a matching service, not a licensed builder, contractor,
          or lender. We connect landowners with independent regional builders.
          We do not design, engineer, finance, or construct barndominiums
          ourselves.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">
          Estimates and information
        </h2>
        <p>
          Cost figures, timelines, and other information on this site are
          general ranges for education only — not quotes, offers, or guarantees.
          Actual pricing and terms come from the builder after a site
          evaluation.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">Your submission</h2>
        <p>
          By submitting the form, you consent to be contacted by a matched
          builder by phone or email about your project. Any agreement to build
          is solely between you and that builder.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">Contact</h2>
        <p>Questions about these terms? Email hello@barndobuilt.com.</p>
      </div>
    </div>
  );
}
