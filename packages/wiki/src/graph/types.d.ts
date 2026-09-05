/** Serializable force-graph model shared by builders and React views. */

export interface GraphNode {
  id: string;
  url: string;
  text: string;
  description?: string;
  kind?: 'page' | 'tag';
  /** Top-level URL segment — drives optional group colouring. */
  group?: string;
  neighbors?: string[];
  /** Runtime simulation fields (written by d3-force). */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  index?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface Graph {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Minimal page shape accepted by {@link buildGraph}. */
export interface BuildGraphPage {
  url: string;
  data?: {
    title?: string;
    description?: string;
    unlisted?: boolean;
    tagPage?: boolean;
    tag?: string;
    tags?: string[];
    outgoingLinks?: string[];
    [key: string]: unknown;
  };
}

export interface BuildGraphOptions {
  /** Build a public tag URL when no dedicated tag page exists. */
  tagUrl?: (tag: string) => string;
  /** Hierarchical tag prefixes (`a/b` → `['a', 'a/b']`). */
  getTagPrefixes?: (tag: string) => string[];
  /** Derive a section/group key from a page URL. */
  sectionOf?: (url: string) => string | undefined;
}
