import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HOMEPAGE_SITE_ROLE,
  SITE_ROLE_PROPERTY,
  isSiteControlPage,
  siteRole,
} from '../src/site/site-control.mjs';
import { buildHomeModel } from '../src/site/home-model.mjs';

test('isSiteControlPage recognizes native and nested Content Type roles', () => {
  assert.equal(SITE_ROLE_PROPERTY, 'Content Type');
  assert.equal(HOMEPAGE_SITE_ROLE, 'site-homepage');

  assert.equal(
    isSiteControlPage({
      metadata: { [SITE_ROLE_PROPERTY]: 'Site Homepage' },
    }),
    true,
  );
  assert.equal(siteRole({ metadata: { [SITE_ROLE_PROPERTY]: 'Site Homepage' } }), 'site-homepage');

  assert.equal(
    isSiteControlPage({
      metadata: { affineProperties: { [SITE_ROLE_PROPERTY]: 'site-homepage' } },
    }),
    true,
  );

  assert.equal(
    isSiteControlPage({
      metadata: { [SITE_ROLE_PROPERTY]: 'article' },
    }),
    false,
  );
  assert.equal(isSiteControlPage({ metadata: {} }), false);
});

test('buildHomeModel selects featured, recent, and start-here entries', () => {
  const model = buildHomeModel([
    {
      id: 'a',
      title: 'Alpha',
      href: '/docs/alpha',
      featured: true,
      order: 2,
      modified: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'b',
      title: 'Beta',
      href: '/docs/start-here',
      slug: 'start-here',
      featured: true,
      order: 1,
      modified: '2026-09-04T00:00:00.000Z',
    },
    {
      id: 'c',
      title: 'Gamma',
      href: '/docs/gamma',
      modified: '2026-09-03T00:00:00.000Z',
    },
  ]);

  assert.deepEqual(model.featured.map((page) => page.title), ['Beta', 'Alpha']);
  assert.deepEqual(model.recent.map((page) => page.title), ['Beta', 'Gamma', 'Alpha']);
  assert.equal(model.startHere?.title, 'Beta');
});
