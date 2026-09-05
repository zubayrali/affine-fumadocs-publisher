import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isStudioSnapshot,
  parsePublishingStudioConfig,
} from '../src/studio/config.mjs';

test('parsePublishingStudioConfig normalizes routes and rejects unsafe portal ids', () => {
  const config = parsePublishingStudioConfig({
    version: 1,
    portals: [{
      id: 'guides',
      route: '/docs/',
      label: 'Guides',
      collection: 'Language · English',
      layout: 'library',
      properties: ['Description'],
    }],
  });

  assert.equal(config.version, 1);
  assert.equal(config.portals[0]?.route, 'docs');
  assert.equal(config.portals[0]?.layout, 'library');
  assert.deepEqual(config.editorial.recommendedProperties, ['Description', 'Translation Key']);

  assert.throws(
    () => parsePublishingStudioConfig({
      version: 1,
      portals: [{ id: 'Bad ID', route: 'x', label: 'x', collection: 'x' }],
    }),
    /Unsafe portal id/,
  );
});

test('isStudioSnapshot accepts a valid fixture shape', () => {
  assert.equal(isStudioSnapshot({
    version: 1,
    generatedAt: '2026-09-05T00:00:00.000Z',
    locale: 'en',
    summary: {
      workspaceDocuments: 1,
      publishedPages: 1,
      drafts: 0,
      errors: 0,
      warnings: 0,
    },
    collections: [],
    portals: [],
    documents: [],
    diagnostics: [],
  }), true);

  assert.equal(isStudioSnapshot({ version: 2 }), false);
  assert.equal(isStudioSnapshot(null), false);
});
