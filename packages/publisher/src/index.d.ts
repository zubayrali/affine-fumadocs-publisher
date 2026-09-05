export interface PublisherConfigInput {
  workspaceId: string;
  bridgeUrl: string;
  outputDir: string;
  locale?: string;
  pollSeconds?: number;
  blobBaseUrl?: string;
}

export interface PublisherConfig {
  readonly workspaceId: string;
  readonly bridgeUrl: string;
  readonly outputDir: string;
  readonly locale: string;
  readonly pollSeconds: number;
  readonly blobBaseUrl?: string;
}

export interface AffinePublicationMetadata {
  title?: string;
  slug?: string;
  locale?: string;
  description?: string;
  publish?: boolean;
  draft?: boolean;
  unlisted?: boolean;
  featured?: boolean;
  order?: number;
  aliases?: string[];
  created?: string;
  modified?: string;
}

export interface AffinePublishedDocumentMetadata extends AffinePublicationMetadata {
  tags?: string[];
  affineProperties: Record<string, unknown>;
}

export const AFFINE_PUBLICATION_PROPERTIES: Readonly<Record<keyof AffinePublicationMetadata, string>>;
export function definePublisherConfig(input: PublisherConfigInput): PublisherConfig;
export function metadataFromAffineProperties(properties: Record<string, unknown> | undefined, title: string | undefined): AffinePublicationMetadata;
export function metadataFromAllAffineProperties(properties: Record<string, unknown> | undefined, title: string | undefined): AffinePublishedDocumentMetadata;
export function findLinkedDocumentIds(markdown: string): string[];
export function findUnpublishedLinkedDocumentIds(
  markdown: string,
  pagesById: ReadonlyMap<string, { title: string; slug: string }>,
): string[];
export function rewriteAffineDocumentLinks(
  markdown: string,
  pagesById: ReadonlyMap<string, { title: string; slug: string }>,
  basePath?: string,
): string;
export function stripLegacyFrontmatter(markdown: string): string;
export function normalizeMarkdownFences(markdown: string): string;
export function validatePublication(metadata: AffinePublicationMetadata): string[];
export {
  findAffineDatabaseBlockIds,
  replaceAffineDatabaseMarkers,
  resolveAffineDatabaseSources,
} from './databases.js';
