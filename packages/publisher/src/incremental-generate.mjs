/**
 * Decide which AFFiNE locales need a full MCP export vs reuse of affine/<locale>/.
 * Compares prior per-page AFFiNE updatedAt revisions (not manifest `modified`,
 * which can be a date-only property) and probes brand-new workspace docs.
 */

/** Parse AFFINE_GENERATE_LOCALES — same shape as PUBLISHER_BUILD_LOCALES. */
export function parseGenerateLocales(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed === "all" || trimmed === "*") return "all";
  const locales = [...new Set(
    trimmed.split(",").map((part) => part.trim()).filter(Boolean),
  )];
  return locales.length > 0 ? locales : undefined;
}

export function normalizeAffineTimestamp(value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const parsed = /^\d+$/.test(trimmed) ? new Date(Number(trimmed)) : new Date(trimmed);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed.toISOString();
}

export function revisionsFromDocuments(pageIds, documents) {
  const byId = new Map(documents.filter((doc) => !doc.inTrash).map((doc) => [doc.id, doc]));
  const revisions = {};
  for (const id of pageIds) {
    const live = byId.get(id);
    const stamp = normalizeAffineTimestamp(live?.updatedAt);
    if (stamp) revisions[id] = stamp;
  }
  return revisions;
}

export function planLocaleGeneration(options) {
  const localeCodes = [...options.localeCodes];
  const reasons = {};
  const generate = new Set();
  const knownManifestIds = knownIds(options.previousPages);
  const seen = new Set(options.seenDocumentIds ?? [...knownManifestIds]);

  if (options.force === "all") {
    for (const code of localeCodes) {
      generate.add(code);
      reasons[code] = "forced-all";
    }
    return finalize(localeCodes, generate, reasons, unknownIds(options.documents, seen));
  }
  if (Array.isArray(options.force)) {
    for (const code of options.force) {
      if (!localeCodes.includes(code)) continue;
      generate.add(code);
      reasons[code] = "forced-list";
    }
    return finalize(localeCodes, generate, reasons, unknownIds(options.documents, seen));
  }

  const unknownDocumentIds = unknownIds(options.documents, seen);
  const byId = new Map(
    options.documents.filter((doc) => !doc.inTrash).map((doc) => [doc.id, doc]),
  );
  const previousRevisions = options.previousRevisions ?? {};

  for (const code of localeCodes) {
    const pages = options.previousPages[code];
    if (!pages) {
      generate.add(code);
      reasons[code] = "missing-manifest";
      continue;
    }
    const revisions = previousRevisions[code];
    if (!revisions) {
      generate.add(code);
      reasons[code] = "missing-revisions";
      continue;
    }
    if (pages.length === 0) continue;

    for (const page of pages) {
      const live = byId.get(page.id);
      if (!live) {
        generate.add(code);
        reasons[code] = `removed:${page.id}`;
        break;
      }
      const previous = revisions[page.id];
      const current = normalizeAffineTimestamp(live.updatedAt);
      if (!previous || !current || previous !== current) {
        generate.add(code);
        reasons[code] = previous && current ? `updated:${page.id}` : `timestamp:${page.id}`;
        break;
      }
    }
  }

  for (const code of options.publishableUnknownLocales ?? []) {
    if (!localeCodes.includes(code)) continue;
    generate.add(code);
    reasons[code] ??= "new-publishable-doc";
  }

  for (const code of localeCodes) {
    if (generate.has(code)) continue;
    const pages = options.previousPages[code];
    if (pages && pages.length === 0 && unknownDocumentIds.length === 0) {
      generate.add(code);
      reasons[code] = "empty-manifest";
    }
  }

  return finalize(localeCodes, generate, reasons, unknownDocumentIds);
}

function knownIds(previousPages) {
  const ids = new Set();
  for (const pages of Object.values(previousPages)) {
    for (const page of pages ?? []) ids.add(page.id);
  }
  return ids;
}

function unknownIds(documents, known) {
  return documents
    .filter((doc) => !doc.inTrash && !known.has(doc.id))
    .map((doc) => doc.id)
    .sort();
}

function finalize(localeCodes, generate, reasons, unknownDocumentIds) {
  const orderedGenerate = localeCodes.filter((code) => generate.has(code));
  const skip = localeCodes.filter((code) => !generate.has(code));
  return { generate: orderedGenerate, skip, unknownDocumentIds, reasons };
}
