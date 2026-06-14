import type { Book } from '@/types/book';
import { applyAutoClassification } from '@/lib/book-classifier';
import { loadBooksFromDatabase, upsertBooksToDatabase } from '@/lib/books-db';
import { updateBooks } from '@/lib/books-store';

function countByCategory(books: Book[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const book of books) {
    const key = book.category?.trim() || 'その他・未分類';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export async function reclassifyAllBooks(): Promise<{
  updated: number;
  categories: Record<string, number>;
  unclassified: number;
}> {
  const books = await loadBooksFromDatabase();

  const reclassified = books.map((book) => {
    const next = applyAutoClassification(book, {
      forceCategory: true,
      clearTags: true,
      preserveManualCategory: false,
    });

    return {
      ...next,
      updatedAt: new Date().toISOString(),
    };
  });

  if (reclassified.length > 0) {
    await upsertBooksToDatabase(reclassified);
    updateBooks(reclassified);
  }

  return {
    updated: reclassified.length,
    categories: countByCategory(reclassified),
    unclassified: reclassified.filter((book) => book.category === 'その他・未分類').length,
  };
}
