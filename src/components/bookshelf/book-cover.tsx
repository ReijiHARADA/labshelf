'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { getSpineColor } from '@/lib/spine-colors';

interface BookCoverProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-24',
  md: 'w-24 h-36',
  lg: 'w-32 h-48',
};

export function BookCover({
  book,
  size = 'md',
  className,
}: BookCoverProps) {
  const spineColor = getSpineColor(book.category, book.id);
  const [imageError, setImageError] = useState(false);
  const coverSrc = book.coverImageUrl?.replace(/^http:\/\//, 'https://');

  if (coverSrc && !imageError) {
    return (
      <div
        className={cn(
          'relative overflow-hidden shadow-soft',
          sizeClasses[size],
          className
        )}
      >
        <img
          src={coverSrc}
          alt={book.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
        {book.borrowedBy && (
          <span className="absolute left-1.5 top-1.5 bg-rose-600/90 text-white text-[10px] px-1.5 py-0.5">
            貸出中
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden shadow-soft flex flex-col items-center justify-center p-3',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: spineColor,
      }}
    >
      <BookOpen
        className={cn(
          'text-white/30 mb-2',
          size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
        )}
      />
      <p
        className={cn(
          'text-white/90 text-center font-medium leading-tight',
          size === 'lg' ? 'text-xs' : 'text-[10px]'
        )}
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {book.title}
      </p>
      {book.borrowedBy && (
        <span className="absolute left-1.5 top-1.5 bg-rose-600/90 text-white text-[10px] px-1.5 py-0.5">
          貸出中
        </span>
      )}
    </div>
  );
}
