'use client';

import { usePathname } from 'next/navigation';
import { Check, ChevronsUpDown, Languages } from 'lucide-react';

export interface LocaleSwitcherLocale {
  code: string;
  label: string;
  languageTag: string;
  dir?: 'ltr' | 'rtl';
}

export interface TranslationIndex {
  routes: Record<string, Record<string, string>>;
  translations: Record<string, Record<string, string>>;
}

export interface LocaleSwitcherProps {
  locales: readonly LocaleSwitcherLocale[];
  currentLocale: string;
  /** Deploy base path (e.g. `/repo/en`). Sibling builds live under the parent. */
  basePath?: string;
  variant?: 'nav' | 'sidebar';
  /** Optional AFFiNE translation-key → localized-path map. */
  translationIndex?: TranslationIndex;
  /** Override when sibling locale builds are available (defaults from basePath). */
  siblingBuildsAvailable?: boolean;
  /** Shown under disabled options when siblings are not deployed. */
  unavailableHint?: string;
}

const itemBase =
  'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-start';

/**
 * Language switcher for isolated locale builds. Uses plain `<a>` links —
 * never `next/link` — so sibling builds under `/<parent>/<locale>/` are not
 * trapped by this build's basePath.
 */
export function LocaleSwitcher({
  locales,
  currentLocale,
  basePath = '',
  variant = 'nav',
  translationIndex,
  siblingBuildsAvailable,
  unavailableHint = 'Sibling locale builds are only available in a multi-locale deploy.',
}: LocaleSwitcherProps) {
  const pathname = usePathname() || '/';
  const entry = locales.find((locale) => locale.code === currentLocale) ?? locales[0];
  if (!entry || locales.length < 2) return null;

  const deployed = siblingBuildsAvailable
    ?? (basePath.length > 0 && basePath.endsWith(`/${currentLocale}`));
  const parent = deployed ? basePath.slice(0, -(currentLocale.length + 1)) : '';
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '');

  const translationKey = translationIndex?.routes[currentLocale]?.[normalizedPath];
  const translatedPath = (targetLocale: string) =>
    (translationKey && translationIndex?.translations[translationKey]?.[targetLocale])
    || normalizedPath;

  return (
    <details
      className={`group relative ${variant === 'sidebar' ? 'w-full' : ''}`}
      dir="ltr"
    >
      <summary
        aria-label={`Choose language. Current language: ${entry.label}`}
        className={`flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-fd-border bg-fd-card px-3 py-2.5 text-sm font-medium text-fd-foreground outline-none transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-fd-ring [&::-webkit-details-marker]:hidden ${
          variant === 'sidebar' ? 'w-full' : ''
        }`}
      >
        <Languages className="size-4 text-fd-muted-foreground" aria-hidden />
        <span className="flex-1 text-start">{entry.label}</span>
        <ChevronsUpDown className="size-3.5 text-fd-muted-foreground" aria-hidden />
      </summary>

      <div
        className={`absolute z-50 w-56 rounded-xl border border-fd-border bg-fd-popover p-1.5 text-fd-popover-foreground shadow-xl ${
          variant === 'sidebar'
            ? 'inset-x-0 bottom-full mb-1.5'
            : 'end-0 top-full mt-1.5'
        }`}
        aria-label="Languages"
      >
        {locales.map((locale) => {
          if (locale.code === currentLocale) {
            return (
              <div key={locale.code} className={`${itemBase} bg-fd-accent text-fd-foreground`}>
                <span className="min-w-0 flex-1 truncate font-medium">{locale.label}</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-fd-muted-foreground">
                  {locale.code}
                </span>
                <Check className="size-4 text-fd-primary" aria-hidden />
              </div>
            );
          }

          if (!deployed) {
            return (
              <div
                key={locale.code}
                aria-disabled="true"
                title={unavailableHint}
                className={`${itemBase} cursor-not-allowed text-fd-muted-foreground opacity-60`}
              >
                <span className="min-w-0 flex-1 truncate">{locale.label}</span>
                <span className="text-[11px] uppercase tracking-[0.14em]">{locale.code}</span>
              </div>
            );
          }

          return (
            <a
              key={locale.code}
              href={`${parent}/${locale.code}${translatedPath(locale.code)}`}
              hrefLang={locale.languageTag}
              className={`${itemBase} text-fd-foreground no-underline transition-colors hover:bg-fd-accent`}
            >
              <span className="min-w-0 flex-1 truncate">{locale.label}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-fd-muted-foreground">
                {locale.code}
              </span>
            </a>
          );
        })}
        {!deployed && (
          <p className="border-t border-fd-border px-3 pb-1 pt-2 text-[11px] leading-4 text-fd-muted-foreground">
            {unavailableHint}
          </p>
        )}
      </div>
    </details>
  );
}
