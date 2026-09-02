import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function localToken(runtimeDir) {
  const tokenPath = path.join(runtimeDir, "bridge.token");
  await mkdir(runtimeDir, { recursive: true, mode: 0o700 });
  try { const token = (await readFile(tokenPath, "utf8")).trim(); if (token) return token; } catch { /* create below */ }
  const token = randomBytes(32).toString("base64url");
  await writeFile(tokenPath, `${token}\n`, { mode: 0o600 }); await chmod(tokenPath, 0o600); return token;
}

async function waitForHealth(url, attempts = 30) {
  let lastError = "not ready";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(2_000) }); if (response.ok) return; lastError = `HTTP ${response.status}`; }
    catch (cause) { lastError = cause instanceof Error ? cause.message : String(cause); }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`AFFiNE bridge never became healthy at ${url}: ${lastError}`);
}

/** Starts a loopback read-only bridge and a publisher child with the generated bridge token. */
export async function startReadOnlyBridgePublisher(options) {
  const token = await localToken(options.runtimeDir);
  const healthUrl = new URL("/healthz", options.bridgeUrl).toString();
  const bridgePort = new URL(options.bridgeUrl).port || "3333";
  const baseEnv = options.environment ?? process.env;
  const bridge = spawn(options.bridgeCommand, options.bridgeArgs ?? [], {
    cwd: options.cwd, stdio: "inherit", env: { ...baseEnv, ...options.bridgeEnvironment, AFFINE_MCP_HTTP_TOKEN: token, AFFINE_TOOL_PROFILE: "read_only", MCP_TRANSPORT: "http", PORT: bridgePort },
  });
  const unexpected = (name, code, signal) => options.onUnexpectedExit?.(name, code ?? signal ?? "unknown");
  bridge.once("error", (cause) => options.onUnexpectedExit?.("bridge", cause.message));
  bridge.once("exit", (code, signal) => unexpected("bridge", code, signal));
  try { await waitForHealth(healthUrl); } catch (cause) { bridge.kill("SIGTERM"); throw cause; }
  const publisher = spawn(options.publisherCommand, options.publisherArgs ?? [], {
    cwd: options.cwd, stdio: "inherit", env: { ...baseEnv, AFFINE_BRIDGE_MCP_URL: options.bridgeUrl, AFFINE_BRIDGE_MCP_TOKEN: token },
  });
  publisher.once("error", (cause) => options.onUnexpectedExit?.("publisher", cause.message));
  publisher.once("exit", (code, signal) => unexpected("publisher", code, signal));
  return { stop() { publisher.kill("SIGTERM"); bridge.kill("SIGTERM"); } };
}
