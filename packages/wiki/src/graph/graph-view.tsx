'use client';

import {
  lazy,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ForceGraphMethods, ForceGraphProps } from 'react-force-graph-2d';
import { forceCollide, forceLink, forceManyBody, forceRadial } from 'd3-force';
import { useRouter } from 'next/navigation';
import { Crosshair, Maximize2, Minimize2 } from 'lucide-react';
import { groupColorIndex } from './graph-utils.mjs';
import type { Graph, GraphLink, GraphNode } from './types';
import './graph.css';

export type { Graph, GraphLink, GraphNode };

export interface GraphViewProps {
  graph: Graph;
  variant?: 'global' | 'local';
  currentUrl?: string;
  className?: string;
  extraControls?: ReactNode;
  /** Persist visited-node tint in localStorage (default true). */
  trackVisited?: boolean;
  visitedStorageKey?: string;
}

const ForceGraph2D = lazy(
  () => import('react-force-graph-2d'),
) as any;

const LABEL_OPACITY_SCALE = { local: 0.6, global: 1.4 } as const;
const LABEL_FONT_PX = 11;
const DIM_ALPHA = 0.12;

type Rgb = [number, number, number];

interface ThemeColors {
  current: Rgb;
  page: Rgb;
  tag: Rgb;
  label: Rgb;
  link: Rgb;
  groups: Record<string, Rgb>;
  font: string;
}

let colorCtx: CanvasRenderingContext2D | null | undefined;

function resolveColor(value: string): Rgb {
  const probe = document.createElement('div');
  probe.style.color = value;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color || value;
  probe.remove();

  if (colorCtx === undefined) {
    colorCtx = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true });
  }
  if (colorCtx) {
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = '#808080';
    colorCtx.fillStyle = resolved;
    colorCtx.fillRect(0, 0, 1, 1);
    const [r, g, b] = colorCtx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }

  const parts = resolved.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return [128, 128, 128];
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

