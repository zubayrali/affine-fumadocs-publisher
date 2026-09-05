import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { visit } from 'unist-util-visit';

// createRequire forces Node resolution past bundlers that pick the browser
// conditional export (unable to read local .bib files).
const _require = createRequire(import.meta.url);
const rehypeCitation = _require('rehype-citation').default ?? _require('rehype-citation');

/** @typedef {{ bibliographyFile: string, suppressBibliography: boolean, linkCitations: boolean, csl: string }} CitationsOptions */

/** @type {CitationsOptions} */
const defaultOptions = {
  bibliographyFile: './references.bib',
  suppressBibliography: false,
  linkCitations: true,
  csl: 'apa',
};

/** @param {any} node */
function collectText(node) {
  if (node.type === 'text') return node.value ?? '';
  if (node.children) return node.children.map(collectText).join('');
  return '';
}

/**
 * @param {Partial<CitationsOptions>} [userOpts]
 * @returns {unknown[]}
 */
export function rehypeCitations(userOpts) {
  const opts = { ...defaultOptions, ...userOpts };
  const bibPath = resolve(opts.bibliographyFile);

  if (!existsSync(bibPath)) return [];

  return [
    [
      rehypeCitation,
      {
        bibliography: opts.bibliographyFile,
        path: process.cwd(),
        suppressBibliography: opts.suppressBibliography,
        linkCitations: opts.linkCitations,
        csl: opts.csl,
      },
    ],
    () => {
      return (tree) => {
        /** @type {Map<string, string>} */
        const bibEntries = new Map();

        visit(tree, 'element', (node) => {
          if (
            node.tagName === 'div' &&
            node.properties?.className?.includes?.('csl-entry') &&
            node.properties?.id
          ) {
            bibEntries.set(`#${node.properties.id}`, collectText(node).trim());
          }
        });

        visit(tree, 'element', (node) => {
          if (node.tagName !== 'a') return;
          const href = node.properties?.href;
          if (typeof href !== 'string' || !href.startsWith('#bib')) return;

          node.properties['data-no-popover'] = true;
          node.properties['data-citation'] = '';

          const entry = bibEntries.get(href);
          if (entry) {
            node.properties['data-citation-text'] = entry;
          }
        });
      };
    },
  ];
}
