// Module-level pub/sub so ReviewBlock can register its prompts and
// ReviewProgress can subscribe via useSyncExternalStore.

type Listener = () => void;

interface PromptInfo {
  id: string;
}

const blocks = new Map<string, PromptInfo[]>();
const listeners = new Set<Listener>();
let snapshot: PromptInfo[] = [];

function rebuild() {
  snapshot = Array.from(blocks.values()).flat();
  for (const l of listeners) l();
}

export function registerPrompts(
  key: string,
  prompts: PromptInfo[],
): () => void {
  blocks.set(key, prompts);
  rebuild();
  return () => {
    blocks.delete(key);
    rebuild();
  };
}

export function getPromptSnapshot(): PromptInfo[] {
  return snapshot;
}

export function subscribePrompts(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
