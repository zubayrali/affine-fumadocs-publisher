import { defineConfig } from 'fumadocs-mdx/config';
import { createWikiMdxOptions } from '@affine-fumadocs/wiki/mdx';
import wikiConfig from './affine-wiki.config';

export default defineConfig({
  mdxOptions: createWikiMdxOptions(wikiConfig.features) as never,
});
