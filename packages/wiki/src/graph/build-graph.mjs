import { enrichNeighbors } from './graph-utils.mjs';
import { getTagPrefixes as defaultGetTagPrefixes, tagHref } from '../index.mjs';

/**
 * @typedef {import('./types.d.ts').Graph} Graph
 * @typedef {import('./types.d.ts').BuildGraphPage} BuildGraphPage
 * @typedef {import('./types.d.ts').BuildGraphOptions} BuildGraphOptions
 */

/**
 * @param {string} url
 * @returns {string | undefined}
 */
function defaultSectionOf(url) {
  const segments = url.split('/').filter(Boolean);
  // Expect `/docs/<section>/…` or `/<section>/…`
  if (segments[0] === 'docs' && segments.length >= 2) return segments[1];
  return segments.length >= 2 ? segments[0] : undefined;
}

/**
 * Build a knowledge graph from published page metadata.
 * Inject pages (and optional helpers) — never imports an app `source` loader.
 *
 * @param {Iterable<BuildGraphPage>} pagesInput
 * @param {BuildGraphOptions} [options]
 * @returns {Graph}
 */
export function buildGraph(pagesInput, options = {}) {
  const tagUrl = options.tagUrl ?? ((tag) => tagHref(tag));
  const getTagPrefixes = options.getTagPrefixes ?? defaultGetTagPrefixes;
  const sectionOf = options.sectionOf ?? defaultSectionOf;

  const pages = [...pagesInput].filter((page) => !page.data?.unlisted);
  /** @type {Graph} */
  const graph = { links: [], nodes: [] };

  /** @type {Map<string, BuildGraphPage>} */
  const tagPagesByTag = new Map();
  for (const page of pages) {
    if (page.data?.tagPage && typeof page.data.tag === 'string') {
      tagPagesByTag.set(page.data.tag, page);
    }
  }

  /** @type {Set<string>} */
  const knownUrls = new Set(pages.map((page) => page.url));
  /** @type {Set<string>} */
  const tagNodes = new Set();

  /** @param {string} tag */
  const tagNodeUrl = (tag) => tagPagesByTag.get(tag)?.url ?? tagUrl(tag);

  /** @param {string} tag */
  const ensureTagNode = (tag) => {
    if (tagNodes.has(tag)) return;
    tagNodes.add(tag);

    graph.nodes.push({
      id: tagNodeUrl(tag),
      url: tagNodeUrl(tag),
      text: `#${tag}`,
      description: typeof tagPagesByTag.get(tag)?.data?.description === 'string'
        ? tagPagesByTag.get(tag)?.data?.description
        : undefined,
      kind: 'tag',
    });

    const prefixes = getTagPrefixes(tag);
    const parent = prefixes[prefixes.length - 2];
    if (parent) {
      ensureTagNode(parent);
      graph.links.push({ source: tagNodeUrl(tag), target: tagNodeUrl(parent) });
    }
  };

  for (const page of pages) {
    if (page.data?.tagPage) continue;

    graph.nodes.push({
      id: page.url,
      url: page.url,
      text: typeof page.data?.title === 'string' && page.data.title
        ? page.data.title
        : page.url,
      description: typeof page.data?.description === 'string'
        ? page.data.description
        : undefined,
      kind: 'page',
      group: sectionOf(page.url),
    });

    const outgoing = page.data?.outgoingLinks;
    if (Array.isArray(outgoing)) {
      for (const href of outgoing) {
        if (typeof href !== 'string' || !href || !knownUrls.has(href)) continue;
        const target = pages.find((candidate) => candidate.url === href);
        if (target?.data?.tagPage) continue;
        graph.links.push({ source: page.url, target: href });
      }
    }

    const tags = page.data?.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (typeof tag !== 'string' || !tag) continue;
        ensureTagNode(tag);
        graph.links.push({ source: page.url, target: tagNodeUrl(tag) });
      }
    }
  }

  return enrichNeighbors(graph);
}
