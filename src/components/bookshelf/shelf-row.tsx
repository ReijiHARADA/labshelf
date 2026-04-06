'use client';

import { motion } from 'framer-motion';
import { BookSpine } from './book-spine';
import type { Book } from '@/types/book';

interface ShelfRowProps {
  books: Book[];
  onBookClick?: (book: Book) => void;
  rowIndex?: number;
}

export function ShelfRow({ books, onBookClick, rowIndex = 0 }: ShelfRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: rowIndex * 0.1 }}
      className="relative"
    >
      {/* Books container */}
      <div className="flex items-end gap-[1px] px-4 pb-2 min-h-[200px]">
        {books.map((book, index) => (
          <BookSpine
            key={book.id}
            book={book}
            onClick={() => onBookClick?.(book)}
            index={index}
          />
        ))}
      </div>

      {/* Shelf board */}
      <div 
        className="h-3"
        style={{
          background: 'linear-gradient(180deg, #c9b896 0%, #a89070 50%, #8b7355 100%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.3),
            0 2px 4px rgba(0,0,0,0.2),
            0 4px 8px rgba(0,0,0,0.1)
          `,
        }}
      />

      {/* Shelf front edge */}
      <div 
        className="h-1"
        style={{
          background: 'linear-gradient(180deg, #7a6245 0%, #5c4a35 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      />

      {/* Shelf shadow on wall */}
      <div
        className="h-4"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        }}
      />
    </motion.div>
  );
}
