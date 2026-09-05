import { MarkerType, type Edge, type Node } from '@xyflow/react';
import { resolveCanvasColor } from './colors.js';
import { nodeLabel } from './labels.js';
import type { CanvasData, CanvasNode } from './types.js';

export type CanvasBoxNodeData = {
  node: CanvasNode;
  label: string;
};

export { nodeLabel };

/** Map CanvasData into React Flow nodes/edges (labeled boxes; default bezier edges). */
export function canvasToFlow(data: CanvasData): {
  nodes: Node<CanvasBoxNodeData>[];
  edges: Edge[];
} {
  const nodes: Node<CanvasBoxNodeData>[] = data.nodes.map((node, index) => ({
    id: node.id,
    type: 'canvasBox',
    position: { x: node.x, y: node.y },
    data: { node, label: nodeLabel(node) },
    style: {
      width: node.width,
      height: node.height,
    },
    zIndex: node.type === 'group' ? -1 : index + 1,
    draggable: false,
    selectable: true,
    connectable: false,
    ...(node.type === 'group' ? { focusable: false } : {}),
  }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: Edge[] = data.edges.flatMap((edge) => {
    if (!nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) return [];
    const stroke = resolveCanvasColor(edge.color) ?? 'var(--color-fd-muted-foreground)';
    const strokeWidth = edge.strokeWidth ?? 2;
    return [
      {
        id: edge.id,
        source: edge.fromNode,
        target: edge.toNode,
        label: edge.label,
        type: edge.mode === 'straight' ? 'straight' : edge.mode === 'curve' ? 'default' : 'smoothstep',
        selectable: false,
        focusable: false,
        markerEnd:
          edge.toEnd === 'none'
            ? undefined
            : { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke },
        style: {
          stroke,
          strokeWidth,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeDasharray: edge.strokeStyle === 'dash' ? '10 8' : undefined,
        },
      },
    ];
  });

  return { nodes, edges };
}
