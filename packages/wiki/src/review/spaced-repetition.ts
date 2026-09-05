// Spaced-repetition scheduler — vendored & trimmed from Orbit's
// @withorbit/core `spacedRepetitionScheduler.ts` (Apache-2.0, Andy Matuschak).
// We keep only the two-outcome (remembered/forgotten) interval math; Orbit's
// account/sync/notification layers are intentionally not used — the schedule
// lives per-reader in localStorage (see components/review-block.tsx).

export const GROWTH_FACTOR = 2.3;
export const INITIAL_INTERVAL_MS = 1000 * 60 * 60 * 24 * 5; // five days
const FORGOTTEN_RETRY_MS = 1000 * 60 * 10; // come back in ~10 minutes

export type Outcome = "remembered" | "forgotten" | "skipped";

export interface CardState {
  createdAtTimestampMillis: number;
  lastRepetitionTimestampMillis: number | null;
  intervalMillis: number;
  dueTimestampMillis: number;
}

export interface SchedulerOutput {
  dueTimestampMillis: number;
  intervalMillis: number;
}

/** A brand-new card: due immediately, no history. */
export function newCard(now: number): CardState {
  return {
    createdAtTimestampMillis: now,
    lastRepetitionTimestampMillis: null,
    intervalMillis: 0,
    dueTimestampMillis: now,
  };
}

/** Compute the next schedule for one repetition. Mirrors Orbit's logic. */
export function scheduleNext(
  state: CardState,
  now: number,
  outcome: Outcome,
): SchedulerOutput {
  const currentReviewIntervalMillis = Math.max(
    0,
    now - (state.lastRepetitionTimestampMillis ?? state.createdAtTimestampMillis),
  );

  let newIntervalMillis: number;
  if (outcome === "remembered" || outcome === "skipped") {
    // If they reviewed early, don't shrink the interval below what's scheduled.
    newIntervalMillis = Math.max(
      currentReviewIntervalMillis < state.intervalMillis ? state.intervalMillis : 0,
      INITIAL_INTERVAL_MS,
      Math.floor(currentReviewIntervalMillis * GROWTH_FACTOR),
    );
  } else if (state.intervalMillis < INITIAL_INTERVAL_MS) {
    // Hasn't reached the minimum interval yet — hold steady rather than punish.
    newIntervalMillis = state.intervalMillis;
  } else {
    newIntervalMillis = Math.max(
      INITIAL_INTERVAL_MS,
      Math.floor(state.intervalMillis / GROWTH_FACTOR),
    );
  }

  // Small jitter so prompts don't always reappear in lockstep (max ~10 min).
  const jitter = (now % 1000) * (60 * 10);
  const dueTimestampMillis =
    now + jitter + (outcome === "forgotten" ? FORGOTTEN_RETRY_MS : newIntervalMillis);

  return { dueTimestampMillis, intervalMillis: newIntervalMillis };
}

/** Apply an outcome and return the updated card. */
export function applyOutcome(state: CardState, now: number, outcome: Outcome): CardState {
  const { dueTimestampMillis, intervalMillis } = scheduleNext(state, now, outcome);
  return {
    ...state,
    lastRepetitionTimestampMillis: now,
    intervalMillis,
    dueTimestampMillis,
  };
}

/** Human label for "next review in …". */
export function formatInterval(ms: number): string {
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return "less than a day";
  if (days < 2) return "a day";
  if (days < 30) return `${Math.round(days)} days`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months)} month${Math.round(months) === 1 ? "" : "s"}`;
  return `${Math.round(months / 12)} year${Math.round(months / 12) === 1 ? "" : "s"}`;
}

// ponytail: runnable self-check — `npx tsx lib/spaced-repetition.ts`. Kept here
// (not a test framework) so the interval math has one failing tripwire.
export function demo() {
  const t0 = 0;
  let c = newCard(t0);
  console.assert(c.dueTimestampMillis === t0, "new card due now");

  // Remember on day 6 → interval should grow to >= initial (5d).
  const day6 = INITIAL_INTERVAL_MS + 1000 * 60 * 60 * 24;
  c = applyOutcome(c, day6, "remembered");
  console.assert(c.intervalMillis >= INITIAL_INTERVAL_MS, "grows to >= initial");
  console.assert(c.dueTimestampMillis > day6, "scheduled in the future");

  // Forget after a real interval → interval shrinks but stays >= initial.
  const before = c.intervalMillis;
  c = applyOutcome(c, c.dueTimestampMillis, "forgotten");
  console.assert(c.intervalMillis <= before, "forgetting does not grow interval");
  console.assert(c.intervalMillis >= INITIAL_INTERVAL_MS, "floors at initial interval");
  console.log("spaced-repetition demo OK");
}
