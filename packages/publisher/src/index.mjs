export const AFFINE_PUBLICATION_PROPERTIES = Object.freeze({
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
    title,
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
