import { getPageImageUrl, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Presentation } from 'lucide-react';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { PageMetadata } from '@/components/wiki-metadata';
import wikiConfig from '@/affine-wiki.config';
import { Backlinks } from '@/components/backlinks';
import { ReaderToggle } from '@affine-fumadocs/wiki/reader';
import { SlideViewer } from '@affine-fumadocs/wiki/slides';
import { getWikiGraph } from '@/lib/wiki-graph';

const LocalGraph = dynamic(
  () => import('@affine-fumadocs/wiki/graph').then((mod) => mod.LocalGraph),
  { ssr: false },
);

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const slug = params.slug ?? [];
  const isSlides = slug.length > 1 && slug[slug.length - 1] === 'slides';
  const resolvedSlug = isSlides ? slug.slice(0, -1) : slug;
  const page = source.getPage(resolvedSlug);
  if (!page) notFound();

  if (isSlides) {
    if (!wikiConfig.features.slides || !page.data.slides) notFound();
    const MDX = page.data.body;
    return (
      <SlideViewer parentUrl={page.url} parentTitle={page.data.title}>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </SlideViewer>
    );
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const graph = wikiConfig.features.graph ? getWikiGraph() : null;
  const isGraphPage = resolvedSlug.length === 1 && resolvedSlug[0] === 'graph';
  const chromeless = Boolean(page.data.full) || isGraphPage;

  return (
    <DocsPage
      toc={chromeless ? undefined : page.data.toc}
      full={Boolean(page.data.full) || isGraphPage}
      tableOfContent={chromeless ? { enabled: false } : undefined}
      tableOfContentPopover={chromeless ? { enabled: false } : undefined}
      footer={chromeless ? { enabled: false } : undefined}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {!chromeless ? (
        <PageMetadata
          data={page.data as unknown as Record<string, unknown>}
          showProperties={wikiConfig.features.properties}
          showTags={wikiConfig.features.tags}
        />
      ) : null}
      {!chromeless ? (
        <div className="page-actions flex flex-row gap-2 items-center border-b pb-6">
          {wikiConfig.features.readerMode ? (
            <ReaderToggle label="Reader mode" exitLabel="Exit reader" />
          ) : null}
          {wikiConfig.features.slides && page.data.slides ? (
            <Link
              href={`${page.url}/slides`}
              className="inline-flex items-center gap-1.5 rounded-md border bg-fd-background px-2.5 py-1.5 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <Presentation className="size-3.5" />
              Slides
            </Link>
          ) : null}
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
          />
        </div>
      ) : null}
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
        {wikiConfig.features.backlinks && !isGraphPage ? (
          <Backlinks
            currentUrl={page.url}
            pages={source.getPages().map((candidate) => ({
              url: candidate.url,
              data: candidate.data as unknown as Record<string, unknown> & {
                title?: string;
                description?: string;
              },
            }))}
          />
        ) : null}
        {wikiConfig.features.graph && graph && !isGraphPage ? (
          <div data-local-graph className="not-prose mt-8">
            <h2 className="mb-3 text-base font-semibold text-fd-foreground">Connections</h2>
            <LocalGraph graph={graph} currentUrl={page.url} depthLabel="Graph depth" />
          </div>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const base = source.generateParams();
  if (!wikiConfig.features.slides) return base;
  const slides = source
    .getPages()
    .filter((page) => page.data.slides && !page.data.unlisted)
    .map((page) => ({ slug: [...page.slugs, 'slides'] }));
  return [...base, ...slides];
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const slug = params.slug ?? [];
  const isSlides = slug.length > 1 && slug[slug.length - 1] === 'slides';
  const page = source.getPage(isSlides ? slug.slice(0, -1) : slug);
  if (!page) notFound();

  return {
    title: isSlides ? `${page.data.title} · Slides` : page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}
