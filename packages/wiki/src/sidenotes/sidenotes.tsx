'use client';

import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Sidenote layout engine, ported from aarnphm/quartz sidenotes.inline.ts.
// Decides per viewport whether footnote sidenotes sit in the left/right
// margins (stacked to avoid collisions) or fall back to a click-to-open
// floating popover, and re-lays them out on resize. Geometry is adapted from
// Quartz's centered `.main-col` to the Fumadocs docs layout: free margin
// space is measured against the sidebar (#nd-sidebar) and the TOC (#nd-toc).

const SIDENOTE_WIDTH = 16; // rem — max width, reached when margins are generous
const SIDENOTE_MIN_WIDTH = 8; // rem — below this a margin is considered too tight
const SIDENOTE_GUTTER = 1; // rem — gap between article and note
const SIDENOTE_EDGE = 1; // rem — breathing room against the sidebar / viewport edge
const GAP = 1; // rem
const MIN_DESKTOP_WIDTH = 1280; // px

const LABEL_ATTRS = ['role', 'tabindex', 'aria-expanded', 'aria-haspopup', 'data-inline'] as const;

function remToPx(rem: number): number {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function cssPixelValue(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOffsetParentRect(content: HTMLElement): Pick<DOMRect, 'left' | 'right'> {
  const offsetParent = content.offsetParent;
  if (!offsetParent) return { left: 0, right: window.innerWidth };

  const rect = offsetParent.getBoundingClientRect();
  const style = getComputedStyle(offsetParent);

  return {
    left: rect.left + cssPixelValue(style.borderLeftWidth),
    right: rect.right - cssPixelValue(style.borderRightWidth),
  };
}

function getMainColumn(content?: Element): HTMLElement | null {
  return (
    content?.closest<HTMLElement>('.prose') ??
    document.querySelector<HTMLElement>('#nd-page .prose, article#nd-page, article')
  );
}

interface MarginSpace {
  /** Note width in px for each side, or 0 when that margin is too tight.
   *  Width adapts between SIDENOTE_MIN_WIDTH and SIDENOTE_WIDTH so narrower
   *  margins (e.g. sidebar expanded) still fit notes on both sides. */
  left: number;
  right: number;
}

/** Which margins have room for a sidenote column, measured against the real layout. */
function getMarginSpace(mainColumn: HTMLElement | null): MarginSpace {
  if (!mainColumn || window.innerWidth < MIN_DESKTOP_WIDTH) {
    return { left: 0, right: 0 };
  }

  const gutter = remToPx(SIDENOTE_GUTTER);
  const edge = remToPx(SIDENOTE_EDGE);
  const minWidth = remToPx(SIDENOTE_MIN_WIDTH);
  const maxWidth = remToPx(SIDENOTE_WIDTH);
  const mainRect = mainColumn.getBoundingClientRect();

  const sidebar = document.querySelector<HTMLElement>('#nd-sidebar');
  const sidebarVisible =
    sidebar &&
    sidebar.getBoundingClientRect().width > 0 &&
    getComputedStyle(sidebar).display !== 'none';
  const leftBoundary = sidebarVisible ? sidebar.getBoundingClientRect().right : 0;

  const toc = document.querySelector<HTMLElement>('#nd-toc');
  const tocVisible =
    toc &&
    toc.getBoundingClientRect().width > 0 &&
    getComputedStyle(toc).display !== 'none';
  const rightBoundary = tocVisible ? toc.getBoundingClientRect().left : window.innerWidth;

  const widthFor = (space: number): number => {
    const width = Math.min(maxWidth, space - gutter - edge);
    return width >= minWidth ? width : 0;
  };

  return {
    left: widthFor(mainRect.left - leftBoundary),
    right: widthFor(rightBoundary - mainRect.right),
  };
}

interface SidenoteState {
  span: HTMLElement;
  label: HTMLElement;
  content: HTMLElement;
  side?: 'left' | 'right';
  controller?: AbortController;
}

class SidenoteManager {
  private sidenotes: SidenoteState[] = [];
  private lastBottomLeft = 0;
  private lastBottomRight = 0;
  private margins: MarginSpace = { left: 0, right: 0 };

  constructor() {
    this.initialize();
  }

  get isEmpty(): boolean {
    return this.sidenotes.length === 0;
  }

  private cleanupHandlers(state: SidenoteState) {
    state.controller?.abort();
    state.controller = undefined;
  }

  private setActiveState(state: SidenoteState, active: boolean) {
    state.span.classList.toggle('active', active);
    state.label.classList.toggle('active', active);
  }

  private openPopover: SidenoteState | null = null;
  private dismiss: AbortController | null = null;

  private closePopover() {
    const state = this.openPopover;
    this.openPopover = null;
    this.dismiss?.abort();
    this.dismiss = null;
    if (!state) return;
    state.label.setAttribute('aria-expanded', 'false');
    state.content.style.display = 'none';
    state.content.setAttribute('aria-hidden', 'true');
    this.setActiveState(state, false);
  }

  private async showPopover(state: SidenoteState) {
    this.closePopover();
    this.openPopover = state;

    const { label, content } = state;
    label.setAttribute('aria-expanded', 'true');
    content.style.display = 'block';
    content.setAttribute('aria-hidden', 'false');
    this.setActiveState(state, true);

    const { x, y } = await computePosition(label, content, {
      placement: 'bottom',
      strategy: 'fixed',
      middleware: [offset(6), shift({ padding: 8 }), flip()],
    });
    content.style.left = `${Math.round(x)}px`;
    content.style.top = `${Math.round(y)}px`;

    // Dismiss on outside interaction, Escape, or scroll.
    this.dismiss = new AbortController();
    const { signal } = this.dismiss;
    document.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target;
        if (target instanceof Node && (content.contains(target) || label.contains(target))) {
          return;
        }
        this.closePopover();
      },
      { signal },
    );
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') this.closePopover();
      },
      { signal },
    );
    window.addEventListener('scroll', () => this.closePopover(), {
      signal,
      passive: true,
      once: true,
    });
  }

  private measureContentHeight(content: HTMLElement, width: number): number {
    const probe = content.cloneNode(true) as HTMLElement;
    probe.removeAttribute('id');
    probe.style.cssText = `display:block;visibility:hidden;position:absolute;left:0;top:0;width:${width}px`;
    content.parentElement?.appendChild(probe);
    const height = probe.getBoundingClientRect().height;
    probe.remove();
    return height;
  }

  private initialize() {
    const sidenoteSpans = document.querySelectorAll<HTMLSpanElement>('.sidenote');

    sidenoteSpans.forEach((span) => {
      const label = span.querySelector<HTMLSpanElement>('.sidenote-label');
      if (!label) return;

      const content = span.nextElementSibling as HTMLElement | null;
      if (!content || !content.classList.contains('sidenote-content')) return;

      content.style.display = 'none';
      content.setAttribute('aria-hidden', 'true');

      // Repeat the marker number at the head of the note (CSS ::before).
      const marker = label.querySelector('.sidenote-number')?.textContent?.trim();
      if (marker) content.dataset.sidenoteNumber = marker;

      this.sidenotes.push({ span, label, content });
    });
  }

  /** Reset a label's interactive affordances and hover state, WITHOUT touching
   *  the content's geometry — so a re-layout can transition it from its old
   *  position to the new one instead of snapping through a hidden reset. */
  private softCleanup(state: SidenoteState) {
    const { label } = state;
    this.cleanupHandlers(state);
    LABEL_ATTRS.forEach((attr) => label.removeAttribute(attr));
    label.style.cursor = '';
    label.style.userSelect = '';
    this.setActiveState(state, false);
  }

  /** Clear a note's margin geometry — used when it falls back to a popover or
   *  is hidden as a duplicate. */
  private clearGeometry(content: HTMLElement) {
    content.style.left = '';
    content.style.right = '';
    content.style.top = '';
    content.style.width = '';
    content.style.marginTop = '';
    content.classList.remove('sidenote-left', 'sidenote-right', 'sidenote-hiding');
  }

  /** Fade out the currently-placed margin notes (opacity → 0). Called the
   *  instant a layout change starts; the subsequent `layout()` repositions
   *  them while invisible and fades them back in, so the move is never seen. */
  public beginFade() {
    this.sidenotes.forEach(({ content }) => {
      if (content.classList.contains('sidenote-left') || content.classList.contains('sidenote-right')) {
        content.classList.add('sidenote-hiding');
      }
    });
  }

  private get reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private findState(id: string): SidenoteState | undefined {
    return this.sidenotes.find(
      (s) => s.span.id === id || s.content.id === id || s.label.id === id,
    );
  }

  /** One-shot gold arrival pulse on a note, restarting cleanly if re-triggered. */
  private pulse(content: HTMLElement) {
    content.classList.remove('sidenote-arrive');
    void content.offsetWidth; // reflow so the animation replays
    content.classList.add('sidenote-arrive');
    setTimeout(() => content.classList.remove('sidenote-arrive'), 1400);
  }

  /** Run `cb` once the current smooth scroll settles (or a fallback timeout).
   *  Used to open a popover AFTER scrolling — showPopover dismisses on scroll,
   *  so opening mid-scroll would immediately close it. */
  private afterScrollEnd(cb: () => void) {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', run);
      cb();
    };
    window.addEventListener('scrollend', run, { once: true });
    setTimeout(run, 700);
  }

  /** ScrollReveal + highlight a note and write its #sidenote-N to the URL (shareable,
   *  no new history entry). Scrolls only when asked (e.g. arriving via a link);
   *  a marker click doesn't scroll since the marker is already in view. */
  private focusNote(state: SidenoteState, opts: { scroll: boolean; block?: ScrollLogicalPosition }) {
    const isPopover = !state.side;
    const reveal = () => {
      if (isPopover) void this.showPopover(state);
      this.pulse(state.content);
    };

    if (opts.scroll) {
      state.label.scrollIntoView({
        behavior: this.reducedMotion ? 'auto' : 'smooth',
        block: opts.block ?? 'center',
        inline: 'nearest',
      });
      // A popover must open after the scroll settles (it self-dismisses on
      // scroll); a margin note is already in place, so pulse it right away.
      if (isPopover) this.afterScrollEnd(reveal);
      else reveal();
    } else {
      reveal();
    }

    if (state.span.id) history.replaceState(history.state, '', `#${state.span.id}`);
  }

  /** Focus the note a `#sidenote-N` hash points at (deep link / hashchange). */
  public focusHash(hash: string, scroll: boolean) {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    if (!id.startsWith('sidenote-')) return;
    const state = this.findState(id);
    if (state) this.focusNote(state, { scroll });
  }

  private positionSideToSide(state: SidenoteState): boolean {
    const { span, label, content } = state;
    const labelRect = label.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const topPosition = labelRect.top + scrollTop;

    const mainColumn = getMainColumn(content);
    if (!mainColumn) return false;
    const mainRect = mainColumn.getBoundingClientRect();

    const allowLeft = this.margins.left > 0 && span.getAttribute('data-allow-left') !== 'false';
    const allowRight = this.margins.right > 0 && span.getAttribute('data-allow-right') !== 'false';
    const gap = remToPx(GAP);

    // Allow nudging down to clear the previous note on that side.
    // With both margins the notes alternate, so drift is moderate.
    // With one margin all notes stack, so allow more drift.
    const bothSides = allowLeft && allowRight;
    const maxDrift = remToPx(bothSides ? 8 : 14);

    const rightStart = Math.max(topPosition, this.lastBottomRight + gap);
    const leftStart = Math.max(topPosition, this.lastBottomLeft + gap);
    const canRight = allowRight && rightStart - topPosition <= maxDrift;
    const canLeft = allowLeft && leftStart - topPosition <= maxDrift;

    let side: 'left' | 'right';
    let effectiveTop: number;
    if (canRight && (!canLeft || rightStart <= leftStart)) {
      side = 'right';
      effectiveTop = rightStart;
    } else if (canLeft) {
      side = 'left';
      effectiveTop = leftStart;
    } else {
      return false;
    }

    content.classList.remove('sidenote-popover', 'sidenote-left', 'sidenote-right');
    content.classList.add(`sidenote-${side}`);
    content.style.display = 'block';
    content.setAttribute('aria-hidden', 'false');

    const gutter = remToPx(SIDENOTE_GUTTER);
    const sidenoteWidth = this.margins[side];
    content.style.width = `${sidenoteWidth}px`;
    const contentHeight = this.measureContentHeight(content, sidenoteWidth);
    const parentRect = getOffsetParentRect(content);
    const sideOffset =
      side === 'left'
        ? mainRect.left - parentRect.left - sidenoteWidth - gutter
        : parentRect.right - mainRect.right - sidenoteWidth - gutter;

    content.style.left = '';
    content.style.right = '';
    content.style[side] = `${sideOffset}px`;

    // Position vertically relative to the offset parent.
    const parentTop = (content.offsetParent as HTMLElement | null)?.getBoundingClientRect().top ?? 0;
    content.style.top = `${effectiveTop - (parentTop + scrollTop)}px`;
    content.style.marginTop = '0';

    const bottomPosition = effectiveTop + contentHeight;
    if (side === 'left') this.lastBottomLeft = bottomPosition;
    else this.lastBottomRight = bottomPosition;

    state.side = side;

    // Now positioned at its new spot — fade back in (a no-op if it wasn't
    // hidden). The reposition above happened while faded out, so the move is
    // never seen; the note simply crossfades from old spot to new.
    content.classList.remove('sidenote-hiding');

    // JS-based hover highlighting — the CSS `~` sibling combinator can't
    // reach the content reliably once we use explicit `top` positioning.
    state.controller = new AbortController();
    const { signal } = state.controller;
    const highlight = (on: boolean) => content.classList.toggle('sidenote-highlight', on);
    span.addEventListener('mouseenter', () => highlight(true), { signal });
    span.addEventListener('mouseleave', () => highlight(false), { signal });
    content.addEventListener('mouseenter', () => { highlight(true); this.setActiveState(state, true); }, { signal });
    content.addEventListener('mouseleave', () => { highlight(false); this.setActiveState(state, false); }, { signal });

    // Marker is a keyboard-reachable link to the note: activate → pulse it and
    // write #sidenote-N to the URL (shareable). No scroll (already in view).
    label.style.cursor = 'pointer';
    label.setAttribute('role', 'link');
    label.setAttribute('tabindex', '0');
    const activate = (e: Event) => {
      e.preventDefault();
      this.focusNote(state, { scroll: false });
    };
    label.addEventListener('click', activate, { signal });
    label.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') activate(e);
      },
      { signal },
    );

    return true;
  }

  /** No margin room: the label opens the note as a floating popover instead. */
  private positionPopover(state: SidenoteState) {
    const { label, content } = state;

    this.cleanupHandlers(state);
    this.clearGeometry(content);
    state.side = undefined;

    content.classList.add('sidenote-popover');
    content.style.display = 'none';
    content.setAttribute('aria-hidden', 'true');

    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';
    label.setAttribute('role', 'button');
    label.setAttribute('tabindex', '0');
    label.setAttribute('aria-haspopup', 'dialog');
    label.setAttribute('aria-expanded', 'false');
    label.setAttribute('data-inline', '');

    const toggle = () => {
      if (this.openPopover === state) this.closePopover();
      else this.focusNote(state, { scroll: false }); // opens popover + hash + pulse
    };

    state.controller = new AbortController();
    const { signal } = state.controller;

    label.addEventListener(
      'click',
      (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      },
      { capture: true, signal },
    );

    label.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }
      },
      { signal },
    );
  }

  public layout() {
    const first = this.sidenotes[0];
    const mainColumn = first ? getMainColumn(first.content) : null;
    this.margins = getMarginSpace(mainColumn);
    this.closePopover();

    this.lastBottomLeft = 0;
    this.lastBottomRight = 0;

    // Clear any previous overflow padding.
    if (mainColumn) mainColumn.style.paddingBottom = '';

    // Track which footnote markers (e.g. "1") are already placed so
    // duplicate references (same [^1] used twice) don't appear twice.
    const placedMarkers = new Map<string, SidenoteState>();

    this.sidenotes.forEach((state) => {
      // Reset label affordances/handlers but keep content geometry so an
      // in-place transition has an old position to animate from.
      this.softCleanup(state);

      const forceInline = state.span.getAttribute('data-force-inline') === 'true';
      const sideAvailable = this.margins.left > 0 || this.margins.right > 0;
      const marker = state.label.querySelector('.sidenote-number')?.textContent ?? '';

      // Duplicate reference — hide this content but wire the label's hover
      // to highlight the already-placed sidenote's content.
      const original = marker ? placedMarkers.get(marker) : undefined;
      if (original) {
        this.clearGeometry(state.content);
        state.content.style.display = 'none';
        state.content.setAttribute('aria-hidden', 'true');
        state.side = undefined;
        state.controller = new AbortController();
        const { signal } = state.controller;
        const highlight = (on: boolean) =>
          original.content.classList.toggle('sidenote-highlight', on);
        state.span.addEventListener('mouseenter', () => highlight(true), { signal });
        state.span.addEventListener('mouseleave', () => highlight(false), { signal });
        return;
      }

      if (!sideAvailable || forceInline || !this.positionSideToSide(state)) {
        this.positionPopover(state);
      }

      if (marker) placedMarkers.set(marker, state);
    });

    // If margin sidenotes extend below the article, add padding so the
    // prev/next footer doesn't overlap them.
    if (mainColumn) {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const articleBottom = mainColumn.getBoundingClientRect().bottom + scrollTop;
      const lowestSidenote = Math.max(this.lastBottomLeft, this.lastBottomRight);
      if (lowestSidenote > articleBottom) {
        const overflow = lowestSidenote - articleBottom + remToPx(2);
        mainColumn.style.paddingBottom = `${overflow}px`;
      }
    }
  }

  public destroy() {
    this.closePopover();
    this.sidenotes.forEach((state) => this.cleanupHandlers(state));
    this.sidenotes = [];
  }
}

