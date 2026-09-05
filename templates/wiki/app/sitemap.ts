import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import wikiConfig from '@/affine-wiki.config';

export const dynamic = 'force-static';

function siteUrl(): string {
  return (
    wikiConfig.site.url?.replace(/\/$/, '') ||
    process.env.SITE_URL?.replace(/\/$/, '') ||
    'https://example.com'
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  return source
    .getPages()
    .filter((page) => {
      const data = page.data as unknown as Record<string, unknown>;
      return data.unlisted !== true && data.draft !== true && data.tagPage !== true;
    })
    .map((page) => ({
      url: `${base}${page.url}`,
      changeFrequency: 'weekly' as const,
    }));
}
