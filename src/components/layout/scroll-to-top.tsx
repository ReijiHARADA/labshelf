'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';

function scrollWindowToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function ScrollToTop() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    scrollWindowToTop();
    const raf = requestAnimationFrame(scrollWindowToTop);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
