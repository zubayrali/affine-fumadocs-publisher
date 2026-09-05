'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { canvasNodeStyle, resolveCanvasColor, resolveCanvasInkColor } from './colors.js';
import { CanvasTextContent } from './text-content.js';
import { canvasToFlow, type CanvasBoxNodeData } from './to-flow.js';
import type { CanvasData, CanvasNode } from './types.js';
import '@xyflow/react/dist/style.css';

export type CanvasViewProps = {
  data: CanvasData;
  title?: string;
  fullBleed?: boolean;
};

function shapeRadius(node: CanvasNode): string | number | undefined {
  if (node.type !== 'shape') return undefined;
  if (node.shape === 'ellipse') return '50%';
  if (node.shape === 'diamond' || node.shape === 'triangle') return 0;
  return node.radius ?? 8;
}

function boxStyle(node: CanvasNode): CSSProperties {
  if (node.type === 'group') {
    return {
      border: '1px dashed color-mix(in oklab, var(--color-fd-muted-foreground) 42%, transparent)',
      borderRadius: 8,
      background: 'color-mix(in oklab, var(--color-fd-muted) 8%, transparent)',
    };
  }
  if (node.type === 'shape') {
    return {
      border: `${node.strokeWidth ?? 2}px solid ${resolveCanvasColor(node.strokeColor) ?? 'var(--color-fd-border)'}`,
      borderRadius: shapeRadius(node),
      background:
        resolveCanvasColor(node.fillColor) ??
        'color-mix(in oklab, var(--color-fd-muted) 12%, var(--color-fd-background))',
      color: resolveCanvasInkColor(node.textColor) ?? 'var(--color-fd-foreground)',
      clipPath:
        node.shape === 'diamond'
          ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
          : node.shape === 'triangle'
            ? 'polygon(50% 0, 100% 100%, 0 100%)'
            : undefined,
    };
  }
  if (node.type === 'text' && node.variant === 'label') {
    return {
      border: 'none',
      background: 'transparent',
      color: resolveCanvasInkColor(node.color) ?? 'var(--color-fd-foreground)',
      fontSize: node.fontSize,
      fontWeight: node.fontWeight,
      textAlign: node.textAlign ?? 'center',
      justifyContent: 'center',
    };
  }
  return {
    border: '1px solid var(--color-fd-border)',
    borderRadius: 8,
    ...canvasNodeStyle(node.type === 'text' ? node.color : undefined),
    color: 'var(--color-fd-foreground)',
  };
}

function CanvasBoxNode({ data }: NodeProps<Node<CanvasBoxNodeData>>) {
  const { node, label } = data;
  const isGroup = node.type === 'group';
  const richText =
    node.type === 'text' && (Boolean(node.html) || Boolean(node.databaseSnapshot));
  return (
    <div
      className={isGroup ? 'wiki-canvas-box wiki-canvas-box--group' : 'wiki-canvas-box'}
      style={boxStyle(node)}
    >
      {!isGroup ? (
        <>
          <Handle type="target" position={Position.Left} className="wiki-canvas-handle" />
          <Handle type="source" position={Position.Right} className="wiki-canvas-handle" />
        </>
      ) : null}
      <span className="wiki-canvas-box__kind">{node.type}</span>
      {richText && node.type === 'text' ? (
        <CanvasTextContent html={node.html} databaseSnapshot={node.databaseSnapshot} />
      ) : (
        <strong className="wiki-canvas-box__label">{label}</strong>
      )}
    </div>
  );
}

const nodeTypes = { canvasBox: CanvasBoxNode };

function getPrimaryDiagramNodes(
  nodes: ReturnType<typeof canvasToFlow>['nodes'],
  edges: ReturnType<typeof canvasToFlow>['edges'],
) {
  if (edges.length === 0) return nodes;

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const neighbors = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue;
    if (!neighbors.has(edge.source)) neighbors.set(edge.source, new Set());
    if (!neighbors.has(edge.target)) neighbors.set(edge.target, new Set());
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  let primaryIds: string[] = [];
  for (const startId of neighbors.keys()) {
    if (visited.has(startId)) continue;
    const component: string[] = [];
    const queue = [startId];
    visited.add(startId);

    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index]!;
      component.push(id);
      for (const neighborId of neighbors.get(id) ?? []) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }

    if (component.length > primaryIds.length) primaryIds = component;
  }

  return primaryIds.length > 1
    ? primaryIds.flatMap((id) => (nodesById.has(id) ? [nodesById.get(id)!] : []))
    : nodes;
}

