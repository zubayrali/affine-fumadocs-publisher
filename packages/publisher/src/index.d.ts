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

export const AFFINE_PUBLICATION_PROPERTIES: Readonly<Record<keyof Omit<AffinePublicationMetadata, "title">, string>>;
export function definePublisherConfig(input: PublisherConfigInput): PublisherConfig;
export function metadataFromAffineProperties(properties: Record<string, unknown> | undefined, title: string | undefined): AffinePublicationMetadata;
export function stripLegacyFrontmatter(markdown: string): string;
export function normalizeMarkdownFences(markdown: string): string;
export function validatePublication(metadata: AffinePublicationMetadata): string[];
