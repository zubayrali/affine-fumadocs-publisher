import test from "node:test";
import assert from "node:assert/strict";
import {
  findLinkedDocumentIds,
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
  const markdown = "[Guide](/workspace/workspace-id/doc-one) and [Private](/workspace/workspace-id/doc-two)";
  assert.deepEqual(findLinkedDocumentIds(markdown), ["doc-one", "doc-two"]);
  assert.equal(
    rewriteAffineDocumentLinks(markdown, new Map([["doc-one", { title: "Guide", slug: "guides/start" }]])),
    "[Guide](/docs/guides/start) and [Private](/workspace/workspace-id/doc-two)",
  );
});
