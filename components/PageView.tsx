import Head from 'next/head';
import type { PageContent } from '@/lib/content';
import { jsonLd, siteUrl } from '@/lib/content';

const CONTACT_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || '';

/**
 * Renders an imported page: the original SEO tags, page specific CSS,
 * structured data and the original markup (header, content, footer, mobile
 * menu, WhatsApp widget). Interactivity comes from /js/site.js (lib/behaviors).
 */
export default function PageView({ page }: { page: PageContent }) {
  const { meta } = page;
  if (page.redirect) {
    return (
      <>
        <Head>
          <title>Weiterleitung – Daniela Heinisch Photography</title>
          <meta name="robots" content="noindex, follow" />
          <meta httpEquiv="refresh" content={`0; url=${page.redirect}`} />
          <link rel="canonical" href={siteUrl(page.redirect)} />
        </Head>
        <p style={{ padding: 24, fontFamily: 'sans-serif' }}>
          Diese Seite ist umgezogen: <a href={page.redirect}>weiter</a>
        </p>
      </>
    );
  }
  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {meta.description && <meta name="description" content={meta.description} />}
        {meta.robots && <meta name="robots" content={meta.robots} />}
        {meta.canonical && <link rel="canonical" href={siteUrl(meta.canonical)} />}
        {Object.entries(meta.og).map(([property, content]) => (
          <meta
            key={property}
            property={property}
            content={/^og:(url|image)$/.test(property) ? siteUrl(content) : content}
          />
        ))}
        {Object.entries(meta.twitter).map(([name, content]) => (
          <meta key={name} name={name} content={content} />
        ))}
        {CONTACT_ENDPOINT && <meta name="hs-contact-endpoint" content={CONTACT_ENDPOINT} />}
        {jsonLd(page).map((json, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
        ))}
      </Head>
      {/* after the global stylesheet in the cascade, like on the original */}
      {page.css ? <style dangerouslySetInnerHTML={{ __html: page.css }} /> : null}
      <div className="hs-page" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: page.html }} />
    </>
  );
}
