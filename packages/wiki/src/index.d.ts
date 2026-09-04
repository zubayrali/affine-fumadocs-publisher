export interface WikiLocale {
  code: string;
  label: string;
  languageTag: string;
  dir?: 'ltr' | 'rtl';
}

export interface WikiFeatures {
  backlinks: boolean;
  canvas: boolean;
  citations: boolean;
  databases: boolean;
  graph: boolean;
  lightbox: boolean;
  linkPreviews: boolean;
  multilingual: boolean;
  properties: boolean;
  publishingStudio: boolean;
  readerMode: boolean;
  rss: boolean;
  search: boolean;
  sidenotes: boolean;
  slides: boolean;
  tags: boolean;
  transclusion: boolean;
}

export interface WikiConfigInput {
  site: { name: string; description?: string; url?: string };
  locales?: WikiLocale[];
  features?: Partial<WikiFeatures>;
}

export interface WikiConfig {
  site: Readonly<WikiConfigInput['site']>;
  locales: readonly Readonly<Required<WikiLocale>>[];
  features: Readonly<WikiFeatures>;
}

export const FEATURE_DEFAULTS: Readonly<WikiFeatures>;
export function defineWikiConfig(input: WikiConfigInput): WikiConfig;
export function normalizeTag(tag: unknown): string;
export function normalizeTags(value: unknown): string[];
export function getTagPrefixes(tag: string): string[];
export function tagHref(tag: string, basePath?: string): string;
export function formatPropertyLabel(key: string): string;
export function getDisplayProperties(
  properties: unknown,
  hiddenKeys?: Iterable<string>,
): Array<[string, string | number | boolean | null | Array<string | number | boolean | null>]>;
export function getBacklinks<T extends { url: string; data?: Record<string, unknown> }>(
  currentUrl: string,
  pages: Iterable<T>,
): T[];
