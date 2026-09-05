const FEATURE_DEFAULTS = Object.freeze({
  annotations: true,
  backlinks: true,
  canvas: true,
  citations: true,
  databases: true,
  graph: true,
  lightbox: true,
  linkPreviews: true,
  math: true,
  mermaid: true,
  multilingual: true,
  properties: true,
  publishingStudio: true,
  readerMode: true,
  review: true,
  rss: true,
  search: true,
  sidenotes: true,
  slides: true,
  tags: true,
  transclusion: true,
});

/**
 * Validate and normalize the small interface a wiki application must own.
 * Renderer and publishing implementations stay behind this configuration seam.
 * @param {import('./index.d.ts').WikiConfigInput} input
 * @returns {import('./index.d.ts').WikiConfig}
 */
export function defineWikiConfig(input) {
  if (!input?.site?.name?.trim()) throw new Error('site.name is required');
  const locales = input.locales?.length
    ? input.locales
    : [{ code: 'en', label: 'English', languageTag: 'en', dir: 'ltr' }];
  const codes = new Set();
  for (const locale of locales) {
    if (!/^[a-z][a-z0-9-]*$/.test(locale.code)) throw new Error(`Unsafe locale code: ${locale.code}`);
    if (codes.has(locale.code)) throw new Error(`Duplicate locale code: ${locale.code}`);
    codes.add(locale.code);
  }
  return Object.freeze({
    site: Object.freeze({ ...input.site }),
    locales: Object.freeze(locales.map(locale => Object.freeze({
      ...locale,
      dir: locale.dir === 'rtl' ? 'rtl' : 'ltr',
    }))),
    features: Object.freeze({ ...FEATURE_DEFAULTS, ...input.features }),
  });
}

/** @param {unknown} tag @returns {string} */
export function normalizeTag(tag) {
  return typeof tag === "string" ? tag.trim().replace(/^#+/, "") : "";
}

/** @param {unknown} value @returns {string[]} */
export function normalizeTags(value) {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

/** @param {string} tag @returns {string[]} */
export function getTagPrefixes(tag) {
  const segments = normalizeTag(tag).split("/").filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

/** @param {string} tag @param {string} [basePath] @returns {string} */
export function tagHref(tag, basePath = "/docs/tags") {
  const encoded = normalizeTag(tag).split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `${basePath.replace(/\/$/, "")}/${encoded}`;
}

/** @param {string} key @returns {string} */
export function formatPropertyLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase())
    .trim();
}

/**
 * @param {unknown} properties
 * @param {Iterable<string>} [hiddenKeys]
 * @returns {Array<[string, string | number | boolean | Array<string | number | boolean | null>]>}
 */
export function getDisplayProperties(properties, hiddenKeys = []) {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) return [];
  const hidden = new Set(hiddenKeys);
  /** @param {unknown} value */
  const scalar = (value) => value === null || ["string", "number", "boolean"].includes(typeof value);

  return Object.entries(properties).filter(([key, value]) => {
    if (!key || key.startsWith("_") || hidden.has(key) || value == null || typeof value === "function") return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0 && value.every(scalar);
    return scalar(value);
  });
}

/**
 * @param {string} currentUrl
 * @param {Iterable<{ url: string, data?: Record<string, unknown> }>} pages
 */
export function getBacklinks(currentUrl, pages) {
  return [...pages].filter((page) => {
    const links = page.data?.outgoingLinks;
    return Array.isArray(links) && links.includes(currentUrl);
  });
}

/**
 * Pages with no inbound published links. Index/home roots and tag listing pages
 * are excluded so the orphan list stays useful for authored notes.
 * @param {Iterable<{ url: string, data?: Record<string, unknown> }>} pages
 * @param {{ rootUrls?: Iterable<string>, excludeUrlPrefix?: string }} [options]
 */
export function getOrphanPages(pages, options = {}) {
  const list = [...pages];
  const incoming = new Set();
  for (const page of list) {
    const links = page.data?.outgoingLinks;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      if (typeof link === "string" && link) incoming.add(link);
    }
  }

  const roots = new Set(options.rootUrls ?? ["/docs", "/docs/", "/docs/index"]);
  const excludePrefix = options.excludeUrlPrefix ?? "/docs/tags";

  return list.filter((page) => {
    if (roots.has(page.url) || page.url === "/docs/index") return false;
    if (excludePrefix && page.url.startsWith(excludePrefix)) return false;
    return !incoming.has(page.url);
  });
}

export { FEATURE_DEFAULTS };
