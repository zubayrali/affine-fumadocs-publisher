export function findAffineDatabaseBlockIds(markdown: string): string[];
export function replaceAffineDatabaseMarkers(
  markdown: string,
  sources: ReadonlyMap<string, string>,
  importPath?: string,
): string;
export function resolveAffineDatabaseSources(
  publicRoot: string,
  docId: string,
  blockIds: string[],
  exists?: (path: string) => Promise<boolean>,
): Promise<Map<string, string>>;
