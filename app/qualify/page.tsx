import { cookies } from "next/headers";
import type { Metadata } from "next";
import QualifyWizard from "@/components/QualifyWizard";

export const metadata: Metadata = {
  title: "Check If Your Land Qualifies | BarndoBuilt",
  description:
    "Answer five quick questions and get matched with a vetted barndominium builder in your state.",
};

const VALID = ["TX", "TN", "OK", "LA"];

export default async function QualifyPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const variant = (await cookies()).get("bb_variant")?.value ?? "A";
  const initialState =
    state && VALID.includes(state.toUpperCase()) ? state.toUpperCase() : "";

  return (
    <div className="container-x py-12 max-w-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-ink">
          Let&apos;s see if your land qualifies
        </h1>
        <p className="mt-2 text-charcoal">
          About 90 seconds. No obligation. We&apos;ll match you with the right
          regional builder.
        </p>
      </div>
      <QualifyWizard initialState={initialState} variant={variant} />
    </div>
  );
}
