import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're Matched | BarndoBuilt",
  robots: { index: false },
};

export default function ThankYouPage() {
  return (
    <div className="container-x py-20 max-w-xl text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-rust flex items-center justify-center text-cream text-2xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold text-ink">
        You&apos;re in. We&apos;ve got it from here.
      </h1>
      <p className="mt-4 text-charcoal">
        Your details are on the way to a vetted builder serving your state.
        Expect a call or email — typically within one business day, at the time
        you told us works best.
      </p>
      <div className="mt-8 rounded-lg border border-sand bg-sand/40 p-5 text-left">
        <h2 className="font-semibold text-ink">What happens next</h2>
        <ol className="mt-3 space-y-2 text-sm text-charcoal list-decimal list-inside">
          <li>Your regional builder reviews your land and timeline.</li>
          <li>They reach out to talk through your vision and budget.</li>
          <li>You get a custom plan — design, financing, and build, one contract.</li>
        </ol>
      </div>
      <Link
        href="/how-it-works"
        className="mt-8 inline-block text-sm font-semibold text-rust hover:underline"
      >
        Read how the process works →
      </Link>
    </div>
  );
}
