import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { AffineDatabase } from '@affine-fumadocs/wiki/databases';
import { ArticleImage } from '@affine-fumadocs/wiki/lightbox';
import { Mermaid } from '@affine-fumadocs/wiki/mdx/mermaid';
import wikiConfig from '@/affine-wiki.config';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...(wikiConfig.features.lightbox ? { img: ArticleImage } : {}),
    ...(wikiConfig.features.databases ? { AffineDatabase } : {}),
    ...(wikiConfig.features.mermaid ? { Mermaid } : {}),
    ...components,
  } as MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
