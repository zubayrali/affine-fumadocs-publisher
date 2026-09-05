export function createWikiMdxOptions(
  features?: Partial<{
    math: boolean;
    mermaid: boolean;
    citations: boolean;
    sidenotes: boolean;
    annotations: boolean;
    review: boolean;
  }>,
  options?: {
    citations?: {
      bibliographyFile?: string;
      csl?: string;
      linkCitations?: boolean;
      suppressBibliography?: boolean;
    };
  },
): {
  remarkPlugins: unknown[];
  rehypePlugins: (plugins: unknown[]) => unknown[];
};

export { Mermaid } from './mermaid';
