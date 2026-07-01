'use client';

import { useState } from 'react';
import { Sparkles, Clock, Grid3X3, Layers } from 'lucide-react';
import { CoverFlowBookshelf } from '@/components/bookshelf/cover-flow-bookshelf';
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

  const displayBooks = (() => {
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
  })();

  return (
    <section className="pt-4 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* フィルタータブ */}
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

            {/* カテゴリサブフィルター */}
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

        {/* 3Dカルーセル — 画面幅いっぱい、左右端で見切れ */}
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden">
          <CoverFlowBookshelf books={displayBooks} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{displayBooks.length}冊</p>
      </div>
    </section>
  );
}
