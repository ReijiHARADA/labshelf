import {
  loadBooksFromDatabase,
  loadCategoriesFromDatabase,
  mergeCategoryInDatabase,
} from '@/lib/books-db';
import { mergeCategoryInStore, setCustomCategories, updateBooks } from '@/lib/books-store';
import { deleteCategoryColorOverride } from '@/lib/spine-colors';

/** 手動追加の旧カテゴリ → 現行カテゴリ */
export const LEGACY_CATEGORY_MERGES: Record<string, string> = {
  その他: 'その他・未分類',
  色彩: '色彩・配色',
};

export async function consolidateLegacyCategories(): Promise<{
  merged: Array<{ from: string; to: string; movedBooks: number }>;
  categories: string[];
}> {
  const merged: Array<{ from: string; to: string; movedBooks: number }> = [];

  for (const [from, to] of Object.entries(LEGACY_CATEGORY_MERGES)) {
    const movedBooks = await mergeCategoryInDatabase(from, to);
    mergeCategoryInStore(from, to);
    deleteCategoryColorOverride(from);
    merged.push({ from, to, movedBooks });
  }

  const books = await loadBooksFromDatabase();
  const categories = await loadCategoriesFromDatabase();
  updateBooks(books);
  setCustomCategories(categories);

  return { merged, categories };
}
