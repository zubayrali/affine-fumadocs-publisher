/** Native AFFiNE property used for site control documents. */
export const SITE_ROLE_PROPERTY = 'Content Type';

/** Canonical role for the homepage control document. */
export const HOMEPAGE_SITE_ROLE = 'site-homepage';

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function normalizeRole(value) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLocaleLowerCase().replace(/[ _]+/g, '-');
  return normalized || undefined;
}

/**
 * Resolve the site-control role from a publication page's metadata.
 * Accepts either a top-level property or nested `affineProperties`.
 * @param {{ metadata?: Record<string, unknown> }} page
 * @returns {string | undefined}
 */
export function siteRole(page) {
  const metadata = page?.metadata;
  if (!metadata || typeof metadata !== 'object') return undefined;

  const direct = metadata[SITE_ROLE_PROPERTY];
  if (direct !== undefined) return normalizeRole(direct);

  const properties = metadata.affineProperties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return undefined;
  }
  return normalizeRole(/** @type {Record<string, unknown>} */ (properties)[SITE_ROLE_PROPERTY]);
}

/**
 * Site control documents (`Content Type` starting with `site-`) must never
 * become reader routes.
 * @param {{ metadata?: Record<string, unknown> }} page
 */
export function isSiteControlPage(page) {
  return siteRole(page)?.startsWith('site-') === true;
}
