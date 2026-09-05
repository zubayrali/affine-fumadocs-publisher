import { GraphPageContent } from '@affine-fumadocs/wiki/graph';
import { getWikiGraph } from '@/lib/wiki-graph';

/** Template wrapper: injects the staged page source into the wiki graph page. */
export function WikiGraphPage() {
  const graph = getWikiGraph();
  return (
    <GraphPageContent
      graph={graph}
      labels={{
        tag: 'Tag',
        pages: 'pages',
        tags: 'tags',
        links: 'links',
      }}
    />
  );
}
