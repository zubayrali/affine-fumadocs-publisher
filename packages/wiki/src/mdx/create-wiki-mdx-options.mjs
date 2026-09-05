import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { FEATURE_DEFAULTS } from '../index.mjs';

/**
 * Build Fumadocs MDX preset options from wiki feature flags.
 * Citations, sidenotes, annotations, and orbit stay out of this slice.
 * @param {Partial<{ math: boolean, mermaid: boolean }>} [features]
 */
export function createWikiMdxOptions(features = {}) {
  const enabled = {
    math: features.math ?? FEATURE_DEFAULTS.math,
    mermaid: features.mermaid ?? FEATURE_DEFAULTS.mermaid,
  };

  /** @type {unknown[]} */
  const remarkPlugins = [];
  if (enabled.mermaid) remarkPlugins.push(remarkMdxMermaid);
  if (enabled.math) remarkPlugins.push(remarkMath);

  return {
    remarkPlugins,
    /** @param {unknown[]} plugins */
    rehypePlugins: (plugins) =>
      enabled.math ? [rehypeKatex, ...plugins] : plugins,
  };
}
