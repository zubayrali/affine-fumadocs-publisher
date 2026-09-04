import assert from 'node:assert/strict';
import test from 'node:test';
import { defineWikiConfig } from '../src/index.mjs';

test('enables the complete wiki baseline by default', () => {
  const config = defineWikiConfig({ site: { name: 'Knowledge Base' } });
  assert.equal(config.locales[0].code, 'en');
  assert.equal(Object.values(config.features).every(Boolean), true);
});

test('supports explicit feature opt-out and rejects duplicate locales', () => {
  const config = defineWikiConfig({ site: { name: 'Knowledge Base' }, features: { slides: false } });
  assert.equal(config.features.slides, false);
  assert.throws(() => defineWikiConfig({
    site: { name: 'Knowledge Base' },
    locales: [
      { code: 'en', label: 'English', languageTag: 'en' },
      { code: 'en', label: 'English again', languageTag: 'en' },
    ],
  }), /Duplicate locale/);
});
