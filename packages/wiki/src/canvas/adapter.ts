import type {
  AffineCanvasBounds,
  AffineCanvasChild,
  AffineCanvasColor,
  AffineEdgelessCanvas,
  AffineSurfaceEndpoint,
} from './affine-types.js';
import type {
  CanvasColor,
  CanvasContentSegment,
  CanvasData,
  CanvasEdge,
  CanvasEnd,
  CanvasNode,
  CanvasSide,
} from './types.js';

function hasBounds(value: AffineCanvasBounds | null | undefined): value is AffineCanvasBounds {
  return Boolean(
    value &&
      [value.x, value.y, value.width, value.height].every(Number.isFinite) &&
      value.width > 0 &&
      value.height > 0,
  );
}

function nodeBounds(id: string, bounds: AffineCanvasBounds) {
  return { id, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text;
  }
  return undefined;
}

function richTextMarkdown(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('delta' in value) || !Array.isArray(value.delta)) {
    return asText(value);
  }
  return value.delta
    .map((part) => {
      if (!part || typeof part !== 'object' || !('insert' in part) || typeof part.insert !== 'string') {
        return '';
      }
      let text = part.insert;
      const attributes =
        'attributes' in part && part.attributes && typeof part.attributes === 'object'
          ? (part.attributes as Record<string, unknown>)
          : {};
      if (attributes.code) text = `\`${text}\``;
      if (attributes.bold) text = `**${text}**`;
      if (attributes.italic) text = `*${text}*`;
      if (attributes.strike) text = `~~${text}~~`;
      if (typeof attributes.link === 'string') text = `[${text}](${attributes.link})`;
      return text;
    })
    .join('');
}

function prop(child: AffineCanvasChild, ...names: string[]): unknown {
  for (const name of names) if (child.props?.[name] !== undefined) return child.props[name];
  return undefined;
}

function publicationMetadataYaml(child: AffineCanvasChild, index: number) {
  if (index !== 0 || child.flavour !== 'affine:code' || child.language?.toLowerCase() !== 'yaml') {
    return false;
  }
  return /(^|\n)\s*(publish|draft|slug|locale|contentSource|translation key)\s*:/i.test(
    child.text ?? '',
  );
}

function childMarkdown(child: AffineCanvasChild, depth = 0): string {
  const text = richTextMarkdown(prop(child, 'text'))?.trim() ?? child.text?.trim() ?? '';
  const type = child.type?.toLowerCase();
  const flavour = child.flavour?.toLowerCase();
  const indent = '  '.repeat(depth);
  let line = text;
  if (/^h[1-6]$/.test(type ?? '')) line = `${'#'.repeat(Number(type?.slice(1)))} ${text}`;
  else if (type === 'bulleted' || type === 'bullet') line = `${indent}- ${text}`;
  else if (type === 'numbered') line = `${indent}1. ${text}`;
  else if (type === 'todo') line = `${indent}- [${child.checked ? 'x' : ' '}] ${text}`;
  else if (type === 'quote') line = `> ${text}`;
  else if (type === 'code' || flavour === 'affine:code') {
    line = `\`\`\`${child.language ?? ''}\n${text}\n\`\`\``;
  }
  const descendants = child.children?.map((item) => childMarkdown(item, depth + 1)).filter(Boolean) ?? [];
  return [line, ...descendants].filter(Boolean).join('\n');
}

function imageSegment(child: AffineCanvasChild): CanvasContentSegment {
  const source = asText(prop(child, 'sourceId', 'blobId', 'source', 'src')) ?? '';
  const src = /^(?:https?:|\/|affine:\/\/blob\/)/.test(source)
    ? source
    : source
      ? `affine://blob/${source}`
      : '/affine-unavailable-blob.svg';
  return {
    type: 'image',
    src,
    alt: asText(prop(child, 'alt', 'name')),
    caption: asText(prop(child, 'caption')),
  };
}

