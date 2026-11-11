
/** Public URL of the site, used for canonical and Open Graph URLs. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://danielaheinisch.at').replace(/\/$/, '');

export type PageContent = {
  id: string;
  path: string | null;
  meta: {
    title: string;
    description: string | null;
    robots: string | null;
    canonical: string | null;
    og: Record<string, string>;
    twitter: Record<string, string>;
    jsonLd: string[];
  };
  bodyClass: string;
  /** Old URL that now redirects (static hosting: meta refresh). */
  redirect?: string;
  css: string;
  html: string;
};

export type Route = { id: string; path: string };

/** Replace the original domain with the configured site URL. */
export function siteUrl(url: string): string {
  if (url.startsWith('/')) return SITE_URL + url;
  return url.replace(/^https?:\/\/(www\.)?danielaheinisch\.at/i, SITE_URL);
}

/** JSON-LD blocks with the original domain replaced by the configured site URL. */
export function jsonLd(page: PageContent): string[] {
  const escapedOrigin = SITE_URL.replace(/\//g, '\\/');
  return page.meta.jsonLd.map((s) =>
    s
      .replace(/https?:\\\/\\\/(www\.)?danielaheinisch\.at/gi, escapedOrigin)
      .replace(/https?:\/\/(www\.)?danielaheinisch\.at/gi, SITE_URL)
      .replace(/</g, '\\u003c'),
  );
}
