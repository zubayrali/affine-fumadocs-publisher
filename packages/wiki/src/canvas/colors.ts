import type { CanvasColor } from './types.js';

const PRESET_COLORS: Record<string, string> = {
  '1': '#e93147',
  '2': '#e9835e',
  '3': '#e0b400',
  '4': '#86bd00',
  '5': '#08bdba',
  '6': '#a882ff',
};

const PRESET_BACKGROUNDS: Record<string, string> = {
  '1': '#fce8eb',
  '2': '#fdf0e8',
  '3': '#fdf8e0',
  '4': '#f0f8e0',
  '5': '#e0f8f8',
  '6': '#f0ecff',
};

export function resolveCanvasColor(color?: CanvasColor) {
  if (!color) return undefined;
  if (typeof color !== 'string') return `light-dark(${color.light}, ${color.dark})`;
  if (color.startsWith('#')) return color;
  return PRESET_COLORS[color] ?? undefined;
}

export function resolveCanvasInkColor(color?: CanvasColor) {
  const resolved = resolveCanvasColor(color);
  if (!resolved) return undefined;

  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(resolved);
  if (!match) return resolved;
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;

  if (luminance < 0.18) return `light-dark(${resolved}, #f8fafc)`;
  if (luminance > 0.82) return `light-dark(#111827, ${resolved})`;
  return resolved;
}

export function canvasNodeStyle(color?: CanvasColor) {
  if (!color) {
    return { backgroundColor: 'var(--color-fd-background)' };
  }

  const borderColor = resolveCanvasColor(color);
  if (!borderColor) {
    return { backgroundColor: 'var(--color-fd-background)' };
  }

  const backgroundColor =
    (typeof color === 'string' ? PRESET_BACKGROUNDS[color] : undefined) ??
    `color-mix(in oklab, ${borderColor} 14%, var(--color-fd-background))`;

  return { borderColor, backgroundColor };
}
