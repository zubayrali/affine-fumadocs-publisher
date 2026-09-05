export const AFFINE_PUBLICATION_PROPERTIES = Object.freeze({
  title: "Title",
  slug: "Slug",
  locale: "Locale",
  description: "Description",
  publish: "Publish",
  draft: "Draft",
  unlisted: "Unlisted",
  featured: "Featured",
  order: "Order",
  aliases: "Aliases",
  created: "Created",
  modified: "Modified",
});

export function definePublisherConfig(input) {
  if (!input || typeof input !== "object") throw new TypeError("Publisher configuration must be an object.");
  const required = ["workspaceId", "bridgeUrl", "outputDir"];
  for (const key of required) {
    if (typeof input[key] !== "string" || !input[key].trim()) {
      throw new TypeError(`Publisher configuration requires ${key}.`);
    }
  }
  const locale = typeof input.locale === "string" && input.locale.trim() ? input.locale.trim() : "en";
  return Object.freeze({
    workspaceId: input.workspaceId.trim(),
    bridgeUrl: input.bridgeUrl.trim(),
    outputDir: input.outputDir.trim(),
    locale,
    pollSeconds: Number.isFinite(input.pollSeconds) ? Math.max(15, input.pollSeconds) : 45,
    blobBaseUrl: typeof input.blobBaseUrl === "string" ? input.blobBaseUrl.trim() : undefined,
  });
}

export function metadataFromAffineProperties(properties, title) {
  const text = (name) => typeof properties?.[name] === "string" ? properties[name].trim() || undefined : undefined;
  const bool = (name) => typeof properties?.[name] === "boolean" ? properties[name] : undefined;
  const number = (name) => typeof properties?.[name] === "number" ? properties[name] : undefined;
  const slug = text(AFFINE_PUBLICATION_PROPERTIES.slug);
  const locale = text(AFFINE_PUBLICATION_PROPERTIES.locale);
  const aliases = text(AFFINE_PUBLICATION_PROPERTIES.aliases)?.split(",").map((value) => value.trim()).filter(Boolean);
  return {
    title: text(AFFINE_PUBLICATION_PROPERTIES.title) ?? title,
    slug,
    locale,
    description: text(AFFINE_PUBLICATION_PROPERTIES.description),
    publish: bool(AFFINE_PUBLICATION_PROPERTIES.publish),
    draft: bool(AFFINE_PUBLICATION_PROPERTIES.draft),
    unlisted: bool(AFFINE_PUBLICATION_PROPERTIES.unlisted),
    featured: bool(AFFINE_PUBLICATION_PROPERTIES.featured),
    order: number(AFFINE_PUBLICATION_PROPERTIES.order),
    aliases,
    created: text(AFFINE_PUBLICATION_PROPERTIES.created),
    modified: text(AFFINE_PUBLICATION_PROPERTIES.modified),
  };
}

/**
 * Removes frontmatter that was preserved as a code block by AFFiNE's Markdown
 * importer. Publication metadata belongs in AFFiNE properties, never in the
 * reader-facing article body.
 */
function serializablePropertyValue(value) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map(serializablePropertyValue).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function tagsFromAffineProperties(properties) {
  const value = properties?.Tags ?? properties?.tags;
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return [...new Set(values
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean))];
}

/**
 * Build publication metadata while preserving every JSON-safe AFFiNE property.
 * Reserved publication controls remain top-level; authored properties are
 * exposed under `affineProperties` so templates can render them without
 * leaking loader internals into the public UI.
 */
export function metadataFromAllAffineProperties(properties, title) {
  const source = properties && typeof properties === "object" ? properties : {};
  const publication = metadataFromAffineProperties(source, title);
  const reserved = new Set(Object.values(AFFINE_PUBLICATION_PROPERTIES));
  const affineProperties = Object.fromEntries(
    Object.entries(source).flatMap(([name, value]) => {
      const normalizedName = name.trim();
      if (!normalizedName || reserved.has(normalizedName)) return [];
      const serialized = serializablePropertyValue(value);
      return serialized === undefined ? [] : [[normalizedName, serialized]];
    }),
  );
  const tags = tagsFromAffineProperties(source);

  return Object.fromEntries(
    Object.entries({
      ...publication,
      tags: tags.length > 0 ? tags : undefined,
      affineProperties,
    }).filter(([, value]) => value !== undefined),
  );
}

