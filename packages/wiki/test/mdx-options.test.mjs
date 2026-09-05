import assert from 'node:assert/strict';
import test from 'node:test';
import { createWikiMdxOptions } from '../src/mdx/create-wiki-mdx-options.mjs';

test('createWikiMdxOptions enables math and mermaid by default', () => {
  const options = createWikiMdxOptions();
  assert.equal(options.remarkPlugins.length, 2);
  const rehype = options.rehypePlugins(['existing']);
  assert.equal(rehype.length, 2);
  assert.equal(rehype[1], 'existing');
});

test('createWikiMdxOptions respects feature opt-outs', () => {
  const none = createWikiMdxOptions({ math: false, mermaid: false });
  assert.deepEqual(none.remarkPlugins, []);
  assert.deepEqual(none.rehypePlugins(['existing']), ['existing']);

  const mathOnly = createWikiMdxOptions({ math: true, mermaid: false });
  assert.equal(mathOnly.remarkPlugins.length, 1);
  assert.equal(mathOnly.rehypePlugins([]).length, 1);

  const mermaidOnly = createWikiMdxOptions({ math: false, mermaid: true });
  assert.equal(mermaidOnly.remarkPlugins.length, 1);
  assert.deepEqual(mermaidOnly.rehypePlugins(['existing']), ['existing']);
});
