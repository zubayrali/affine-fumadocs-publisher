import { buildGraph, type BuildGraphPage, type Graph } from '@affine-fumadocs/wiki/graph';
import { source } from '@/lib/source';

/** Build the site knowledge graph from the staged Fumadocs source. */
export function getWikiGraph(): Graph {
  const pages: BuildGraphPage[] = source.getPages().map((page) => ({
    url: page.url,
    data: page.data as unknown as BuildGraphPage['data'],
  }));
  return buildGraph(pages);
}
