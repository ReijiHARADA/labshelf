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
  editMode?: boolean;
  onCycleOrientation?: () => void;
}

export function BookSpine({
  book,
  onClick,
  index = 0,
  editMode = false,
  onCycleOrientation,
}: BookSpineProps) {
  const spineColor = getSpineColor(book.category, book.id);
  const spineWidth = getSpineWidth(book);
  const spineHeight = getSpineHeight(book);
  const hasTexture = shouldHaveTexture(book.id);
  const labelPosition = getLabelPosition(book.id);

  const displayTitle = book.title.length > 20 
    ? book.title.slice(0, 18) + '…' 
    : book.title;

  const orientation = book.shelfOrientation ?? 'vertical';
  const isCover = orientation === 'cover';
  const isHorizontal = orientation === 'horizontal';
  const visualWidth = isCover
    ? Math.max(spineHeight * 0.66, 56)
    : isHorizontal
      ? spineHeight
      : spineWidth;
  const visualHeight = isHorizontal ? spineWidth : spineHeight;

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
        width: `${visualWidth}px`,
        height: `${visualHeight}px`,
      }}
      aria-label={`${book.title} - ${book.author}`}
    >
      {isCover ? (
        <div className="absolute inset-0 overflow-hidden border border-black/10 bg-white">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground px-1">
              {displayTitle}
            </div>
          )}
        </div>
      ) : isHorizontal ? (
        <div
          className="absolute inset-0 rounded-[2px] overflow-hidden"
          style={{
            backgroundColor: spineColor,
            boxShadow: `
              inset 0 2px 4px rgba(0,0,0,0.18),
              inset 0 -2px 4px rgba(0,0,0,0.14),
              inset 2px 0 3px rgba(255,255,255,0.08),
              inset -2px 0 3px rgba(255,255,255,0.08)
            `,
          }}
        >
          {hasTexture && (
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          )}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.2), transparent)' }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-3">
            <p
              className="font-medium whitespace-nowrap"
              style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.94)',
                textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                letterSpacing: '0.015em',
                transform: 'rotate(90deg)',
                transformOrigin: 'center',
              }}
            >
              {displayTitle}
            </p>
          </div>
        </div>
      ) : (
        <>
      {/* Main spine body */}
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
      </>
      )}
      {editMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCycleOrientation?.();
          }}
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-white"
        >
          {orientation === 'vertical' ? '縦' : orientation === 'horizontal' ? '横' : '表紙'}
        </button>
      )}
    </motion.button>
  );
}
