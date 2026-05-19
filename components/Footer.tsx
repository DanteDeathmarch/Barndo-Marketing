import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-sand bg-sand/40 mt-auto">
      <div className="container-x py-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold">
            Barndo<span className="text-rust">Built</span>
          </p>
          <p className="text-sm text-steel mt-1">
            Matching landowners in TX, TN, OK &amp; LA with vetted barndominium
            builders.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-charcoal">
          <Link href="/how-it-works" className="hover:text-rust">
            How It Works
          </Link>
          <Link href="/qualify" className="hover:text-rust">
            Get Matched
          </Link>
          <Link href="/privacy" className="hover:text-rust">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-rust">
            Terms
          </Link>
          <a href="mailto:hello@barndobuilt.com" className="hover:text-rust">
            hello@barndobuilt.com
          </a>
        </nav>
      </div>
      <div className="container-x pb-6 text-xs text-steel">
        © {new Date().getFullYear()} BarndoBuilt. We are a lead-matching service,
        not a licensed builder. Estimates shown are ranges, not quotes.
      </div>
    </footer>
  );
}
