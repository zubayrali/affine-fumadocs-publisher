import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import wikiConfig from '@/affine-wiki.config';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: wikiConfig.site.name, template: `%s | ${wikiConfig.site.name}` },
  description: wikiConfig.site.description,
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
