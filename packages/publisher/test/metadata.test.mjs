import test from "node:test";
import assert from "node:assert/strict";
import {
  findLinkedDocumentIds,
  findUnpublishedLinkedDocumentIds,
  metadataFromAllAffineProperties,
  rewriteAffineDocumentLinks,
} from "../src/index.mjs";

test("preserves JSON-safe AFFiNE properties and normalizes tags", () => {
  const metadata = metadataFromAllAffineProperties({
    Title: "Example",
    Slug: "guides/example",
    Locale: "en",
    Publish: true,
    Tags: ["#guide", " guide ", "reference/api"],
    Audience: "Editors",
    Rating: 5,
    Internal: undefined,
  }, "Fallback");

  assert.deepEqual(metadata.tags, ["guide", "reference/api"]);
  assert.deepEqual(metadata.affineProperties, {
    Tags: ["#guide", " guide ", "reference/api"],
    Audience: "Editors",
    Rating: 5,
  });
  assert.equal(metadata.title, "Example");
});

test("rewrites published AFFiNE document links and preserves unknown targets", () => {
  const markdown = [
    "[Guide](/workspace/workspace-id/doc-one)",
    "[Private](/workspace/workspace-id/doc-two)",
    "[](https://affine.local/workspace/workspace-id/doc-one:mode)",
    "Read [[obsidian-style]] remains plain text",
  ].join(" and ");
  const pagesById = new Map([["doc-one", { title: "Guide", slug: "guides/start" }]]);

  assert.deepEqual(findLinkedDocumentIds(markdown), ["doc-one", "doc-two"]);
  assert.deepEqual(findUnpublishedLinkedDocumentIds(markdown, pagesById), ["doc-two"]);
  assert.equal(
    rewriteAffineDocumentLinks(markdown, pagesById),
    [
      "[Guide](/docs/guides/start)",
      "[Private](/workspace/workspace-id/doc-two)",
      "[Guide](/docs/guides/start)",
      "Read [[obsidian-style]] remains plain text",
    ].join(" and "),
  );
});
