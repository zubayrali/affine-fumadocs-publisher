'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import type { RoughAnnotation } from 'rough-notation/lib/model';
import { annotate } from 'rough-notation';

// Runtime half of the rough-notation port: finds .rough-ann spans emitted by
// remarkAnnotations and draws the hand-sketched annotation over each. Re-runs
// on navigation, theme flips (colors are CSS vars), and resize.

let annotations: RoughAnnotation[] = [];

function cleanup() {
  for (const annotation of annotations) {
    try {
      annotation.remove();
    } catch {
      // element already gone after navigation
    }
  }
  annotations = [];
  // rough-notation appends SVGs to ancestors outside React's tree; sweep strays.
  document.querySelectorAll('svg.rough-annotation').forEach((el) => el.remove());
}

function init(animate: boolean) {
  cleanup();

  // Scope to the article so cached link-preview clones never get annotated.
  const spans = document.querySelectorAll<HTMLElement>('#nd-page .rough-ann');
  if (spans.length === 0) return;

  const style = getComputedStyle(document.documentElement);
  const colorFor = (type: string): string =>
    style.getPropertyValue(`--ann-${type}`).trim() ||
    style.getPropertyValue('--ann-highlight').trim() ||
    'currentColor';

  for (const span of spans) {
    const type = (span.dataset.annType ?? 'highlight') as Parameters<
      typeof annotate
    >[1]['type'];

    const annotation = annotate(span, {
      type,
      color: colorFor(type),
      iterations: 2,
      animate,
      animationDuration: 500,
      multiline: type !== 'circle',
      ...(type === 'bracket' ? { brackets: ['left', 'right'] as const } : {}),
    });
    annotation.show();
    annotations.push(annotation);
  }
}

function debounce(fn: () => void, delay: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };
}

export function RoughAnnotations({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Let the view-transition crossfade and fonts settle before measuring.
    const timer = window.setTimeout(() => init(!reduceMotion), 250);

    const relayout = debounce(() => init(false), 150);
    window.addEventListener('resize', relayout, { passive: true });

    // Redraw when theme flips, reader mode toggles, or sidebar collapses.
    // Hide SVGs instantly to avoid stale positions during layout shift.
    const layoutChanged = () => { cleanup(); relayout(); };

    const htmlObserver = new MutationObserver(layoutChanged);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-reader-mode'],
    });

    const sidebar = document.getElementById('nd-sidebar');
    const sidebarObserver = sidebar ? new MutationObserver(layoutChanged) : null;
    sidebarObserver?.observe(sidebar!, {
      attributes: true,
      attributeFilter: ['data-collapsed'],
    });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', relayout);
      htmlObserver.disconnect();
      sidebarObserver?.disconnect();
      cleanup();
    };
  }, [pathname, enabled]);

  return null;
}
