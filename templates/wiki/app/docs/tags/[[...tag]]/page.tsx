import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { getTagPrefixes, normalizeTags, tagHref } from '@affine-fumadocs/wiki';
import wikiConfig from '@/affine-wiki.config';
import { source } from '@/lib/source';

type TaggedPage = ReturnType<typeof source.getPages>[number];

function tagsForPage(page: TaggedPage) {
  const data = page.data as unknown as Record<string, unknown>;
  const properties = data.affineProperties && typeof data.affineProperties === 'object' && !Array.isArray(data.affineProperties)
    ? data.affineProperties as Record<string, unknown>
    : {};
  return normalizeTags(data.tags ?? properties.Tags ?? properties.tags);
}

function allTags() {
  return [...new Set(source.getPages().flatMap((page) => tagsForPage(page).flatMap(getTagPrefixes)))].sort();
}

export default async function TagsPage(props: PageProps<'/docs/tags/[[...tag]]'>) {
  if (!wikiConfig.features.tags) notFound();
  const { tag: segments = [] } = await props.params;
  const selected = segments.join('/');
  const pages = selected
    ? source.getPages().filter((page) => tagsForPage(page).some((tag) => getTagPrefixes(tag).includes(selected)))
    : source.getPages().filter((page) => tagsForPage(page).length > 0);

  if (selected && !allTags().includes(selected)) notFound();

  return (
    <DocsPage toc={[]}>
      <DocsTitle>{selected ? `Pages tagged “${selected}”` : 'Tags'}</DocsTitle>
      <DocsDescription>
        {selected ? `${pages.length} page${pages.length === 1 ? '' : 's'} in this topic.` : 'Browse the knowledge base by topic.'}
      </DocsDescription>
      <DocsBody>
        {!selected ? (
          <ul className="not-prose grid list-none gap-2 p-0 sm:grid-cols-2">
            {allTags().map((tag) => (
              <li key={tag}>
                <Link className="block rounded-lg border border-fd-border bg-fd-card px-3 py-2 no-underline hover:bg-fd-accent" href={tagHref(tag)}>
                  <span className="font-medium text-fd-foreground">#{tag}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="not-prose grid list-none gap-3 p-0">
            {pages.map((page) => (
              <li key={page.url}>
                <Link className="block rounded-lg border border-fd-border bg-fd-card p-4 no-underline transition-colors hover:bg-fd-accent" href={page.url}>
                  <span className="font-medium text-fd-foreground">{page.data.title}</span>
                  {page.data.description ? <span className="mt-1 block text-sm text-fd-muted-foreground">{page.data.description}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return [{ tag: [] }, ...allTags().map((tag) => ({ tag: tag.split('/') }))];
}

export async function generateMetadata(props: PageProps<'/docs/tags/[[...tag]]'>): Promise<Metadata> {
  const { tag: segments = [] } = await props.params;
  const selected = segments.join('/');
  return {
    title: selected ? `Tag: ${selected}` : 'Tags',
    description: selected ? `Knowledge-base pages tagged ${selected}.` : 'Browse knowledge-base topics.',
  };
}
