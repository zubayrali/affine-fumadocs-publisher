import Link from 'next/link';
import { CornerDownLeft } from 'lucide-react';
import { getBacklinks } from '@affine-fumadocs/wiki';

type BacklinkPage = {
  url: string;
  data: Record<string, unknown> & { title?: string; description?: string };
};

export function Backlinks({ currentUrl, pages }: { currentUrl: string; pages: BacklinkPage[] }) {
  const backlinks = getBacklinks(currentUrl, pages);
  if (backlinks.length === 0) return null;

  return (
    <aside className="not-prose mt-12 border-t border-fd-border pt-6" aria-labelledby="backlinks-heading">
      <h2 id="backlinks-heading" className="flex items-center gap-2 text-base font-semibold text-fd-foreground">
        <CornerDownLeft className="size-4 text-fd-muted-foreground" aria-hidden="true" />
        Backlinks
      </h2>
      <ul className="mt-3 grid list-none gap-2 p-0 sm:grid-cols-2">
        {backlinks.map((page) => (
          <li key={page.url}>
            <Link href={page.url} className="block rounded-lg border border-fd-border bg-fd-card p-3 no-underline transition-colors hover:bg-fd-accent">
              <span className="font-medium text-fd-foreground">{page.data.title ?? page.url}</span>
              {page.data.description ? <span className="mt-1 block text-xs text-fd-muted-foreground">{page.data.description}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
