'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShelfRow } from './shelf-row';
import { BookCover } from './book-cover';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Book } from '@/types/book';
import { getSpineWidth } from '@/lib/spine-colors';

interface VirtualBookshelfProps {
  books: Book[];
  maxBooksPerRow?: number;
  maxRows?: number;
  title?: string;
}

export function VirtualBookshelf({
  books,
  maxBooksPerRow = 12,
  maxRows = 3,
  title,
}: VirtualBookshelfProps) {
  const [focusedBookId, setFocusedBookId] = useState<string | null>(null);

  const shelves = useMemo(() => {
    const rows: Book[][] = [];
    let currentRow: Book[] = [];
    let currentWidth = 0;
    const maxWidth = maxBooksPerRow * 35;

    for (const book of books) {
      const bookWidth = getSpineWidth(book.title);
      
      if (currentWidth + bookWidth > maxWidth && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        currentWidth = 0;
        
        if (rows.length >= maxRows) break;
      }
      
      currentRow.push(book);
      currentWidth += bookWidth + 2;
    }

    if (currentRow.length > 0 && rows.length < maxRows) {
      rows.push(currentRow);
    }

    return rows;
  }, [books, maxBooksPerRow, maxRows]);

  const shelfBooks = useMemo(() => shelves.flat(), [shelves]);
  const focusedIndex = useMemo(
    () => shelfBooks.findIndex((book) => book.id === focusedBookId),
    [shelfBooks, focusedBookId]
  );
  const focusedBook = focusedIndex >= 0 ? shelfBooks[focusedIndex] : null;
  const leftNeighbor = focusedIndex > 0 ? shelfBooks[focusedIndex - 1] : null;
  const rightNeighbor =
    focusedIndex >= 0 && focusedIndex < shelfBooks.length - 1
      ? shelfBooks[focusedIndex + 1]
      : null;
  const focusedMemo = focusedBook?.memo?.trim();

  return (
    <div className="relative">
      <div className="relative">
        {title && (
          <motion.h3
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-semibold mb-4 px-4"
          >
            {title}
          </motion.h3>
        )}

        {/* Bookshelf frame */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #f8f6f3 0%, #f0ece6 100%)',
            boxShadow: `
              inset 0 1px 3px rgba(0,0,0,0.04),
              0 2px 8px rgba(0,0,0,0.06)
            `,
          }}
        >
          {/* Shelves */}
          <motion.div
            className="pt-4 pb-2"
            animate={
              focusedBook
                ? { filter: 'blur(8px)', opacity: 0.28, scale: 0.985 }
                : { filter: 'blur(0px)', opacity: 1, scale: 1 }
            }
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <AnimatePresence mode="wait">
              {shelves.map((shelfBooks, rowIndex) => (
                <ShelfRow
                  key={`shelf-${rowIndex}`}
                  books={shelfBooks}
                  onBookClick={(book) => setFocusedBookId(book.id)}
                  rowIndex={rowIndex}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Empty state */}
          {shelves.length === 0 && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p>本が見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {focusedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto px-4 pb-8 pt-6 sm:px-8 sm:pt-10"
          >
            <div className="absolute inset-0 bg-white/35 backdrop-blur-[10px]" />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative z-10 w-full max-w-5xl p-2 sm:p-4"
            >
              <div className="absolute right-0 top-0 z-20">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/70 shadow-sm backdrop-blur"
                  onClick={() => setFocusedBookId(null)}
                  aria-label="フォーカスビューを閉じる"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
                <div className="order-2 flex items-center justify-center md:order-1 md:justify-end">
                  {leftNeighbor ? (
                    <motion.button
                      key={leftNeighbor.id}
                      type="button"
                      onClick={() => setFocusedBookId(leftNeighbor.id)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08, duration: 0.26 }}
                      className="opacity-85 transition hover:-translate-y-1 hover:opacity-100"
                    >
                      <BookCover
                        book={leftNeighbor}
                        size="md"
                        className="h-44 w-[120px] rounded-md"
                      />
                    </motion.button>
                  ) : (
                    <div className="hidden md:block w-[120px]" />
                  )}
                </div>

                <div className="order-1 flex flex-col items-center md:order-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.88, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: -2 }}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                    className="drop-shadow-2xl"
                  >
                    <BookCover
                      book={focusedBook}
                      size="lg"
                      className="h-[320px] w-[214px] rounded-lg sm:h-[360px] sm:w-[240px]"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14, duration: 0.25 }}
                    className="mt-4 max-w-sm text-center"
                  >
                    <h3 className="text-lg font-semibold leading-tight sm:text-xl">
                      {focusedBook.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{focusedBook.author}</p>
                    {focusedMemo && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {focusedMemo.length > 72 ? `${focusedMemo.slice(0, 72)}...` : focusedMemo}
                      </p>
                    )}
                  </motion.div>
                </div>

                <div className="order-3 flex items-center justify-center md:justify-start">
                  {rightNeighbor ? (
                    <motion.button
                      key={rightNeighbor.id}
                      type="button"
                      onClick={() => setFocusedBookId(rightNeighbor.id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08, duration: 0.26 }}
                      className="opacity-85 transition hover:-translate-y-1 hover:opacity-100"
                    >
                      <BookCover
                        book={rightNeighbor}
                        size="md"
                        className="h-44 w-[120px] rounded-md"
                      />
                    </motion.button>
                  ) : (
                    <div className="hidden md:block w-[120px]" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
