'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, BookmarkPlus, Clock, BookOpen, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookCover } from '@/components/bookshelf';
import type { Book } from '@/types/book';

export default function MyPage() {
  const [favorites, setFavorites] = useState<string[]>(['1', '4', '10', '17']);
  const [wantToRead, setWantToRead] = useState<string[]>(['2', '7', '23']);
  const [recentlyViewed] = useState<string[]>(['1', '2', '3', '4', '5', '6', '7', '8']);
  const [allBooks, setAllBooks] = useState<Book[]>([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await fetch('/api/books?limit=1000', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        setAllBooks(Array.isArray(data.books) ? data.books : []);
      } catch {
        setAllBooks([]);
      }
    };

    fetchBooks();
  }, []);

  const favoriteBooks = allBooks.filter((book) => favorites.includes(book.id));
  const wantToReadBooks = allBooks.filter((book) => wantToRead.includes(book.id));
  const recentBooks = allBooks.filter((book) => recentlyViewed.includes(book.id));

  const removeFromFavorites = (bookId: string) => {
    setFavorites((prev) => prev.filter((id) => id !== bookId));
  };

  const removeFromWantToRead = (bookId: string) => {
    setWantToRead((prev) => prev.filter((id) => id !== bookId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">マイページ</h1>
          <p className="mt-2 text-muted-foreground">
            お気に入りや読みたい本を管理できます
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="favorites" className="gap-2 py-2.5">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">お気に入り</span>
              <span className="text-xs text-muted-foreground">
                ({favoriteBooks.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="want-to-read" className="gap-2 py-2.5">
              <BookmarkPlus className="h-4 w-4" />
              <span className="hidden sm:inline">読みたい本</span>
              <span className="text-xs text-muted-foreground">
                ({wantToReadBooks.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 py-2.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">閲覧履歴</span>
              <span className="text-xs text-muted-foreground">
                ({recentBooks.length})
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Favorites */}
          <TabsContent value="favorites">
            {favoriteBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoriteBooks.map((book, index) => (
                  <BookListItem
                    key={book.id}
                    book={book}
                    index={index}
                    onRemove={() => removeFromFavorites(book.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Heart}
                title="お気に入りがありません"
                description="本の詳細ページからお気に入りに追加できます"
              />
            )}
          </TabsContent>

          {/* Want to read */}
          <TabsContent value="want-to-read">
            {wantToReadBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {wantToReadBooks.map((book, index) => (
                  <BookListItem
                    key={book.id}
                    book={book}
                    index={index}
                    onRemove={() => removeFromWantToRead(book.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookmarkPlus}
                title="読みたい本がありません"
                description="本の詳細ページから読みたい本に追加できます"
              />
            )}
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            {recentBooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recentBooks.map((book, index) => (
                  <BookListItem key={book.id} book={book} index={index} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="閲覧履歴がありません"
                description="本を閲覧すると履歴が表示されます"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface BookListItemProps {
  book: Book;
  index: number;
  onRemove?: () => void;
}

function BookListItem({ book, index, onRemove }: BookListItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Link href={`/books/${book.id}`}>
              <BookCover book={book} size="sm" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/books/${book.id}`}>
                <h3 className="font-medium line-clamp-1 hover:text-primary transition-colors">
                  {book.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {book.author}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {book.category}
              </p>
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
      <Button asChild>
        <Link href="/browse">
          <BookOpen className="h-4 w-4 mr-2" />
          本を探す
        </Link>
      </Button>
    </div>
  );
}
