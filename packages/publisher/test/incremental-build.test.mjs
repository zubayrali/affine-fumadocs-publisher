import test from "node:test";
import assert from "node:assert/strict";
import {
  localesChanged,
  parseBuildLocales,
  planLocaleBuilds,
} from "../src/incremental-build.mjs";

test("parseBuildLocales treats empty as auto", () => {
  assert.equal(parseBuildLocales(undefined), undefined);
  assert.equal(parseBuildLocales(""), undefined);
  assert.equal(parseBuildLocales("  "), undefined);
});

test("parseBuildLocales accepts all aliases and comma lists", () => {
  assert.equal(parseBuildLocales("all"), "all");
  assert.equal(parseBuildLocales("*"), "all");
  assert.deepEqual(parseBuildLocales("en, fr,en"), ["en", "fr"]);
});

test("localesChanged rebuilds every locale when nothing was released yet", () => {
  assert.deepEqual(localesChanged(undefined, { en: "a", fr: "b" }, ["en", "fr"]), ["en", "fr"]);
});

test("localesChanged returns only locales whose fingerprint moved", () => {
  assert.deepEqual(
    localesChanged(
      { en: "a", fr: "b", cn: "c" },
      { en: "a2", fr: "b", cn: "c" },
      ["en", "fr", "cn"],
    ),
    ["en"],
  );
});

test("planLocaleBuilds rebuilds everything when changed is all", () => {
  assert.deepEqual(planLocaleBuilds({
    localeCodes: ["en", "fr"],
    changed: "all",
    availableArtifacts: ["en", "fr"],
  }), { build: ["en", "fr"], reuse: [] });
});

test("planLocaleBuilds reuses cached outs for unchanged locales", () => {
  assert.deepEqual(planLocaleBuilds({
    localeCodes: ["en", "fr", "cn"],
    changed: ["en"],
    availableArtifacts: ["en", "fr", "cn"],
  }), { build: ["en"], reuse: ["fr", "cn"] });
});

test("planLocaleBuilds forces rebuild when a cached out is missing", () => {
  assert.deepEqual(planLocaleBuilds({
    localeCodes: ["en", "fr"],
    changed: [],
    availableArtifacts: ["en"],
  }), { build: ["fr"], reuse: ["en"] });
});