function rgba([r, g, b]: Rgb, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getVisited(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function recordVisited(url: string, storageKey = 'wiki-graph-visited') {
  try {
    const visited = getVisited(storageKey);
    visited.add(url);
    localStorage.setItem(storageKey, JSON.stringify([...visited]));
  } catch {
    // private mode — tint simply will not persist
  }
}

function readThemeColors(container: HTMLElement, groups: string[]): ThemeColors {
  const style = getComputedStyle(container);
  const token = (name: string) => style.getPropertyValue(name).trim();
  const muted = resolveColor(token('--color-fd-muted-foreground') || 'gray');
  return {
    current: resolveColor(token('--color-fd-primary') || '#3b82f6'),
    page: muted,
    tag: resolveColor(token('--wiki-graph-tag-color') || token('--color-fd-primary') || 'teal'),
    label: resolveColor(token('--color-fd-foreground') || '#111'),
    link: muted,
    groups: Object.fromEntries(
      groups.map((group) => [
        group,
        resolveColor(
          token(`--wiki-graph-node-color-${groupColorIndex(group)}`) ||
            token('--color-fd-primary') ||
            '#3b82f6',
        ),
      ]),
    ),
    font: token('--font-mono') || 'ui-monospace, monospace',
  };
}

function useContainerSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function fitGraph(
  graph: ForceGraphMethods<GraphNode, GraphLink> | undefined,
  duration = 400,
) {
  graph?.zoomToFit(duration, 32);
}

/**
 * Reduced GraphView: force layout, zoom/pan, click-to-navigate, local/global
 * variants, optional visited tint. Deferred vs the reference: selection
 * preview card, link-direction arrows, label collision layout, hover
 * prefetch, and semantic √-zoom label priority queues.
 */
export function GraphView({
  graph,
  variant = 'global',
  currentUrl,
  className,
  extraControls,
  trackVisited = true,
  visitedStorageKey = 'wiki-graph-visited',
}: GraphViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const size = useContainerSize(ref);
  const fitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setMount(true);
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div
      ref={ref}
      className={`wiki-graph-frame not-prose group relative w-full max-w-full overflow-hidden ${
        className ?? 'h-[min(600px,70vh)]'
      }`}
    >
      {mount && size.width > 0 ? (
        <ClientOnly
          graph={graph}
          variant={variant}
          currentUrl={currentUrl}
          containerRef={ref}
          size={size}
          fitRef={fitRef}
          trackVisited={trackVisited}
          visitedStorageKey={visitedStorageKey}
        />
      ) : null}
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {extraControls}
        <button
          type="button"
          aria-label="Zoom to fit"
          className="wiki-graph-btn"
          onClick={() => fitRef.current?.()}
        >
          <Crosshair className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="wiki-graph-btn"
          onClick={() => {
            if (document.fullscreenElement === ref.current) {
              void document.exitFullscreen();
            } else {
              void ref.current?.requestFullscreen();
            }
          }}
        >
          {fullscreen ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function ClientOnly({
  containerRef,
  graph,
  variant,
  currentUrl,
  size,
  fitRef,
  trackVisited,
  visitedStorageKey,
}: {
  graph: Graph;
  variant: 'global' | 'local';
  currentUrl?: string;
  containerRef: RefObject<HTMLDivElement | null>;
  size: { width: number; height: number };
  fitRef: RefObject<(() => void) | null>;
  trackVisited: boolean;
  visitedStorageKey: string;
}) {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
  const hoveredRef = useRef<GraphNode | null>(null);
  const colorsRef = useRef<ThemeColors | null>(null);
  const visitedRef = useRef<Set<string>>(new Set());
  const baselineZoomRef = useRef<number | null>(null);
  const didAutoFitRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const router = useRouter();

  const data = useMemo(() => structuredClone(graph) as Graph, [graph]);

  const groups = useMemo(
    () =>
      [...new Set(data.nodes.map((node) => node.group))].filter(
        (group): group is string => Boolean(group),
      ),
    [data],
  );

  useEffect(() => {
    if (trackVisited) visitedRef.current = getVisited(visitedStorageKey);
    const container = containerRef.current;
    if (!container) return;
    colorsRef.current = readThemeColors(container, groups);
    const observer = new MutationObserver(() => {
      colorsRef.current = readThemeColors(container, groups);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [containerRef, groups, trackVisited, visitedStorageKey]);

  useEffect(() => {
    fitRef.current = () => fitGraph(graphRef.current);
  }, [fitRef]);

  useEffect(() => {
    didAutoFitRef.current = false;
  }, [data]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const release = () => {
      if (didAutoFitRef.current) return;
      didAutoFitRef.current = true;
      baselineZoomRef.current = graphRef.current?.zoom() ?? null;
    };
    const opts = { capture: true, passive: true } as const;
    container.addEventListener('wheel', release, opts);
    container.addEventListener('pointerdown', release, opts);
    return () => {
      container.removeEventListener('wheel', release, opts);
      container.removeEventListener('pointerdown', release, opts);
    };
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onPointerDown = (event: PointerEvent) => {
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      suppressClickRef.current = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
        suppressClickRef.current = true;
      }
    };
    const onPointerUp = () => {
      pointerStartRef.current = null;
    };
    container.addEventListener('pointerdown', onPointerDown, true);
    container.addEventListener('pointermove', onPointerMove, true);
    container.addEventListener('pointerup', onPointerUp, true);
    container.addEventListener('pointercancel', onPointerUp, true);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
      container.removeEventListener('pointermove', onPointerMove, true);
      container.removeEventListener('pointerup', onPointerUp, true);
      container.removeEventListener('pointercancel', onPointerUp, true);
    };
  }, [containerRef]);

  const configure = useCallback(
    (fg: ForceGraphMethods<GraphNode, GraphLink>) => {
      fg.d3Force('link', forceLink().distance(variant === 'local' ? 60 : 90));
      fg.d3Force(
        'charge',
        forceManyBody().strength(variant === 'local' ? -80 : -120),
      );
      fg.d3Force(
        'collision',
        forceCollide<GraphNode>(
          (node) => 10 + Math.sqrt(node.neighbors?.length ?? 0) * 4,
        ),
      );
      if (variant === 'global') {
        fg.d3Force(
          'radial',
          forceRadial((Math.min(size.width, size.height) / 2) * 0.8).strength(0.05),
        );
      } else {
        fg.d3Force('radial', null);
      }
    },
    [variant, size.width, size.height],
  );
  const configureRef = useRef(configure);
  configureRef.current = configure;

  const fgRefObject = useRef<{
    current: ForceGraphMethods<GraphNode, GraphLink> | undefined;
  } | null>(null);
  if (!fgRefObject.current) {
    fgRefObject.current = {
      get current() {
        return graphRef.current;
      },
      set current(fg: ForceGraphMethods<GraphNode, GraphLink> | undefined) {
        graphRef.current = fg;
        if (fg) configureRef.current(fg);
      },
    };
  }

  const nodeRadius = useCallback(
    (node: GraphNode) => {
      const degree = node.neighbors?.length ?? 0;
      const isCurrent = currentUrl !== undefined && node.url === currentUrl;
      return 2 + Math.sqrt(degree) * 1.8 + (isCurrent ? 1.5 : 0);
    },
    [currentUrl],
  );

  const isActive = useCallback((node: GraphNode): boolean => {
    const hovered = hoveredRef.current;
    if (!hovered) return true;
    return (
      hovered.id === node.id ||
      (hovered.neighbors ?? []).includes(String(node.id))
    );
  }, []);

  const nodeCanvasObject: ForceGraphProps<GraphNode, GraphLink>['nodeCanvasObject'] = (
    node,
    ctx,
    globalScale,
  ) => {
    const colors = colorsRef.current;
    if (!colors || node.x == null || node.y == null) return;

    const isCurrent = currentUrl !== undefined && node.url === currentUrl;
    const isHovered = hoveredRef.current?.id === node.id;
    const radius = nodeRadius(node);
    const active = isActive(node);
    const alpha = active ? 1 : DIM_ALPHA;

    const fill =
      isCurrent || isHovered
        ? colors.current
        : node.kind === 'tag'
          ? colors.tag
          : (node.group && colors.groups[node.group]) || colors.page;

    const visitedDim =
      trackVisited &&
      !isCurrent &&
      !isHovered &&
      visitedRef.current.has(node.url)
        ? 0.55
        : 1;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = rgba(fill, alpha * visitedDim);
    ctx.fill();

    if (isCurrent) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 1.5 / globalScale + 1, 0, 2 * Math.PI, false);
      ctx.strokeStyle = rgba(colors.current, 0.45 * alpha);
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }

    const baseline = baselineZoomRef.current ?? globalScale;
    const relativeZoom = Math.max(globalScale / baseline, 1e-4);
    const zoomAlpha = Math.min(
      1,
      Math.max(0, Math.log2(relativeZoom) + 1 - LABEL_OPACITY_SCALE[variant]),
    );
    const labelAlpha = isCurrent || isHovered ? 1 : zoomAlpha;
    if (labelAlpha > 0.05) {
      const fontSize = LABEL_FONT_PX / globalScale;
      ctx.font = `${fontSize}px ${colors.font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = rgba(colors.label, labelAlpha * alpha);
      ctx.fillText(node.text, node.x, node.y + radius + 3 / globalScale);
    }
  };

  const linkColor = (link: GraphLink) => {
    const colors = colorsRef.current;
    if (!colors) return 'rgba(128,128,128,0.3)';
    const hovered = hoveredRef.current;
    const source = link.source as GraphNode;
    const target = link.target as GraphNode;
    if (!hovered) return rgba(colors.link, 0.25);
    const active = hovered.id === source.id || hovered.id === target.id;
    return rgba(active ? colors.current : colors.link, active ? 0.9 : 0.05);
  };

  const openNode = useCallback(
    (node: GraphNode) => {
      if (trackVisited) {
        recordVisited(node.url, visitedStorageKey);
        visitedRef.current.add(node.url);
      }
      router.push(node.url);
    },
    [router, trackVisited, visitedStorageKey],
  );

  return (
    <ForceGraph2D
      width={size.width}
      height={size.height}
      ref={fgRefObject.current}
      graphData={data}
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        if (node.x == null || node.y == null) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius(node) + 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      linkColor={linkColor}
      linkWidth={1.5}
      onNodeHover={(node: GraphNode | null) => {
        hoveredRef.current = node;
        const container = containerRef.current;
        if (container) container.style.cursor = node ? 'pointer' : '';
      }}
      onNodeClick={(node: GraphNode) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        openNode(node);
      }}
      onNodeDrag={() => {
        suppressClickRef.current = true;
      }}
      onEngineTick={() => {
        if (!didAutoFitRef.current) fitGraph(graphRef.current, 0);
      }}
      onEngineStop={() => {
        if (didAutoFitRef.current) return;
        didAutoFitRef.current = true;
        fitGraph(graphRef.current);
        baselineZoomRef.current = graphRef.current?.zoom() ?? null;
      }}
      minZoom={0.3}
      maxZoom={Math.min(16, Math.max(8, Math.sqrt(data.nodes.length / 4)))}
      autoPauseRedraw={false}
      enableNodeDrag
      enableZoomInteraction
    />
  );
}
