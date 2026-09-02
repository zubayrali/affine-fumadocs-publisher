export function replaceDirectoryAtomically(target: string, write: (temporary: string) => Promise<void>): Promise<void>;
export interface BlobMaterializationOptions {
  markdown: string; workspaceId: string; publicRoot: string; assets: Map<string, string>;
  cookie?: string; blobBaseUrl?: string; fetch?: typeof globalThis.fetch;
  onUnavailable?: (blobKey: string, message: string) => void;
}
export function materializeAffineBlobAssets(options: BlobMaterializationOptions): Promise<string>;
