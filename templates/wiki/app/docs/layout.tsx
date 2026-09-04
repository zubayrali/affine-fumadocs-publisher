import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { LinkPreview } from '@/components/link-preview';
import wikiConfig from '@/affine-wiki.config';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
      <LinkPreview enabled={wikiConfig.features.linkPreviews} />
    </DocsLayout>
  );
}
