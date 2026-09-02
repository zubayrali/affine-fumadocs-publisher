import { createHash } from "node:crypto";
import fs from "node:fs/promises";

function fingerprint(documents) {
  return createHash("sha256")
    .update(JSON.stringify(documents.filter((doc) => !doc.inTrash).sort((a, b) => a.id.localeCompare(b.id))))
    .digest("hex");
}

/** Polls a document source and preserves the previous state until refresh succeeds. */
export function createSnapshotPoller(options) {
  const { client, workspaceId, statePath, refresh, log = console.log, error = console.error } = options;
  const pollSeconds = Number.isInteger(options.pollSeconds) && options.pollSeconds >= 15 ? options.pollSeconds : 45;
  if (!client?.listDocuments || !workspaceId || !statePath || !refresh) throw new TypeError("Poller requires client, workspaceId, statePath, and refresh.");
  let running = false; let timer;
  async function poll() {
    if (running) return false;
    running = true;
    try {
      const documents = await client.listDocuments(workspaceId);
      const next = fingerprint(documents);
      const previous = await fs.readFile(statePath, "utf8").then(JSON.parse).catch(() => null);
      if (previous?.fingerprint === next) { log(`[publisher] No AFFiNE changes; checking again in ${pollSeconds}s.`); return false; }
      log(`[publisher] Detected AFFiNE changes across ${documents.length} documents; refreshing snapshot.`);
      await refresh();
      await fs.writeFile(statePath, `${JSON.stringify({ fingerprint: next, updatedAt: new Date().toISOString() }, null, 2)}\n`);
      log("[publisher] Snapshot staged successfully.");
      return true;
    } catch (cause) {
      error("[publisher] Refresh failed:", cause instanceof Error ? cause.message : cause);
      return false;
    } finally { running = false; }
  }
  return {
    poll,
    async start() { await poll(); timer = setInterval(() => void poll(), pollSeconds * 1000); },
    stop() { if (timer) clearInterval(timer); timer = undefined; },
  };
}
