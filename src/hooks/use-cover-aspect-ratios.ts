'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Book } from '@/types/book';
import {
  getCoverAspectRatio,
  getDefaultCoverAspectRatio,
  loadCoverAspectRatio,
} from '@/lib/cover-aspect-ratio';

export function useCoverAspectRatios(books: Book[]) {
  const bookKey = useMemo(
    () => books.map((book) => `${book.id}:${book.coverImageUrl ?? ''}`).join('|'),
    [books]
  );

  const [ratios, setRatios] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const book of books) {
      initial[book.id] = getCoverAspectRatio(book);
    }
    return initial;
  });

  useEffect(() => {
    let cancelled = false;

    const initial: Record<string, number> = {};
    for (const book of books) {
      initial[book.id] = getCoverAspectRatio(book);
    }
    setRatios(initial);

    void (async () => {
      const entries = await Promise.all(
        books.map(async (book) => [book.id, await loadCoverAspectRatio(book.coverImageUrl)] as const)
      );

      if (cancelled) return;
      setRatios(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [bookKey]);

  const getRatio = (book: Book) => ratios[book.id] ?? getDefaultCoverAspectRatio();

  return { ratios, getRatio };
}
