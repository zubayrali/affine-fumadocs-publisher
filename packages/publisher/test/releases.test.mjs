import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeReleaseId,
  parseReleaseDebounceSeconds,
  releasesToPrune,
  selectRollbackTarget,
} from "../src/releases.mjs";

test("isSafeReleaseId rejects path tricks", () => {
  assert.equal(isSafeReleaseId("2026-09-05T01-00-00"), true);
  assert.equal(isSafeReleaseId("../etc"), false);
  assert.equal(isSafeReleaseId(""), false);
});

test("selectRollbackTarget prefers previous when no request", () => {
  assert.equal(
    selectRollbackTarget(["r3", "r2", "r1"], "r3"),
    "r2",
  );
  assert.equal(
    selectRollbackTarget(["r3", "r2", "r1"], "r3", "r1"),
    "r1",
  );
});

test("releasesToPrune keeps current plus keep newest", () => {
  assert.deepEqual(
    releasesToPrune(["r5", "r4", "r3", "r2", "r1"], "r5", 2),
    ["r3", "r2", "r1"],
  );
});

test("parseReleaseDebounceSeconds defaults and validates", () => {
  assert.equal(parseReleaseDebounceSeconds(undefined), 180);
  assert.equal(parseReleaseDebounceSeconds("0"), 0);
  assert.throws(() => parseReleaseDebounceSeconds("-1"), /at least 0/);
});