function tableRows(child: AffineCanvasChild): string[][] {
  const rawRows = prop(child, 'rows');
  if (Array.isArray(rawRows)) {
    const rows = rawRows.map((row) =>
      Array.isArray(row) ? row.map((cell) => asText(cell) ?? String(cell ?? '')) : [],
    );
    if (rows.some((row) => row.length)) return rows;
  }
  const props = child.props ?? {};
  const rows = [
    ...new Map(
      Object.entries(props).flatMap(([key, value]) => {
        const match = /^rows\.([^.]+)\.rowId$/.exec(key);
        if (!match || typeof value !== 'string') return [];
        return [
          [match[1]!, { id: value, order: String(props[`rows.${match[1]}.order`] ?? '') }] as const,
        ];
      }),
    ).values(),
  ].sort((a, b) => a.order.localeCompare(b.order));
  const columns = [
    ...new Map(
      Object.entries(props).flatMap(([key, value]) => {
        const match = /^columns\.([^.]+)\.columnId$/.exec(key);
        if (!match || typeof value !== 'string') return [];
        return [
          [
            match[1]!,
            { id: value, order: String(props[`columns.${match[1]}.order`] ?? '') },
          ] as const,
        ];
      }),
    ).values(),
  ].sort((a, b) => a.order.localeCompare(b.order));
  if (rows.length && columns.length) {
    return rows.map((row) =>
      columns.map((column) => richTextMarkdown(props[`cells.${row.id}:${column.id}.text`]) ?? ''),
    );
  }
  return (child.children ?? [])
    .map((row) => (row.children?.length ? row.children : [row]).map((cell) => childMarkdown(cell)))
    .filter((row) => row.some(Boolean));
}

function contentSegments(children: AffineCanvasChild[] | undefined): CanvasContentSegment[] | undefined {
  if (!children?.length) return undefined;
  const segments: CanvasContentSegment[] = [];
  let markdown: string[] = [];
  const flush = () => {
    const text = markdown.filter(Boolean).join('\n\n');
    if (text) segments.push({ type: 'markdown', text });
    markdown = [];
  };
  children.forEach((child, index) => {
    if (publicationMetadataYaml(child, index)) return;
    const flavour = child.flavour?.toLowerCase() ?? '';
    if (flavour === 'affine:database' && child.database) {
      flush();
      segments.push({ type: 'database', snapshot: child.database });
    } else if (flavour === 'affine:divider') {
      flush();
      segments.push({ type: 'divider' });
    } else if (flavour === 'affine:image') {
      flush();
      segments.push(imageSegment(child));
    } else if (flavour === 'affine:bookmark') {
      flush();
      segments.push({
        type: 'bookmark',
        url: asText(prop(child, 'url')) ?? '',
        title: asText(prop(child, 'title')),
        description: asText(prop(child, 'description', 'caption')),
        icon: asText(prop(child, 'icon')),
        image: asText(prop(child, 'image')),
      });
    } else if (flavour === 'affine:latex') {
      flush();
      segments.push({
        type: 'latex',
        formula: asText(prop(child, 'latex', 'formula', 'text')) ?? child.text ?? '',
      });
    } else if (flavour === 'affine:table') {
      flush();
      segments.push({ type: 'table', rows: tableRows(child) });
    } else {
      const rendered = childMarkdown(child);
      if (rendered) markdown.push(rendered);
      else if (flavour && flavour !== 'affine:paragraph' && flavour !== 'affine:list') {
        flush();
        segments.push({
          type: 'unsupported',
          flavour: child.flavour ?? 'AFFiNE block',
          label:
            asText(prop(child, 'name', 'title')) ??
            child.flavour?.replace(/^affine:/, '') ??
            'AFFiNE block',
          data: child.props,
        });
      }
    }
  });
  flush();
  return segments.length ? segments : undefined;
}

function noteMarkdown(children: AffineCanvasChild[] | undefined, fallback: string | null | undefined) {
  const structured = children
    ?.filter((child, index) => !publicationMetadataYaml(child, index))
    .map((child) => childMarkdown(child))
    .filter(Boolean)
    .join('\n\n');
  return structured || fallback?.trim() || '';
}

function estimatedNoteHeight(children: AffineCanvasChild[] | undefined, text: string, width: number) {
  const charsPerLine = Math.max(24, Math.floor((width - 32) / 8));
  let height = 28 + Math.max(1, Math.ceil(text.length / charsPerLine)) * 23;
  for (const child of children ?? []) {
    const flavour = child.flavour?.toLowerCase();
    if (flavour === 'affine:image') height += 240;
    else if (flavour === 'affine:database' || flavour === 'affine:table') height += 220;
    else if (flavour === 'affine:bookmark') height += 92;
    else if (flavour === 'affine:divider') height += 18;
  }
  return Math.min(2400, Math.max(96, height));
}

const PALETTE: Record<string, string> = {
  yellow: '#fcd34d',
  orange: '#fdba74',
  red: '#fca5a5',
  magenta: '#f0abfc',
  purple: '#c4b5fd',
  navy: '#a5b4fc',
  blue: '#93c5fd',
  green: '#86efac',
  teal: '#5eead4',
  grey: '#d1d5db',
  gray: '#d1d5db',
  white: '#ffffff',
  black: '#111827',
};

