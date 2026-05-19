import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | BarndoBuilt",
};

export default function PrivacyPage() {
  return (
    <div className="container-x py-16 max-w-2xl">
      <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-charcoal">
        <p>
          BarndoBuilt is a lead-matching service that connects landowners with
          barndominium builders. This page explains what we collect and how we
          use it.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">
          What we collect
        </h2>
        <p>
          When you complete our qualification form or chat with our concierge,
          we collect the details you provide: your name, contact information,
          location, land details, timeline, and budget range.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">How we use it</h2>
        <p>
          We use your information to match you with a vetted regional builder
          and to follow up about your project. We share your details only with
          the builder matched to your state. We do not sell your data to
          unrelated third parties or advertising networks.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">Your choices</h2>
        <p>
          You can request that we delete your information at any time by
          emailing hello@barndobuilt.com.
        </p>
        <h2 className="text-xl font-semibold text-ink pt-2">Contact</h2>
        <p>Questions about privacy? Email hello@barndobuilt.com.</p>
      </div>
    </div>
  );
}
