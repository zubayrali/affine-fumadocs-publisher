import { Buffer } from 'node:buffer';
import { visit } from 'unist-util-visit';

/**
 * @typedef {{
 *   id: string,
 *   question: string,
 *   answer: string,
 *   questionAttachment?: string,
 *   answerAttachment?: string,
 * }} Prompt
 */

/** @param {string} s */
function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Parse Q:/A: prompt pairs from an ```orbit fence body.
 * @param {string} source
 * @returns {Prompt[]}
 */
export function parsePrompts(source) {
  /** @type {Prompt[]} */
  const prompts = [];
  /** @type {string[] | null} */
  let q = null;
  /** @type {string[] | null} */
  let a = null;
  /** @type {string | undefined} */
  let qImg;
  /** @type {string | undefined} */
  let aImg;
  /** @type {'q' | 'a' | null} */
  let field = null;

  /** @param {string} name */
  const resolveAttachment = (name) => {
    const basePath = process.env.PAGES_BASE_PATH ?? '';
    return basePath + '/' + encodeURIComponent(name);
  };

  const flush = () => {
    if (q && a) {
      const question = q.join('\n').trim();
      const answer = a.join('\n').trim();
      if (question && answer) {
        /** @type {Prompt} */
        const prompt = { id: hashId(question + '\u0000' + answer), question, answer };
        if (qImg) prompt.questionAttachment = resolveAttachment(qImg);
        if (aImg) prompt.answerAttachment = resolveAttachment(aImg);
        prompts.push(prompt);
      }
    }
    q = a = field = null;
    qImg = aImg = undefined;
  };

  for (const line of source.split('\n')) {
    const qm = line.match(/^\s*Q:\s?(.*)$/);
    const am = line.match(/^\s*A:\s?(.*)$/);
    const qim = line.match(/^\s*QI:\s?(.*)$/);
    const aim = line.match(/^\s*AI:\s?(.*)$/);
    if (qm) {
      flush();
      q = [qm[1]];
      a = null;
      field = 'q';
    } else if (am && q) {
      a = [am[1]];
      field = 'a';
    } else if (qim && q) {
      qImg = qim[1].trim();
    } else if (aim && a) {
      aImg = aim[1].trim();
    } else if (line.trim() === '') {
      flush();
    } else if (field === 'q' && q) {
      q.push(line);
    } else if (field === 'a' && a) {
      a.push(line);
    }
  }
  flush();
  return prompts;
}

/** @param {string | null | undefined} meta */
function parseMeta(meta) {
  if (!meta) return undefined;
  const m = meta.match(/\bcolor\s*=\s*(\S+)/);
  return m ? m[1] : undefined;
}

/**
 * @param {Prompt[]} prompts
 * @param {string} [color]
 */
function buildJsxNode(prompts, color) {
  const configBase64 = Buffer.from(JSON.stringify(prompts)).toString('base64');
  /** @type {{ type: string, name: string, value: string }[]} */
  const attributes = [
    { type: 'mdxJsxAttribute', name: 'configBase64', value: configBase64 },
  ];
  if (color) {
    attributes.push({ type: 'mdxJsxAttribute', name: 'color', value: color });
  }
  return {
    type: 'mdxJsxFlowElement',
    name: 'ReviewBlock',
    attributes,
    children: [],
  };
}

/** Remark plugin: ```orbit fences → <ReviewBlock>. */
export function remarkReviewPrompts() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'orbit') return;
      if (!parent || index === undefined) return;

      const prompts = parsePrompts(node.value);
      if (prompts.length === 0) return;

      const color = parseMeta(node.meta);
      parent.children.splice(index, 1, buildJsxNode(prompts, color));
    });
  };
}
