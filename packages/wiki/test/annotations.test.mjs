import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkAnnotations } from '../src/annotations/remark-annotations.mjs';

test('remarkAnnotations wraps inline highlight delimiters', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: 'See ==important== text.' }],
      },
    ],
  };
  remarkAnnotations()(tree);
  const kids = tree.children[0].children;
  assert.equal(kids[0].value, 'See ');
  assert.equal(kids[1].type, 'mdxJsxTextElement');
  assert.equal(kids[1].name, 'span');
  assert.equal(
    kids[1].attributes.find((a) => a.name === 'data-ann-type')?.value,
    'highlight',
  );
  assert.equal(kids[1].children[0].value, 'important');
  assert.equal(kids[2].value, ' text.');
});

test('remarkAnnotations converts highlight fences to block spans', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'code', lang: 'underline', value: 'A whole sentence.\n' },
    ],
  };
  remarkAnnotations()(tree);
  const node = tree.children[0];
  assert.equal(node.type, 'mdxJsxFlowElement');
  assert.equal(node.name, 'p');
  assert.equal(
    node.attributes.find((a) => a.name === 'data-ann-type')?.value,
    'underline',
  );
});

test('remarkAnnotations skips headings', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'heading',
        depth: 2,
        children: [{ type: 'text', value: '==not annotated==' }],
      },
    ],
  };
  remarkAnnotations()(tree);
  assert.equal(tree.children[0].children[0].type, 'text');
  assert.equal(tree.children[0].children[0].value, '==not annotated==');
});
