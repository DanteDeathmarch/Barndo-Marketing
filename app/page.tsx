import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs uppercase tracking-wider text-rust font-semibold">
          Template
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-ink">
          Customer-owned conversion bot
        </h1>
        <p className="mt-4 text-charcoal">
          A complete chatbot platform packaged as a forkable template — bundled
          Skills, scheduled routines, eval harness, and an install wizard that
          walks a customer end-to-end on their own stack.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/install-wizard"
            className="rounded-md bg-rust px-6 py-3 text-sm font-semibold text-cream hover:bg-rust-dark"
          >
            Open the install wizard →
          </Link>
          <a
            href="https://github.com/DanteDeathmarch/Barndo-Marketing"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-sand px-6 py-3 text-sm font-semibold text-charcoal hover:border-rust"
          >
            View on GitHub
          </a>
        </div>
        <p className="mt-10 text-xs text-steel">
          Bot runtime, lead pipeline, 9 Skills, 5 routines, 18-persona eval
          suite, A/B variant infrastructure. See{" "}
          <code className="bg-sand/60 px-1 rounded">CLAUDE.md</code> and{" "}
          <code className="bg-sand/60 px-1 rounded">README.md</code>.
        </p>
      </div>
    </div>
  );
}
