'use client';

import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import {
  type ImgHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

type ArticleImageProps = ImgHTMLAttributes<HTMLImageElement>;

type GalleryItem = {
  alt: string;
  caption: string;
  src: string;
  trigger: HTMLButtonElement;
};

function collectArticleImages(): GalleryItem[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '#nd-page [data-article-image-trigger]',
    ),
  )
    .map((trigger) => {
      const image = trigger.querySelector('img');
      if (!image) return null;

      return {
        alt: image.alt,
        caption: trigger.dataset.caption ?? image.alt,
        src: image.currentSrc || image.src,
        trigger,
      };
    })
    .filter((item): item is GalleryItem => item !== null);
}

export function ArticleImage({ alt = '', ...props }: ArticleImageProps) {
  const source = props.src as unknown;
  const imageData =
    source && typeof source === 'object' && 'src' in source
      ? (source as { height?: number; src: string; width?: number })
      : null;
  const src = typeof source === 'string' ? source : imageData?.src;
  const width = props.width ?? imageData?.width;
  const height = props.height ?? imageData?.height;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeItem = items[activeIndex];
  const isOpen = activeIndex >= 0 && Boolean(activeItem);

  const close = () => setActiveIndex(-1);
  const previous = () => setActiveIndex((index) => Math.max(0, index - 1));
  const next = () =>
    setActiveIndex((index) => Math.min(items.length - 1, index + 1));

  function open() {
    const galleryItems = collectArticleImages();
    const index = galleryItems.findIndex(
      ({ trigger }) => trigger === triggerRef.current,
    );
    setItems(galleryItems);
    setActiveIndex(Math.max(0, index));
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => Math.min(items.length - 1, index + 1));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen, items.length]);

  function keepFocusInside(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;

    const controls = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href]',
      ),
    );
    if (controls.length === 0) return;

    const first = controls[0]!;
    const last = controls[controls.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <span className="figure-image" role="figure">
      <button
        ref={triggerRef}
        type="button"
        className="article-image-trigger"
        data-article-image-trigger=""
        data-caption={alt}
        aria-label={alt ? `Enlarge image: ${alt}` : 'Enlarge image'}
        onClick={open}
      >
        {/* AFFiNE may supply dimensions; keep a native img for remote and static assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...props} src={src} width={width} height={height} alt={alt} />
      </button>
      {alt ? <span className="figcaption">{alt}</span> : null}

      {isOpen && activeItem
        ? createPortal(
            <div
              className="article-lightbox"
              role="dialog"
              aria-modal="true"
              aria-label="Image viewer"
              onKeyDown={keepFocusInside}
            >
              <button
                type="button"
                className="article-lightbox-backdrop"
                aria-label="Close image viewer"
                onClick={close}
              />

              <div className="article-lightbox-toolbar">
                <span className="article-lightbox-count" aria-live="polite">
                  {String(activeIndex + 1).padStart(2, '0')} /{' '}
                  {String(items.length).padStart(2, '0')}
                </span>
                <a
                  className="article-lightbox-action"
                  href={activeItem.src}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open original image"
                >
                  <ExternalLink aria-hidden="true" />
                </a>
                <button
                  ref={closeRef}
                  type="button"
                  className="article-lightbox-action"
                  aria-label="Close image viewer"
                  onClick={close}
                >
                  <X aria-hidden="true" />
                </button>
              </div>

              <div
                className="article-lightbox-stage"
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  touchStart.current = { x: touch.clientX, y: touch.clientY };
                }}
                onTouchEnd={(event) => {
                  const start = touchStart.current;
                  const touch = event.changedTouches[0];
                  touchStart.current = null;
                  if (!start || !touch) return;

                  const x = touch.clientX - start.x;
                  const y = touch.clientY - start.y;
                  if (Math.abs(x) < 48 || Math.abs(x) <= Math.abs(y)) return;
                  if (x > 0) previous();
                  else next();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeItem.src} alt={activeItem.alt} />
              </div>

              {items.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="article-lightbox-nav article-lightbox-previous"
                    aria-label="Previous image"
                    disabled={activeIndex === 0}
                    onClick={previous}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="article-lightbox-nav article-lightbox-next"
                    aria-label="Next image"
                    disabled={activeIndex === items.length - 1}
                    onClick={next}
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </>
              ) : null}

              <div className="article-lightbox-caption">
                <p>{activeItem.caption || 'Untitled image'}</p>
                {items.length > 1 ? (
                  <span>Use arrow keys or swipe to browse</span>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
