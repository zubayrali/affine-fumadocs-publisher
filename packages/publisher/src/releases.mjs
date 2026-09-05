/** Safe release-id helpers for rollback / prune. */

export function isSafeReleaseId(value) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

export function selectRollbackTarget(releases, current, requested) {
  const available = [...new Set(releases.filter(isSafeReleaseId))].sort().reverse();
  if (requested) {
    return isSafeReleaseId(requested) && available.includes(requested) ? requested : undefined;
  }
  return available.find((release) => release !== current);
}

export function releasesToPrune(releases, current, keep) {
  const retained = Math.max(2, Math.floor(keep));
  const available = [...new Set(releases.filter(isSafeReleaseId))].sort().reverse();
  const protectedIds = new Set([current, ...available.slice(0, retained)]);
  return available.filter((release) => !protectedIds.has(release));
}

/**
 * Parse PUBLISHER_RELEASE_DEBOUNCE_SECONDS.
 * 0 = release immediately; default 180s coalesces bursty AFFiNE edits.
 */
export function parseReleaseDebounceSeconds(value, fallback = 180) {
  const seconds = Number(value ?? String(fallback));
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error("PUBLISHER_RELEASE_DEBOUNCE_SECONDS must be an integer of at least 0.");
  }
  return seconds;
}
