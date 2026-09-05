import test from "node:test";
import assert from "node:assert/strict";
import {
  findAffineDatabaseBlockIds,
  replaceAffineDatabaseMarkers,
  resolveAffineDatabaseSources,
} from "../src/databases.mjs";

test("findAffineDatabaseBlockIds decodes HTML entities in block ids", () => {
  const markdown = [
    "Intro",
    "<!-- unsupported: flavour=affine:database blockId=db&#45;one -->",
    "Outro",
  ].join("\n");
  assert.deepEqual(findAffineDatabaseBlockIds(markdown), ["db-one"]);
});

test("replaceAffineDatabaseMarkers injects MDX and import", () => {
  const markdown = "<!-- unsupported: flavour=affine:database blockId=db-one -->";
  const out = replaceAffineDatabaseMarkers(
    markdown,
    new Map([["db-one", "/affine-database/doc/db-one.json"]]),
  );
  assert.match(out, /import \{ AffineDatabase \} from "@affine-fumadocs\/wiki\/databases"/);
  assert.match(out, /<AffineDatabase src="\/affine-database\/doc\/db-one.json" \/>/);
});

test("resolveAffineDatabaseSources maps existing JSON files", async () => {
  const sources = await resolveAffineDatabaseSources(
    "/tmp/public",
    "docA",
    ["b1", "b2"],
    async (filePath) => filePath.endsWith("b1.json"),
  );
  assert.deepEqual([...sources.entries()], [["b1", "/affine-database/docA/b1.json"]]);
});