function CanvasFlow({ data }: { data: CanvasData }) {
  const { setViewport } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const { nodes, edges } = useMemo(() => canvasToFlow(data), [data]);
  const primaryDiagramNodes = useMemo(
    () => getPrimaryDiagramNodes(nodes, edges),
    [nodes, edges],
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () =>
      setColorMode(root.classList.contains('dark') ? 'dark' : 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container || primaryDiagramNodes.length === 0) return;
      const rect = container.getBoundingClientRect();
      const minX = Math.min(...primaryDiagramNodes.map((node) => node.position.x));
      const minY = Math.min(...primaryDiagramNodes.map((node) => node.position.y));
      const maxX = Math.max(
        ...primaryDiagramNodes.map((node) => node.position.x + Number(node.style?.width ?? 0)),
      );
      const maxY = Math.max(
        ...primaryDiagramNodes.map((node) => node.position.y + Number(node.style?.height ?? 0)),
      );
      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);
      const padding = 32;
      const zoom = Math.max(
        0.18,
        Math.min(1.25, (rect.width - padding * 2) / width, (rect.height - padding * 2) / height),
      );
      void setViewport(
        {
          x: (rect.width - width * zoom) / 2 - minX * zoom,
          y: (rect.height - height * zoom) / 2 - minY * zoom,
          zoom,
        },
        { duration: 0 },
      );
    });
    return () => cancelAnimationFrame(id);
  }, [primaryDiagramNodes, setViewport]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.08}
        maxZoom={2.5}
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        zoomOnPinch
        colorMode={colorMode}
        proOptions={{ hideAttribution: true }}
        className="wiki-canvas-flow"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={0.8} />
        <Controls showInteractive={false} className="wiki-canvas-controls" />
      </ReactFlow>
    </div>
  );
}

function useCanvasFullbleed(enabled: boolean) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const page = document.getElementById('nd-page');
    if (!page) return;

    const rootOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const pageStyle = page.getAttribute('style');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    page.style.maxWidth = 'none';
    page.style.padding = '0';
    page.style.margin = '0';
    page.style.overflow = 'hidden';
    page.style.position = 'relative';
    page.style.gridColumn = '3 / -1';
    const h1 = page.querySelector('h1');
    const h1Display = h1?.style.display;
    if (h1 instanceof HTMLElement) h1.style.display = 'none';
    return () => {
      document.documentElement.style.overflow = rootOverflow;
      document.body.style.overflow = bodyOverflow;
      if (pageStyle === null) page.removeAttribute('style');
      else page.setAttribute('style', pageStyle);
      if (h1 instanceof HTMLElement) h1.style.display = h1Display ?? '';
    };
  }, [enabled]);
}

export function CanvasView({ data, title, fullBleed = true }: CanvasViewProps) {
  useCanvasFullbleed(fullBleed);
  if (data.nodes.length === 0) {
    return (
      <div className="not-prose flex h-[min(480px,60vh)] items-center justify-center border border-fd-border bg-fd-background text-sm text-fd-muted-foreground">
        Empty canvas
      </div>
    );
  }

  return (
    <div
      className={
        fullBleed
          ? 'wiki-canvas-stage wiki-canvas-stage--full not-prose relative h-[max(28rem,calc(100dvh-15.25rem))] min-h-0 overflow-hidden [&_.wiki-canvas-flow]:h-full'
          : 'not-prose relative min-h-[32rem] overflow-hidden border border-fd-border [&_.wiki-canvas-flow]:h-[min(72vh,52rem)]'
      }
    >
      <ReactFlowProvider>
        <CanvasFlow data={data} />
      </ReactFlowProvider>
      {title ? (
        <div className="wiki-canvas-identity pointer-events-none absolute left-3 top-3 z-10">
          <span>Canvas</span>
          <strong>{title}</strong>
        </div>
      ) : null}
      <div className="wiki-canvas-hint pointer-events-none absolute bottom-3 right-3 z-10">
        Drag to pan · Scroll to zoom
      </div>
    </div>
  );
}
