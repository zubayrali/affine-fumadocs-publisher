function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function responsePayload(text) {
  const events = text.split(/\r?\n\r?\n/).flatMap((event) => event.split(/\r?\n/)
    .filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim())).reverse();
  for (const event of events) { try { return JSON.parse(event); } catch { /* try next */ } }
  try { return JSON.parse(text); } catch { throw new Error("AFFiNE bridge MCP returned invalid JSON-RPC."); }
}

function resultValue(result) {
  if (result?.structuredContent !== undefined) return result.structuredContent;
  const text = result?.content?.filter((item) => item.type === "text").map((item) => item.text).join("\n");
  if (!text) throw new Error("AFFiNE bridge MCP tool returned no structured content.");
  try { return JSON.parse(text); } catch { throw new Error("AFFiNE bridge MCP tool returned non-JSON content."); }
}

/** A read-only client for affine-mcp-server's streamable HTTP endpoint. */
export function createAffineBridgeMcpClient(options) {
  const fetcher = options.fetch ?? globalThis.fetch;
  let id = 0; let sessionId; let initialized = false;
  async function request(method, params, notification = false) {
    const headers = { Accept: "application/json, text/event-stream", "Content-Type": "application/json" };
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;
    const response = await fetcher(options.endpoint, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", ...(notification ? {} : { id: ++id }), method, params }) });
    if (!response.ok) throw new Error(`AFFiNE bridge MCP request failed: ${response.status} ${response.statusText}`);
    sessionId = response.headers.get("mcp-session-id") ?? sessionId;
    if (notification || response.status === 202) return undefined;
    const payload = responsePayload(await response.text());
    if (payload.error) throw new Error(`AFFiNE bridge MCP error ${payload.error.code}: ${payload.error.message}`);
    return payload.result;
  }
  async function callTool(name, args) {
    if (!initialized) {
      await request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "affine-fumadocs-publisher", version: "0.1.0" } });
      await request("notifications/initialized", {}, true); initialized = true;
    }
    const result = await request("tools/call", { name, arguments: args });
    if (!result || result.isError) throw new Error(`AFFiNE bridge MCP ${name} failed.`);
    return resultValue(result);
  }
  return {
    callTool,
    async readDocumentProperties(workspaceId, docId) {
      const value = record(await callTool("list_doc_properties", { workspaceId, docId }));
      return Object.fromEntries((Array.isArray(value?.properties) ? value.properties : []).map(record)
        .filter((item) => item?.set === true && typeof item.name === "string").map((item) => [item.name, item.value]));
    },
    async listDocuments(workspaceId) {
      const documents = []; let after;
      do {
        const value = record(await callTool("list_docs", { workspaceId, first: 200, ...(after ? { after } : {}) }));
        for (const edge of Array.isArray(value?.edges) ? value.edges : []) {
          const node = record(record(edge)?.node);
          if (typeof node?.id === "string") documents.push({ id: node.id, title: typeof node.title === "string" ? node.title : null, updatedAt: typeof node.updatedAt === "string" || typeof node.updatedAt === "number" ? String(node.updatedAt) : null, inTrash: node.inTrash === true });
        }
        const pageInfo = record(value?.pageInfo); after = pageInfo?.hasNextPage === true && typeof pageInfo.endCursor === "string" ? pageInfo.endCursor : undefined;
      } while (after);
      return documents;
    },
    async readDocument(workspaceId, docId) {
      const value = record(await callTool("export_doc_markdown", { workspaceId, docId, includeFrontmatter: false }));
      if (value?.exists !== true || typeof value.markdown !== "string") throw new Error(`AFFiNE bridge MCP could not export document ${docId}.`);
      return value.markdown;
    },
  };
}
