import { NextRequest, NextResponse } from 'next/server';
import type { Book } from '@/types/book';
import { fetchBookInfo } from '@/lib/book-api';
import { normalizeToIsbn13 } from '@/lib/isbn';
import { findExistingIsbns, upsertBooksToDatabase } from '@/lib/books-db';
import { appendItemsToSheet } from '@/lib/sheets-append';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireToken(req: NextRequest): string | null {
  const expected = process.env.LABSHELF_INGEST_TOKEN;
  if (!expected) return null;
  const got = req.headers.get('x-labshelf-token') || '';
  if (got !== expected) return null;
  return expected;
}

function toBookFromApi(isbn13: string, apiData: Partial<Book> | null): Book | null {
  if (!apiData?.title) return null;

  const now = new Date().toISOString();
  return {
    id: isbn13,
    isbn: isbn13,
    title: apiData.title,
    subtitle: apiData.subtitle,
    author: apiData.author || '不明',
    publisher: apiData.publisher || '',
    publishedYear: apiData.publishedYear || new Date().getFullYear(),
    category: '未分類',
    tags: apiData.tags || [],
    description: apiData.description,
    toc: apiData.toc,
    coverImageUrl: apiData.coverImageUrl,
    recommended: false,
    latestFlag: true,
    popularityScore: 50,
    createdAt: now,
    updatedAt: now,
    memo: undefined,
  };
}

export async function POST(request: NextRequest) {
  if (!requireToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const raw: string[] = Array.isArray(body?.isbns)
    ? body.isbns
    : typeof body?.isbn === 'string'
      ? [body.isbn]
      : [];

  const normalized: string[] = [];
  const invalid: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const isbn13 = normalizeToIsbn13(v);
    if (!isbn13) {
      invalid.push(String(v));
      continue;
    }
    normalized.push(isbn13);
  }

  const unique = [...new Set(normalized)];
  if (unique.length === 0) {
    return NextResponse.json({
      success: false,
      added: [],
      skipped: [],
      invalid,
      message: '有効なISBNがありません',
    });
  }

  if (unique.length > 50) {
    return NextResponse.json(
      { error: '一度に追加できるISBNは50件までです' },
      { status: 400 }
    );
  }

  const existing = await findExistingIsbns(unique);
  const toAdd = unique.filter((i) => !existing.has(i));
  const skipped = unique.filter((i) => existing.has(i));

  const books: Book[] = [];
  const errors: string[] = [];
  for (const isbn13 of toAdd) {
    try {
      const apiData = await fetchBookInfo(isbn13);
      const book = toBookFromApi(isbn13, apiData);
      if (!book) {
        errors.push(`ISBN ${isbn13}: 書籍情報を取得できませんでした`);
        continue;
      }
      books.push(book);
    } catch (e) {
      errors.push(
        `ISBN ${isbn13}: ${e instanceof Error ? e.message : '不明なエラー'}`
      );
    }
  }

  if (books.length > 0) {
    await upsertBooksToDatabase(books);
  }

  const sheetResult = await appendItemsToSheet(
    books.map((b) => ({ isbn: b.isbn, title: b.title }))
  );
  const appendedIsbns = books.map((b) => b.isbn);

  return NextResponse.json({
    success: errors.length === 0 && sheetResult.ok,
    added: appendedIsbns,
    skipped,
    invalid,
    errors,
    sheet: sheetResult.ok ? { appended: sheetResult.appended } : sheetResult,
  });
}

