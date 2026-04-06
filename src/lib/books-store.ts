import type { Book, SyncStatus, SyncLog } from '@/types/book';

let cachedBooks: Book[] = [];
let customCategories: string[] = [];
let syncStatus: SyncStatus = {
  lastSyncAt: '',
  status: 'idle',
  bookCount: 0,
};
let syncLogs: SyncLog[] = [];

export function getBooks(): Book[] {
  return cachedBooks;
}

export function getBookById(id: string): Book | undefined {
  return cachedBooks.find((book) => book.id === id);
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function getSyncLogs(): SyncLog[] {
  return syncLogs;
}

export function updateBooks(books: Book[]): void {
  cachedBooks = books;
}

export function updateSyncStatus(status: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...status };
}

export function addSyncLog(log: SyncLog): void {
  syncLogs = [log, ...syncLogs].slice(0, 100);
}

export function searchBooks(query: string): Book[] {
  if (!query.trim()) return cachedBooks;
  
  const lowerQuery = query.toLowerCase();
  return cachedBooks.filter(
    (book) =>
      book.title.toLowerCase().includes(lowerQuery) ||
      book.author.toLowerCase().includes(lowerQuery) ||
      book.isbn.includes(query) ||
      book.publisher.toLowerCase().includes(lowerQuery) ||
      book.category.toLowerCase().includes(lowerQuery) ||
      book.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
      book.description?.toLowerCase().includes(lowerQuery)
  );
}

export function filterBooks(options: {
  category?: string;
  tags?: string[];
  recommended?: boolean;
  latest?: boolean;
  author?: string;
  publishedYear?: number;
}): Book[] {
  let filtered = cachedBooks;

  if (options.category) {
    filtered = filtered.filter((book) => book.category === options.category);
  }

  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter((book) =>
      options.tags!.some((tag) => book.tags.includes(tag))
    );
  }

  if (options.recommended) {
    filtered = filtered.filter((book) => book.recommended);
  }

  if (options.latest) {
    filtered = filtered.filter((book) => book.latestFlag);
  }

  if (options.author) {
    filtered = filtered.filter((book) =>
      book.author.toLowerCase().includes(options.author!.toLowerCase())
    );
  }

  if (options.publishedYear) {
    filtered = filtered.filter(
      (book) => book.publishedYear === options.publishedYear
    );
  }

  return filtered;
}

export function sortBooks(
  books: Book[],
  sortBy: 'latest' | 'title' | 'author' | 'popular' | 'year'
): Book[] {
  const sorted = [...books];

  switch (sortBy) {
    case 'latest':
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

export function getAllCategories(): string[] {
  const categories = [
    ...cachedBooks.map((book) => book.category),
    ...customCategories,
  ].filter(Boolean);
  return [...new Set(categories)];
}

export function addCategory(category: string): { success: boolean; message: string } {
  const normalized = category.trim();
  if (!normalized) {
    return { success: false, message: 'カテゴリ名が空です' };
  }
  const exists = getAllCategories().some((c) => c === normalized);
  if (exists) {
    return { success: false, message: '同じカテゴリが既に存在します' };
  }
  customCategories = [...customCategories, normalized];
  return { success: true, message: 'カテゴリを追加しました' };
}

export function getAllTags(): string[] {
  const tags = cachedBooks.flatMap((book) => book.tags);
  return [...new Set(tags)];
}

export function getAllAuthors(): string[] {
  return [...new Set(cachedBooks.map((book) => book.author))];
}

export function getRecommendedBooks(): Book[] {
  return cachedBooks.filter((book) => book.recommended);
}

export function getLatestBooks(): Book[] {
  return cachedBooks.filter((book) => book.latestFlag);
}

export function getPopularBooks(limit = 10): Book[] {
  return [...cachedBooks]
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);
}

export function getRelatedBooks(book: Book, limit = 6): Book[] {
  const related = cachedBooks.filter(
    (b) =>
      b.id !== book.id &&
      (b.category === book.category ||
        b.tags.some((tag) => book.tags.includes(tag)))
  );

  return related
    .sort((a, b) => {
      const aScore =
        (a.category === book.category ? 2 : 0) +
        a.tags.filter((tag) => book.tags.includes(tag)).length;
      const bScore =
        (b.category === book.category ? 2 : 0) +
        b.tags.filter((tag) => book.tags.includes(tag)).length;
      return bScore - aScore;
    })
    .slice(0, limit);
}
