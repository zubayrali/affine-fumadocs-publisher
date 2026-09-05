#!/usr/bin/env node
/**
 * Push releases/current to GitHub Pages over SSH (deploy key).
 * Used when PUBLISHER_DEPLOY_TARGET=github-pages-ssh (preferred) or custom.
 *
 * Env:
 *   PUBLISHER_DEPLOY_DIR           (set by runPublisherDeploy)
 *   PUBLISHER_DEPLOY_GITHUB_REPO   owner/name
 *   PUBLISHER_DEPLOY_GITHUB_BRANCH default gh-pages
 *   PUBLISHER_DEPLOY_SSH_KEY       absolute path to private key
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for SSH GitHub Pages deploy.`);
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

  const repo = required("PUBLISHER_DEPLOY_GITHUB_REPO");
  const branch = process.env.PUBLISHER_DEPLOY_GITHUB_BRANCH?.trim() || "gh-pages";
  const keyPath = path.resolve(
    process.env.PUBLISHER_DEPLOY_SSH_KEY?.trim() ||
      path.join(process.cwd(), ".affine-publisher", "deploy_key"),
  );
  await fs.access(keyPath);

  const remote = process.env.PUBLISHER_DEPLOY_GITHUB_REMOTE?.trim()
    || `git@github.com:${repo}.git`;
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "affine-gh-pages-"));
  const ssh = `ssh -i ${keyPath} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
  try {
    await run("git", ["init"], { cwd: work });
    await run("git", ["checkout", "-B", branch], { cwd: work });
    await fs.cp(releaseDir, work, { recursive: true, dereference: true });
    await run("git", ["add", "-A"], { cwd: work });
    await run("git", [
      "-c", "user.name=affine-fumadocs-publisher",
      "-c", "user.email=publisher@users.noreply.github.com",
      "commit",
      "--allow-empty",
      "-m", `publish ${new Date().toISOString()}`,
    ], { cwd: work });
    await run("git", ["push", "--force", remote, `HEAD:${branch}`], {
      cwd: work,
      env: { ...process.env, GIT_SSH_COMMAND: ssh },
    });
    console.log(`[deploy] github-pages(ssh): pushed ${releaseDir} → ${repo}@${branch}`);
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
