import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCanvasData } from './load-canvas.js';
import { CanvasView } from './view.js';

/**
 * Server component: load a published CanvasData JSON from `public/`.
 * `src` must be a root-relative path under `/affine-canvas/`.
 */
export async function CanvasPage({
  src,
  title,
  fullBleed = false,
}: {
  src: string;
  title?: string;
  fullBleed?: boolean;
}) {
  if (!src.startsWith('/affine-canvas/') || src.includes('..')) {
    return <p className="wiki-canvas-error">Canvas source is not valid.</p>;
  }

  try {
    const filePath = path.join(process.cwd(), 'public', src.replace(/^\//, ''));
    const data = parseCanvasData(await fs.readFile(filePath, 'utf8'));
    return <CanvasView data={data} title={title} fullBleed={fullBleed} />;
  } catch {
    return (
      <p className="wiki-canvas-error">
        This canvas is not available in the publication snapshot.
      </p>
    );
  }
}
