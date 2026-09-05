'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

let tooltip: HTMLDivElement | null = null;
let activeLink: HTMLElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateTooltip(): HTMLDivElement {
  if (tooltip && document.body.contains(tooltip)) return tooltip;
  tooltip = document.createElement('div');
  tooltip.className = 'citation-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltip);
  return tooltip;
}

function show(link: HTMLElement) {
  const text = link.getAttribute('data-citation-text');
  if (!text) return;

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  activeLink = link;
  const el = getOrCreateTooltip();
  el.textContent = text;

  const rect = link.getBoundingClientRect();
  const tipWidth = Math.min(448, window.innerWidth - 32);
  el.style.width = `${tipWidth}px`;

  let left = rect.left + rect.width / 2 - tipWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipWidth - 8));
  const top = rect.bottom + 6;

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.classList.add('active');
}

function hide() {
  hideTimer = setTimeout(() => {
    hideTimer = null;
    activeLink = null;
    tooltip?.classList.remove('active');
  }, 150);
}

function onOver(e: MouseEvent) {
  const target = (e.target as Element)?.closest?.('a[data-citation]') as HTMLElement | null;
  if (!target) return;
  show(target);
}

function onOut(e: MouseEvent) {
  const target = (e.target as Element)?.closest?.('a[data-citation]') as HTMLElement | null;
  if (!target || target !== activeLink) return;
  hide();
}

export function CitationTooltip({ enabled = true }: { enabled?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      tooltip?.classList.remove('active');
      activeLink = null;
    };
  }, [enabled]);

  useEffect(() => {
    tooltip?.classList.remove('active');
    activeLink = null;
  }, [pathname]);

  return null;
}
