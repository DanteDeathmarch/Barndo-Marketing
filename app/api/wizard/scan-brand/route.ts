// Wizard Step 3 — scan a customer's website and propose brand defaults.
//
// Given a URL, fetches the page server-side and extracts:
// - Site title and tagline candidates
// - og:image / favicon (logo candidates)
// - theme-color CSS variable
// - Likely primary color from inline CSS hints
// - Font family hints from common patterns
//
// Returns enough that the wizard can pre-fill Step 3 fields. The customer
// confirms or overrides before continuing.

export const runtime = "nodejs";

interface BrandScanResult {
  url: string;
  title: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  themeColor: string;
  fontHints: string[];
  rawTitle: string;
  ogDescription: string;
}

function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

function firstMatch(html: string, pattern: RegExp): string {
  const m = html.match(pattern);
  return m ? (m[1] ?? m[0]) : "";
}

function parseHtml(url: string, html: string): BrandScanResult {
  const ogTitle = firstMatch(
    html,
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  const ogDescription = firstMatch(
    html,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
  );
  const ogImage = firstMatch(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  const rawTitle = firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i).trim();
  const themeColor = firstMatch(
    html,
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i
  );
  const metaDescription = firstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
  );

  // Favicon: try shortcut icon first, then plain icon
  const faviconHref =
    firstMatch(
      html,
      /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i
    ) ||
    firstMatch(
      html,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i
    );

  // First H1 as tagline candidate
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
    .replace(/<[^>]+>/g, "")
    .trim();

  // Logo candidate: img where alt or src contains "logo"
  const logoFromAlt = firstMatch(
    html,
    /<img[^>]+alt=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i
  );
  const logoFromSrc = firstMatch(
    html,
    /<img[^>]+src=["']([^"']*logo[^"']*)["']/i
  );

  // Font hints: look for common font-family declarations
  const fontHints: string[] = [];
  const fontMatches = html.match(/font-family\s*:\s*([^;"'}]+)/gi) ?? [];
  for (const m of fontMatches.slice(0, 5)) {
    const family = m.split(":")[1]?.trim();
    if (family && !fontHints.includes(family)) fontHints.push(family);
  }
  // Google Fonts link tags
  const gfontMatches = html.match(
    /fonts\.googleapis\.com\/css2?\?family=([^"&'\s]+)/gi
  );
  if (gfontMatches) {
    for (const m of gfontMatches.slice(0, 3)) {
      const family = decodeURIComponent(
        m.replace(/.*family=/, "").replace(/\+/g, " ")
      );
      if (!fontHints.includes(family)) fontHints.push(family);
    }
  }

  return {
    url,
    title: ogTitle || rawTitle,
    tagline: ogDescription || metaDescription || h1,
    logoUrl: absoluteUrl(url, ogImage || logoFromAlt || logoFromSrc),
    faviconUrl: absoluteUrl(url, faviconHref),
    themeColor,
    fontHints,
    rawTitle,
    ogDescription,
  };
}

export async function POST(req: Request) {
  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "").trim();
    if (!url) throw new Error("missing url");
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    new URL(url); // validate
  } catch {
    return Response.json(
      { ok: false, error: "Provide a valid URL like https://example.com" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        // Some sites 403 default Node UAs. Use a plausible browser UA.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // Bail quickly if the site is slow or unreachable
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          error: `Site returned ${res.status}. The wizard can't scan it, but you can enter brand details manually below.`,
        },
        { status: 502 }
      );
    }

    const html = await res.text();
    const result = parseHtml(url, html);

    return Response.json({ ok: true, brand: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json(
      {
        ok: false,
        error: `Couldn't reach the site (${msg}). Enter brand details manually below.`,
      },
      { status: 502 }
    );
  }
}
