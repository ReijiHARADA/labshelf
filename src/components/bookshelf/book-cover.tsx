'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { getBookSpineColor } from '@/lib/spine-colors';
import {
  cacheCoverAspectRatio,
  getCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';

interface BookCoverProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fit?: 'cover' | 'contain';
  width?: number;
  height?: number;
}

const sizeClasses = {
  sm: 'w-16',
  md: 'w-24',
  lg: 'w-32',
};

export function BookCover({
  book,
  size = 'md',
  className,
  fit = 'contain',
  width,
  height,
}: BookCoverProps) {
  const spineColor = getBookSpineColor(book);
  const [imageError, setImageError] = useState(false);
  const coverSrc = normalizeCoverUrl(book.coverImageUrl);
  const [aspectRatio, setAspectRatio] = useState(() => getCoverAspectRatio(book));
  const hasExplicitSize = width != null && height != null;

  useEffect(() => {
    setAspectRatio(getCoverAspectRatio(book));
    setImageError(false);
  }, [book.id, book.coverImageUrl]);

  const containerStyle = hasExplicitSize
    ? { width: `${width}px`, height: `${height}px` }
    : undefined;

  const containerClassName = cn(
    'relative overflow-hidden shadow-soft',
    !hasExplicitSize && sizeClasses[size],
    !hasExplicitSize && fit === 'contain' && 'h-auto',
    className
  );

  const fallbackClassName = cn(
    'relative overflow-hidden shadow-soft flex flex-col items-center justify-center p-3',
    !hasExplicitSize && sizeClasses[size],
    className
  );

  const fallbackStyle = hasExplicitSize
    ? containerStyle
    : {
        aspectRatio: `${aspectRatio}`,
        backgroundColor: spineColor,
      };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0 || !coverSrc) return;

    const ratio = img.naturalWidth / img.naturalHeight;
    cacheCoverAspectRatio(coverSrc, ratio);
    if (!hasExplicitSize) {
      setAspectRatio(ratio);
    }
  };

  if (coverSrc && !imageError) {
    return (
      <div
        className={containerClassName}
        style={{
          ...containerStyle,
          ...(!hasExplicitSize
            ? { aspectRatio: `${aspectRatio}`, backgroundColor: spineColor }
            : { backgroundColor: spineColor }),
        }}
      >
        <img
          src={coverSrc}
          alt={book.title}
          loading="lazy"
          decoding="async"
          className={cn(
            'block h-full w-full',
            fit === 'contain' ? 'object-contain' : 'object-cover'
          )}
          onLoad={handleImageLoad}
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
    <div className={fallbackClassName} style={fallbackStyle}>
      <BookOpen
        className={cn(
          'text-white/30 mb-2',
          size === 'lg' || hasExplicitSize ? 'w-10 h-10' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6'
        )}
      />
      <p
        className={cn(
          'text-white/90 text-center font-medium leading-tight',
          size === 'lg' || hasExplicitSize ? 'text-xs' : 'text-[10px]'
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
