'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import {
  getBookSpineColor,
  getSpineWidth,
  getSpineHeight,
  shouldHaveTexture,
  getLabelPosition,
  SPINE_COLOR_OPTIONS,
} from '@/lib/spine-colors';

interface BookSpineProps {
  book: Book;
  onClick?: () => void;
  index?: number;
  editMode?: boolean;
  onColorChange?: (color: string) => void;
}

export function BookSpine({
  book,
  onClick,
  index = 0,
  editMode = false,
  onColorChange,
}: BookSpineProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const spineColor = getBookSpineColor(book);
  const spineWidth = getSpineWidth(book);
  const spineHeight = getSpineHeight(book);
  const hasTexture = shouldHaveTexture(book.id);
  const labelPosition = getLabelPosition(book.id);

  const displayTitle =
    book.title.length > 20 ? book.title.slice(0, 18) + '…' : book.title;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.02,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={
        editMode
          ? undefined
          : {
              y: -6,
              transition: { duration: 0.15 },
            }
      }
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
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
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
        {hasTexture && (
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        <div
          className="absolute left-0 top-0 bottom-0 w-[1px]"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.2) 100%)',
          }}
        />

        <div
          className="absolute right-0 top-0 bottom-0 w-[2px]"
          style={{
            background: 'linear-gradient(270deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15), transparent)',
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background: 'rgba(255,255,255,0.1)',
          }}
        />

        {labelPosition === 'top' && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 w-[70%] h-2"
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)',
            }}
          />
        )}

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

      {book.recommended && (
        <div
          className="absolute -top-1 right-0 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white/80 shadow-sm z-10"
          title="おすすめ"
        />
      )}

      {editMode && (
        <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPaletteOpen((open) => !open);
            }}
            className="h-5 w-5 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: spineColor }}
            aria-label={`${book.title} の色を変更`}
          />
          {paletteOpen && (
            <div
              className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 grid grid-cols-4 gap-1 rounded-lg border border-border bg-background p-1.5 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {SPINE_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange?.(option.value);
                    setPaletteOpen(false);
                  }}
                  className={cn(
                    'h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110',
                    spineColor === option.value && 'ring-2 ring-zinc-950 ring-offset-1'
                  )}
                  style={{ backgroundColor: option.value }}
                  aria-label={option.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.button>
  );
}
