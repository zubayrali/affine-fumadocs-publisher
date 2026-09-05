import assert from 'node:assert/strict';
import test from 'node:test';
import { createWikiMdxOptions } from '../src/mdx/create-wiki-mdx-options.mjs';

test('createWikiMdxOptions enables math and mermaid by default', () => {
  const options = createWikiMdxOptions({
    citations: false,
    sidenotes: false,
    annotations: false,
    review: false,
  });
  assert.equal(options.remarkPlugins.length, 2);
  const rehype = options.rehypePlugins(['existing']);
  assert.equal(rehype.length, 2);
  assert.equal(rehype[1], 'existing');
});

test('createWikiMdxOptions respects feature opt-outs', () => {
  const none = createWikiMdxOptions({
    math: false,
    mermaid: false,
    citations: false,
    sidenotes: false,
    annotations: false,
    review: false,
  });
  assert.deepEqual(none.remarkPlugins, []);
  assert.deepEqual(none.rehypePlugins(['existing']), ['existing']);

  const mathOnly = createWikiMdxOptions({
    math: true,
    mermaid: false,
    citations: false,
    sidenotes: false,
    annotations: false,
    review: false,
  });
  assert.equal(mathOnly.remarkPlugins.length, 1);
  assert.equal(mathOnly.rehypePlugins([]).length, 1);

  const mermaidOnly = createWikiMdxOptions({
    math: false,
    mermaid: true,
    citations: false,
    sidenotes: false,
    annotations: false,
    review: false,
  });
  assert.equal(mermaidOnly.remarkPlugins.length, 1);
  assert.deepEqual(mermaidOnly.rehypePlugins(['existing']), ['existing']);
});

test('createWikiMdxOptions adds rich-content plugins when enabled', () => {
  const options = createWikiMdxOptions({
    math: false,
    mermaid: false,
    citations: true,
    sidenotes: true,
    annotations: true,
    review: true,
  });
  // review + annotations
  assert.equal(options.remarkPlugins.length, 2);
  // existing + sidenotes (citations returns [] when no .bib at cwd)
  const rehype = options.rehypePlugins(['existing']);
  assert.ok(rehype.includes('existing'));
  assert.ok(rehype.length >= 2);
});
