import type { CanvasNode } from './types.js';

/** First-line display label for a reduced canvas box. */
export function nodeLabel(node: CanvasNode): string {
  if (node.type === 'text') {
    const firstLine = node.text.split('\n').find((line) => line.trim())?.trim() ?? '';
    return firstLine.replace(/^#+\s*/, '').slice(0, 120) || 'Note';
  }
  if (node.type === 'shape') return node.text?.trim() || node.shape;
  if (node.type === 'group') return node.label?.trim() || 'Group';
  if (node.type === 'link') return node.url;
  if (node.type === 'file') return node.file.split('/').at(-1) || 'File';
  if (node.type === 'brush') return 'Stroke';
  return 'Node';
}
