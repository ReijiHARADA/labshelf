import type { Book } from '@/types/book';
import { getSupabaseAdmin } from './supabase';

type DbBookRow = {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  author: string;
  publisher: string;
  published_year: number;
  category: string;
  tags: string[] | null;
  description: string | null;
  toc: string | null;
  cover_image_url: string | null;
  recommended: boolean;
  latest_flag: boolean;
  popularity_score: number;
  created_at: string;
  updated_at: string;
  memo: string | null;
};

function isMissingColorColumnError(errorMessage: string): boolean {
  return (
    errorMessage.includes("Could not find the 'color' column") ||
    errorMessage.includes('column "color" does not exist')
  );
}

function toDbRow(book: Book): DbBookRow {
  return {
    id: book.id,
    isbn: book.isbn,
    title: book.title,
    subtitle: book.subtitle ?? null,
    author: book.author,
    publisher: book.publisher,
    published_year: book.publishedYear,
    category: book.category,
    tags: book.tags,
    description: book.description ?? null,
    toc: book.toc ?? null,
    cover_image_url: book.coverImageUrl ?? null,
    recommended: book.recommended,
    latest_flag: book.latestFlag,
    popularity_score: book.popularityScore,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
    memo: book.memo ?? null,
  };
}

function fromDbRow(row: DbBookRow): Book {
  return {
    id: row.id,
    isbn: row.isbn,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    author: row.author,
    publisher: row.publisher,
    publishedYear: row.published_year,
    category: row.category,
    tags: row.tags ?? [],
    description: row.description ?? undefined,
    toc: row.toc ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
    recommended: row.recommended,
    latestFlag: row.latest_flag,
    popularityScore: row.popularity_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memo: row.memo ?? undefined,
  };
}

export async function upsertBooksToDatabase(books: Book[]): Promise<void> {
  if (books.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const rows = books.map(toDbRow);
  const { error } = await supabase.from('books').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(`DB保存に失敗しました: ${error.message}`);
}

export async function findExistingIsbns(isbns: string[]): Promise<Set<string>> {
  const normalized = [...new Set(isbns.map((v) => v.trim()).filter(Boolean))];
  if (normalized.length === 0) return new Set();

  const supabase = getSupabaseAdmin();
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('books')
    .select('isbn')
    .in('isbn', normalized);

  if (error) throw new Error(`DB照会に失敗しました: ${error.message}`);

  const out = new Set<string>();
  for (const row of data ?? []) {
    const isbn = (row as { isbn?: string }).isbn;
    if (isbn) out.add(isbn);
  }
  return out;
}

export async function loadBooksFromDatabase(): Promise<Book[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`DB読込に失敗しました: ${error.message}`);
  return (data ?? []).map((row) => fromDbRow(row as DbBookRow));
}

export async function addCategoryToDatabase(
  category: string,
  color?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const row: { name: string; created_at: string; color?: string | null } = {
    name: category,
    created_at: new Date().toISOString(),
  };
  if (color !== undefined) {
    row.color = color;
  }

  const { error } = await supabase.from('categories').upsert(row, {
    onConflict: 'name',
  });
  if (!error) return;

  if (row.color !== undefined && isMissingColorColumnError(error.message)) {
    const { error: retryError } = await supabase
      .from('categories')
      .upsert(
        {
          name: category,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'name' }
      );
    if (!retryError) return;
    throw new Error(`カテゴリ保存に失敗しました: ${retryError.message}`);
  }

  throw new Error(`カテゴリ保存に失敗しました: ${error.message}`);
}

export async function loadCategoryColorsFromDatabase(): Promise<
  Record<string, string>
> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from('categories')
    .select('name, color')
    .order('name');
  if (error) {
    if (isMissingColorColumnError(error.message)) {
      return {};
    }
    throw new Error(`カテゴリ色の読込に失敗しました: ${error.message}`);
  }

  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { name: string; color: string | null };
    if (r.color && typeof r.color === 'string') {
      out[r.name.trim()] = r.color.trim();
    }
  }
  return out;
}

export async function updateCategoryColorInDatabase(
  name: string,
  color: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from('categories').upsert(
    {
      name: name.trim(),
      color: color.trim(),
      created_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
  if (error) {
    if (isMissingColorColumnError(error.message)) {
      throw new Error(
        'カテゴリ色を保存できません。DBにcolor列がありません。マイグレーションを適用してください。'
      );
    }
    throw new Error(`カテゴリ色の保存に失敗しました: ${error.message}`);
  }
}

export async function loadCategoriesFromDatabase(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('categories').select('name').order('name');
  if (error) throw new Error(`カテゴリ読込に失敗しました: ${error.message}`);
  return (data ?? []).map((row: { name: string }) => row.name);
}

export async function updateBookCategoryInDatabase(
  id: string,
  category: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('books')
    .update({
      category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`カテゴリ更新に失敗しました: ${error.message}`);
}

export async function bulkUpdateBookCategoryInDatabase(
  fromCategory: string,
  toCategory: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('books')
    .update({
      category: toCategory,
      updated_at: new Date().toISOString(),
    })
    .eq('category', fromCategory);

  if (error) throw new Error(`カテゴリ一括更新に失敗しました: ${error.message}`);
}

export async function renameCategoryInDatabase(
  oldName: string,
  newName: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('categories')
    .update({ name: newName.trim() })
    .eq('name', oldName.trim());
  if (error) throw new Error(`カテゴリ名変更に失敗しました: ${error.message}`);
}

export async function deleteCategoryFromDatabase(name: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('name', name.trim());
  if (error) throw new Error(`カテゴリ削除に失敗しました: ${error.message}`);
}
