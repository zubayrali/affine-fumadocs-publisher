#!/usr/bin/env node
/**
 * Deploy a static release directory to Cloudflare Pages via wrangler.
 *
 * Required:
 *   PUBLISHER_DEPLOY_DIR
 *   PUBLISHER_DEPLOY_CF_PROJECT
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *
 * Optional:
 *   PUBLISHER_DEPLOY_CF_BRANCH   default production
 *   PUBLISHER_DEPLOY_WRANGLER    default npx --yes wrangler@4
 *
 * Swap from GitHub Pages later by setting:
 *   PUBLISHER_DEPLOY_TARGET=cloudflare-pages
 * and the Cloudflare secrets above (remove GitHub Pages token usage).
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the cloudflare-pages deploy target.`);
  return value;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => code === 0
      ? resolve()
      : reject(new Error(`${command} ${args.join(" ")} failed (${code ?? signal ?? "unknown"}).`)));
  });
}

async function main() {
  const releaseDir = await fs.realpath(path.resolve(required("PUBLISHER_DEPLOY_DIR")));
  await fs.access(path.join(releaseDir, "index.html"));
  const project = required("PUBLISHER_DEPLOY_CF_PROJECT");
  required("CLOUDFLARE_API_TOKEN");
  required("CLOUDFLARE_ACCOUNT_ID");
  const branch = process.env.PUBLISHER_DEPLOY_CF_BRANCH?.trim() || "production";
  const wranglerBin = process.env.PUBLISHER_DEPLOY_WRANGLER?.trim();

  if (wranglerBin) {
    await run(wranglerBin, ["pages", "deploy", releaseDir, "--project-name", project, "--branch", branch], {
      cwd: process.cwd(),
      env: process.env,
    });
  } else {
    await run("npx", [
      "--yes",
      "wrangler@4",
      "pages",
      "deploy",
      releaseDir,
      "--project-name",
      project,
      "--branch",
      branch,
    ], { cwd: process.cwd(), env: process.env });
  }
  console.log(`[deploy] cloudflare-pages: deployed ${releaseDir} → ${project} (${branch})`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
