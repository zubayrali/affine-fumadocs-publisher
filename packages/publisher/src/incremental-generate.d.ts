export interface WorkspaceDocumentHint {
  id: string;
  updatedAt?: string | null;
  inTrash?: boolean;
}

export interface PreviousManifestPage {
  id: string;
  modified?: string;
}

export type LocaleSourceRevisions = Record<string, Record<string, string>>;

export interface LocaleGenerationPlan {
  generate: string[];
  skip: string[];
  unknownDocumentIds: string[];
  reasons: Record<string, string>;
}

export interface SourceRevisionState {
  locales: LocaleSourceRevisions;
  seenDocumentIds: string[];
}

export function parseGenerateLocales(value: string | undefined): "all" | string[] | undefined;
export function normalizeAffineTimestamp(value: string | undefined | null): string | undefined;
export function revisionsFromDocuments(
  pageIds: string[],
  documents: WorkspaceDocumentHint[],
): Record<string, string>;
export function planLocaleGeneration(options: {
  localeCodes: string[];
  documents: WorkspaceDocumentHint[];
  previousPages: Record<string, PreviousManifestPage[] | undefined>;
  previousRevisions?: LocaleSourceRevisions;
  seenDocumentIds?: string[];
  publishableUnknownLocales?: string[];
  force?: "all" | string[];
}): LocaleGenerationPlan;
