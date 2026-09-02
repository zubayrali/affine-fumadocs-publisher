import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function extensionFor(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  return "webp";
}

/** Writes a replacement snapshot without ever leaving a partially-written target. */
export async function replaceDirectoryAtomically(target, write) {
  const parent = path.dirname(target);
  const temporary = path.join(parent, `.${path.basename(target)}.tmp-${process.pid}-${Date.now()}`);
  const previous = `${target}.previous`;
  await fs.mkdir(parent, { recursive: true });
  await fs.rm(temporary, { recursive: true, force: true });
  await write(temporary);
  await fs.rm(previous, { recursive: true, force: true });
  try { await fs.rename(target, previous); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  try {
    await fs.rename(temporary, target);
    await fs.rm(previous, { recursive: true, force: true });
  } catch (error) {
    try { await fs.rename(previous, target); } catch { /* preserve original error */ }
    throw error;
  }
}

/**
 * Copies affine://blob references into content-addressed static files and rewrites
 * Markdown/HTML image URLs. Callers control diagnostics through onUnavailable.
 */
export async function materializeAffineBlobAssets(options) {
  const { markdown, workspaceId, publicRoot, assets, cookie, onUnavailable, fetch: fetcher = globalThis.fetch } = options;
  const baseUrl = (options.blobBaseUrl ?? "http://localhost:3010").replace(/\/+$/, "");
  const keys = [...markdown.matchAll(/affine:\/\/blob\/[^\s)"']+/g)].map(([value]) => value.slice("affine://blob/".length));
  for (const rawKey of new Set(keys)) {
    if (assets.has(rawKey)) continue;
    if (!cookie) {
      onUnavailable?.(rawKey, "AFFINE_BLOB_COOKIE is required to download this attachment.");
      assets.set(rawKey, "/affine-unavailable-blob.svg");
      continue;
    }
    let key = rawKey;
    try { key = decodeURIComponent(rawKey); } catch { /* opaque key remains valid */ }
    try {
      const response = await fetcher(`${baseUrl}/api/workspaces/${encodeURIComponent(workspaceId)}/blobs/${encodeURIComponent(key)}`, {
        headers: { Cookie: cookie, "x-affine-version": "0.26.0" },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const mime = response.headers.get("content-type") ?? "application/octet-stream";
      const fileName = `${createHash("sha256").update(key).digest("hex")}.${extensionFor(mime)}`;
      await fs.mkdir(path.join(publicRoot, "affine-blobs"), { recursive: true });
      await fs.writeFile(path.join(publicRoot, "affine-blobs", fileName), Buffer.from(await response.arrayBuffer()));
      assets.set(rawKey, `/affine-blobs/${fileName}`);
    } catch (error) {
      onUnavailable?.(rawKey, `Could not download AFFiNE blob: ${error instanceof Error ? error.message : String(error)}`);
      assets.set(rawKey, "/affine-unavailable-blob.svg");
    }
  }
  return markdown
    .replace(/(\!\[[^\]]*\]\()affine:\/\/blob\/([^)\s]+)(\))/g, (_match, before, key, after) => `${before}${assets.get(key) ?? "/affine-unavailable-blob.svg"}${after}`)
    .replace(/(<img\b[^>]*\bsrc=["'])affine:\/\/blob\/([^"']+)(["'][^>]*>)/gi, (_match, before, key, after) => `${before}${assets.get(key) ?? "/affine-unavailable-blob.svg"}${after}`);
}
