'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { usePathname } from 'next/navigation';
import {
  consumeBrowseScrollRestore,
  enableManualScrollRestoration,
  saveBrowseScrollPosition,
  type BrowseViewMode,
} from '@/lib/browse-session';

const SCROLL_TOLERANCE_PX = 2;
const STABLE_FRAME_COUNT = 3;
const RESTORE_TIMEOUT_MS = 5000;

function getMaxScrollY(): number {
  return Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
}

function clampScrollY(y: number): number {
  return Math.min(Math.max(0, y), getMaxScrollY());
}

function applyScrollY(y: number): void {
  const target = clampScrollY(y);
  window.scrollTo(0, target);
  document.documentElement.scrollTop = target;
  document.body.scrollTop = target;
}

function isScrollAtTarget(targetY: number): boolean {
  return Math.abs(window.scrollY - clampScrollY(targetY)) <= SCROLL_TOLERANCE_PX;
}

interface UseBrowseScrollRestoreOptions {
  ready: boolean;
  viewMode: BrowseViewMode;
  contentRef?: RefObject<HTMLElement | null>;
}

export function useBrowseScrollRestore({
  ready,
  viewMode,
  contentRef,
}: UseBrowseScrollRestoreOptions) {
  const pathname = usePathname();
  const restoringRef = useRef(false);

  useEffect(() => {
    enableManualScrollRestoration();
  }, []);

  useEffect(() => {
    if (pathname !== '/browse') return;

    let raf = 0;
    const persist = () => {
      saveBrowseScrollPosition(viewMode);
    };

    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(persist);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      persist();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, viewMode]);

  useEffect(() => {
    if (!ready || pathname !== '/browse' || restoringRef.current) return;

    const targetY = consumeBrowseScrollRestore();
    if (targetY == null || targetY <= 0) return;

    restoringRef.current = true;
    const html = document.documentElement;
    const previousScrollBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';

    let cancelled = false;
    let raf = 0;
    let stableFrames = 0;
    let lastScrollHeight = 0;
    const startedAt = performance.now();

    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      html.style.scrollBehavior = previousScrollBehavior;
      restoringRef.current = false;
    };

    const attemptRestore = () => {
      if (cancelled) return;

      applyScrollY(targetY);

      const scrollHeight = document.documentElement.scrollHeight;
      const atTarget = isScrollAtTarget(targetY);
      const heightStable = scrollHeight === lastScrollHeight;

      if (atTarget && heightStable) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
      }

      lastScrollHeight = scrollHeight;

      if (stableFrames >= STABLE_FRAME_COUNT) {
        finish();
        return;
      }

      if (performance.now() - startedAt >= RESTORE_TIMEOUT_MS) {
        finish();
        return;
      }

      raf = requestAnimationFrame(attemptRestore);
    };

    const resizeObserver = new ResizeObserver(() => {
      stableFrames = 0;
      attemptRestore();
    });

    resizeObserver.observe(document.documentElement);
    if (contentRef?.current) {
      resizeObserver.observe(contentRef.current);
    }

    applyScrollY(targetY);
    raf = requestAnimationFrame(attemptRestore);

    return () => {
      finish();
    };
  }, [ready, pathname, contentRef]);
}