function debounce(fn: () => void, delay: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, delay);
  };
}

export function Sidenotes({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    const manager = new SidenoteManager();
    if (manager.isEmpty) return;

    // Initial layout after paint so fonts/images have settled enough to
    // measure. If the URL already points at a note (a shared link), reveal it.
    const raf = requestAnimationFrame(() => {
      manager.layout();
      if (location.hash) manager.focusHash(location.hash, true);
    });

    // A #sidenote-N hash arriving later (edited URL, or an in-page link).
    const onHashChange = () => manager.focusHash(location.hash, true);
    window.addEventListener('hashchange', onHashChange);

    // Resize repositions live (feels responsive during a drag; no crossfade
    // flicker on every tick).
    const debouncedLayout = debounce(() => manager.layout(), 100);
    window.addEventListener('resize', debouncedLayout, { passive: true });

    // Re-layout when reader mode toggles or the sidebar collapses — the margin
    // geometry changes but no resize event fires. To keep it clean, crossfade:
    // fade the notes out the instant the change starts, then (once the docs
    // grid has snapped and the sidebar aside's ~250ms slide has settled)
    // reposition while they're invisible and fade them back in — the move is
    // never seen. Skip the fade under reduced-motion (just reposition).
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let relayoutTimer: ReturnType<typeof setTimeout> | undefined;
    const onLayoutChange = () => {
      if (!reducedMotion) manager.beginFade();
      clearTimeout(relayoutTimer);
      relayoutTimer = setTimeout(() => manager.layout(), 280);
    };

    const htmlObserver = new MutationObserver(onLayoutChange);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      // Not 'class' — a theme (dark) toggle mutates it and must not crossfade.
      attributeFilter: ['data-reader-mode', 'data-sidebar-collapsed'],
    });

    const sidebar = document.getElementById('nd-sidebar');
    const sidebarObserver = sidebar ? new MutationObserver(onLayoutChange) : null;
    sidebarObserver?.observe(sidebar!, {
      attributes: true,
      attributeFilter: ['data-collapsed'],
    });

    // Belt and braces: fumadocs also mirrors collapse state on the layout
    // grid (`data-sidebar-collapsed`), which is what actually resizes the
    // columns the margins are measured against.
    const layoutEl = document.getElementById('nd-docs-layout');
    const layoutObserver = layoutEl ? new MutationObserver(onLayoutChange) : null;
    layoutObserver?.observe(layoutEl!, {
      attributes: true,
      attributeFilter: ['data-sidebar-collapsed'],
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(relayoutTimer);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('resize', debouncedLayout);
      htmlObserver.disconnect();
      sidebarObserver?.disconnect();
      layoutObserver?.disconnect();
      manager.destroy();
    };
  }, [pathname, enabled]);

  return null;
}
