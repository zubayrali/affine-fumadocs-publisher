import type { AffineDatabaseSnapshot } from '../databases/types.js';

export interface AffineCanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AffineCanvasChild {
  id?: string;
  flavour?: string;
  type?: string;
  text?: string;
  language?: string;
  checked?: boolean;
  children?: AffineCanvasChild[];
  /** Complete AFFiNE block properties, with the `prop:` prefix removed. */
  props?: Record<string, unknown>;
  database?: AffineDatabaseSnapshot;
}

export type AffineCanvasColor = string | { light: string; dark: string };

export interface AffineEdgelessBlock {
  id?: string;
  flavour?: string;
  bounds?: AffineCanvasBounds | null;
  text?: string | null;
  title?: string | null;
  color?: AffineCanvasColor | null;
  background?: unknown;
  children?: AffineCanvasChild[];
  sourceId?: string | null;
  caption?: string | null;
}

export interface AffineSurfaceEndpoint {
  id?: string;
  position?: number[];
}

export interface AffineSurfaceElement {
  id?: string;
  type?: string;
  bounds?: AffineCanvasBounds | null;
  text?: string | null;
  label?: string | null;
  shapeType?: string;
  fillColor?: AffineCanvasColor;
  strokeColor?: AffineCanvasColor;
  color?: AffineCanvasColor;
  stroke?: AffineCanvasColor;
  strokeWidth?: number;
  strokeStyle?: string;
  mode?: string | number;
  radius?: number;
  rotate?: number;
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: string;
  source?: AffineSurfaceEndpoint;
  target?: AffineSurfaceEndpoint;
  frontEndpointStyle?: string;
  rearEndpointStyle?: string;
  children?: Record<string, boolean | { index?: string; parent?: string; collapsed?: boolean }>;
  title?: string;
  points?: Array<[number, number]>;
  lineWidth?: number;
  layoutType?: string | number;
  style?: string | number;
}

export interface AffineEdgelessCanvas {
  docId?: string;
  exists?: boolean;
  edgelessBlocks?: AffineEdgelessBlock[];
  surfaceElements?: AffineSurfaceElement[];
}
