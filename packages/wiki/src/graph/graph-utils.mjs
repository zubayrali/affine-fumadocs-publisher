/**
 * Pure graph helpers — safe for server builders and client depth slicing.
 * @typedef {import('./types.d.ts').Graph} Graph
 */

/**
 * Precompute neighbors so the client never rescans links.
 * @param {Graph} graph
 * @returns {Graph}
 */
export function enrichNeighbors(graph) {
  /** @type {Map<string, Set<string>>} */
  const neighbors = new Map();
  /** @param {string} a @param {string} b */
  const add = (a, b) => {
    const set = neighbors.get(a);
    if (set) set.add(b);
    else neighbors.set(a, new Set([b]));
  };

  for (const link of graph.links) {
    const source = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
    const target = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
    add(source, target);
    add(target, source);
  }

  for (const node of graph.nodes) {
    const set = neighbors.get(String(node.id));
    node.neighbors = set ? [...set] : [];
  }

  return graph;
}

/**
 * Depth-limited neighborhood around a page (BFS with per-level sentinel).
 * @param {Graph} graph
 * @param {string} centerId
 * @param {number} depth
 * @returns {Graph}
 */
export function localGraph(graph, centerId, depth) {
  const byId = new Map(graph.nodes.map((node) => [String(node.id), node]));
  /** @type {Set<string>} */
  const neighborhood = new Set();
  /** @type {(string | null)[]} */
  const queue = [centerId, null];
  let remaining = depth;

  while (remaining >= 0 && queue.length > 0) {
    const current = queue.shift();
    if (current === null) {
      remaining--;
      if (queue.length === 0) break;
      queue.push(null);
      continue;
    }
    if (neighborhood.has(current)) continue;
    neighborhood.add(current);

    for (const neighbor of byId.get(current)?.neighbors ?? []) {
      if (!neighborhood.has(neighbor)) queue.push(neighbor);
    }
  }

  return {
    nodes: graph.nodes.filter((node) => neighborhood.has(String(node.id))),
    links: graph.links.filter((link) => {
      const source = typeof link.source === 'object' ? String(link.source.id) : String(link.source);
      const target = typeof link.target === 'object' ? String(link.target.id) : String(link.target);
      return neighborhood.has(source) && neighborhood.has(target);
    }),
  };
}

/**
 * Stable 1–12 colour slot for a section/group name.
 * @param {string} group
 * @returns {number}
 */
export function groupColorIndex(group) {
  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = (Math.imul(hash, 31) + group.charCodeAt(i)) >>> 0;
  }
  return (hash % 12) + 1;
}
