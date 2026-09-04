'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hover previews for internal docs links. AFFiNE-native document links are
 * rewritten to published `/docs/...` URLs at snapshot time; this component only
 * previews those public routes.
 */

let activeAnchor: HTMLAnchorElement | null = null;
let activeRequest: { abort: () => void; link: HTMLAnchorElement } | null = null;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;
const htmlCache = new Map<string, string>();

function createPopoverElement() {
  const popoverElement = document.createElement('div');
  popoverElement.classList.add('link-preview');
  popoverElement.setAttribute('aria-hidden', 'true');
  const popoverInner = document.createElement('div');
  popoverInner.classList.add('link-preview-inner');
  popoverElement.append(popoverInner);
  return { popoverElement, popoverInner };
}

function cleanPreviewElement(element: HTMLElement): HTMLElement {
  element
    .querySelectorAll(
      'script, style, button, [data-backlinks], [data-skip-preview], .link-preview',
    )
    .forEach((node) => node.remove());
  return element;
}

function normalizeRelativeUrls(root: ParentNode, baseUrl: URL) {
  const rewrite = (el: Element, attr: string) => {
    const value = el.getAttribute(attr);
    if (!value || value.startsWith('#')) return;
    try {
      const resolved = new URL(value, baseUrl);
      if (resolved.origin === window.location.origin) {
        el.setAttribute(attr, resolved.pathname + resolved.search + resolved.hash);
      }
    } catch {
      // leave malformed URLs untouched
    }
  };
  root.querySelectorAll('a[href]').forEach((el) => rewrite(el, 'href'));
  root.querySelectorAll('img[src]').forEach((el) => rewrite(el, 'src'));
}

function positionPopover(link: HTMLElement, popoverElement: HTMLElement) {
  const rect = link.getBoundingClientRect();
  const width = Math.min(30 * 16, window.innerWidth * 0.8);
  const left = Math.min(
    Math.max(8, rect.left),
    Math.max(8, window.innerWidth - width - 8),
  );
  const below = rect.bottom + 8;
  const maxTop = window.innerHeight - 16;
  const top = Math.min(below, maxTop - 80);
  popoverElement.style.width = `${width}px`;
  popoverElement.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}

function cancelDismiss() {
  if (dismissTimer !== null) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function deactivatePopovers(except?: HTMLElement) {
  cancelDismiss();
  document.querySelectorAll<HTMLElement>('.link-preview').forEach((popoverElement) => {
    if (popoverElement === except) return;
    popoverElement.classList.remove('active-preview');
  });
}

function clearActivePopover() {
  activeAnchor = null;
  deactivatePopovers();
}

function scheduleDismiss() {
  cancelDismiss();
  dismissTimer = setTimeout(() => {
    dismissTimer = null;
    clearActivePopover();
  }, 280);
}

async function showPopover(link: HTMLAnchorElement, popoverElement: HTMLElement) {
  deactivatePopovers(popoverElement);
  popoverElement.classList.add('active-preview');
  positionPopover(link, popoverElement);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

async function populatePagePreview(
  targetUrl: URL,
  popoverInner: HTMLDivElement,
  signal: AbortSignal,
): Promise<boolean> {
  const cached = htmlCache.get(targetUrl.pathname);
  if (cached) {
    popoverInner.innerHTML = cached;
    return true;
  }

  const response = await fetch(targetUrl.toString(), {
    headers: { Accept: 'text/html' },
    signal,
  }).catch((error) => {
    if (!isAbortError(error)) console.error(error);
    return null;
  });
  if (!response?.ok) return false;

  const contents = await response.text().catch(() => null);
  if (contents === null) return false;

  const html = new DOMParser().parseFromString(contents, 'text/html');
  normalizeRelativeUrls(html, targetUrl);
  html.querySelectorAll('[id]').forEach((el) => {
    el.id = `preview-${el.id}`;
  });

  const article = html.querySelector<HTMLElement>(
    '[data-popover-hint], article#nd-page, article, main',
  );
  if (!article) return false;

  popoverInner.replaceChildren(cleanPreviewElement(article));
  htmlCache.set(targetUrl.pathname, popoverInner.innerHTML);
  return true;
}

async function handleInternalLink(link: HTMLAnchorElement) {
  const targetUrl = new URL(link.href);
  targetUrl.hash = '';
  targetUrl.search = '';

  const popoverId = `link-preview:${targetUrl.pathname}`;
  const existing = document.getElementById(popoverId);
  if (existing) {
    await showPopover(link, existing);
    return;
  }

  if (activeRequest && activeRequest.link !== link) {
    activeRequest.abort();
    activeRequest = null;
  }

  const controller = new AbortController();
  activeRequest = { abort: () => controller.abort(), link };
  const { popoverElement, popoverInner } = createPopoverElement();
  popoverElement.id = popoverId;
  popoverInner.textContent = 'Loading preview…';
  document.body.append(popoverElement);

  const ready = await populatePagePreview(targetUrl, popoverInner, controller.signal);
  if (activeRequest?.link !== link) {
    popoverElement.remove();
    return;
  }
  activeRequest = null;
  if (!ready) {
    popoverElement.remove();
    return;
  }
  await showPopover(link, popoverElement);
}

function isPreviewableLink(link: HTMLAnchorElement, pathname: string) {
  if (link.dataset.noPreview === 'true') return false;
  if (!link.href || link.target === '_blank') return false;
  let url: URL;
  try {
    url = new URL(link.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (!url.pathname.startsWith('/docs')) return false;
  if (url.pathname === pathname) return false;
  if (url.pathname.includes('/tags/')) return false;
  return true;
}

export function LinkPreview({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a');
      if (!(link instanceof HTMLAnchorElement)) return;
      if (!link.closest('article, .fd-prose, [data-page-content]')) return;
      if (!isPreviewableLink(link, pathname)) return;
      if (activeAnchor === link) {
        cancelDismiss();
        return;
      }
      activeAnchor = link;
      cancelDismiss();
      void handleInternalLink(link);
    };

    const onPointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget;
      if (related instanceof Element && related.closest('.link-preview, a')) {
        return;
      }
      scheduleDismiss();
    };

    const onPointerOverPreview = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.link-preview')) cancelDismiss();
    };

    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('pointerover', onPointerOverPreview);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('pointerover', onPointerOverPreview);
      clearActivePopover();
      activeRequest?.abort();
      activeRequest = null;
    };
  }, [enabled, pathname]);

  return null;
}
