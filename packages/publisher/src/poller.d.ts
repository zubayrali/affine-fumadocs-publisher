export interface SnapshotPollerOptions {
  client: { listDocuments(workspaceId: string): Promise<Array<{ id: string; inTrash: boolean }>> };
  workspaceId: string; statePath: string; pollSeconds?: number; forceInitialRefresh?: boolean; refresh(): Promise<void>;
  log?: (message: string) => void; error?: (...args: unknown[]) => void;
}
export interface SnapshotPoller { poll(): Promise<boolean>; start(): Promise<void>; stop(): void; }
export function createSnapshotPoller(options: SnapshotPollerOptions): SnapshotPoller;
