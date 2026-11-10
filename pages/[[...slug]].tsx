import type { GetStaticPaths, GetStaticProps, PageConfig } from 'next';
import PageView from '@/components/PageView';
import type { PageContent } from '@/lib/content';
import { getPage, getRoutes } from '@/lib/pages';

// Static HTML only: no Next.js client runtime is shipped.
export const config: PageConfig = { unstable_runtimeJS: false };

type Props = { page: PageContent };

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getRoutes().map((r) => ({
    params: { slug: r.path === '/' ? [] : r.path.replace(/^\/|\/$/g, '').split('/') },
  })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const slug = (params?.slug as string[] | undefined) ?? [];
  const path = '/' + (slug.length ? slug.join('/') + '/' : '');
  const route = getRoutes().find((r) => r.path === path);
  if (!route) return { notFound: true };
  return { props: { page: getPage(route.id) } };
};

export default function Page({ page }: Props) {
  return <PageView page={page} />;
}
