export interface ReadOnlyBridgePublisherOptions {
  cwd: string; runtimeDir: string; bridgeUrl: string; bridgeCommand: string; bridgeArgs?: string[];
  publisherCommand: string; publisherArgs?: string[]; environment?: Record<string, string | undefined>;
  bridgeEnvironment: Record<string, string | undefined>; onUnexpectedExit?(name: "bridge" | "publisher", detail: string | number): void;
}
export function startReadOnlyBridgePublisher(options: ReadOnlyBridgePublisherOptions): Promise<{ stop(): void }>;
