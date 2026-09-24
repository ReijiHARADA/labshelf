'use client';

import Link from 'next/link';
import { BookCover } from '@/components/bookshelf';
import type { Book } from '@/types/book';

const VISIBLE_COUNT = 10;
const COVER_HEIGHT = 320;

interface BookshelfSectionProps {
  allBooks: Book[];
  recommendedBooks: Book[];
  latestBooks: Book[];
  categories: string[];
}

export function BookshelfSection({ latestBooks, allBooks }: BookshelfSectionProps) {
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
    return null;
  }

  return (
    <section className="pt-4 pb-8 sm:pt-6 sm:pb-12">
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <div className="flex items-end justify-start gap-5 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:thin] sm:gap-6 sm:px-8 md:justify-center md:overflow-x-auto">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              aria-label={book.title}
              className="group shrink-0 transition-transform duration-200 hover:-translate-y-1.5"
            >
              <BookCover
                book={book}
                height={COVER_HEIGHT}
                className="shadow-md transition-shadow duration-200 group-hover:shadow-lg"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
