import Link from "next/link";

export default function CTAButton({
  href = "/qualify",
  children,
  variant = "primary",
}: {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "light";
}) {
  const base =
    "inline-block rounded-md px-6 py-3 text-base font-semibold transition-colors";
  const styles =
    variant === "primary"
      ? "bg-rust text-cream hover:bg-rust-dark"
      : "bg-cream text-rust hover:bg-sand";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}
