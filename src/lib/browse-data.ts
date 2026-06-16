import type { Book } from '@/types/book';

export interface BrowseBooksData {
  books: Book[];
  categories: string[];
  tags: string[];
}

export async function fetchBrowseBooks(): Promise<BrowseBooksData> {
  const res = await fetch('/api/books?limit=1000');
  if (!res.ok) {
    throw new Error('Failed to fetch books');
  }

  const data = await res.json();
  return {
    books: Array.isArray(data.books) ? data.books : [],
    categories: Array.isArray(data?.meta?.categories) ? data.meta.categories : [],
    tags: Array.isArray(data?.meta?.tags) ? data.meta.tags : [],
  };
}

export async function fetchCategoryColors(): Promise<Record<string, string>> {
  const res = await fetch('/api/categories');
  if (!res.ok) {
    return {};
  }

  const data = await res.json();
  return typeof data?.colors === 'object' && data.colors ? data.colors : {};
}