function affineColor(value: AffineCanvasColor | null | undefined): CanvasColor | undefined {
  if (!value) return undefined;
  if (typeof value !== 'string') {
    return typeof value.light === 'string' && typeof value.dark === 'string' ? value : undefined;
  }
  if (!value.startsWith('--affine-palette-')) return value;
  const name = value.split('-').at(-1)?.toLowerCase();
  return name ? PALETTE[name] : undefined;
}

function affineReadableInk(value: AffineCanvasColor | null | undefined): CanvasColor | undefined {
  const resolved = affineColor(value);
  if (!resolved || typeof resolved !== 'string') return resolved;
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(resolved);
  if (!match) return resolved;
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  if (luminance < 0.18) return { light: resolved, dark: '#f8fafc' };
  if (luminance > 0.82) return { light: '#111827', dark: resolved };
  return resolved;
}

function endpointSide(endpoint: AffineSurfaceEndpoint | undefined): CanvasSide | undefined {
  const position = endpoint?.position;
  if (!position || position.length < 2) return undefined;
  const [x, y] = position;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  const choices: Array<[CanvasSide, number]> = [
    ['top', Math.abs(y!)],
    ['right', Math.abs(1 - x!)],
    ['bottom', Math.abs(1 - y!)],
    ['left', Math.abs(x!)],
  ];
  return choices.sort((a, b) => a[1] - b[1])[0]?.[0];
}

function endpointPosition(endpoint: AffineSurfaceEndpoint | undefined): [number, number] | undefined {
  const position = endpoint?.position;
  if (!position || position.length < 2) return undefined;
  const [x, y] = position;
  return Number.isFinite(x) && Number.isFinite(y) ? [x!, y!] : undefined;
}

function endpointStyle(value: string | undefined): CanvasEnd {
  return value?.toLowerCase().includes('arrow') ? 'arrow' : 'none';
}

function connectorMode(value: string | number | undefined): CanvasEdge['mode'] {
  if (value === 0 || String(value).toLowerCase() === 'straight') return 'straight';
  if (value === 2 || String(value).toLowerCase() === 'curve') return 'curve';
  return 'orthogonal';
}

function connectorStrokeStyle(value: string | undefined): CanvasEdge['strokeStyle'] {
  return value?.toLowerCase() === 'dash' ? 'dash' : 'solid';
}

function shapeType(value: string | undefined): 'rect' | 'ellipse' | 'diamond' | 'triangle' {
  return value === 'ellipse' || value === 'diamond' || value === 'triangle' ? value : 'rect';
}

