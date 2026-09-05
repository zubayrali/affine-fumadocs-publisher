// Custom sidenote / marginalia syntax → GFM footnotes (gen-time, before MDX).
//
//   Labeled:  {{sidenotes[label]: content}}   → label[^_sn_1]
//   Bare:     {{content}}                     → [^_sn_2]
//
// Code fences, inline code, and YAML frontmatter are left untouched.

const LABELED_RE = /\{\{sidenotes\[([^\]]+)\]:\s*([\s\S]*?)\}\}/g;
const BARE_RE = /[ \t]*\{\{([\s\S]*?)\}\}/g;
const FENCE_RE = /(```[\s\S]*?```|~~~[\s\S]*?~~~)/;
const INLINE_CODE_RE = /`[^`\n]*`/g;
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;

/** @param {string} segment @param {RegExp} re @param {(groups: string[]) => string} replacer */
function replaceOutsideInlineCode(segment, re, replacer) {
  /** @type {Array<[number, number]>} */
  const ranges = [];
  for (const m of segment.matchAll(INLINE_CODE_RE)) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return segment.replace(re, (match, ...args) => {
    const offset = args[args.length - 2];
    const braceStart = offset + match.indexOf('{{');
    if (ranges.some(([a, b]) => braceStart >= a && braceStart < b)) return match;
    return replacer(args.slice(0, -2));
  });
}

/**
 * Pure text transform: both sidenote forms → GFM footnotes.
 * @param {string} content
 * @returns {string}
 */
export function transformSidenoteSyntax(content) {
  if (!content.includes('{{')) return content;

  const frontmatter = content.match(FRONTMATTER_RE)?.[0] ?? '';
  const body = content.slice(frontmatter.length);

  let counter = 0;
  /** @type {string[]} */
  const definitions = [];
  /** @param {string} note */
  const define = (note) => {
    const id = `_sn_${++counter}`;
    definitions.push(`[^${id}]: ${note.trim().replace(/\s*\n\s*/g, ' ')}`);
    return id;
  };

  const transformed = body
    .split(FENCE_RE)
    .map((segment, i) => {
      if (i % 2 === 1) return segment;
      const labeled = replaceOutsideInlineCode(
        segment,
        LABELED_RE,
        ([label, note]) => `${label}[^${define(note)}]`,
      );
      return replaceOutsideInlineCode(labeled, BARE_RE, ([note]) => `[^${define(note)}]`);
    })
    .join('');

  if (definitions.length === 0) return content;
  return frontmatter + transformed.trimEnd() + '\n\n' + definitions.join('\n\n') + '\n';
}
