'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_PREFIX = 'labshelf:browse-scroll:';

function getBrowseScrollKey(pathname: string, search: string) {
  return `${STORAGE_PREFIX}${pathname}${search ? `?${search}` : ''}`;
}

function saveBrowseScroll(pathname: string, search: string) {
  if (typeof window === 'undefined') return;
  const key = getBrowseScrollKey(pathname, search);
  sessionStorage.setItem(key, String(window.scrollY));
}

function readBrowseScroll(pathname: string, search: string): number | null {
  if (typeof window === 'undefined') return null;
  const key = getBrowseScrollKey(pathname, search);
  const value = sessionStorage.getItem(key);
  if (value == null) return null;
  const y = Number(value);
  return Number.isFinite(y) ? y : null;
}

function restoreBrowseScroll(y: number) {
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;
}

export function useBrowseScrollRestore(ready: boolean) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (pathname !== '/browse') return;

    let raf = 0;
    const handleScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        saveBrowseScroll(pathname, search);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      saveBrowseScroll(pathname, search);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, search]);

  useLayoutEffect(() => {
    restoredRef.current = false;
  }, [pathname, search]);

  useLayoutEffect(() => {
    if (!ready || pathname !== '/browse' || restoredRef.current) return;

    const y = readBrowseScroll(pathname, search);
    if (y == null || y <= 0) {
      restoredRef.current = true;
      return;
    }

    restoreBrowseScroll(y);
    const raf = requestAnimationFrame(() => {
      restoreBrowseScroll(y);
      restoredRef.current = true;
    });

    return () => cancelAnimationFrame(raf);
  }, [ready, pathname, search]);
}
