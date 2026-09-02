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

export function validatePublication(metadata) {
  const errors = [];
  if (!metadata?.title?.trim()) errors.push("A document title is required.");
  if (!metadata?.slug?.trim()) errors.push(`Set the ${AFFINE_PUBLICATION_PROPERTIES.slug} property.`);
  if (!metadata?.locale?.trim()) errors.push(`Set the ${AFFINE_PUBLICATION_PROPERTIES.locale} property.`);
  if (metadata?.publish !== true) errors.push(`Set ${AFFINE_PUBLICATION_PROPERTIES.publish} to true.`);
  if (metadata?.draft === true) errors.push("Draft documents cannot be published.");
  return errors;
}
