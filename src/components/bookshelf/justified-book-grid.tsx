'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Book } from '@/types/book';
import { getDefaultCoverAspectRatio } from '@/lib/cover-aspect-ratio';
import { buildJustifiedRows } from '@/lib/justified-layout';
import { useCoverAspectRatios } from '@/hooks/use-cover-aspect-ratios';
import { BookCover } from './book-cover';

interface JustifiedBookGridProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  targetRowHeight?: number;
  onLayoutReady?: () => void;
}

export function JustifiedBookGrid({
  books,
  onBookClick,
  targetRowHeight = 190,
  onLayoutReady,
}: JustifiedBookGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { ratios } = useCoverAspectRatios(books);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => setContainerWidth(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo(() => {
    if (containerWidth <= 0) return [];
    return buildJustifiedRows(
      books.map((book) => ({
        item: book,
        aspectRatio: ratios[book.id] ?? getDefaultCoverAspectRatio(),
      })),
      containerWidth,
      { targetRowHeight, gap: 12 }
    );
  }, [books, containerWidth, targetRowHeight, ratios]);

  useEffect(() => {
    if (containerWidth > 0 && rows.length > 0) {
      onLayoutReady?.();
    }
  }, [containerWidth, rows.length, onLayoutReady]);

  return (
    <div ref={containerRef} className="space-y-3">
      {rows.map((row, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={`flex items-start gap-3 ${row.isLastRow ? 'justify-start' : ''}`}
        >
          {row.boxes.map(({ item: book, width, height }, index) => (
            <motion.button
              key={book.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (rowIndex * 6 + index) * 0.015 }}
              className="group shrink-0 text-left"
              style={{ width: `${width}px` }}
              onClick={() => onBookClick?.(book)}
            >
              <div
                className="flex items-end justify-center"
                style={{ height: `${height}px` }}
              >
                <BookCover
                  book={book}
                  height={height}
                  className="max-w-full"
                />
              </div>
              <h3 className="mt-2 h-10 overflow-hidden text-sm font-medium leading-5 line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              <p className="mt-0.5 h-4 overflow-hidden text-xs leading-4 text-muted-foreground line-clamp-1">
                {book.author}
              </p>
            </motion.button>
          ))}
        </div>
      ))}
    </div>
  );
}
