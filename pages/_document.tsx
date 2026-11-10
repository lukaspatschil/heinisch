import { Head, Html, Main, NextScript } from 'next/document';

// Body classes of the original WordPress theme that the stylesheets rely on.
const BODY_CLASS =
  'wp-theme-flo-pronto fgt-button-scheme_1 fgt-fields-style-bordered flextheme flextheme_layout_default flex-stylekit-present';

export default function Document() {
  return (
    <Html lang="de">
      <Head>
        {/* The original has no favicon either; this avoids a 404 request for /favicon.ico */}
        <link rel="icon" href="data:," />
      </Head>
      <body className={BODY_CLASS}>
        <Main />
        <NextScript />
        {/* Site interactivity (no React hydration: pages set unstable_runtimeJS = false) */}
        <script type="module" src="/js/site.js" />
      </body>
    </Html>
  );
}
