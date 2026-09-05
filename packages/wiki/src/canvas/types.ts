import type { AffineDatabaseSnapshot } from '../databases/types.js';

export type CanvasSide = 'top' | 'right' | 'bottom' | 'left';
export type CanvasEnd = 'none' | 'arrow';
export type CanvasColor = string | { light: string; dark: string };

export type CanvasContentSegment =
  | { type: 'markdown'; text: string }
  | { type: 'database'; snapshot: AffineDatabaseSnapshot }
  | { type: 'divider' }
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | { type: 'bookmark'; url: string; title?: string; description?: string; icon?: string; image?: string }
  | { type: 'latex'; formula: string }
  | { type: 'table'; rows: string[][] }
  | { type: 'unsupported'; flavour: string; label: string; data?: Record<string, unknown> };

export type CanvasNodeBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
};

export type CanvasTextNode = CanvasNodeBase & {
  type: 'text';
  text: string;
  /** Pre-rendered HTML for richer in-node display (full MDX compile still deferred). */
  html?: string;
  /** Optional embedded database snapshot rendered inside the note card. */
  databaseSnapshot?: AffineDatabaseSnapshot;
  content?: CanvasContentSegment[];
  variant?: 'card' | 'label';
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right';
  rotate?: number;
};

export type CanvasFileNode = CanvasNodeBase & {
  type: 'file';
  file: string;
  subpath?: string;
};

export type CanvasLinkNode = CanvasNodeBase & {
  type: 'link';
  url: string;
};

export type CanvasGroupNode = CanvasNodeBase & {
  type: 'group';
  label?: string;
  background?: string;
  backgroundStyle?: 'cover' | 'ratio' | 'repeat';
};

export type CanvasShapeNode = CanvasNodeBase & {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'diamond' | 'triangle';
  text?: string;
  fillColor?: CanvasColor;
  strokeColor?: CanvasColor;
  textColor?: CanvasColor;
  strokeWidth?: number;
  radius?: number;
  rotate?: number;
  fontSize?: number;
  fontWeight?: string | number;
};

export type CanvasBrushNode = CanvasNodeBase & {
  type: 'brush';
  points: Array<[number, number]>;
  strokeColor?: CanvasColor;
  strokeWidth?: number;
  rotate?: number;
};

export type CanvasNode =
  | CanvasTextNode
  | CanvasFileNode
  | CanvasLinkNode
  | CanvasGroupNode
  | CanvasShapeNode
  | CanvasBrushNode;

export type CanvasEdge = {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: CanvasSide;
  toSide?: CanvasSide;
  fromPosition?: [number, number];
  toPosition?: [number, number];
  mode?: 'straight' | 'orthogonal' | 'curve';
  strokeStyle?: 'solid' | 'dash';
  strokeWidth?: number;
  fromEnd?: CanvasEnd;
  toEnd?: CanvasEnd;
  color?: CanvasColor;
  label?: string;
};

export type CanvasData = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};
