import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const roots = ['packages/wiki/', 'templates/wiki/', 'docs/'];
const forbidden = [['alkar', 'kari'].join(''), ['kar', 'kari'].join('')];
const files = execFileSync('git', [
  'ls-files', '--cached', '--others', '--exclude-standard', '--', ...roots,
], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const findings = [];

for (const file of files) {
  const extension = path.extname(file).toLowerCase();
  if (!['.css', '.html', '.js', '.json', '.md', '.mdx', '.mjs', '.ts', '.tsx', '.yaml', '.yml'].includes(extension)) continue;
  const content = readFileSync(file, 'utf8').toLowerCase();
  for (const term of forbidden) {
    if (content.includes(term)) findings.push(`${file}: contains a reserved consumer identifier`);
  }
}

if (findings.length) {
  console.error(findings.join('\n'));
  process.exit(1);
}
console.log(`Neutrality check passed across ${files.length} public source files.`);
