/**
 * Pluggable post-release deploy hook.
 *
 * Targets:
 * - none              skip (local release only)
 * - github-pages      push release tree to a gh-pages branch
 * - cloudflare-pages  wrangler pages deploy
 * - custom            run PUBLISHER_DEPLOY_COMMAND
 *
 * Swap hosts later by changing PUBLISHER_DEPLOY_TARGET (and its secrets).
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET_SCRIPTS = Object.freeze({
  "github-pages": path.join(HERE, "..", "deploy", "github-pages.mjs"),
  "cloudflare-pages": path.join(HERE, "..", "deploy", "cloudflare-pages.mjs"),
});

/** @param {NodeJS.ProcessEnv} [env] */
export function resolveDeployConfig(env = process.env) {
  const command = typeof env.PUBLISHER_DEPLOY_COMMAND === "string"
    ? env.PUBLISHER_DEPLOY_COMMAND.trim()
    : "";
  const rawTarget = typeof env.PUBLISHER_DEPLOY_TARGET === "string"
    ? env.PUBLISHER_DEPLOY_TARGET.trim().toLowerCase()
    : "";
  const target = rawTarget || (command ? "custom" : "none");
  const allowed = new Set(["none", "github-pages", "cloudflare-pages", "custom"]);
  if (!allowed.has(target)) {
    throw new Error(
      `PUBLISHER_DEPLOY_TARGET must be one of ${[...allowed].join(", ")} (got ${target}).`,
    );
  }
  if (target === "custom" && !command) {
    throw new Error("PUBLISHER_DEPLOY_TARGET=custom requires PUBLISHER_DEPLOY_COMMAND.");
  }
  if (command && target !== "custom" && target !== "none") {
    // Explicit command wins over built-in target scripts.
    return {
      target: "custom",
      command,
      releaseDir: resolveReleaseDir(env),
      builtIn: false,
    };
  }
  return {
    target,
    command: target === "custom" ? command : "",
    releaseDir: resolveReleaseDir(env),
    builtIn: target === "github-pages" || target === "cloudflare-pages",
  };
}

/** @param {NodeJS.ProcessEnv} [env] */
function resolveReleaseDir(env = process.env) {
  if (typeof env.PUBLISHER_DEPLOY_DIR === "string" && env.PUBLISHER_DEPLOY_DIR.trim()) {
    return path.resolve(env.PUBLISHER_DEPLOY_DIR.trim());
  }
  const root = typeof env.PUBLISHER_RELEASE_ROOT === "string" && env.PUBLISHER_RELEASE_ROOT.trim()
    ? env.PUBLISHER_RELEASE_ROOT.trim()
    : path.join(".affine-publisher", "releases");
  return path.resolve(root, "current");
}

/**
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, config?: ReturnType<typeof resolveDeployConfig> }} [options]
 * @returns {Promise<{ skipped: boolean, target: string }>}
 */
export async function runPublisherDeploy(options = {}) {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const config = options.config ?? resolveDeployConfig(env);
  if (config.target === "none") {
    return { skipped: true, target: "none" };
  }

  if (config.target === "custom") {
    await runShell(config.command, { cwd, env: { ...env, PUBLISHER_DEPLOY_DIR: config.releaseDir } });
    return { skipped: false, target: "custom" };
  }

  const script = TARGET_SCRIPTS[config.target];
  if (!script) throw new Error(`No built-in deploy script for target ${config.target}.`);
  await runNode(script, {
    cwd,
    env: { ...env, PUBLISHER_DEPLOY_DIR: config.releaseDir },
  });
  return { skipped: false, target: config.target };
}

function runNode(script, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd, env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0
      ? resolve()
      : reject(new Error(`Deploy script ${path.basename(script)} failed (${code ?? signal ?? "unknown"}).`)));
  });
}

function runShell(command, { cwd, env }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env,
      stdio: "inherit",
      shell: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0
      ? resolve()
      : reject(new Error(`PUBLISHER_DEPLOY_COMMAND failed (${code ?? signal ?? "unknown"}).`)));
  });
}
