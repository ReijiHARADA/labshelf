'use client';

import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { BookCover } from '@/components/bookshelf';
import { Button } from '@/components/ui/button';
import type { Book } from '@/types/book';

const VISIBLE_COUNT = 12;

interface BookshelfSectionProps {
  allBooks: Book[];
  recommendedBooks: Book[];
  latestBooks: Book[];
  categories: string[];
}

export function BookshelfSection({ latestBooks, allBooks }: BookshelfSectionProps) {
  // 新着フラグが少ない場合は更新日の新しい本で補完
  const source =
    latestBooks.length > 0
      ? latestBooks
      : [...allBooks].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime()
        );

  const books = source.slice(0, VISIBLE_COUNT);

  if (books.length === 0) {
    return (
      <section className="pt-6 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">表示できる本がありません</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-6 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                新着の本
              </h2>
              <p className="text-sm text-muted-foreground">
                最近追加・更新された蔵書
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link href="/browse?filter=latest">
              すべて見る
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible md:grid-cols-6 lg:grid-cols-6">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="group flex w-[112px] shrink-0 flex-col gap-2 sm:w-auto"
            >
              <div className="flex min-h-[168px] items-end justify-center transition-transform duration-200 group-hover:-translate-y-1">
                <BookCover book={book} height={168} className="max-w-full" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">
                  {book.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {book.author}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
