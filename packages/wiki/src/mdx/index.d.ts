export function createWikiMdxOptions(features?: Partial<{ math: boolean; mermaid: boolean }>): {
  remarkPlugins: unknown[];
  rehypePlugins: (plugins: unknown[]) => unknown[];
};

export { Mermaid } from './mermaid';
