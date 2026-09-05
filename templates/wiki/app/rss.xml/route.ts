import { source } from '@/lib/source';
import wikiConfig from '@/affine-wiki.config';
import { notFound } from 'next/navigation';

export const dynamic = 'force-static';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRFC822(date: Date): string {
  return date.toUTCString();
}

function parseCreatedDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function siteUrl(): string {
  return (
    wikiConfig.site.url?.replace(/\/$/, '') ||
    process.env.SITE_URL?.replace(/\/$/, '') ||
    'https://example.com'
  );
}

export function GET() {
  if (!wikiConfig.features.rss) notFound();

  const base = siteUrl();
  const language = wikiConfig.locales[0]?.languageTag ?? 'en';

  const pages = source.getPages().filter((page) => {
    const data = page.data as unknown as Record<string, unknown>;
    return data.unlisted !== true && data.draft !== true && data.tagPage !== true;
  });

  const withDates = pages.map((page) => {
    const fm = page.data as unknown as Record<string, unknown>;
    return { page, created: parseCreatedDate(fm.created) };
  });

  withDates.sort((a, b) => {
    if (a.created && b.created) return b.created.getTime() - a.created.getTime();
    if (a.created) return -1;
    if (b.created) return 1;
    return 0;
  });

  const items = withDates
    .slice(0, 50)
    .map(({ page, created }) => {
      const link = `${base}${page.url}`;
      const description =
        typeof page.data.description === 'string' ? page.data.description : '';
      const tags = Array.isArray(page.data.tags)
        ? page.data.tags.filter((tag): tag is string => typeof tag === 'string')
        : typeof page.data.tags === 'string'
          ? [page.data.tags]
          : [];

      const pubDate = created
        ? `\n      <pubDate>${toRFC822(created)}</pubDate>`
        : '';
      const categories = tags
        .map((tag) => `\n      <category><![CDATA[${tag}]]></category>`)
        .join('');

      return `    <item>
      <title><![CDATA[${page.data.title}]]></title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description><![CDATA[${description}]]></description>${pubDate}${categories}
    </item>`;
    })
    .join('\n');

  const name = wikiConfig.site.name;
  const description =
    wikiConfig.site.description ?? `${name} RSS feed`;

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(name)}</title>
    <link>${escapeXml(base)}</link>
    <description>${escapeXml(description)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${toRFC822(new Date())}</lastBuildDate>
    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
