import assert from 'node:assert/strict';
import test from 'node:test';
import { transformSidenoteSyntax } from '../src/sidenotes/transform-sidenote-syntax.mjs';

test('passes through content without braces', () => {
  const input = 'Plain text with a [^1] footnote.\n\n[^1]: note\n';
  assert.equal(transformSidenoteSyntax(input), input);
});

test('converts the labeled form', () => {
  const out = transformSidenoteSyntax('objects genuinely {{sidenotes[possess.]: the challenge}}\n');
  assert.match(out, /objects genuinely possess\.\[\^_sn_1\]/);
  assert.match(out, /\[\^_sn_1\]: the challenge/);
});

test('converts the bare form, gluing the marker to the prior word', () => {
  const out = transformSidenoteSyntax('The web was static. {{Well, mostly static.}} More text.\n');
  assert.match(out, /The web was static\.\[\^_sn_1\] More text\./);
  assert.match(out, /\[\^_sn_1\]: Well, mostly static\./);
});

test('handles both forms in one document', () => {
  const out = transformSidenoteSyntax('A {{sidenotes[label]: first}} and B {{second}} end.\n');
  assert.match(out, /A label\[\^_sn_1\] and B\[\^_sn_2\] end\./);
  assert.match(out, /\[\^_sn_1\]: first/);
  assert.match(out, /\[\^_sn_2\]: second/);
});

test('leaves code fences and inline code untouched', () => {
  const input = [
    'Prose {{a note}} here.',
    '```txt',
    'template {{not a note}}',
    '```',
    '```orbit',
    'Q: what is {{this}}?',
    'A: braces',
    '```',
    'Inline `{{also not}}` code.',
    '',
  ].join('\n');
  const out = transformSidenoteSyntax(input);
  assert.match(out, /Prose\[\^_sn_1\] here\./);
  assert.match(out, /template \{\{not a note\}\}/);
  assert.match(out, /Q: what is \{\{this\}\}\?/);
  assert.match(out, /`\{\{also not\}\}`/);
  assert.ok(!out.includes('_sn_2'));
});

test('leaves YAML frontmatter untouched', () => {
  const input = '---\ntitle: T\ndate: "{{date}}"\n---\nBody {{note}}\n';
  const out = transformSidenoteSyntax(input);
  assert.match(out, /date: "\{\{date\}\}"/);
  assert.match(out, /Body\[\^_sn_1\]/);
  assert.match(out, /\[\^_sn_1\]: note/);
});
