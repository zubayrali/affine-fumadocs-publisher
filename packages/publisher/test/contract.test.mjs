import test from "node:test";
import assert from "node:assert/strict";
import { definePublisherConfig, metadataFromAffineProperties, validatePublication } from "../src/index.mjs";
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
