export const TRANSLATIONS_BASENAME: "affine-translations.json";

export type LocaleFingerprints = Record<string, string>;

export interface ChangedLocalesReport {
  generatedAt: string;
  changed: string[];
  fingerprints: LocaleFingerprints;
}

export function publisherStateDir(root: string): string;
export function fingerprintsPath(root: string): string;
export function releasedFingerprintsPath(root: string): string;
export function changedLocalesPath(root: string): string;
export function buildCacheDir(root: string): string;
export function parseBuildLocales(value: string | undefined): "all" | string[] | undefined;
export function localesChanged(
  previous: LocaleFingerprints | undefined,
  current: LocaleFingerprints,
  localeCodes: string[],
): string[];
export function planLocaleBuilds(options: {
  localeCodes: string[];
  changed: string[] | "all";
  availableArtifacts: string[];
}): { build: string[]; reuse: string[] };
export function fingerprintLocaleSnapshot(localeRoot: string): Promise<string>;
export function fingerprintLocales(root: string, localeCodes: string[]): Promise<LocaleFingerprints>;
export function readJsonFile<T>(filePath: string): Promise<T | undefined>;
export function writeChangedLocalesReport(root: string, report: ChangedLocalesReport): Promise<void>;
export function markFingerprintsReleased(root: string): Promise<void>;
export function resolveChangedLocales(
  root: string,
  localeCodes: string[],
  envValue?: string,
): Promise<{ changed: string[] | "all"; source: string }>;
