import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { FEATURE_DEFAULTS } from '../index.mjs';
import { remarkAnnotations } from '../annotations/remark-annotations.mjs';
import { rehypeCitations } from '../citations/rehype-citations.mjs';
import { rehypeSidenotes } from '../sidenotes/rehype-sidenotes.mjs';
import { remarkReviewPrompts } from '../review/remark-review-prompts.mjs';

/**
 * Build Fumadocs MDX preset options from wiki feature flags.
 * Gen-time text transforms (`transformSidenoteSyntax`, `transformOrbitCallouts`)
 * stay outside this helper — run them in the publisher before MDX sees the source.
 * @param {Partial<{
 *   math: boolean,
 *   mermaid: boolean,
 *   citations: boolean,
 *   sidenotes: boolean,
 *   annotations: boolean,
 *   review: boolean,
 * }>} [features]
 * @param {{ citations?: { bibliographyFile?: string, csl?: string, linkCitations?: boolean, suppressBibliography?: boolean } }} [options]
 */
export function createWikiMdxOptions(features = {}, options = {}) {
  const enabled = {
    math: features.math ?? FEATURE_DEFAULTS.math,
    mermaid: features.mermaid ?? FEATURE_DEFAULTS.mermaid,
    citations: features.citations ?? FEATURE_DEFAULTS.citations,
    sidenotes: features.sidenotes ?? FEATURE_DEFAULTS.sidenotes,
    annotations: features.annotations ?? FEATURE_DEFAULTS.annotations,
    review: features.review ?? FEATURE_DEFAULTS.review,
  };

  /** @type {unknown[]} */
  const remarkPlugins = [];
  if (enabled.review) remarkPlugins.push(remarkReviewPrompts);
  if (enabled.annotations) remarkPlugins.push(remarkAnnotations);
  if (enabled.mermaid) remarkPlugins.push(remarkMdxMermaid);
  if (enabled.math) remarkPlugins.push(remarkMath);

  return {
    remarkPlugins,
    /** @param {unknown[]} plugins */
    rehypePlugins: (plugins) => {
      /** @type {unknown[]} */
      const out = [];
      if (enabled.math) out.push(rehypeKatex);
      out.push(...plugins);
      if (enabled.citations) out.push(...rehypeCitations(options.citations));
      // Citations must run before sidenotes so [@key] inside footnotes resolve.
      if (enabled.sidenotes) out.push(rehypeSidenotes);
      return out;
    },
  };
}
