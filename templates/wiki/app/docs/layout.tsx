import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { LinkPreview } from '@/components/link-preview';
import { CitationTooltip } from '@affine-fumadocs/wiki/citations';
import { RoughAnnotations } from '@affine-fumadocs/wiki/annotations';
import { Sidenotes } from '@affine-fumadocs/wiki/sidenotes';
import { LocaleSwitcher } from '@affine-fumadocs/wiki/site';
import wikiConfig from '@/affine-wiki.config';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  const multilingual = wikiConfig.features.multilingual && wikiConfig.locales.length > 1;

  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...baseOptions()}
      sidebar={
        multilingual
          ? {
              banner: (
                <LocaleSwitcher
                  locales={wikiConfig.locales}
                  currentLocale={
                    process.env.NEXT_PUBLIC_SITE_LANGUAGE
                    || process.env.SITE_LANGUAGE
                    || wikiConfig.locales[0]!.code
                  }
                  basePath={process.env.NEXT_PUBLIC_BASE_PATH || ''}
                  variant="sidebar"
                />
              ),
            }
          : undefined
      }
    >
      {children}
      <LinkPreview enabled={wikiConfig.features.linkPreviews} />
      <CitationTooltip enabled={wikiConfig.features.citations} />
      <Sidenotes enabled={wikiConfig.features.sidenotes} />
      <RoughAnnotations enabled={wikiConfig.features.annotations} />
    </DocsLayout>
  );
}
