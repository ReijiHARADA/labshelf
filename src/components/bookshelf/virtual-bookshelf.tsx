'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShelfRow } from './shelf-row';
import { BookDetailDrawer } from './book-detail-drawer';
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
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

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

  return (
    <>
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
          <div className="pt-4 pb-2">
            <AnimatePresence mode="wait">
              {shelves.map((shelfBooks, rowIndex) => (
                <ShelfRow
                  key={`shelf-${rowIndex}`}
                  books={shelfBooks}
                  onBookClick={setSelectedBook}
                  rowIndex={rowIndex}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {shelves.length === 0 && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <p>本が見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>

      {/* Book detail drawer */}
      <BookDetailDrawer
        book={selectedBook}
        open={!!selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </>
  );
}
