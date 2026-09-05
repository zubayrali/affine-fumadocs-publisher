import fs from 'node:fs/promises';
import path from 'node:path';
import { AffineDatabaseView } from './view.js';
import type { AffineDatabaseSnapshot } from './types.js';

/**
 * Server component: load a published AFFiNE database snapshot from `public/`.
 * `src` must be a root-relative path under `/affine-database/`.
 */
export async function AffineDatabase({ src }: { src: string }) {
  if (!src.startsWith('/affine-database/') || src.includes('..')) {
    return <p className="affine-db-error">Database source is not valid.</p>;
  }

  try {
    const filePath = path.join(process.cwd(), 'public', src);
    const snapshot = JSON.parse(
      await fs.readFile(filePath, 'utf8'),
    ) as AffineDatabaseSnapshot;
    return <AffineDatabaseView snapshot={snapshot} />;
  } catch {
    return (
      <p className="affine-db-error">
        This database is not available in the publication snapshot.
      </p>
    );
  }
}
