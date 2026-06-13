import type { Book } from '@/types/book';

export function isManualCoverUrl(url?: string): boolean {
  if (!url?.trim()) return false;
  const bucket = process.env.SUPABASE_BOOK_COVERS_BUCKET || 'book-covers';
  const normalized = url.trim().toLowerCase();
  return (
    normalized.includes('/storage/v1/object/public/') &&
    normalized.includes(`/${bucket.toLowerCase()}/`)
  );
}

export function resolveCoverImageUrl(
  synced: string | undefined,
  existing: string | undefined,
  sheetHasCoverUrl: boolean
): string | undefined {
  if (sheetHasCoverUrl) {
    return synced?.trim() || undefined;
  }
  if (isManualCoverUrl(existing)) {
    return existing;
  }
  return synced?.trim() || existing?.trim() || undefined;
}

export function mergeSyncedBookWithExisting(
  synced: Book,
  existing: Book | undefined,
  options: { sheetHasCoverUrl?: boolean } = {}
): Book {
  if (!existing) return synced;

  const sheetHasCoverUrl = options.sheetHasCoverUrl ?? false;

  return {
    ...synced,
    coverImageUrl: resolveCoverImageUrl(
      synced.coverImageUrl,
      existing.coverImageUrl,
      sheetHasCoverUrl
    ),
    shelfOrder: existing.shelfOrder ?? synced.shelfOrder,
    spineColor: existing.spineColor ?? synced.spineColor,
    borrowedBy: existing.borrowedBy,
    borrowedAt: existing.borrowedAt,
    dueDate: existing.dueDate,
    loanMemo: existing.loanMemo,
    dimensions:
      existing.dimensions?.manual && !synced.dimensions?.manual
        ? existing.dimensions
        : (synced.dimensions ?? existing.dimensions),
    createdAt: existing.createdAt || synced.createdAt,
  };
}

export function buildExistingBookMaps(books: Book[]): {
  byId: Map<string, Book>;
  byIsbn: Map<string, Book>;
} {
  const byId = new Map<string, Book>();
  const byIsbn = new Map<string, Book>();
  for (const book of books) {
    byId.set(book.id, book);
    byIsbn.set(book.isbn, book);
  }
  return { byId, byIsbn };
}

export function findExistingBook(
  synced: Book,
  maps: { byId: Map<string, Book>; byIsbn: Map<string, Book> }
): Book | undefined {
  return maps.byId.get(synced.id) ?? maps.byIsbn.get(synced.isbn);
}

export function mergeSyncedBooksWithExisting(
  syncedBooks: Book[],
  existingBooks: Book[],
  sheetCoverByBookId: Map<string, boolean> = new Map()
): Book[] {
  const maps = buildExistingBookMaps(existingBooks);
  return syncedBooks.map((synced) => {
    const existing = findExistingBook(synced, maps);
    return mergeSyncedBookWithExisting(synced, existing, {
      sheetHasCoverUrl: sheetCoverByBookId.get(synced.id) ?? false,
    });
  });
}
