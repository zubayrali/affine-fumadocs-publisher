import test from "node:test";
import assert from "node:assert/strict";
import { definePublisherConfig, metadataFromAffineProperties, normalizeMarkdownFences, stripLegacyFrontmatter, validatePublication } from "../src/index.mjs";
import { createAffineBridgeMcpClient } from "../src/bridge-client.mjs";
import { materializeAffineBlobAssets } from "../src/snapshot.mjs";
import { createSnapshotPoller } from "../src/poller.mjs";

test("normalizes generic configuration", () => {
  assert.deepEqual(definePublisherConfig({ workspaceId: " ws ", bridgeUrl: "http://127.0.0.1:3333/mcp", outputDir: "./snapshot" }), {
    workspaceId: "ws", bridgeUrl: "http://127.0.0.1:3333/mcp", outputDir: "./snapshot", locale: "en", pollSeconds: 45, blobBaseUrl: undefined,
  });
});

test("requires native AFFiNE publication fields", () => {
  const metadata = metadataFromAffineProperties({ Slug: "guides/getting-started", Locale: "en", Publish: true }, "Getting started");
  assert.deepEqual(validatePublication(metadata), []);
  assert.match(validatePublication({ title: "Draft", slug: "draft", locale: "en", publish: true, draft: true })[0], /Draft/);
});

test("prefers the native AFFiNE Title property over the document name", () => {
  const metadata = metadataFromAffineProperties(
    { Title: "On Faqr: The Secret of the Path", Slug: "articles/on-faqr" },
    "on-faqr",
  );
  assert.equal(metadata.title, "On Faqr: The Secret of the Path");
});

test("removes legacy vault frontmatter and preserves the AFFiNE article", () => {
  const legacy = "``` yaml\ntitle: Old title\nslug: dictionary/example\nlocale: en\npublish: true\nsourcePath: dictionary/example.md\ncontentSource: affine-import\n```\n\n# Article\n";
  assert.equal(stripLegacyFrontmatter(legacy), "# Article\n");
  assert.equal(stripLegacyFrontmatter(legacy.replace("``` yaml", "```yaml")), "# Article\n");
  assert.equal(stripLegacyFrontmatter("``` yaml\nanswer: 42\n```\n"), "``` yaml\nanswer: 42\n```\n");
});

test("normalizes spaced AFFiNE fence languages without corrupting closers", () => {
  assert.equal(normalizeMarkdownFences("``` yaml\nanswer: 42\n```\nText"), "```yaml\nanswer: 42\n```\nText");
  assert.equal(normalizeMarkdownFences("``` yaml\nanswer: 42\n```text\nText"), "```yaml\nanswer: 42\n```\nText");
});

test("initializes a token-protected streamable MCP bridge once", async () => {
  const calls = [];
  const client = createAffineBridgeMcpClient({
    endpoint: "http://127.0.0.1:3333/mcp",
    token: "test-token",
    fetch: async (_url, request) => {
      calls.push({ headers: request.headers, body: JSON.parse(request.body) });
      const method = calls.at(-1).body.method;
      const body = method === "tools/call"
        ? { jsonrpc: "2.0", id: 2, result: { structuredContent: { ok: true } } }
        : { jsonrpc: "2.0", id: 1, result: {} };
      return new Response(JSON.stringify(body), { status: 200, headers: { "mcp-session-id": "session" } });
    },
  });
  assert.deepEqual(await client.callTool("ping", {}), { ok: true });
  assert.equal(calls.filter((call) => call.body.method === "initialize").length, 1);
  assert.equal(calls.at(-1).headers.Authorization, "Bearer test-token");
});

test("copies AFFiNE blobs into content-addressed assets", async () => {
  const root = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp("/tmp/affine-publisher-"));
  const output = await materializeAffineBlobAssets({
    markdown: "![Diagram](affine://blob/example-key)", workspaceId: "workspace", publicRoot: root,
    assets: new Map(), cookie: "session=private", blobBaseUrl: "http://affine.test",
    fetch: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } }),
  });
  assert.match(output, /^!\[Diagram\]\(\/affine-blobs\/[a-f0-9]{64}\.png\)$/);
});

test("refreshes once per document fingerprint", async () => {
  const statePath = `${await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp("/tmp/affine-poller-"))}/state.json`;
  let refreshes = 0;
  const poller = createSnapshotPoller({
    client: { listDocuments: async () => [{ id: "doc", inTrash: false }] }, workspaceId: "workspace", statePath,
    refresh: async () => { refreshes += 1; }, log: () => {}, error: () => {},
  });
  assert.equal(await poller.poll(), true);
  assert.equal(await poller.poll(), false);
  assert.equal(refreshes, 1);
});

test("refreshes when only the AFFiNE Yjs source revision changes", async () => {
  const statePath = `${await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp("/tmp/affine-poller-canvas-"))}/state.json`;
  let sourceRevision = "canvas-v1";
  let refreshes = 0;
  const poller = createSnapshotPoller({
    client: { listDocuments: async () => [{ id: "doc", inTrash: false, sourceRevision }] },
    workspaceId: "workspace",
    statePath,
    refresh: async () => { refreshes += 1; },
    log: () => {},
    error: () => {},
  });
  assert.equal(await poller.poll(), true);
  assert.equal(await poller.poll(), false);
  sourceRevision = "canvas-v2";
  assert.equal(await poller.poll(), true);
  assert.equal(refreshes, 2);
});

test("refreshes once when a publisher process restarts even with the same fingerprint", async () => {
  const statePath = `${await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp("/tmp/affine-poller-restart-"))}/state.json`;
  const options = { client: { listDocuments: async () => [{ id: "doc", inTrash: false }] }, workspaceId: "workspace", statePath, log: () => {}, error: () => {} };
  let refreshes = 0;
  await createSnapshotPoller({ ...options, refresh: async () => { refreshes += 1; } }).poll();
  await createSnapshotPoller({ ...options, refresh: async () => { refreshes += 1; } }).poll();
  assert.equal(refreshes, 2);
});
