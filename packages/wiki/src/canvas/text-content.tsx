'use client';

import { AffineDatabaseView } from '../databases/view.js';
import type { AffineDatabaseSnapshot } from '../databases/types.js';

export type CanvasTextContentProps = {
  html?: string;
  databaseSnapshot?: AffineDatabaseSnapshot;
};

/**
 * Rich text/note body for canvas boxes: optional HTML plus an optional
 * embedded database. Segmented latex/table/bookmark rendering stays deferred.
 */
export function CanvasTextContent({ html, databaseSnapshot }: CanvasTextContentProps) {
  return (
    <div className="wiki-canvas-text-content nowheel h-full overflow-auto text-sm leading-relaxed break-words">
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {databaseSnapshot ? <AffineDatabaseView snapshot={databaseSnapshot} /> : null}
    </div>
  );
}
