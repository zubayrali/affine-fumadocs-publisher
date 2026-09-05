import type { CSSProperties } from 'react';
import { GraphView } from './graph-view';
import { groupColorIndex } from './graph-utils.mjs';
import type { Graph } from './types';
import './graph.css';

export interface GraphPageLabels {
  tag?: string;
  pages?: string;
  tags?: string;
  links?: string;
}

export interface GraphPageContentProps {
  graph: Graph;
  labels?: GraphPageLabels;
  className?: string;
}

/**
 * Global graph page chrome: section legend + stats + force graph.
 * All copy is supplied via `labels` (no locale table).
 */
export function GraphPageContent({
  graph,
  labels = {},
  className = 'h-[min(75vh,52rem)]',
}: GraphPageContentProps) {
  const tagLabel = labels.tag ?? 'Tag';
  const pagesLabel = labels.pages ?? 'pages';
  const tagsLabel = labels.tags ?? 'tags';
  const linksLabel = labels.links ?? 'links';

  const tagCount = graph.nodes.filter((node) => node.kind === 'tag').length;
  const pageCount = graph.nodes.length - tagCount;
  const sections = [...new Set(graph.nodes.map((node) => node.group))]
    .filter((section): section is string => Boolean(section))
    .sort();

  return (
    <div className="flex flex-col gap-3">
      <div className="not-prose wiki-graph-legend flex flex-wrap items-center justify-between gap-2 text-fd-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {sections.map((section) => (
            <span key={section} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="wiki-graph-swatch"
                style={
                  {
                    '--wiki-graph-swatch-color': `var(--wiki-graph-node-color-${groupColorIndex(section)})`,
                  } as CSSProperties
                }
              />
              {section}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="wiki-graph-swatch"
              style={
                {
                  '--wiki-graph-swatch-color': 'var(--wiki-graph-tag-color)',
                } as CSSProperties
              }
            />
            {tagLabel}
          </span>
        </div>
        <span>
          {pageCount} {pagesLabel} · {tagCount} {tagsLabel} · {graph.links.length}{' '}
          {linksLabel}
        </span>
      </div>
      <GraphView graph={graph} className={className} />
    </div>
  );
}
