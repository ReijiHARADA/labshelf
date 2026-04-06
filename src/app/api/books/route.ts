import { NextRequest, NextResponse } from 'next/server';
import {
  getBooks,
  searchBooks,
  filterBooks,
  sortBooks,
  getAllCategories,
  getAllTags,
  getAllAuthors,
} from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import type { SortOption } from '@/types/book';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  await ensureBooksLoaded();
  const searchParams = request.nextUrl.searchParams;
  
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const tags = searchParams.get('tags')?.split(',').filter(Boolean) || undefined;
  const recommended = searchParams.get('recommended') === 'true' || undefined;
  const latest = searchParams.get('latest') === 'true' || undefined;
  const author = searchParams.get('author') || undefined;
  const publishedYear = searchParams.get('year')
    ? parseInt(searchParams.get('year')!, 10)
    : undefined;
  const sort = (searchParams.get('sort') as SortOption) || 'latest';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let books = query ? searchBooks(query) : getBooks();

  if (category || tags || recommended || latest || author || publishedYear) {
    books = filterBooks({
      category,
      tags,
      recommended,
      latest,
      author,
      publishedYear,
    });

    if (query) {
      const lowerQuery = query.toLowerCase();
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerQuery) ||
          book.author.toLowerCase().includes(lowerQuery) ||
          book.isbn.includes(query)
      );
    }
  }

  books = sortBooks(books, sort);

  const total = books.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedBooks = books.slice(offset, offset + limit);

  return NextResponse.json({
    books: paginatedBooks,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    meta: {
      categories: getAllCategories(),
      tags: getAllTags(),
      authors: getAllAuthors(),
    },
  });
}
