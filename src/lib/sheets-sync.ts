import type { Book, SyncLog } from '@/types/book';
import { updateBooks, updateSyncStatus, addSyncLog, getBooks } from './books-store';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const API_KEY = process.env.GOOGLE_API_KEY;

interface SheetRow {
  id: string;
  isbn: string;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  publishedYear: string;
  category: string;
  tags: string;
  description: string;
  toc: string;
  coverImageUrl: string;
  recommended: string;
  latestFlag: string;
  popularityScore: string;
  createdAt: string;
  updatedAt: string;
  memo: string;
}

function parseBoolean(value: string): boolean {
  const lower = value?.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'はい';
}

function parseNumber(value: string, defaultValue = 0): number {
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function parseTags(value: string): string[] {
  if (!value) return [];
  return value
    .split(/[,、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDate(value: string): string {
  if (!value) return new Date().toISOString();
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function validateBook(row: SheetRow, index: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.id?.trim()) {
    errors.push(`行${index + 2}: IDが空です`);
  }
  if (!row.title?.trim()) {
    errors.push(`行${index + 2}: タイトルが空です`);
  }
  if (!row.author?.trim()) {
    errors.push(`行${index + 2}: 著者が空です`);
  }

  if (row.isbn && !/^[\d-]+$/.test(row.isbn.replace(/\s/g, ''))) {
    errors.push(`行${index + 2}: ISBNの形式が不正です (${row.isbn})`);
  }

  return { valid: errors.length === 0, errors };
}

function transformRow(row: SheetRow): Book {
  return {
    id: row.id.trim(),
    isbn: row.isbn?.trim() || '',
    title: row.title.trim(),
    subtitle: row.subtitle?.trim() || undefined,
    author: row.author.trim(),
    publisher: row.publisher?.trim() || '',
    publishedYear: parseNumber(row.publishedYear, new Date().getFullYear()),
    category: row.category?.trim() || 'その他',
    tags: parseTags(row.tags),
    description: row.description?.trim() || undefined,
    toc: row.toc?.trim() || undefined,
    coverImageUrl: row.coverImageUrl?.trim() || undefined,
    recommended: parseBoolean(row.recommended),
    latestFlag: parseBoolean(row.latestFlag),
    popularityScore: parseNumber(row.popularityScore, 50),
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
    memo: row.memo?.trim() || undefined,
  };
}

export async function syncFromGoogleSheets(): Promise<{
  success: boolean;
  bookCount: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  updateSyncStatus({ status: 'syncing' });

  try {
    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID が設定されていません');
    }

    const url = API_KEY
      ? `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:R?key=${API_KEY}`
      : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    const response = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`シートの取得に失敗しました: ${response.status}`);
    }

    let rows: SheetRow[];

    if (API_KEY) {
      const data = await response.json();
      const values = data.values as string[][];
      const headers = values[0];
      rows = values.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        return obj as unknown as SheetRow;
      });
    } else {
      const text = await response.text();
      const jsonStr = text.replace(/^[^(]+\(|\);$/g, '');
      const data = JSON.parse(jsonStr);
      const cols = data.table.cols.map((col: { label: string }) => col.label);
      rows = data.table.rows.map((row: { c: Array<{ v: unknown } | null> }) => {
        const obj: Record<string, string> = {};
        cols.forEach((col: string, i: number) => {
          obj[col] = row.c[i]?.v?.toString() || '';
        });
        return obj as unknown as SheetRow;
      });
    }

    const validBooks: Book[] = [];
    
    rows.forEach((row, index) => {
      const validation = validateBook(row, index);
      if (validation.valid) {
        validBooks.push(transformRow(row));
      } else {
        errors.push(...validation.errors);
      }
    });

    if (validBooks.length === 0) {
      throw new Error('有効な本のデータがありません');
    }

    updateBooks(validBooks);

    const duration = Date.now() - startTime;
    const log: SyncLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'success',
      bookCount: validBooks.length,
      duration,
    };
    addSyncLog(log);

    updateSyncStatus({
      lastSyncAt: new Date().toISOString(),
      status: 'success',
      bookCount: validBooks.length,
      syncDuration: duration,
      errorMessage: errors.length > 0 ? `${errors.length}件の警告があります` : undefined,
    });

    return {
      success: true,
      bookCount: validBooks.length,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';

    const log: SyncLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'error',
      bookCount: 0,
      errorMessage,
      duration,
    };
    addSyncLog(log);

    updateSyncStatus({
      status: 'error',
      errorMessage,
      syncDuration: duration,
    });

    return {
      success: false,
      bookCount: getBooks().length,
      errors: [errorMessage, ...errors],
      duration,
    };
  }
}

export function getLastSyncTime(): string | null {
  const status = getSyncStatus();
  return status.lastSyncAt;
}

function getSyncStatus() {
  return {
    lastSyncAt: new Date().toISOString(),
    status: 'idle' as const,
    bookCount: getBooks().length,
  };
}
