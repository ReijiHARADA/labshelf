'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Grid3X3, Layers } from 'lucide-react';
import { VirtualBookshelf } from '@/components/bookshelf';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';

interface BookshelfSectionProps {
  allBooks: Book[];
  recommendedBooks: Book[];
  latestBooks: Book[];
  categories: string[];
}

type ViewMode = 'all' | 'recommended' | 'latest' | 'category';

const viewModes = [
  { id: 'all' as const, label: 'すべて', icon: Grid3X3 },
  { id: 'recommended' as const, label: 'おすすめ', icon: Sparkles },
  { id: 'latest' as const, label: '新着', icon: Clock },
  { id: 'category' as const, label: 'カテゴリ', icon: Layers },
];

export function BookshelfSection({
  allBooks,
  recommendedBooks,
  latestBooks,
  categories,
}: BookshelfSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');

  const getDisplayBooks = () => {
    switch (viewMode) {
      case 'recommended':
        return recommendedBooks;
      case 'latest':
        return latestBooks;
      case 'category':
        return allBooks.filter((book) => book.category === selectedCategory);
      default:
        return allBooks;
    }
  };

  const displayBooks = getDisplayBooks();

  return (
    <section className="pt-4 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {viewModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    viewMode === mode.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}

            {/* Category sub-filter */}
            {viewMode === 'category' && (
              <>
                <div className="w-px h-5 bg-border mx-1" />
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm transition-all',
                      selectedCategory === category
                        ? 'bg-secondary text-secondary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bookshelf */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <VirtualBookshelf
            books={displayBooks}
            maxRows={5}
            maxBooksPerRow={18}
          />
        </motion.div>

        {/* Book count - subtle */}
        <p className="text-xs text-muted-foreground mt-4">
          {displayBooks.length}冊
        </p>
      </div>
    </section>
  );
}
