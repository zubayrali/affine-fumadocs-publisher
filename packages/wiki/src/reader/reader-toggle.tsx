'use client';

import { createPortal } from 'react-dom';
import { BookOpen, BookOpenCheck, X } from 'lucide-react';
import { useSidebar } from 'fumadocs-ui/components/sidebar/base';
import { useCallback, useEffect, useRef, useState } from 'react';
import './reader.css';

export interface ReaderToggleProps {
  label: string;
  exitLabel: string;
}

/**
 * Thin reader mode: collapses the docs sidebar and sets
 * `html[data-reader-mode="on"]` so CSS can hide chrome.
 */
export function ReaderToggle({ label, exitLabel }: ReaderToggleProps) {
  const [active, setActive] = useState(false);
  const { collapsed, setCollapsed } = useSidebar();
  const prevCollapsed = useRef(collapsed);
  const activeRef = useRef(false);

  const applyCSS = useCallback((on: boolean) => {
    document.documentElement.dataset.readerMode = on ? 'on' : '';
    activeRef.current = on;
  }, []);

  const deactivate = useCallback(() => {
    setCollapsed(prevCollapsed.current);
    applyCSS(false);
    setActive(false);
  }, [setCollapsed, applyCSS]);

  const activate = useCallback(() => {
    prevCollapsed.current = collapsed;
    setCollapsed(true);
    applyCSS(true);
    setActive(true);
  }, [collapsed, setCollapsed, applyCSS]);

  useEffect(() => {
    if (activeRef.current && !collapsed) {
      applyCSS(false);
      setActive(false);
    }
  }, [collapsed, applyCSS]);

  useEffect(() => {
    return () => {
      document.documentElement.dataset.readerMode = '';
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'b' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        event.preventDefault();
        if (activeRef.current) {
          setCollapsed(prevCollapsed.current);
          applyCSS(false);
          setActive(false);
        } else {
          prevCollapsed.current =
            document.getElementById('nd-sidebar')?.dataset.collapsed === 'true';
          setCollapsed(true);
          applyCSS(true);
          setActive(true);
        }
      } else if (
        event.key === 'Escape' &&
        activeRef.current &&
        !document.querySelector('dialog[open]')
      ) {
        setCollapsed(prevCollapsed.current);
        applyCSS(false);
        setActive(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setCollapsed, applyCSS]);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={active ? deactivate : activate}
        className="inline-flex items-center justify-center rounded-md border bg-fd-background p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        {active ? (
          <BookOpenCheck className="size-4" />
        ) : (
          <BookOpen className="size-4" />
        )}
      </button>

      {active
        ? createPortal(
            <div className="wiki-reader-exit-bar">
              <button type="button" onClick={deactivate} className="wiki-reader-exit-btn">
                <X className="size-3.5" />
                {exitLabel}
              </button>
              <kbd className="wiki-reader-exit-hint">ESC</kbd>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
