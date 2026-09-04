import wikiConfig from '@/affine-wiki.config';

export const appName = wikiConfig.site.name;
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? 'your-account',
  repo: process.env.NEXT_PUBLIC_GITHUB_REPOSITORY ?? 'knowledge-base',
  branch: 'main',
};
