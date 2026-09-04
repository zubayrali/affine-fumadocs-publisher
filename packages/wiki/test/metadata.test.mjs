import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPropertyLabel,
  getBacklinks,
  getDisplayProperties,
  getTagPrefixes,
  normalizeTags,
  tagHref,
} from "../src/index.mjs";

test("normalizes tags and preserves hierarchical prefixes", () => {
  assert.deepEqual(normalizeTags(["#guide", " guide ", "api/http"]), ["guide", "api/http"]);
  assert.deepEqual(getTagPrefixes("api/http/client"), ["api", "api/http", "api/http/client"]);
  assert.equal(tagHref("api/http"), "/docs/tags/api/http");
});

test("finds backlinks from generated outgoing-link metadata", () => {
  const pages = [
    { url: "/docs/one", data: { outgoingLinks: ["/docs/two"] } },
    { url: "/docs/two", data: { outgoingLinks: [] } },
  ];
  assert.deepEqual(getBacklinks("/docs/two", pages), [pages[0]]);
});

test("selects safe display properties", () => {
  const entries = getDisplayProperties({
    audience: "Editors",
    rating: 5,
    published: true,
    topics: ["one", "two"],
    empty: "",
    internal: { secret: true },
    _loader: "hidden",
  });

  assert.deepEqual(entries, [
    ["audience", "Editors"],
    ["rating", 5],
    ["published", true],
    ["topics", ["one", "two"]],
  ]);
  assert.equal(formatPropertyLabel("reviewStatus"), "Review Status");
});
