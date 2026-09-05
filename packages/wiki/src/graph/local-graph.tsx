'use client';

import { useEffect, useMemo, useState } from 'react';
import { GraphView, recordVisited, type Graph } from './graph-view';
import { localGraph } from './graph-utils.mjs';

export interface LocalGraphProps {
  graph: Graph;
  currentUrl: string;
  /** Accessible label for the depth select. */
  depthLabel?: string;
  className?: string;
  trackVisited?: boolean;
  visitedStorageKey?: string;
}

/**
 * Local neighborhood graph with client-side depth slicing.
 */
export function LocalGraph({
  graph,
  currentUrl,
  depthLabel = 'Graph depth',
  className = 'h-56',
  trackVisited = true,
  visitedStorageKey,
}: LocalGraphProps) {
  const [depth, setDepth] = useState(1);
  const sliced = useMemo(
    () => localGraph(graph, currentUrl, depth),
    [graph, currentUrl, depth],
  );

  useEffect(() => {
    if (trackVisited) recordVisited(currentUrl, visitedStorageKey);
  }, [currentUrl, trackVisited, visitedStorageKey]);

  if (sliced.nodes.length <= 1) return null;

  return (
    <GraphView
      graph={sliced}
      variant="local"
      currentUrl={currentUrl}
      className={className}
      trackVisited={trackVisited}
      visitedStorageKey={visitedStorageKey}
      extraControls={
        <select
          aria-label={depthLabel}
          className="wiki-graph-select"
          value={depth}
          onChange={(event) => setDepth(Number(event.target.value))}
        >
          {[1, 2, 3].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      }
    />
  );
}
