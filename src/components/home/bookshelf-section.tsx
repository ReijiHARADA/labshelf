'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Clock, Grid3X3, Layers, Search } from 'lucide-react';
import { VirtualBookshelf } from '@/components/bookshelf';
import { Input } from '@/components/ui/input';
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
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
        {/* Toolbar - Filters left, Search right */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Filters - Left */}
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

          {/* Search - Right */}
          <form onSubmit={handleSearch} className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 pl-9 pr-3 text-sm rounded-lg border-border/50 bg-white/80"
            />
          </form>
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
