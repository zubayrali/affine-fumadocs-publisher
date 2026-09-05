export function isSafeReleaseId(value: string): boolean;
export function selectRollbackTarget(
  releases: readonly string[],
  current: string | undefined,
  requested?: string,
): string | undefined;
export function releasesToPrune(
  releases: readonly string[],
  current: string,
  keep: number,
): string[];
export function parseReleaseDebounceSeconds(value: string | undefined, fallback?: number): number;
