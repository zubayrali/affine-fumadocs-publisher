import { notFound } from 'next/navigation';
import { PublishingStudio, isStudioSnapshot } from '@affine-fumadocs/wiki/studio';
import type { StudioSnapshot } from '@affine-fumadocs/wiki/studio';
import wikiConfig from '@/affine-wiki.config';
import fixture from '@/public/affine-studio/fixture-snapshot.json';

export default function PublishingPage() {
  if (!wikiConfig.features.publishingStudio) notFound();
  // Dev/admin surface only — keep Publishing Studio out of production reader routes.
  if (process.env.NODE_ENV === 'production') notFound();

  const snapshot = isStudioSnapshot(fixture)
    ? (fixture as StudioSnapshot)
    : undefined;

  return <PublishingStudio snapshot={snapshot} />;
}
