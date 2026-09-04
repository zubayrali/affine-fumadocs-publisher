import Link from 'next/link';
import wikiConfig from '@/affine-wiki.config';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20 text-center">
      <p className="mb-3 text-sm font-medium text-fd-muted-foreground">Powered by AFFiNE and Fumadocs</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{wikiConfig.site.name}</h1>
      <p className="mx-auto mt-5 max-w-xl text-balance text-fd-muted-foreground">
        {wikiConfig.site.description}
      </p>
      <p className="mt-8">
        <Link href="/docs" className="font-medium underline">
          Open the knowledge base
        </Link>{' '}
      </p>
    </main>
  );
}
