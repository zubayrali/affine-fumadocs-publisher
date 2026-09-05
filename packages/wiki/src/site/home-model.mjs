/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   href: string,
 *   description?: string,
 *   modified?: string,
 *   tags?: string[],
 *   featured?: boolean,
 *   order?: number,
 *   slug?: string,
 *   startHere?: boolean,
 * }} HomePageEntry
 */

/**
 * @typedef {{
 *   featured: HomePageEntry[],
 *   recent: HomePageEntry[],
 *   startHere?: HomePageEntry,
 * }} HomeModel
 */

/**
 * Lightweight homepage feed stub. Consumers can replace this with
 * AFFiNE-backed compilation once homepage control documents are wired.
 *
 * @param {Iterable<HomePageEntry>} pages
 * @param {{ featuredLimit?: number, recentLimit?: number }} [options]
 * @returns {HomeModel}
 */
export function buildHomeModel(pages, options = {}) {
  const list = [...pages];
  const featuredLimit = options.featuredLimit ?? 4;
  const recentLimit = options.recentLimit ?? 6;

  const byOrderThenTitle = (left, right) =>
    (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    || left.title.localeCompare(right.title);

  const featured = list
    .filter((page) => page.featured === true)
    .sort(byOrderThenTitle)
    .slice(0, featuredLimit);

  const recent = list
    .filter((page) => typeof page.modified === 'string' && page.modified.trim())
    .sort((left, right) => right.modified.localeCompare(left.modified))
    .slice(0, recentLimit);

  const startHere = list.find((page) => page.startHere === true)
    ?? list.find((page) => page.slug === 'start-here' || page.href === '/start-here' || page.href === '/docs/start-here');

  return {
    featured,
    recent,
    startHere,
  };
}
