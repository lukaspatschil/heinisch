import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Fully static site: `next build` writes plain HTML/CSS/JS to ./out
  output: 'export',
  // Same URL scheme as the original WordPress site (/ueber-mich/)
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
