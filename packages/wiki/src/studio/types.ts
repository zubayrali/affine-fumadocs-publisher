export type StudioDiagnosticLevel = 'error' | 'warning';

export interface StudioDiagnostic {
  level: StudioDiagnosticLevel;
  code: string;
  message: string;
  docId?: string;
}

export type StudioDocumentStatus =
  | 'published'
  | 'draft'
  | 'private'
  | 'warning'
  | 'blocked';

export interface StudioDocument {
  id: string;
  title: string;
  locale: string;
  status: StudioDocumentStatus;
  collections?: Array<{ id: string; name: string }>;
  slug?: string;
  publishedHref?: string;
  affineHref?: string;
  diagnostics: StudioDiagnostic[];
  metadata: {
    complete: number;
    total: number;
    missing: string[];
  };
}

export interface StudioSnapshot {
  version: 1;
  generatedAt: string;
  locale: string;
  summary: {
    workspaceDocuments: number;
    publishedPages: number;
    drafts: number;
    errors: number;
    warnings: number;
  };
  collections: Array<{ id: string; name: string; documentCount: number }>;
  portals: Array<{
    id: string;
    label: string;
    route: string;
    collection: string;
    publishedCount: number;
    workspaceCount: number;
  }>;
  documents: StudioDocument[];
  diagnostics: StudioDiagnostic[];
}

export type PortalLayout = 'cards' | 'library' | 'list' | 'media' | 'timeline';

export interface PublishingStudioPortalConfig {
  id: string;
  route: string;
  label: string;
  description?: string;
  collection: string;
  layout: PortalLayout;
  locales?: string[];
  slugPrefix?: string;
  required: boolean;
  properties: string[];
}

export interface PublishingStudioConfig {
  version: 1;
  portals: PublishingStudioPortalConfig[];
  editorial: {
    recommendedProperties: string[];
  };
}
