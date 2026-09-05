// Rough-notation annotation syntax. Marked spans render normally and are
// hand-annotated at runtime by RoughAnnotations.
//
// INLINE: ==highlight==  !!underline!!  ^^box^^  ((circle))  ||bracket||
// BLOCK:  ```highlight … ``` (any of the five type names as the fence language)

const PATTERNS = [
  { type: 'highlight', open: '==', close: '==' },
  { type: 'underline', open: '!!', close: '!!' },
  { type: 'box', open: '^^', close: '^^' },
  { type: 'circle', open: '((', close: '))' },
  { type: 'bracket', open: '||', close: '||' },
];

const BLOCK_TYPES = new Set(PATTERNS.map((p) => p.type));
const DELIM = 2;
const HAS_ANN = /==|!!|\^\^|\(\(|\|\|/;

/**
 * @param {string} type
 * @param {string} content
 * @param {'span' | 'p'} [tag]
 */
function annSpan(type, content, tag = 'span') {
  return {
    type: tag === 'p' ? 'mdxJsxFlowElement' : 'mdxJsxTextElement',
    name: tag,
    attributes: [
      { type: 'mdxJsxAttribute', name: 'className', value: 'rough-ann' },
      { type: 'mdxJsxAttribute', name: 'data-ann-type', value: type },
    ],
    children: [{ type: 'text', value: content }],
  };
}

/** @param {string} text */
function convert(text) {
  let bestIdx = Infinity;
  /** @type {(typeof PATTERNS)[number] | null} */
  let best = null;

  for (const p of PATTERNS) {
    const idx = text.indexOf(p.open);
    if (idx !== -1 && idx < bestIdx) {
      bestIdx = idx;
      best = p;
    }
  }

  if (!best) return [{ type: 'text', value: text }];

  const closeIdx = text.indexOf(best.close, bestIdx + DELIM);
  if (closeIdx === -1) {
    return [
      { type: 'text', value: text.slice(0, bestIdx + DELIM) },
      ...convert(text.slice(bestIdx + DELIM)),
    ];
  }

  const content = text.slice(bestIdx + DELIM, closeIdx);
  const rest = text.slice(closeIdx + DELIM);
  /** @type {unknown[]} */
  const result = [];

  if (bestIdx > 0) result.push({ type: 'text', value: text.slice(0, bestIdx) });
  result.push(annSpan(best.type, content));
  if (rest) result.push(...convert(rest));

  return result;
}

/**
 * @param {{ type: string, value?: string, lang?: string | null, children?: any[] }} parent
 * @param {boolean} insideHeading
 */
function walk(parent, insideHeading) {
  const children = parent.children;
  if (!children) return;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.type === 'code' && child.lang && BLOCK_TYPES.has(child.lang)) {
      children[i] = annSpan(
        child.lang,
        (child.value ?? '').replace(/\n+/g, ' ').trim(),
        'p',
      );
      continue;
    }

    if (child.type === 'text' && typeof child.value === 'string' && !insideHeading) {
      if (!HAS_ANN.test(child.value)) continue;
      const nodes = convert(child.value);
      children.splice(i, 1, ...nodes);
      i += nodes.length - 1;
      continue;
    }

    if (child.children) {
      walk(child, insideHeading || child.type === 'heading');
    }
  }
}

export function remarkAnnotations() {
  /** @param {{ children?: any[] }} tree */
  return (tree) => {
    walk(tree, false);
  };
}
