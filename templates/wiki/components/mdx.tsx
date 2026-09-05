import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { CanvasPage } from '@affine-fumadocs/wiki/canvas';
import { AffineDatabase } from '@affine-fumadocs/wiki/databases';
import { ArticleImage } from '@affine-fumadocs/wiki/lightbox';
import { Mermaid } from '@affine-fumadocs/wiki/mdx/mermaid';
import { ReviewBlock } from '@affine-fumadocs/wiki/review';
import wikiConfig from '@/affine-wiki.config';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...(wikiConfig.features.lightbox ? { img: ArticleImage } : {}),
    ...(wikiConfig.features.databases ? { AffineDatabase } : {}),
    ...(wikiConfig.features.canvas ? { CanvasPage } : {}),
    ...(wikiConfig.features.mermaid ? { Mermaid } : {}),
    ...(wikiConfig.features.review ? { ReviewBlock } : {}),
    ...components,
  } as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
