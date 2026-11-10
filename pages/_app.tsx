import type { AppProps } from 'next/app';
import '@/styles/site.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
