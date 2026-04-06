'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { getSpineColor } from '@/lib/spine-colors';

interface BookCoverProps {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  imageSizes?: string;
}

const sizeClasses = {
  sm: 'w-16 h-24',
  md: 'w-24 h-36',
  lg: 'w-32 h-48',
};

export function BookCover({ book, size = 'md', className, imageSizes }: BookCoverProps) {
  const spineColor = getSpineColor(book.category, book.id);
  const [imageError, setImageError] = useState(false);

  if (book.coverImageUrl && !imageError) {
    return (
      <div
        className={cn(
          'relative rounded-md overflow-hidden shadow-soft',
          sizeClasses[size],
          className
        )}
      >
        <Image
          src={book.coverImageUrl}
          alt={book.title}
          fill
          className="object-cover"
          sizes={imageSizes || (size === 'lg' ? '200px' : size === 'md' ? '120px' : '80px')}
          quality={90}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-md overflow-hidden shadow-soft flex flex-col items-center justify-center p-3',
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
    </div>
  );
}
