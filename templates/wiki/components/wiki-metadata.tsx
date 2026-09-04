import Link from 'next/link';
import { SlidersHorizontal, Tag } from 'lucide-react';
import {
  formatPropertyLabel,
  getDisplayProperties,
  normalizeTags,
  tagHref,
} from '@affine-fumadocs/wiki';

type PageMetadataProps = {
  data: Record<string, unknown>;
  showProperties?: boolean;
  showTags?: boolean;
};

function PropertyValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <span key={`${String(item)}-${index}`} className="rounded-md bg-fd-muted px-2 py-0.5 text-xs text-fd-muted-foreground">
            {String(item)}
          </span>
        ))}
      </span>
    );
  }
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return <a href={value} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">{value}</a>;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return <time dateTime={value}>{value.slice(0, 10)}</time>;
  }
  return <span className="break-words">{String(value)}</span>;
}

export function PageMetadata({ data, showProperties = true, showTags = true }: PageMetadataProps) {
  const nativeProperties = data.affineProperties && typeof data.affineProperties === 'object' && !Array.isArray(data.affineProperties)
    ? data.affineProperties as Record<string, unknown>
    : {};
  const tags = normalizeTags(data.tags ?? nativeProperties.Tags ?? nativeProperties.tags);
  const entries = getDisplayProperties(nativeProperties, ['Tags', 'tags']);

  if ((!showTags || tags.length === 0) && (!showProperties || entries.length === 0)) return null;

  return (
    <div className="space-y-3 py-4" aria-label="Page metadata">
      {showTags && tags.length > 0 ? (
        <ul className="flex list-none flex-wrap gap-2 p-0" aria-label="Tags">
          {tags.map((tag) => (
            <li key={tag}>
              <Link
                href={tagHref(tag)}
                className="inline-flex items-center gap-1 rounded-full border border-fd-border bg-fd-card px-2.5 py-1 text-xs text-fd-muted-foreground no-underline transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <Tag className="size-3" aria-hidden="true" />
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {showProperties && entries.length > 0 ? (
        <details className="rounded-lg border border-fd-border bg-fd-card text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium text-fd-foreground marker:content-none">
            <SlidersHorizontal className="size-4 text-fd-muted-foreground" aria-hidden="true" />
            Properties
            <span className="ml-auto rounded-full bg-fd-muted px-2 py-0.5 text-xs text-fd-muted-foreground">{entries.length}</span>
          </summary>
          <dl className="grid gap-px border-t border-fd-border bg-fd-border sm:grid-cols-[minmax(9rem,0.35fr)_1fr]">
            {entries.map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="bg-fd-card px-3 py-2 font-medium text-fd-muted-foreground">{formatPropertyLabel(key)}</dt>
                <dd className="m-0 min-w-0 bg-fd-card px-3 py-2 text-fd-foreground"><PropertyValue value={value} /></dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
