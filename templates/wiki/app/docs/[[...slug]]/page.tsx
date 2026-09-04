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
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';
import { PageMetadata } from '@/components/wiki-metadata';
import wikiConfig from '@/affine-wiki.config';
import { Backlinks } from '@/components/backlinks';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
	      <DocsTitle>{page.data.title}</DocsTitle>
	      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
	      <PageMetadata
	        data={page.data as unknown as Record<string, unknown>}
	        showProperties={wikiConfig.features.properties}
	        showTags={wikiConfig.features.tags}
	      />
	      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
	        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
	        />
	        {wikiConfig.features.backlinks ? (
	          <Backlinks
	            currentUrl={page.url}
	            pages={source.getPages().map((candidate) => ({
	              url: candidate.url,
	              data: candidate.data as unknown as Record<string, unknown> & { title?: string; description?: string },
	            }))}
	          />
	        ) : null}
	      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}
