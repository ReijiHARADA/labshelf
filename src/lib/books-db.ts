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

export async function addCategoryToDatabase(category: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from('categories').upsert(
    {
      name: category,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'name' }
  );
  if (error) throw new Error(`カテゴリ保存に失敗しました: ${error.message}`);
}

export async function loadCategoriesFromDatabase(): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('categories').select('name').order('name');
  if (error) throw new Error(`カテゴリ読込に失敗しました: ${error.message}`);
  return (data ?? []).map((row: { name: string }) => row.name);
}
