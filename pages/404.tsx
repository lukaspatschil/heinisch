import type { GetStaticProps, PageConfig } from 'next';
import PageView from '@/components/PageView';
import type { PageContent } from '@/lib/content';
import { getPage } from '@/lib/pages';

// The original site's 404 page (e.g. https://danielaheinisch.at/preise/).
export const config: PageConfig = { unstable_runtimeJS: false };

type Props = { page: PageContent };

export const getStaticProps: GetStaticProps<Props> = () => ({ props: { page: getPage('404') } });

export default function NotFound({ page }: Props) {
  return <PageView page={page} />;
}