function boundsForChildren(ids: string[], nodes: CanvasNode[]): AffineCanvasBounds | undefined {
  const members = nodes.filter((node) => ids.includes(node.id));
  if (!members.length) return undefined;
  const padding = 24;
  const minX = Math.min(...members.map((node) => node.x)) - padding;
  const minY = Math.min(...members.map((node) => node.y)) - padding;
  const maxX = Math.max(...members.map((node) => node.x + node.width)) + padding;
  const maxY = Math.max(...members.map((node) => node.y + node.height)) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Convert an AFFiNE edgeless canvas snapshot into neutral CanvasData. */
export function affineCanvasToCanvasData(input: AffineEdgelessCanvas): CanvasData {
  const nodes: CanvasNode[] = [];
  for (const block of input.edgelessBlocks ?? []) {
    if (!block.id || !hasBounds(block.bounds)) continue;
    if (block.flavour === 'affine:frame') {
      nodes.push({
        ...nodeBounds(block.id, block.bounds),
        type: 'group',
        label: block.title?.trim() || undefined,
      });
    } else if (block.flavour === 'affine:note') {
      const text = noteMarkdown(block.children, block.text);
      nodes.push({
        ...nodeBounds(block.id, {
          ...block.bounds,
          height: Math.max(
            block.bounds.height,
            estimatedNoteHeight(block.children, text, block.bounds.width),
          ),
        }),
        type: 'text',
        text,
        content: contentSegments(block.children),
        color: affineColor(block.background as AffineCanvasColor | null | undefined),
      });
    } else if (block.flavour === 'affine:edgeless-text') {
      nodes.push({
        ...nodeBounds(block.id, block.bounds),
        type: 'text',
        variant: 'label',
        text: block.text?.trim() || '',
        color: affineColor(block.color),
      });
    } else if (block.flavour === 'affine:image' && block.sourceId) {
      const source = /^(?:https?:|\/|affine:\/\/blob\/)/.test(block.sourceId)
        ? block.sourceId
        : `affine://blob/${block.sourceId}`;
      nodes.push({
        ...nodeBounds(block.id, block.bounds),
        type: 'file',
        file: source,
      });
    }
  }

  const elements = input.surfaceElements ?? [];
  for (const element of elements) {
    if (!element.id || !hasBounds(element.bounds)) continue;
    const base = nodeBounds(element.id, element.bounds);
    if (element.type === 'shape') {
      nodes.push({
        ...base,
        type: 'shape',
        shape: shapeType(element.shapeType),
        text: element.text?.trim() || undefined,
        fillColor: affineColor(element.fillColor),
        strokeColor: affineColor(element.strokeColor),
        textColor: affineColor(element.color),
        strokeWidth: element.strokeWidth,
        radius: element.radius,
        rotate: element.rotate,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
      });
    } else if (element.type === 'text') {
      nodes.push({
        ...base,
        type: 'text',
        variant: 'label',
        text: element.text?.trim() || '',
        color: affineReadableInk(element.color),
        fontSize: element.fontSize,
        fontWeight: element.fontWeight,
        textAlign:
          element.textAlign === 'left' || element.textAlign === 'right'
            ? element.textAlign
            : 'center',
        rotate: element.rotate,
      });
    } else if (element.type === 'brush' && element.points?.length) {
      nodes.push({
        ...base,
        type: 'brush',
        points: element.points,
        strokeColor: affineColor(element.color ?? element.stroke),
        strokeWidth: element.lineWidth ?? element.strokeWidth,
        rotate: element.rotate,
      });
    } else if (
      element.type !== 'connector' &&
      element.type !== 'group' &&
      element.type !== 'mindmap'
    ) {
      nodes.push({
        ...base,
        type: 'shape',
        shape: 'rect',
        text: element.label?.trim() || element.text?.trim() || `AFFiNE ${element.type ?? 'element'}`,
        fillColor: 'transparent',
        strokeColor: '#929292',
        strokeWidth: 1,
        radius: 6,
      });
    }
  }

  // AFFiNE mind maps use a container element to store parent/child
  // relationships, but the container has no visual frame in Edgeless mode.
  // Only explicit groups become visible canvas backplates.
  const pendingGroups = elements.filter((element) => element.id && element.type === 'group');
  for (let pass = 0; pass < pendingGroups.length + 1; pass++) {
    let changed = false;
    for (const element of pendingGroups) {
      if (nodes.some((node) => node.id === element.id)) continue;
      const bounds = hasBounds(element.bounds)
        ? element.bounds
        : boundsForChildren(Object.keys(element.children ?? {}), nodes);
      if (!bounds) continue;
      nodes.push({
        ...nodeBounds(element.id!, bounds),
        type: 'group',
        label: element.title?.trim() || (element.type === 'mindmap' ? 'Mind map' : undefined),
      });
      changed = true;
    }
    if (!changed) break;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: CanvasEdge[] = elements.flatMap((element) => {
    if (element.type !== 'connector' || !element.id) return [];
    const fromNode = element.source?.id;
    const toNode = element.target?.id;
    if (!fromNode || !toNode || !nodeIds.has(fromNode) || !nodeIds.has(toNode)) return [];
    return [
      {
        id: element.id,
        fromNode,
        toNode,
        fromSide: endpointSide(element.source),
        toSide: endpointSide(element.target),
        fromPosition: endpointPosition(element.source),
        toPosition: endpointPosition(element.target),
        mode: connectorMode(element.mode),
        strokeStyle: connectorStrokeStyle(element.strokeStyle),
        strokeWidth:
          typeof element.strokeWidth === 'number' && Number.isFinite(element.strokeWidth)
            ? Math.max(0, element.strokeWidth)
            : undefined,
        fromEnd: endpointStyle(element.frontEndpointStyle),
        toEnd: endpointStyle(element.rearEndpointStyle),
        color: affineColor(element.stroke ?? element.strokeColor),
        label: element.label?.trim() || element.text?.trim() || undefined,
      },
    ];
  });
  for (const mindmap of elements.filter((element) => element.type === 'mindmap')) {
    for (const [childId, relation] of Object.entries(mindmap.children ?? {})) {
      if (
        typeof relation !== 'object' ||
        !relation.parent ||
        !nodeIds.has(relation.parent) ||
        !nodeIds.has(childId)
      ) {
        continue;
      }
      edges.push({
        id: `${mindmap.id}-${relation.parent}-${childId}`,
        fromNode: relation.parent,
        toNode: childId,
        mode: 'curve',
        toEnd: 'none',
        color: '#929292',
      });
    }
  }
  return { nodes, edges };
}
