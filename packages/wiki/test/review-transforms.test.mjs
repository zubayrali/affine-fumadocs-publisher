import assert from 'node:assert/strict';
import test from 'node:test';
import { transformOrbitCallouts } from '../src/review/transform-orbit-callouts.mjs';
import { parsePrompts } from '../src/review/remark-review-prompts.mjs';

test('transformOrbitCallouts converts callouts to orbit fences', () => {
  const input = '> [!orbit] color=green\n> Q: one?\n> A: 1\n';
  const out = transformOrbitCallouts(input);
  assert.match(out, /```orbit color=green/);
  assert.match(out, /Q: one\?/);
  assert.match(out, /A: 1/);
  assert.ok(!out.includes('[!orbit]'));
});

test('transformOrbitCallouts is a no-op without callouts', () => {
  const input = 'Just prose.\n';
  assert.equal(transformOrbitCallouts(input), input);
});

test('parsePrompts parses blank-line-separated Q/A pairs', () => {
  const prompts = parsePrompts('Q: one?\nA: 1\n\nQ: two?\nA: 2');
  assert.deepEqual(
    prompts.map((p) => [p.question, p.answer]),
    [
      ['one?', '1'],
      ['two?', '2'],
    ],
  );
});

test('parsePrompts keeps enumerated A. continuation lines', () => {
  const [p] = parsePrompts('Q: pick one\nA: Options:\nA. first\nB. second');
  assert.equal(p.answer, 'Options:\nA. first\nB. second');
});

test('parsePrompts gives distinct ids to shifted Q/A boundaries', () => {
  const [x] = parsePrompts('Q: ab\nA: c');
  const [y] = parsePrompts('Q: a\nA: bc');
  assert.notEqual(x.id, y.id);
});

test('parsePrompts attaches QI:/AI: images', () => {
  const [p] = parsePrompts('Q: what?\nQI: q.png\nA: that\nAI: a.png');
  assert.equal(p.question, 'what?');
  assert.equal(p.answer, 'that');
  assert.match(p.questionAttachment ?? '', /q\.png/);
  assert.match(p.answerAttachment ?? '', /a\.png/);
});
