import type { Book, SyncLog } from '@/types/book';
import {
  updateBooks,
  updateSyncStatus,
  addSyncLog,
  getBooks,
  setCustomCategories,
} from './books-store';
import { fetchBookInfo } from './book-api';
import {
  loadBooksFromDatabase,
  upsertBooksToDatabase,
  loadCategoriesFromDatabase,
} from './books-db';

interface SheetRow {
  id?: string;
  isbn: string;
  title?: string;
  subtitle?: string;
  author?: string;
  publisher?: string;
  publishedYear?: string;
  category?: string;
  tags?: string;
  description?: string;
  toc?: string;
  coverImageUrl?: string;
  recommended?: string;
  latestFlag?: string;
  popularityScore?: string;
  createdAt?: string;
  updatedAt?: string;
  memo?: string;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'はい';
}

function parseNumber(value: string | undefined, defaultValue = 0): number {
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,、]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseDate(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  try {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

async function enrichBookWithAPI(row: SheetRow, index: number): Promise<Book | null> {
  const isbn = row.isbn?.trim();
  
  if (!isbn) {
    console.log(`行${index + 2}: ISBNが空です`);
    return null;
  }
  
  const normalizedISBN = normalizeISBN(isbn);
  
  let title = row.title?.trim();
  let author = row.author?.trim();
  let publisher = row.publisher?.trim();
  let publishedYear = parseNumber(row.publishedYear, 0);
  let description = row.description?.trim();
  let coverImageUrl = row.coverImageUrl?.trim();
  let subtitle = row.subtitle?.trim();
  
  if (!title || !author) {
    console.log(`行${index + 2}: ISBN ${normalizedISBN} の情報をAPIから取得中...`);
    const apiData = await fetchBookInfo(normalizedISBN);
    
    if (apiData) {
      title = title || apiData.title || '';
      author = author || apiData.author || '';
      publisher = publisher || apiData.publisher || '';
      publishedYear = publishedYear || apiData.publishedYear || new Date().getFullYear();
      description = description || apiData.description;
      coverImageUrl = coverImageUrl || apiData.coverImageUrl;
      subtitle = subtitle || apiData.subtitle;
      
      console.log(`  -> 取得成功: ${title}`);
    } else {
      console.log(`  -> API取得失敗`);
    }
  }
  
  if (!title) {
    console.log(`行${index + 2}: タイトルを取得できませんでした (ISBN: ${normalizedISBN})`);
    return null;
  }
  
  const id = row.id?.trim() || normalizedISBN || `book-${index}`;
  
  return {
    id,
    isbn: normalizedISBN,
    title,
    subtitle: subtitle || undefined,
    author: author || '不明',
    publisher: publisher || '',
    publishedYear: publishedYear || new Date().getFullYear(),
    category: row.category?.trim() || 'その他',
    tags: parseTags(row.tags),
    description: description || undefined,
    toc: row.toc?.trim() || undefined,
    coverImageUrl: coverImageUrl || undefined,
    recommended: parseBoolean(row.recommended),
    latestFlag: parseBoolean(row.latestFlag),
    popularityScore: parseNumber(row.popularityScore, 50),
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
    memo: row.memo?.trim() || undefined,
  };
}

export async function syncFromGoogleSheets(sheetIdParam?: string): Promise<{
  success: boolean;
  bookCount: number;
  errors: string[];
  duration: number;
}> {
  const startTime = Date.now();
  const errors: string[] = [];

  const SHEET_ID = sheetIdParam || process.env.GOOGLE_SHEET_ID;
  const rawApiKey = process.env.GOOGLE_API_KEY;
  const API_KEY = rawApiKey && !rawApiKey.includes('your_') && rawApiKey.length > 10 ? rawApiKey : undefined;

  updateSyncStatus({ status: 'syncing' });

  try {
    if (!SHEET_ID) {
      throw new Error('スプレッドシートIDが設定されていません');
    }

    const url = API_KEY
      ? `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A:R?key=${API_KEY}`
      : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    console.log(`Fetching from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`シートの取得に失敗しました: ${response.status}。共有設定を確認してください。`);
    }

    let rows: SheetRow[];

    if (API_KEY) {
      const data = await response.json();
      const values = data.values as string[][];
      const headers = values[0].map((h: string) => h.toLowerCase().trim());
      rows = values.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header: string, i: number) => {
          obj[header] = row[i] || '';
        });
        return obj as unknown as SheetRow;
      });
    } else {
      const text = await response.text();
      console.log('Raw response (first 1000 chars):', text.substring(0, 1000));
      
      const jsonStr = text.replace(/^[^(]+\(|\);$/g, '');
      const data = JSON.parse(jsonStr);
      
      console.log('Parsed data structure:', JSON.stringify(data.table, null, 2));
      
      const cols = data.table.cols;
      const tableRows = data.table.rows || [];
      const parsedNumHeaders = data.table.parsedNumHeaders || 0;
      
      if (!tableRows || tableRows.length === 0) {
        throw new Error('スプレッドシートにデータがありません');
      }
      
      let headers: string[] = [];
      let dataRows = tableRows;
      
      const hasLabelHeaders = cols.some((col: { label?: string }) => col.label && col.label.trim() !== '');
      
      if (hasLabelHeaders) {
        headers = cols.map((col: { label?: string; id?: string }) => 
          (col.label || col.id || '').toLowerCase().trim()
        );
        console.log('Using column labels as headers:', headers);
      } else {
        const firstRowValues = tableRows[0]?.c?.map((cell: { v?: unknown } | null) => 
          cell?.v?.toString().toLowerCase().trim() || ''
        ) || [];
        
        const looksLikeHeader = firstRowValues.some((val: string) => 
          val === 'isbn' || val === 'title' || val === 'author' || val === 'タイトル' || val === '著者'
        );
        
        if (looksLikeHeader) {
          headers = firstRowValues;
          dataRows = tableRows.slice(1);
          console.log('First row used as headers:', headers);
        } else {
          headers = cols.map((_: unknown, idx: number) => idx === 0 ? 'isbn' : `col${idx}`);
          console.log('No headers found, assuming first column is ISBN:', headers);
        }
      }
      
      console.log('Headers:', headers);
      console.log('Data rows count:', dataRows.length);
      
      const isbnColIndex = headers.findIndex(h => h === 'isbn' || h.includes('isbn'));
      
      if (isbnColIndex === -1) {
        headers[0] = 'isbn';
        console.log('ISBN column not found, using first column as ISBN');
      }
      
      rows = dataRows.map((row: { c: Array<{ v?: unknown } | null> }) => {
        const obj: Record<string, string> = {};
        headers.forEach((header: string, i: number) => {
          if (header && row.c && row.c[i]) {
            obj[header] = row.c[i]?.v?.toString() || '';
          }
        });
        return obj as unknown as SheetRow;
      });
      
      console.log('Parsed rows:', rows.length);
      if (rows.length > 0) {
        console.log('First parsed row:', JSON.stringify(rows[0]));
      }
    }

    console.log(`${rows.length}行のデータを取得しました`);

    const validBooks: Book[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      console.log(`Processing row ${i}:`, JSON.stringify(row));
      
      if (!row.isbn?.trim()) {
        console.log(`Row ${i}: No ISBN found`);
        continue;
      }
      
      try {
        const book = await enrichBookWithAPI(row, i);
        if (book) {
          validBooks.push(book);
          console.log(`Row ${i}: Successfully processed - ${book.title}`);
        }
      } catch (error) {
        const errorMsg = `行${i + 2}: 処理エラー - ${error instanceof Error ? error.message : '不明'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
      
      if (i < rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (validBooks.length === 0) {
      throw new Error('有効な本のデータがありません。ISBN列にデータがあるか確認してください。');
    }

    await upsertBooksToDatabase(validBooks);
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

    console.error('Sync error:', errorMessage);

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

export async function ensureBooksLoaded(): Promise<void> {
  if (getBooks().length > 0) return;
  try {
    const dbBooks = await loadBooksFromDatabase();
    if (dbBooks.length > 0) {
      updateBooks(dbBooks);
      const dbCategories = await loadCategoriesFromDatabase();
      if (dbCategories.length > 0) {
        setCustomCategories(dbCategories);
      }
      return;
    }
  } catch (error) {
    console.error('DB load error:', error);
  }

  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  if (!SHEET_ID) return;
  await syncFromGoogleSheets(SHEET_ID);
}

export async function syncFromISBNList(isbns: string[]): Promise<{
  success: boolean;
  books: Book[];
  errors: string[];
}> {
  const books: Book[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < isbns.length; i++) {
    const isbn = isbns[i].trim();
    if (!isbn) continue;
    
    try {
      const apiData = await fetchBookInfo(isbn);
      if (apiData && apiData.title) {
        books.push({
          id: normalizeISBN(isbn),
          isbn: normalizeISBN(isbn),
          title: apiData.title,
          subtitle: apiData.subtitle,
          author: apiData.author || '不明',
          publisher: apiData.publisher || '',
          publishedYear: apiData.publishedYear || new Date().getFullYear(),
          category: 'その他',
          tags: apiData.tags || [],
          description: apiData.description,
          coverImageUrl: apiData.coverImageUrl,
          recommended: false,
          latestFlag: true,
          popularityScore: 50,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        errors.push(`ISBN ${isbn}: 情報を取得できませんでした`);
      }
    } catch (error) {
      errors.push(`ISBN ${isbn}: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
    
    if (i < isbns.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return {
    success: books.length > 0,
    books,
    errors,
  };
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
