'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import {
  getSpineColor,
  getSpineWidth,
  getSpineHeight,
  shouldHaveTexture,
  getLabelPosition,
} from '@/lib/spine-colors';

interface BookSpineProps {
  book: Book;
  onClick?: () => void;
  index?: number;
}

export function BookSpine({ book, onClick, index = 0 }: BookSpineProps) {
  const spineColor = getSpineColor(book.category, book.id);
  const spineWidth = getSpineWidth(book);
  const spineHeight = getSpineHeight(book);
  const hasTexture = shouldHaveTexture(book.id);
  const labelPosition = getLabelPosition(book.id);

  const displayTitle = book.title.length > 20 
    ? book.title.slice(0, 18) + '…' 
    : book.title;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.02,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ 
        y: -6,
        transition: { duration: 0.15 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      style={{
        width: `${spineWidth}px`,
        height: `${spineHeight}px`,
      }}
      aria-label={`${book.title} - ${book.author}`}
    >
      {/* Left page edge (white paper showing) */}
      <div
        className="absolute left-0 top-[2px] bottom-[2px] w-[3px]"
        style={{
          background: 'linear-gradient(90deg, #d4d4d4 0%, #f5f5f5 40%, #e8e8e8 100%)',
          boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.1)',
        }}
      />

      {/* Right page edge (white paper showing) */}
      <div
        className="absolute right-0 top-[2px] bottom-[2px] w-[3px]"
        style={{
          background: 'linear-gradient(270deg, #d4d4d4 0%, #f5f5f5 40%, #e8e8e8 100%)',
          boxShadow: 'inset 1px 0 2px rgba(0,0,0,0.1)',
        }}
      />

      {/* Main spine body */}
      <div
        className="absolute inset-0 mx-[3px] flex flex-col items-center justify-center"
        style={{
          backgroundColor: spineColor,
          boxShadow: `
            inset 2px 0 4px rgba(0,0,0,0.2),
            inset -2px 0 4px rgba(0,0,0,0.15),
            inset 0 2px 3px rgba(0,0,0,0.1),
            inset 0 -2px 3px rgba(0,0,0,0.1)
          `,
          borderRadius: '1px',
        }}
      >
        {/* Texture overlay */}
        {hasTexture && (
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Spine highlight (left edge) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[1px]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.2) 100%)',
          }}
        />

        {/* Spine shadow (right edge) */}
        <div
          className="absolute right-0 top-0 bottom-0 w-[2px]"
          style={{
            background: 'linear-gradient(270deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        {/* Top edge shadow */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        {/* Bottom edge highlight */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: 'rgba(255,255,255,0.1)',
          }}
        />

        {/* Top label */}
        {labelPosition === 'top' && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 w-[70%] h-2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)',
            }}
          />
        )}

        {/* Title */}
        <div
          className="spine-text px-0.5 py-2 text-center font-medium leading-tight"
          style={{
            fontSize: spineWidth < 30 ? '9px' : '10px',
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            maxHeight: `${spineHeight - 40}px`,
            letterSpacing: '0.02em',
          }}
        >
          {displayTitle}
        </div>

        {/* Bottom label */}
        {labelPosition === 'bottom' && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[70%] h-2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)',
            }}
          />
        )}
      </div>

      {/* Recommended badge */}
      {book.recommended && (
        <div
          className="absolute -top-1 right-0 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white/80 shadow-sm z-10"
          title="おすすめ"
        />
      )}
    </motion.button>
  );
}
