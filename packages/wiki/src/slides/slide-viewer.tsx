'use client';

import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import './slides.css';

export function SlideViewer({
  children,
  parentUrl,
  parentTitle,
}: {
  children: ReactNode;
  parentUrl: string;
  parentTitle: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const nodes = Array.from(el.children);
    const sections: HTMLElement[][] = [[]];

    for (const node of nodes) {
      if (node instanceof HTMLElement && /^H[12]$/.test(node.tagName)) {
        if (sections[sections.length - 1]!.length > 0) {
          sections.push([]);
        }
      }
      if (node instanceof HTMLElement) {
        sections[sections.length - 1]!.push(node);
      }
    }

    const htmlSlides = sections
      .filter((section) => section.length > 0)
      .map((section) => section.map((node) => node.outerHTML).join(''));

    setSlides(htmlSlides);

    const match = window.location.hash.match(/^#slide-(\d+)$/);
    if (match) {
      const idx = Number.parseInt(match[1]!, 10) - 1;
      if (idx >= 0 && idx < htmlSlides.length) setCurrent(idx);
    }
  }, []);

  const go = useCallback(
    (delta: number) => {
      setCurrent((prev) => {
        const next = Math.max(0, Math.min(slides.length - 1, prev + delta));
        queueMicrotask(() =>
          history.replaceState(null, '', `#slide-${next + 1}`),
        );
        return next;
      });
    },
    [slides.length],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        router.push(parentUrl);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [go, router, parentUrl]);

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;
      touchStartRef.current = null;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      go(dx < 0 ? 1 : -1);
    },
    [go],
  );

  return (
    <>
      <div ref={containerRef} className="hidden">
        {children}
      </div>

      {slides.length > 0 && (
        <div
          className="slide-viewer"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="slide-progress">
            <div
              className="slide-progress-fill"
              style={{ width: `${((current + 1) / slides.length) * 100}%` }}
            />
          </div>

          <div className="slide-content prose prose-fd">
            <div
              key={current}
              className="slide-body"
              dangerouslySetInnerHTML={{ __html: slides[current]! }}
            />
          </div>

          <div className="slide-controls">
            <button
              type="button"
              className="slide-btn"
              onClick={() => router.push(parentUrl)}
              title={`Back to ${parentTitle} (Esc)`}
            >
              <X className="size-4" />
            </button>
            <div className="slide-nav">
              <button
                type="button"
                className="slide-btn"
                onClick={() => go(-1)}
                disabled={current === 0}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="slide-counter">
                {current + 1} / {slides.length}
              </span>
              <button
                type="button"
                className="slide-btn"
                onClick={() => go(1)}
                disabled={current === slides.length - 1}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
