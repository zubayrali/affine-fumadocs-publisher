/**
 * AFFiNE Markdown marks unsupported database blocks as HTML comments.
 * Snapshot pipelines replace those markers with MDX `<AffineDatabase />` tags.
 */

const DATABASE_MARKER =
  /<!--\s*unsupported:\s*flavour=affine:database\s+blockId=([^\s]+)\s*-->/g;

function decodeMarkerId(value) {
  return value
    .replaceAll("&#45;", "-")
    .replaceAll("&#95;", "_")
    .replaceAll("&amp;", "&");
}

/** @param {string} markdown */
export function findAffineDatabaseBlockIds(markdown) {
  return [...String(markdown).matchAll(DATABASE_MARKER)].map((match) =>
    decodeMarkerId(match[1]),
  );
}

/**
 * @param {string} markdown
 * @param {ReadonlyMap<string, string>} sources blockId → public src path
 * @param {string} [importPath] MDX import module for AffineDatabase
 */
export function replaceAffineDatabaseMarkers(
  markdown,
  sources,
  importPath = "@affine-fumadocs/wiki/databases",
) {
  let replaced = false;
  const body = String(markdown).replace(DATABASE_MARKER, (marker, encodedId) => {
    const source = sources.get(decodeMarkerId(encodedId));
    if (!source) return marker;
    replaced = true;
    return `<AffineDatabase src=${JSON.stringify(source)} />`;
  });
  return replaced
    ? `import { AffineDatabase } from ${JSON.stringify(importPath)};\n\n${body}`
    : body;
}

/**
 * Resolve on-disk database JSON snapshots for a document into MDX src paths.
 * @param {string} publicRoot
 * @param {string} docId
 * @param {string[]} blockIds
 * @param {(path: string) => Promise<boolean>} [exists]
 */
export async function resolveAffineDatabaseSources(
  publicRoot,
  docId,
  blockIds,
  exists,
) {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const check = exists ?? (async (filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });

  /** @type {Map<string, string>} */
  const sources = new Map();
  for (const blockId of blockIds) {
    const relative = path.posix.join("affine-database", docId, `${blockId}.json`);
    const absolute = path.join(publicRoot, ...relative.split("/"));
    if (await check(absolute)) {
      sources.set(blockId, `/${relative}`);
    }
  }
  return sources;
}
