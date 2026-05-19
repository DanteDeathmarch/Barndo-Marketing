import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-sand bg-cream/95 backdrop-blur sticky top-0 z-40">
      <div className="container-x flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-block w-3 h-3 bg-rust rotate-45" aria-hidden />
          <span className="tracking-tight">
            Barndo<span className="text-rust">Built</span>
          </span>
        </Link>
        <Link
          href="/qualify"
          className="rounded-md bg-rust px-4 py-2 text-sm font-semibold text-cream hover:bg-rust-dark transition-colors"
        >
          Check If You Qualify
        </Link>
      </div>
    </header>
  );
}
