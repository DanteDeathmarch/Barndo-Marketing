import { NextResponse, type NextRequest } from "next/server";

const VARIANT_COOKIE = "bb_variant";
const VARIANTS = ["A", "B"];

export function proxy(req: NextRequest) {
  const res = NextResponse.next();

  if (!req.cookies.get(VARIANT_COOKIE)) {
    const variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    res.cookies.set(VARIANT_COOKIE, variant, {
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
      sameSite: "lax",
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
