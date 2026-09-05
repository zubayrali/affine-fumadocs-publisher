import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAffineTimestamp,
  parseGenerateLocales,
  planLocaleGeneration,
} from "../src/incremental-generate.mjs";

test("normalizeAffineTimestamp normalizes epoch millis and ISO", () => {
  const iso = "2026-09-05T01:00:00.000Z";
  const ms = String(Date.parse(iso));
  assert.equal(normalizeAffineTimestamp(iso), iso);
  assert.equal(normalizeAffineTimestamp(ms), iso);
});

test("parseGenerateLocales parses all and lists", () => {
  assert.equal(parseGenerateLocales(undefined), undefined);
  assert.equal(parseGenerateLocales("all"), "all");
  assert.deepEqual(parseGenerateLocales("en, fr"), ["en", "fr"]);
});

const docs = [
  { id: "en-1", updatedAt: "2026-09-05T01:00:00.000Z" },
  { id: "fr-1", updatedAt: "2026-09-05T01:00:00.000Z" },
  { id: "cn-1", updatedAt: "2026-09-05T01:00:00.000Z" },
];
const previous = {
  en: [{ id: "en-1", modified: "2026-07-02" }],
  fr: [{ id: "fr-1", modified: "2026-07-02" }],
  cn: [{ id: "cn-1", modified: "2026-07-02" }],
};
const revisions = {
  en: { "en-1": "2026-09-05T01:00:00.000Z" },
  fr: { "fr-1": "2026-09-05T01:00:00.000Z" },
  cn: { "cn-1": "2026-09-05T01:00:00.000Z" },
};

test("planLocaleGeneration skips when source revisions match", () => {
  const plan = planLocaleGeneration({
    localeCodes: ["en", "fr", "cn"],
    documents: docs,
    previousPages: previous,
    previousRevisions: revisions,
  });
  assert.deepEqual(plan.generate, []);
  assert.deepEqual(plan.skip, ["en", "fr", "cn"]);
});

test("planLocaleGeneration regenerates only the moved locale", () => {
  const plan = planLocaleGeneration({
    localeCodes: ["en", "fr", "cn"],
    documents: [
      { id: "en-1", updatedAt: "2026-09-05T02:00:00.000Z" },
      { id: "fr-1", updatedAt: "2026-09-05T01:00:00.000Z" },
      { id: "cn-1", updatedAt: "2026-09-05T01:00:00.000Z" },
    ],
    previousPages: previous,
    previousRevisions: revisions,
  });
  assert.deepEqual(plan.generate, ["en"]);
  assert.deepEqual(plan.skip, ["fr", "cn"]);
});
