import type { AffineDatabaseSnapshot } from '../databases/types.js';
import type { CanvasContentSegment, CanvasData, CanvasEdge, CanvasNode } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function color(value: unknown) {
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.light === 'string' && typeof value.dark === 'string') {
    return { light: value.light, dark: value.dark };
  }
  return undefined;
}

function content(value: unknown): CanvasContentSegment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: CanvasContentSegment[] = [];
  for (const segment of value) {
    if (!isRecord(segment)) continue;
    if (segment.type === 'markdown' && typeof segment.text === 'string') {
      result.push({ type: 'markdown', text: segment.text });
      continue;
    }
    if (segment.type === 'database' && isRecord(segment.snapshot)) {
      result.push({
        type: 'database',
        snapshot: segment.snapshot as AffineDatabaseSnapshot,
      });
      continue;
    }
    if (segment.type === 'divider') result.push({ type: 'divider' });
    else if (segment.type === 'image' && typeof segment.src === 'string') {
      result.push({
        type: 'image',
        src: segment.src,
        alt: typeof segment.alt === 'string' ? segment.alt : undefined,
        caption: typeof segment.caption === 'string' ? segment.caption : undefined,
      });
    } else if (segment.type === 'bookmark' && typeof segment.url === 'string') {
      result.push({
        type: 'bookmark',
        url: segment.url,
        title: typeof segment.title === 'string' ? segment.title : undefined,
        description: typeof segment.description === 'string' ? segment.description : undefined,
        icon: typeof segment.icon === 'string' ? segment.icon : undefined,
        image: typeof segment.image === 'string' ? segment.image : undefined,
      });
    } else if (segment.type === 'latex' && typeof segment.formula === 'string') {
      result.push({ type: 'latex', formula: segment.formula });
    } else if (segment.type === 'table' && Array.isArray(segment.rows)) {
      result.push({
        type: 'table',
        rows: segment.rows
          .filter(Array.isArray)
          .map((row) => row.map((cell) => String(cell ?? ''))),
      });
    } else if (
      segment.type === 'unsupported' &&
      typeof segment.flavour === 'string' &&
      typeof segment.label === 'string'
    ) {
      result.push({
        type: 'unsupported',
        flavour: segment.flavour,
        label: segment.label,
        data: isRecord(segment.data) ? segment.data : undefined,
      });
    }
  }
  return result;
}

function parseNode(value: unknown): CanvasNode | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.type !== 'string') return null;
  if (typeof value.x !== 'number') return null;
  if (typeof value.y !== 'number') return null;
  if (typeof value.width !== 'number') return null;
  if (typeof value.height !== 'number') return null;

  const base = {
    id: value.id,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    color: color(value.color),
  };

  switch (value.type) {
    case 'text':
      if (typeof value.text !== 'string') return null;
      return {
        ...base,
        type: 'text',
        text: value.text,
        content: content(value.content),
        variant: value.variant === 'label' ? 'label' : undefined,
        fontSize: typeof value.fontSize === 'number' ? value.fontSize : undefined,
        fontWeight:
          typeof value.fontWeight === 'string' || typeof value.fontWeight === 'number'
            ? value.fontWeight
            : undefined,
        textAlign:
          value.textAlign === 'center' || value.textAlign === 'right'
            ? value.textAlign
            : value.textAlign === 'left'
              ? 'left'
              : undefined,
        rotate: typeof value.rotate === 'number' ? value.rotate : undefined,
      };
    case 'file':
      if (typeof value.file !== 'string') return null;
      return {
        ...base,
        type: 'file',
        file: value.file,
        subpath: typeof value.subpath === 'string' ? value.subpath : undefined,
      };
    case 'link':
      if (typeof value.url !== 'string') return null;
      return { ...base, type: 'link', url: value.url };
    case 'group':
      return {
        ...base,
        type: 'group',
        label: typeof value.label === 'string' ? value.label : undefined,
        background: typeof value.background === 'string' ? value.background : undefined,
        backgroundStyle:
          value.backgroundStyle === 'cover' ||
          value.backgroundStyle === 'ratio' ||
          value.backgroundStyle === 'repeat'
            ? value.backgroundStyle
            : undefined,
      };
    case 'shape': {
      const shape =
        value.shape === 'ellipse' || value.shape === 'diamond' || value.shape === 'triangle'
          ? value.shape
          : 'rect';
      return {
        ...base,
        type: 'shape',
        shape,
        text: typeof value.text === 'string' ? value.text : undefined,
        fillColor: color(value.fillColor),
        strokeColor: color(value.strokeColor),
        textColor: color(value.textColor),
        strokeWidth: typeof value.strokeWidth === 'number' ? value.strokeWidth : undefined,
        radius: typeof value.radius === 'number' ? value.radius : undefined,
        rotate: typeof value.rotate === 'number' ? value.rotate : undefined,
        fontSize: typeof value.fontSize === 'number' ? value.fontSize : undefined,
        fontWeight:
          typeof value.fontWeight === 'string' || typeof value.fontWeight === 'number'
            ? value.fontWeight
            : undefined,
      };
    }
    case 'brush':
      if (!Array.isArray(value.points)) return null;
      return {
        ...base,
        type: 'brush',
        points: value.points.filter(
          (point): point is [number, number] =>
            Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number',
        ),
        strokeColor: color(value.strokeColor),
        strokeWidth: typeof value.strokeWidth === 'number' ? value.strokeWidth : undefined,
        rotate: typeof value.rotate === 'number' ? value.rotate : undefined,
      };
    default:
      return null;
  }
}

function parseEdge(value: unknown): CanvasEdge | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string') return null;
  if (typeof value.fromNode !== 'string') return null;
  if (typeof value.toNode !== 'string') return null;

  const side = (v: unknown) =>
    v === 'top' || v === 'right' || v === 'bottom' || v === 'left' ? v : undefined;
  const end = (v: unknown) => (v === 'none' || v === 'arrow' ? v : undefined);
  const position = (v: unknown): [number, number] | undefined =>
    Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
      ? [v[0], v[1]]
      : undefined;

  return {
    id: value.id,
    fromNode: value.fromNode,
    toNode: value.toNode,
    fromSide: side(value.fromSide),
    toSide: side(value.toSide),
    fromPosition: position(value.fromPosition),
    toPosition: position(value.toPosition),
    mode:
      value.mode === 'straight' || value.mode === 'curve' || value.mode === 'orthogonal'
        ? value.mode
        : undefined,
    strokeStyle: value.strokeStyle === 'dash' ? 'dash' : undefined,
    strokeWidth:
      typeof value.strokeWidth === 'number' && Number.isFinite(value.strokeWidth)
        ? Math.max(0, value.strokeWidth)
        : undefined,
    fromEnd: end(value.fromEnd),
    toEnd: end(value.toEnd),
    color: color(value.color),
    label: typeof value.label === 'string' ? value.label : undefined,
  };
}

/** Parse a published CanvasData JSON string into typed nodes and edges. */
export function parseCanvasData(raw: string): CanvasData {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    return { nodes: [], edges: [] };
  }

  const nodes = Array.isArray(parsed.nodes)
    ? parsed.nodes.map(parseNode).filter((node): node is CanvasNode => node !== null)
    : [];
  const edges = Array.isArray(parsed.edges)
    ? parsed.edges.map(parseEdge).filter((edge): edge is CanvasEdge => edge !== null)
    : [];

  return { nodes, edges };
}