/**
 * AFFiNE's Markdown export turns LinkedPage references and embed-linked-doc
 * blocks into ordinary Markdown links of the form:
 *   [title](/workspace/<workspaceId>/<docId>)
 * Absolute AFFiNE origins and optional `:mode` / query / hash suffixes are also
 * accepted. Obsidian `[[wikilink]]` syntax is intentionally unsupported.
 */
const AFFINE_DOCUMENT_LINK =
  /\[([^\]]*)\]\((?:https?:\/\/[^)\s]+)?\/?workspace\/[^/)\s]+\/([A-Za-z0-9_-]+)(?:(?::[^)\s#?]*)?(?:\?[^)\s#]*)?(?:#[^)\s]*)?)?\)/g;

export function findLinkedDocumentIds(markdown) {
  const ids = new Set();
  for (const match of String(markdown).matchAll(AFFINE_DOCUMENT_LINK)) {
    if (match[2]) ids.add(match[2]);
  }
  return [...ids];
}

export function findUnpublishedLinkedDocumentIds(markdown, pagesById) {
  return findLinkedDocumentIds(markdown).filter((id) => !pagesById.has(id));
}

export function rewriteAffineDocumentLinks(markdown, pagesById, basePath = "/docs") {
  const prefix = basePath === "/" ? "" : `/${basePath.replace(/^\/+|\/+$/g, "")}`;
  return String(markdown).replace(AFFINE_DOCUMENT_LINK, (original, label, linkedId) => {
    const page = pagesById.get(linkedId);
    if (!page) return original;
    const href = `${prefix}/${page.slug.replace(/^\/+/, "")}`;
    return `[${label || page.title}](${href})`;
  });
}

export function stripLegacyFrontmatter(markdown) {
  const source = typeof markdown === "string" ? markdown.replace(/^\uFEFF/, "") : "";
  const plainFrontmatter = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
  if (plainFrontmatter.test(source)) return source.replace(plainFrontmatter, "");

  const fencedFrontmatter = /^```[ \t]*ya?ml[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/i;
  const match = source.match(fencedFrontmatter);
  if (!match) return source;

  // Only remove a fenced block when it is clearly the old vault metadata,
  // rather than an intentionally authored YAML example.
  const legacyFields = /^(?:slug|locale|publish|draft|sourcePath|contentSource):/m;
  return legacyFields.test(match[1]) ? source.slice(match[0].length).replace(/^\r?\n/, "") : source;
}

/**
 * AFFiNE may export an opening fence with a space before its language
 * (``` yaml). Normalize it before MDX sees it; otherwise a later bare fence
 * can be rewritten as a second opening fence and swallow the whole article.
 */
export function normalizeMarkdownFences(markdown) {
  const knownLanguages = new Set(["bash", "c", "cpp", "css", "go", "html", "java", "js", "json", "jsx", "markdown", "md", "php", "python", "py", "rs", "rust", "sh", "sql", "text", "ts", "tsx", "xml", "yaml", "yml"]);
  let open = false;
  return markdown.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)```(?:\s*([^\s`]+))?\s*$/);
    if (!match) return line;
    const [, indent, language] = match;
    // Older publisher previews rewrote a closing fence to ` ```text`.
    // Treat that impossible-in-a-code-block marker as the closer too, so a
    // regenerated snapshot can repair existing output in place.
    if (open && (!language || language.toLowerCase() === "text")) {
      open = false;
      return `${indent}\`\`\``;
    }
    if (!open) {
      open = true;
      const normalized = language?.toLowerCase();
      return `${indent}\`\`\`${normalized && knownLanguages.has(normalized) ? normalized : "text"}`;
    }
    return line;
  }).join("\n");
}

export function validatePublication(metadata) {
  const errors = [];
  if (!metadata?.title?.trim()) errors.push("A document title is required.");
  if (!metadata?.slug?.trim()) errors.push(`Set the ${AFFINE_PUBLICATION_PROPERTIES.slug} property.`);
  if (!metadata?.locale?.trim()) errors.push(`Set the ${AFFINE_PUBLICATION_PROPERTIES.locale} property.`);
  if (metadata?.publish !== true) errors.push(`Set ${AFFINE_PUBLICATION_PROPERTIES.publish} to true.`);
  if (metadata?.draft === true) errors.push("Draft documents cannot be published.");
  return errors;
}

export {
  findAffineDatabaseBlockIds,
  replaceAffineDatabaseMarkers,
  resolveAffineDatabaseSources,
} from "./databases.mjs";
