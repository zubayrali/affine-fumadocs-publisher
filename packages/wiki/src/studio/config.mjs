const PORTAL_LAYOUTS = new Set(['cards', 'library', 'list', 'media', 'timeline']);
const PORTAL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {import('./types.ts').PublishingStudioPortalConfig}
 */
function parsePortal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Portal config must be an object');
  }
  const portal = /** @type {Record<string, unknown>} */ (value);
  const id = text(portal.id);
  if (!id || !PORTAL_ID.test(id)) {
    throw new Error(`Unsafe portal id: ${String(portal.id)}`);
  }
  const routeRaw = text(portal.route);
  if (!routeRaw) throw new Error(`Portal ${id} requires a route`);
  const label = text(portal.label);
  if (!label) throw new Error(`Portal ${id} requires a label`);
  const collection = text(portal.collection);
  if (!collection) throw new Error(`Portal ${id} requires a collection`);

  const layout = text(portal.layout) ?? 'cards';
  if (!PORTAL_LAYOUTS.has(layout)) {
    throw new Error(`Portal ${id} has unsupported layout: ${layout}`);
  }

  return {
    id,
    route: routeRaw.replace(/^\/+|\/+$/g, ''),
    label,
    description: text(portal.description),
    collection,
    layout: /** @type {import('./types.ts').PortalLayout} */ (layout),
    locales: portal.locales === undefined ? undefined : stringList(portal.locales),
    slugPrefix: text(portal.slugPrefix),
    required: portal.required === true,
    properties: stringList(portal.properties),
  };
}

/**
 * Validate and normalize Publishing Studio configuration without Zod.
 * @param {unknown} value
 * @returns {import('./types.ts').PublishingStudioConfig}
 */
export function parsePublishingStudioConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Publishing studio config must be an object');
  }
  const input = /** @type {Record<string, unknown>} */ (value);
  if (input.version !== 1) {
    throw new Error('Publishing studio config version must be 1');
  }

  const portals = Array.isArray(input.portals)
    ? input.portals.map(parsePortal)
    : [];

  const editorialRaw = input.editorial && typeof input.editorial === 'object' && !Array.isArray(input.editorial)
    ? /** @type {Record<string, unknown>} */ (input.editorial)
    : {};
  const recommended = editorialRaw.recommendedProperties === undefined
    ? ['Description', 'Translation Key']
    : stringList(editorialRaw.recommendedProperties);

  return {
    version: 1,
    portals,
    editorial: {
      recommendedProperties: recommended,
    },
  };
}

/**
 * Minimal structural check for a studio snapshot the UI can render.
 * @param {unknown} value
 * @returns {value is import('./types.ts').StudioSnapshot}
 */
export function isStudioSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = /** @type {Record<string, unknown>} */ (value);
  if (snapshot.version !== 1) return false;
  if (typeof snapshot.generatedAt !== 'string') return false;
  if (typeof snapshot.locale !== 'string') return false;
  if (!snapshot.summary || typeof snapshot.summary !== 'object') return false;
  if (!Array.isArray(snapshot.collections)) return false;
  if (!Array.isArray(snapshot.portals)) return false;
  if (!Array.isArray(snapshot.documents)) return false;
  if (!Array.isArray(snapshot.diagnostics)) return false;
  return true;
}
