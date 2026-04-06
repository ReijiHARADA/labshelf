'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  BookOpen,
  X,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VirtualBookshelf, BookCover } from '@/components/bookshelf';
import { BookDetailDrawer } from '@/components/bookshelf/book-detail-drawer';
import { Card, CardContent } from '@/components/ui/card';
import { CategoryManageDialog } from '@/components/categories/category-manage-dialog';
import type { Book, SortOption } from '@/types/book';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list' | 'shelf';

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'latest', label: '新着順' },
  { value: 'title', label: 'タイトル順' },
  { value: 'author', label: '著者順' },
  { value: 'popular', label: '人気順' },
  { value: 'year', label: '出版年順' },
];

function sortBooks(books: Book[], sortBy: SortOption): Book[] {
  const sorted = [...books];
  switch (sortBy) {
    case 'latest':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    case 'author':
      return sorted.sort((a, b) => a.author.localeCompare(b.author, 'ja'));
    case 'popular':
      return sorted.sort((a, b) => b.popularityScore - a.popularityScore);
    case 'year':
      return sorted.sort((a, b) => b.publishedYear - a.publishedYear);
    default:
      return sorted;
  }
}

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || ''
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'latest'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const [booksRes, categoriesRes] = await Promise.all([
          fetch('/api/books?limit=1000', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ]);
        if (!booksRes.ok) return;
        const data = await booksRes.json();
        setAllBooks(Array.isArray(data.books) ? data.books : []);
        setCategories(Array.isArray(data?.meta?.categories) ? data.meta.categories : []);
        setTags(Array.isArray(data?.meta?.tags) ? data.meta.tags : []);
        if (categoriesRes.ok) {
          const categoryData = await categoriesRes.json();
          setCategoryColors(
            typeof categoryData?.colors === 'object' && categoryData.colors
              ? categoryData.colors
              : {}
          );
        }
      } catch {
        setAllBooks([]);
        setCategories([]);
        setCategoryColors({});
        setTags([]);
      }
    };

    fetchBooks();
  }, []);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter === 'recommended') {
      setSelectedTags([]);
    } else if (filter === 'latest') {
      setSelectedTags([]);
    }
  }, [searchParams]);

  const filteredBooks = useMemo(() => {
    let books = allBooks;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerQuery) ||
          book.author.toLowerCase().includes(lowerQuery) ||
          book.isbn.includes(searchQuery) ||
          book.publisher.toLowerCase().includes(lowerQuery) ||
          book.category.toLowerCase().includes(lowerQuery) ||
          book.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
          book.description?.toLowerCase().includes(lowerQuery)
      );
    }

    const filter = searchParams.get('filter');
    if (filter === 'recommended') {
      books = books.filter((book) => book.recommended);
    } else if (filter === 'latest') {
      books = books.filter((book) => book.latestFlag);
    }

    if (selectedCategory) {
      books = books.filter((book) => book.category === selectedCategory);
    }

    if (selectedTags.length > 0) {
      books = books.filter((book) =>
        selectedTags.some((tag) => book.tags.includes(tag))
      );
    }

    return sortBooks(books, sortBy);
  }, [allBooks, searchQuery, selectedCategory, selectedTags, sortBy, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sortBy !== 'latest') params.set('sort', sortBy);
    router.push(`/browse?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedTags([]);
    setSortBy('latest');
    router.push('/browse');
  };

  const hasActiveFilters =
    searchQuery || selectedCategory || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">
              {selectedCategory || '一覧'}
            </h1>
            {selectedCategory && (
              <CategoryManageDialog
                category={selectedCategory}
                categoryColor={categoryColors[selectedCategory]}
                onRenamed={(oldName, newName) => {
                  setAllBooks((prev) =>
                    prev.map((book) =>
                      book.category === oldName ? { ...book, category: newName } : book
                    )
                  );
                  setCategories((prev) =>
                    [...new Set(prev.map((c) => (c === oldName ? newName : c)))]
                  );
                  setCategoryColors((prev) => {
                    const next = { ...prev };
                    const oldColor = next[oldName];
                    delete next[oldName];
                    if (oldColor) next[newName] = oldColor;
                    return next;
                  });
                  setSelectedCategory(newName);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('category', newName);
                  router.push(`/browse?${params.toString()}`);
                }}
                onDeleted={(name, fallbackCategory) => {
                  setAllBooks((prev) =>
                    prev.map((book) =>
                      book.category === name
                        ? { ...book, category: fallbackCategory }
                        : book
                    )
                  );
                  setCategories((prev) =>
                    [...new Set(prev.filter((c) => c !== name).concat(fallbackCategory))]
                  );
                  setCategoryColors((prev) => {
                    const next = { ...prev };
                    delete next[name];
                    return next;
                  });
                  setSelectedCategory(fallbackCategory);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('category', fallbackCategory);
                  router.push(`/browse?${params.toString()}`);
                }}
              />
            )}
          </div>
          <p className="mt-2 text-muted-foreground">
            {filteredBooks.length}冊の本が見つかりました
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="タイトル、著者、ISBN、タグで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Button type="submit" className="h-11 px-6">
              検索
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              フィルター
              <ChevronDown
                className={cn(
                  'h-4 w-4 ml-2 transition-transform',
                  showFilters && 'rotate-180'
                )}
              />
            </Button>
          </form>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                  {/* Category filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      カテゴリ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm transition-colors',
                          !selectedCategory
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-accent border border-border/50'
                        )}
                      >
                        すべて
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm transition-colors',
                            selectedCategory === category
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background hover:bg-accent border border-border/50'
                          )}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      タグ
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 15).map((tag) => (
                        <button
                          key={tag}
                          onClick={() =>
                            setSelectedTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag]
                            )
                          }
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm transition-colors',
                            selectedTags.includes(tag)
                              ? 'bg-secondary text-secondary-foreground'
                              : 'bg-background hover:bg-accent border border-border/50'
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-muted-foreground"
                      >
                        <X className="h-4 w-4 mr-1" />
                        フィルターをクリア
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">絞り込み:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  検索: {searchQuery}
                  <button onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('')}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() =>
                      setSelectedTags((prev) => prev.filter((t) => t !== tag))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
              aria-label="グリッド表示"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
              aria-label="リスト表示"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('shelf')}
              className={cn(
                'p-2 rounded-md transition-colors',
                viewMode === 'shelf'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              )}
              aria-label="本棚表示"
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {viewMode === 'shelf' ? (
            <motion.div
              key="shelf"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <VirtualBookshelf books={filteredBooks} maxRows={10} />
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-soft transition-shadow"
                    onClick={() => setSelectedBook(book)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <BookCover book={book} size="sm" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-1">
                            {book.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {book.author}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {book.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {book.publishedYear}年
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="cursor-pointer group"
                  onClick={() => setSelectedBook(book)}
                >
                  <div className="aspect-[2/3] mb-2">
                    <BookCover book={book} size="lg" className="w-full h-full" />
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {book.author}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {filteredBooks.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">本が見つかりませんでした</h3>
            <p className="text-muted-foreground mb-4">
              検索条件を変更してお試しください
            </p>
            <Button variant="outline" onClick={clearFilters}>
              フィルターをクリア
            </Button>
          </div>
        )}
      </div>

      {/* Book detail drawer */}
      <BookDetailDrawer
        book={selectedBook}
        open={!!selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
