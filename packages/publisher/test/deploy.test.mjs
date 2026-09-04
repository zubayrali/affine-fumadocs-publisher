import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveDeployConfig } from "../src/deploy.mjs";

test("defaults to none when no deploy settings are present", () => {
  assert.deepEqual(resolveDeployConfig({}), {
    target: "none",
    command: "",
    releaseDir: path.resolve(".affine-publisher/releases/current"),
    builtIn: false,
  });
});

test("selects github-pages as a built-in target", () => {
  const config = resolveDeployConfig({
    PUBLISHER_DEPLOY_TARGET: "github-pages",
    PUBLISHER_DEPLOY_DIR: "/tmp/release",
  });
  assert.equal(config.target, "github-pages");
  assert.equal(config.builtIn, true);
  assert.equal(config.releaseDir, "/tmp/release");
});

test("selects cloudflare-pages as a built-in target for easy host swaps", () => {
  const config = resolveDeployConfig({ PUBLISHER_DEPLOY_TARGET: "cloudflare-pages" });
  assert.equal(config.target, "cloudflare-pages");
  assert.equal(config.builtIn, true);
});

test("lets an explicit command override a built-in target", () => {
  const config = resolveDeployConfig({
    PUBLISHER_DEPLOY_TARGET: "github-pages",
    PUBLISHER_DEPLOY_COMMAND: "./scripts/my-deploy.sh",
  });
  assert.equal(config.target, "custom");
  assert.equal(config.command, "./scripts/my-deploy.sh");
  assert.equal(config.builtIn, false);
});

test("rejects unknown deploy targets", () => {
  assert.throws(
    () => resolveDeployConfig({ PUBLISHER_DEPLOY_TARGET: "netlify" }),
    /must be one of/,
  );
});
