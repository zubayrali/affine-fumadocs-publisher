import { defineWikiConfig } from '@affine-fumadocs/wiki';

export default defineWikiConfig({
  site: {
    name: 'AFFiNE Knowledge Base',
    description: 'A collaborative, self-hosted knowledge base.',
  },
  locales: [
    { code: 'en', label: 'English', languageTag: 'en', dir: 'ltr' },
  ],
});
