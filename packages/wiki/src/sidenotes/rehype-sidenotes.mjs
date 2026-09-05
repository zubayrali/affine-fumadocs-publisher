// Margin sidenotes from GFM footnotes: each `[^n]` reference becomes a
// `span.sidenote` + `span.sidenote-content` pair; the bottom footnote list
// is removed. The client Sidenotes component lays them out at runtime.

/** @typedef {{ type: string, tagName?: string, properties?: Record<string, unknown>, children?: HastNode[], value?: string }} HastNode */

/** @param {HastNode} node @param {string} [tagName] */
function isElement(node, tagName) {
  return node.type === 'element' && (!tagName || node.tagName === tagName);
}

/** @param {HastNode} node @param {string} name */
function hasProperty(node, name) {
  const value = node.properties?.[name];
  return value !== undefined && value !== null && value !== false;
}

/** @param {HastNode} node */
function textContent(node) {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

/**
 * @param {string[]} className
 * @param {Record<string, unknown>} properties
 * @param {HastNode[]} children
 */
function span(className, properties, children) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { ...properties, className },
    children,
  };
}

function arrowSvg() {
  return {
    type: 'element',
    tagName: 'svg',
    properties: {
      className: ['sidenote-arrow', 'sidenote-arrow-down'],
      width: '8',
      height: '5',
      viewBox: '0 0 8 5',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': 'true',
    },
    children: [
      {
        type: 'element',
        tagName: 'path',
        properties: { d: 'M0 0L8 0L4 5Z', fill: 'currentColor' },
        children: [],
      },
    ],
  };
}

/** @param {HastNode[]} children */
function toInlineContent(children) {
  /** @type {HastNode[]} */
  const result = [];
  for (const child of children) {
    if (isElement(child, 'a') && hasProperty(child, 'dataFootnoteBackref')) continue;
    if (isElement(child, 'p')) {
      result.push(span(['sidenote-paragraph'], {}, toInlineContent(child.children ?? [])));
      continue;
    }
    if (child.type === 'text' && result.length === 0 && (child.value ?? '').trim() === '') {
      continue;
    }
    result.push(child);
  }
  return result;
}

/** @param {HastNode} tree */
function collectDefinitions(tree) {
  /** @type {Map<string, HastNode[]>} */
  const definitions = new Map();
  let found = false;

  /** @param {HastNode} node @param {HastNode} [parent] @param {number} [index] */
  const walk = (node, parent, index) => {
    if (isElement(node, 'section') && hasProperty(node, 'dataFootnotes')) {
      for (const list of node.children ?? []) {
        if (!isElement(list, 'ol')) continue;
        for (const item of list.children ?? []) {
          if (!isElement(item, 'li')) continue;
          const id = item.properties?.id;
          if (typeof id !== 'string') continue;
          definitions.set(id, toInlineContent(item.children ?? []));
        }
      }
      if (parent?.children && typeof index === 'number') {
        parent.children.splice(index, 1);
      }
      found = true;
      return true;
    }

    const children = node.children ?? [];
    for (let i = 0; i < children.length; i++) {
      if (walk(children[i], node, i)) return true;
    }
    return false;
  };

  walk(tree);
  return found ? definitions : undefined;
}

/**
 * @param {HastNode} refAnchor
 * @param {HastNode[]} definition
 * @param {number} sidenoteId
 */
function buildSidenotePair(refAnchor, definition, sidenoteId) {
  const baseId = `sidenote-${sidenoteId}`;
  const marker = textContent(refAnchor) || String(sidenoteId);

  const label = span(
    ['sidenote-label'],
    { id: `${baseId}-label`, 'aria-controls': `${baseId}-content` },
    [span(['sidenote-number'], {}, [{ type: 'text', value: marker }]), arrowSvg()],
  );

  const sidenote = span(
    ['sidenote'],
    { id: baseId, 'data-sidenote-id': String(sidenoteId) },
    [label],
  );

  const content = span(
    ['sidenote-content'],
    {
      id: `${baseId}-content`,
      'data-sidenote-id': String(sidenoteId),
      'data-sidenote-for': baseId,
      'aria-hidden': 'true',
    },
    structuredClone(definition),
  );

  return [sidenote, content];
}

export function rehypeSidenotes() {
  /** @param {HastNode} tree */
  return (tree) => {
    const definitions = collectDefinitions(tree);
    if (!definitions) return;

    let counter = 0;

    /** @param {HastNode} node */
    const walk = (node) => {
      const children = node.children;
      if (!children) return;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isElement(child, 'sup')) {
          const anchor = (child.children ?? []).find(
            (grandchild) => isElement(grandchild, 'a') && hasProperty(grandchild, 'dataFootnoteRef'),
          );
          const href = anchor?.properties?.href;
          if (anchor && typeof href === 'string' && href.startsWith('#')) {
            const definition = definitions.get(href.slice(1));
            if (definition) {
              const pair = buildSidenotePair(anchor, definition, ++counter);
              children.splice(i, 1, ...pair);
              i += pair.length - 1;
              continue;
            }
          }
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
