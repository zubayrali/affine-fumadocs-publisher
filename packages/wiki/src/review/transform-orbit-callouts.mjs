// Convert > [!orbit] callout blocks to ```orbit fences before MDX parsing.
// Mirrors the sidenote transform: raw text → syntax the remark plugin handles.

const ORBIT_CALLOUT_RE = /^(> \[!orbit\][-+]?\s*(.*)\n)((?:>[ ]?.*\n?)*)/gm;

/**
 * Pure text transform: Obsidian-style orbit callouts → ```orbit fences.
 * @param {string} content
 * @returns {string}
 */
export function transformOrbitCallouts(content) {
  ORBIT_CALLOUT_RE.lastIndex = 0;
  if (!ORBIT_CALLOUT_RE.test(content)) return content;
  ORBIT_CALLOUT_RE.lastIndex = 0;
  return content.replace(ORBIT_CALLOUT_RE, (_match, _header, meta, body) => {
    const stripped = body.replace(/^>[ ]?/gm, '');
    const metaPart = meta.trim();
    const bodyPart = stripped.endsWith('\n') || stripped === '' ? stripped : stripped + '\n';
    return `\`\`\`orbit${metaPart ? ' ' + metaPart : ''}\n${bodyPart}\`\`\`\n`;
  });
}
