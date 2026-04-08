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
  borrowed_by: string | null;
  borrowed_at: string | null;
  due_date: string | null;
  loan_memo: string | null;
  physical_height_mm?: number | null;
  physical_width_mm?: number | null;
  physical_thickness_mm?: number | null;
  page_count?: number | null;
  dimensions_source?: string | null;
  dimensions_manual?: boolean | null;
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
    borrowed_by: book.borrowedBy ?? null,
    borrowed_at: book.borrowedAt ?? null,
    due_date: book.dueDate ?? null,
    loan_memo: book.loanMemo ?? null,
    physical_height_mm: book.dimensions?.heightMm ?? null,
    physical_width_mm: book.dimensions?.widthMm ?? null,
    physical_thickness_mm: book.dimensions?.thicknessMm ?? null,
    page_count: book.dimensions?.pageCount ?? null,
    dimensions_source: book.dimensions?.source ?? null,
    dimensions_manual: book.dimensions?.manual ?? null,
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
    borrowedBy: row.borrowed_by ?? undefined,
    borrowedAt: row.borrowed_at ?? undefined,
    dueDate: row.due_date ?? undefined,
    loanMemo: row.loan_memo ?? undefined,
    dimensions:
      row.physical_height_mm ||
      row.physical_width_mm ||
      row.physical_thickness_mm ||
      row.page_count
        ? {
            heightMm: row.physical_height_mm ?? undefined,
            widthMm: row.physical_width_mm ?? undefined,
            thicknessMm: row.physical_thickness_mm ?? undefined,
            pageCount: row.page_count ?? undefined,
            source:
              (row.dimensions_source as 'manual' | 'api' | 'estimated' | null) ??
              undefined,
            manual: row.dimensions_manual ?? undefined,
          }
        : undefined,
  };
}

function stripDimensionsColumns(row: DbBookRow): Omit<
  DbBookRow,
  | 'physical_height_mm'
  | 'physical_width_mm'
  | 'physical_thickness_mm'
  | 'page_count'
  | 'dimensions_source'
  | 'dimensions_manual'
> {
  const {
    physical_height_mm: _h,
    physical_width_mm: _w,
    physical_thickness_mm: _t,
    page_count: _p,
    dimensions_source: _s,
    dimensions_manual: _m,
    ...rest
  } = row;
  return rest;
}

export async function upsertBooksToDatabase(books: Book[]): Promise<void> {
  if (books.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const rows = books.map(toDbRow);
  const { error } = await supabase.from('books').upsert(rows, { onConflict: 'id' });
  if (!error) return;

  if (
    error.message.includes('physical_height_mm') ||
    error.message.includes('physical_width_mm') ||
    error.message.includes('physical_thickness_mm') ||
    error.message.includes('page_count') ||
    error.message.includes('dimensions_source') ||
    error.message.includes('dimensions_manual')
  ) {
    const compactRows = rows.map((row) => stripDimensionsColumns(row));
    const { error: retryError } = await supabase
      .from('books')
      .upsert(compactRows, { onConflict: 'id' });
    if (!retryError) return;
    throw new Error(`DB保存に失敗しました: ${retryError.message}`);
  }

  throw new Error(`DB保存に失敗しました: ${error.message}`);
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

export async function deleteAllBooksFromDatabase(): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('books')
    .delete({ count: 'exact' })
    .neq('id', '');
  if (error) throw new Error(`DB全削除に失敗しました: ${error.message}`);
  return count ?? 0;
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

export async function updateBookCoverInDatabase(
  id: string,
  coverImageUrl: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('books')
    .update({
      cover_image_url: coverImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`表紙画像更新に失敗しました: ${error.message}`);
}

export async function updateBookLoanInDatabase(
  id: string,
  loan: {
    borrowedBy?: string | null;
    borrowedAt?: string | null;
    dueDate?: string | null;
    loanMemo?: string | null;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('books')
    .update({
      borrowed_by: loan.borrowedBy ?? null,
      borrowed_at: loan.borrowedAt ?? null,
      due_date: loan.dueDate ?? null,
      loan_memo: loan.loanMemo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`貸出情報更新に失敗しました: ${error.message}`);
}

export async function updateBookDimensionsInDatabase(
  id: string,
  dimensions: {
    heightMm?: number | null;
    widthMm?: number | null;
    thicknessMm?: number | null;
    pageCount?: number | null;
    source?: 'manual' | 'api' | 'estimated' | null;
    manual?: boolean | null;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('books')
    .update({
      physical_height_mm: dimensions.heightMm ?? null,
      physical_width_mm: dimensions.widthMm ?? null,
      physical_thickness_mm: dimensions.thicknessMm ?? null,
      page_count: dimensions.pageCount ?? null,
      dimensions_source: dimensions.source ?? null,
      dimensions_manual: dimensions.manual ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`本サイズ更新に失敗しました: ${error.message}`);
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
