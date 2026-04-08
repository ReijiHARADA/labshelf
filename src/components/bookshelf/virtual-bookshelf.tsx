'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [focusedBookId, setFocusedBookId] = useState<string | null>(null);
  const [motionDirection, setMotionDirection] = useState<1 | -1>(1);
  const [viewportWidth, setViewportWidth] = useState(1280);

  const shelves = useMemo(() => {
    const rows: Book[][] = [];
    let currentRow: Book[] = [];
    let currentWidth = 0;
    const maxWidth = maxBooksPerRow * 35;

    for (const book of books) {
      const bookWidth = getSpineWidth(book);
      
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
  const centerStageWidth = viewportWidth >= 1280 ? 380 : 330;
  const sideTrackWidth = Math.max(0, Math.min(560, viewportWidth / 2 - centerStageWidth / 2));
  const perSideCount = 6;
  const leftNeighbors =
    focusedIndex > 0
      ? shelfBooks.slice(Math.max(0, focusedIndex - perSideCount), focusedIndex)
      : [];
  const rightNeighbors =
    focusedIndex >= 0 ? shelfBooks.slice(focusedIndex + 1, focusedIndex + 1 + perSideCount) : [];
  const focusedMemo = focusedBook?.memo?.trim();
  const coverTransition = { duration: 0.28, ease: [0.22, 0.86, 0.36, 1] as const };

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!focusedBookId) return;
    if (focusedIndex !== -1) return;
    if (shelfBooks.length === 0) {
      setFocusedBookId(null);
      return;
    }
    setFocusedBookId(shelfBooks[0].id);
  }, [focusedBookId, focusedIndex, shelfBooks]);

  const moveFocus = (targetId: string) => {
    const current = focusedIndex;
    const next = shelfBooks.findIndex((b) => b.id === targetId);
    if (next !== -1 && current !== -1) {
      setMotionDirection(next > current ? 1 : -1);
    }
    setFocusedBookId(targetId);
  };

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
                  onBookClick={(book) => moveFocus(book.id)}
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
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto"
          >
            <button
              type="button"
              aria-label="フォーカスビューを閉じる"
              className="absolute inset-0 bg-white/35 backdrop-blur-[10px]"
              onClick={() => setFocusedBookId(null)}
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative z-10 h-full w-full pointer-events-auto"
            >
              <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 pointer-events-auto"
                  onClick={() => setFocusedBookId(null)}
                  aria-label="フォーカスビューを閉じる"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative flex h-full w-full items-center overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 hidden items-center overflow-hidden md:flex"
                  style={{ width: `${sideTrackWidth}px` }}
                >
                  <div className="flex w-full items-center justify-end gap-3 pr-1">
                    {leftNeighbors.map((book, i) => (
                      <motion.button
                        key={book.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveFocus(book.id);
                        }}
                        animate={{ opacity: i === 0 ? 0.7 : 0.88, scale: 0.94 }}
                        transition={{ duration: 0.16 }}
                        className="transition hover:opacity-100"
                      >
                        <BookCover
                          book={book}
                          size="md"
                          className="h-44 w-[120px] rounded-md"
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div
                  className="relative z-10 mx-auto flex items-center justify-center pointer-events-auto"
                  style={{ width: `${centerStageWidth}px` }}
                >
                  <div className="relative flex flex-col items-center">
                    <motion.div
                      key={focusedBook.id}
                      initial={{ x: motionDirection * 140, scale: 0.48, opacity: 0.9 }}
                      animate={{
                        x: [motionDirection * 140, 0, 0],
                        scale: [0.48, 0.48, 1],
                        opacity: [0.9, 0.9, 1],
                      }}
                      transition={{
                        x: {
                          duration: 0.3,
                          ease: [0.16, 0.84, 0.34, 1],
                        },
                        scale: {
                          duration: 0.3,
                          delay: 0.1,
                          ease: [0.22, 0.86, 0.36, 1],
                        },
                        opacity: {
                          duration: 0.3,
                          delay: 0.1,
                          ease: 'linear',
                        },
                      }}
                      className="drop-shadow-2xl"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/books/${focusedBook.id}`);
                        }}
                        className="block"
                        aria-label={`${focusedBook.title} の詳細を見る`}
                      >
                        <BookCover
                          book={focusedBook}
                          size="lg"
                          className="h-[380px] w-[252px] rounded-lg sm:h-[440px] sm:w-[292px]"
                        />
                      </button>
                    </motion.div>
                    <motion.div
                      key={`${focusedBook.id}-meta`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.2 }}
                      className="absolute top-full mt-4 max-w-sm text-center"
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
                      <div className="mt-3">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/books/${focusedBook.id}`);
                          }}
                        >
                          この本の詳細を見る
                        </Button>
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div
                  className="absolute inset-y-0 right-0 hidden items-center overflow-hidden md:flex"
                  style={{ width: `${sideTrackWidth}px` }}
                >
                  <div className="flex w-full items-center justify-start gap-3 pl-1">
                    {rightNeighbors.map((book, i) => (
                      <motion.button
                        key={book.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveFocus(book.id);
                        }}
                        animate={{ opacity: i === rightNeighbors.length - 1 ? 0.7 : 0.88, scale: 0.94 }}
                        transition={{ duration: 0.16 }}
                        className="transition hover:opacity-100"
                      >
                        <BookCover
                          book={book}
                          size="md"
                          className="h-44 w-[120px] rounded-md"
                        />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
