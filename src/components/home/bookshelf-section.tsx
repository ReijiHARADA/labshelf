'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookCover } from '@/components/bookshelf';
import type { Book } from '@/types/book';

const COVER_HEIGHT = 420;
const INITIAL_COUNT = 8;
const BATCH_SIZE = 6;
const LOAD_THRESHOLD_PX = 480;

interface BookshelfSectionProps {
  allBooks: Book[];
  recommendedBooks: Book[];
  latestBooks: Book[];
  categories: string[];
}

export function BookshelfSection({ latestBooks }: BookshelfSectionProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const source = latestBooks;

  const items = useMemo(() => {
    if (source.length === 0) return [];
    return Array.from({ length: visibleCount }, (_, index) => {
      const book = source[index % source.length];
      return { book, key: `${book.id}-${index}` };
    });
  }, [source, visibleCount]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || source.length === 0) return;
    loadingRef.current = true;
    setVisibleCount((count) => count + BATCH_SIZE);
    // 次フレームまで連打ロードを抑える
    requestAnimationFrame(() => {
      loadingRef.current = false;
    });
  }, [source.length]);

  // 右端のセンチネルが見えたら追加ロード（循環）
  useEffect(() => {
    const root = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || source.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: `0px ${LOAD_THRESHOLD_PX}px 0px 0px`,
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, source.length, items.length]);

  // スクロールでもフォールバック検知
  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
    if (remaining < LOAD_THRESHOLD_PX) {
      loadMore();
    }
  }, [loadMore]);

  if (source.length === 0) {
    return null;
  }

  return (
    <section className="pt-4 pb-8 sm:pt-6 sm:pb-12">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="flex items-end gap-5 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:thin] sm:gap-7 sm:px-8"
        >
          {items.map(({ book, key }) => (
            <Link
              key={key}
              href={`/books/${book.id}`}
              aria-label={book.title}
              className="group shrink-0 transition-transform duration-200 hover:-translate-y-1.5"
            >
              <BookCover
                book={book}
                height={COVER_HEIGHT}
                className="shadow-md transition-shadow duration-200 group-hover:shadow-lg"
              />
            </Link>
          ))}
          <div
            ref={sentinelRef}
            aria-hidden
            className="h-px w-px shrink-0 self-center"
          />
        </div>
      </div>
    </section>
  );
}
