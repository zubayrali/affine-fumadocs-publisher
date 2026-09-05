import fs from 'node:fs/promises';
import path from 'node:path';
import { createAffineBridgeMcpClient } from '@affine-fumadocs/publisher/bridge-client';
import {
  findLinkedDocumentIds,
  findUnpublishedLinkedDocumentIds,
  findAffineDatabaseBlockIds,
  metadataFromAllAffineProperties,
  normalizeMarkdownFences,
  replaceAffineDatabaseMarkers,
  resolveAffineDatabaseSources,
  rewriteAffineDocumentLinks,
  stripLegacyFrontmatter,
  validatePublication,
} from '@affine-fumadocs/publisher';
import { materializeAffineBlobAssets, replaceDirectoryAtomically } from '@affine-fumadocs/publisher/snapshot';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in .env.publisher.`);
  return value;
};
const safeSlug = (slug) => {
  const normalized = path.posix.normalize(slug).replace(/^\/+/, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../')) throw new Error(`Invalid Slug: ${slug}`);
  return normalized;
};
const yaml = (data) => Object.entries(data).filter(([, value]) => value !== undefined)
  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
const rootIndex = () => `---
title: "Documentation"
description: "Published from AFFiNE. Browse the collection from the sidebar."
---

# Documentation

This documentation is published from AFFiNE. Use the sidebar or search to explore the collection.
`;
// AFFiNE Markdown may contain literal braces (for example, a user's note syntax).
// Plain Fumadocs MDX treats them as JavaScript expressions, so preserve them as text.
const mdxSafe = (markdown) => markdown
  .replace(/(?<!\\)[{}]/g, (character) => `\\${character}`)
  .replace(/<!--([\s\S]*?)-->/g, (_comment, body) => `{/*${body.replace(/\*\//g, '* /')}*/}`);

const workspaceId = required('AFFINE_WORKSPACE_ID');
const endpoint = required('AFFINE_BRIDGE_MCP_URL');
const client = createAffineBridgeMcpClient({ endpoint, token: process.env.AFFINE_BRIDGE_MCP_TOKEN?.trim() });
const output = path.join(process.cwd(), 'content', 'docs');
const publicRoot = path.join(process.cwd(), 'public');
const assets = new Map();
const publishErrors = [];
const warnings = [];
const docs = await client.listDocuments(workspaceId);
const pages = [];

for (const doc of docs) {
  if (doc.inTrash) continue;
    const metadata = metadataFromAllAffineProperties(await client.readDocumentProperties(workspaceId, doc.id), doc.title ?? undefined);
  if (metadata.publish !== true || metadata.draft === true) continue;
  const errors = validatePublication(metadata);
  if (errors.length) { publishErrors.push({ docId: doc.id, errors }); continue; }
  pages.push({ doc, metadata, slug: safeSlug(metadata.slug) });
}
if (publishErrors.length) throw new Error(`Cannot publish ${publishErrors.length} AFFiNE document(s): ${publishErrors.map((item) => item.docId).join(', ')}`);

  const pagesById = new Map(pages.map((page) => [page.doc.id, {
    title: page.metadata.title ?? page.doc.title ?? page.slug,
    slug: page.slug,
  }]));

  await replaceDirectoryAtomically(output, async (temporary) => {
    for (const page of pages) {
      const raw = await client.readDocument(workspaceId, page.doc.id);
      const linkedDocumentIds = findLinkedDocumentIds(raw);
      const unpublishedLinks = findUnpublishedLinkedDocumentIds(raw, pagesById);
      if (unpublishedLinks.length) {
        warnings.push({
          docId: page.doc.id,
          message: `Left ${unpublishedLinks.length} AFFiNE document link(s) unchanged because the target is not published: ${unpublishedLinks.join(', ')}`,
        });
      }
      const rewritten = rewriteAffineDocumentLinks(stripLegacyFrontmatter(raw), pagesById);
      // Keep HTML database markers intact through materialize; mdxSafe converts
      // `<!-- -->` to JSX comments and would hide them from the marker regex.
      const withBlobs = await materializeAffineBlobAssets({
        markdown: normalizeMarkdownFences(rewritten),
        workspaceId,
        publicRoot,
        assets,
        cookie: process.env.AFFINE_BLOB_COOKIE?.trim(),
        blobBaseUrl: process.env.AFFINE_BLOB_BASE_URL,
        onUnavailable: (_key, message) => { throw new Error(message); },
      });
      const databaseIds = findAffineDatabaseBlockIds(withBlobs);
      const databaseSources = await resolveAffineDatabaseSources(
        publicRoot,
        page.doc.id,
        databaseIds,
      );
      const withDatabases = replaceAffineDatabaseMarkers(withBlobs, databaseSources);
      // Protect the injected MDX import from brace escaping in mdxSafe.
      const importPrefix = withDatabases.match(
        /^import \{ AffineDatabase \} from "[^"]+";\n\n/,
      );
      const markdown = importPrefix
        ? `${importPrefix[0]}${mdxSafe(withDatabases.slice(importPrefix[0].length))}`
        : mdxSafe(withDatabases);
      const destination = path.join(temporary, `${page.slug}.mdx`);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      const outgoingLinks = linkedDocumentIds.flatMap((id) => {
        const linked = pagesById.get(id);
        return linked ? [`/docs/${linked.slug}`] : [];
      });
      await fs.writeFile(destination, `---\n${yaml({ ...page.metadata, outgoingLinks, affineDocId: page.doc.id })}\n---\n\n${markdown.trim()}\n`);
  }
  // A fresh AFFiNE workspace normally has no document with the reserved
  // `index` slug. Still generate a docs-root page so `/docs` is always valid.
  if (!pages.some((page) => page.slug === 'index')) {
    await fs.writeFile(path.join(temporary, 'index.mdx'), rootIndex());
  }
  await fs.writeFile(path.join(temporary, 'meta.json'), `${JSON.stringify({ pages: pages.map((page) => page.slug) }, null, 2)}\n`);
});
if (warnings.length) {
  console.warn(`Published with ${warnings.length} warning(s):`);
  for (const warning of warnings) console.warn(`- ${warning.docId}: ${warning.message}`);
}
console.log(`Published ${pages.length} AFFiNE documents into content/docs.`);
