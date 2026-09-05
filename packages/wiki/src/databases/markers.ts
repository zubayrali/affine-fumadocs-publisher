const DATABASE_MARKER =
  /<!--\s*unsupported:\s*flavour=affine:database\s+blockId=([^\s]+)\s*-->/g;

function decodeMarkerId(value: string) {
  return value
    .replaceAll('&#45;', '-')
    .replaceAll('&#95;', '_')
    .replaceAll('&amp;', '&');
}

/** Collect AFFiNE database block IDs from unsupported-block markers in Markdown. */
export function findAffineDatabaseBlockIds(markdown: string): string[] {
  return [...markdown.matchAll(DATABASE_MARKER)].map((match) =>
    decodeMarkerId(match[1]!),
  );
}

/**
 * Replace unsupported database markers with `<AffineDatabase src="…" />`.
 * When at least one marker is replaced, prepends an import for the MDX component.
 */
export function replaceAffineDatabaseMarkers(
  markdown: string,
  sources: ReadonlyMap<string, string>,
  importPath = '@affine-fumadocs/wiki/databases',
): string {
  let replaced = false;
  const body = markdown.replace(DATABASE_MARKER, (_marker, encodedId: string) => {
    const source = sources.get(decodeMarkerId(encodedId));
    if (!source) return _marker;
    replaced = true;
    return `<AffineDatabase src=${JSON.stringify(source)} />`;
  });
  return replaced
    ? `import { AffineDatabase } from ${JSON.stringify(importPath)};\n\n${body}`
    : body;
}
