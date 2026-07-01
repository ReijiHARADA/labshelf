'use client';

import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { getBookSpineColor } from '@/lib/spine-colors';
import {
  cacheCoverAspectRatio,
  getCoverAspectRatio,
  loadCoverAspectRatio,
  normalizeCoverUrl,
} from '@/lib/cover-aspect-ratio';
import { loadCoverDominantColor } from '@/lib/cover-dominant-color';

interface BookCoverProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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
  width,
  height,
}: BookCoverProps) {
  const coverSrc = normalizeCoverUrl(book.coverImageUrl);
  const [spineColor, setSpineColor] = useState(() => getBookSpineColor(book));
  const [imageError, setImageError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(() => getCoverAspectRatio(book));

  const hasExplicitWidth = width != null;
  const hasExplicitHeight = height != null;
  const hasExplicitSize = hasExplicitWidth || hasExplicitHeight;

  useEffect(() => {
    setImageError(false);
    setSpineColor(getBookSpineColor(book));
    setAspectRatio(getCoverAspectRatio(book));
    if (!coverSrc) return;
    void loadCoverAspectRatio(coverSrc).then(setAspectRatio);
    if (!book.spineColor?.trim()) {
      void loadCoverDominantColor(coverSrc).then((color) => {
        if (color) setSpineColor(color);
      });
    }
  }, [book.id, book.coverImageUrl, book.spineColor, book.category, coverSrc]);

  const sizeStyle = {
    ...(hasExplicitWidth ? { width: `${width}px` } : {}),
    ...(hasExplicitHeight ? { height: `${height}px` } : {}),
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth <= 0 || img.naturalHeight <= 0 || !coverSrc) return;

    const ratio = img.naturalWidth / img.naturalHeight;
    cacheCoverAspectRatio(coverSrc, ratio);
    setAspectRatio(ratio);
  };

  const imageClassName = cn(
    'block max-w-full rounded-none shadow-soft',
    hasExplicitHeight || hasExplicitWidth ? 'object-contain' : 'h-auto w-full'
  );

  const imageStyle = {
    ...(hasExplicitHeight ? { height: `${height}px`, width: 'auto' } : {}),
    ...(hasExplicitWidth && !hasExplicitHeight
      ? { width: `${width}px`, height: 'auto' }
      : {}),
    ...(hasExplicitWidth && hasExplicitHeight
      ? { maxWidth: `${width}px`, maxHeight: `${height}px` }
      : {}),
  };

  const wrapperClassName = cn(
    'relative inline-flex max-w-full',
    !hasExplicitSize && sizeClasses[size],
    hasExplicitHeight && 'items-end justify-center',
    className
  );

  const fallbackWidth =
    hasExplicitWidth
      ? width
      : hasExplicitHeight
        ? Math.round(height * aspectRatio)
        : undefined;

  const fallbackHeight =
    hasExplicitHeight
      ? height
      : hasExplicitWidth
        ? Math.round(width / aspectRatio)
        : undefined;

  const fallbackClassName = cn(
    'relative inline-flex max-w-full items-center justify-center overflow-hidden rounded-none shadow-soft p-3',
    !hasExplicitSize && sizeClasses[size],
    className
  );

  const fallbackStyle = {
    ...sizeStyle,
    ...(fallbackWidth != null ? { width: `${fallbackWidth}px` } : {}),
    ...(fallbackHeight != null ? { height: `${fallbackHeight}px` } : {}),
    ...(!hasExplicitSize ? { aspectRatio: `${aspectRatio}` } : {}),
    backgroundColor: spineColor,
  };

  if (coverSrc && !imageError) {
    return (
      <div className={wrapperClassName} style={sizeStyle}>
        <img
          src={coverSrc}
          alt={book.title}
          loading="lazy"
          decoding="async"
          className={imageClassName}
          style={imageStyle}
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
        />
        {book.borrowedBy && (
          <span className="absolute left-1.5 top-1.5 rounded bg-rose-600/90 px-1.5 py-0.5 text-[10px] text-white">
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
          'mb-2 text-white/30',
          size === 'lg' || hasExplicitSize ? 'h-10 w-10' : size === 'md' ? 'h-8 w-8' : 'h-6 w-6'
        )}
      />
      <p
        className={cn(
          'text-center font-medium leading-tight text-white/90',
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
        <span className="absolute left-1.5 top-1.5 rounded bg-rose-600/90 px-1.5 py-0.5 text-[10px] text-white">
          貸出中
        </span>
      )}
    </div>
  );
}
