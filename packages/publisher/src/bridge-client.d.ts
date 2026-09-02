export interface AffineBridgeMcpClientOptions { endpoint: string; token?: string; fetch?: typeof globalThis.fetch; }
export interface AffineBridgeDocument { id: string; title: string | null; updatedAt: string | null; inTrash: boolean; }
export interface AffineBridgeMcpClient {
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
  readDocumentProperties(workspaceId: string, docId: string): Promise<Record<string, unknown>>;
  listDocuments(workspaceId: string): Promise<AffineBridgeDocument[]>;
  readDocument(workspaceId: string, docId: string): Promise<string>;
}
export function createAffineBridgeMcpClient(options: AffineBridgeMcpClientOptions): AffineBridgeMcpClient;
