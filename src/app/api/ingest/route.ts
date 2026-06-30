import { NextRequest, NextResponse } from 'next/server';
import type { Book } from '@/types/book';
import { fetchBookInfo } from '@/lib/book-api';
import {
  isMagazineJanCode,
  normalizeScannedProductCode,
  type ScannedProductCode,
} from '@/lib/isbn';
import { findExistingIsbns, upsertBooksToDatabase } from '@/lib/books-db';
import { appendItemsToSheet } from '@/lib/sheets-append';
import { applyAutoClassification } from '@/lib/book-classifier';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireToken(req: NextRequest): string | null {
  const expected = process.env.LABSHELF_INGEST_TOKEN;
  if (!expected) return null;
  const got = req.headers.get('x-labshelf-token') || '';
  if (got !== expected) return null;
  return expected;
}

function toBookFromApi(code: string, apiData: Partial<Book> | null): Book | null {
  if (!apiData?.title) return null;

  const now = new Date().toISOString();
  return applyAutoClassification(
    {
      id: code,
      isbn: code,
      title: apiData.title,
      subtitle: apiData.subtitle,
      author: apiData.author || '不明',
      publisher: apiData.publisher || '',
      publishedDate: apiData.publishedDate,
      publishedYear: apiData.publishedYear || new Date().getFullYear(),
      category: '未分類',
      tags: [],
      description: apiData.description,
      toc: apiData.toc,
      coverImageUrl: apiData.coverImageUrl,
      recommended: false,
      latestFlag: true,
      popularityScore: 50,
      createdAt: now,
      updatedAt: now,
      memo: undefined,
    },
    {
      preserveManualCategory: false,
      clearTags: true,
    }
  );
}

function toBookFromManual(
  scanned: ScannedProductCode,
  manual: { title: string; author?: string; publisher?: string }
): Book {
  const now = new Date().toISOString();
  const isMagazine = scanned.kind === 'magazine-jan';

  return applyAutoClassification(
    {
      id: scanned.code,
      isbn: scanned.code,
      title: manual.title,
      author: manual.author || (isMagazine ? '編集部' : '不明'),
      publisher: manual.publisher || '',
      publishedYear: new Date().getFullYear(),
      category: isMagazine ? '教養・社会・カルチャー' : '未分類',
      tags: isMagazine ? ['雑誌'] : [],
      description: isMagazine ? '雑誌（JANコードから手動登録）' : undefined,
      recommended: false,
      latestFlag: true,
      popularityScore: 50,
      createdAt: now,
      updatedAt: now,
      memo: isMagazine ? `雑誌JAN: ${scanned.code}` : undefined,
    },
    {
      preserveManualCategory: isMagazine,
      clearTags: !isMagazine,
    }
  );
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

  const manualTitle = typeof body?.title === 'string' ? body.title.trim() : '';
  const manualAuthor = typeof body?.author === 'string' ? body.author.trim() : '';
  const manualPublisher =
    typeof body?.publisher === 'string' ? body.publisher.trim() : '';

  const normalized: ScannedProductCode[] = [];
  const invalid: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const scanned = normalizeScannedProductCode(v);
    if (!scanned) {
      invalid.push(String(v));
      continue;
    }
    normalized.push(scanned);
  }

  const unique = [
    ...new Map(normalized.map((item) => [item.code, item])).values(),
  ];
  if (unique.length === 0) {
    return NextResponse.json({
      success: false,
      added: [],
      skipped: [],
      invalid,
      needsManualTitle: [],
      message: '有効なISBNまたは雑誌コードがありません',
    });
  }

  if (unique.length > 50) {
    return NextResponse.json(
      { error: '一度に追加できる件数は50件までです' },
      { status: 400 }
    );
  }

  const existing = await findExistingIsbns(unique.map((item) => item.code));
  const toAdd = unique.filter((item) => !existing.has(item.code));
  const skipped = unique.filter((item) => existing.has(item.code)).map((item) => item.code);

  const books: Book[] = [];
  const errors: string[] = [];
  const needsManualTitle: string[] = [];

  for (const scanned of toAdd) {
    try {
      if (manualTitle && unique.length === 1 && scanned.code === unique[0].code) {
        books.push(
          toBookFromManual(scanned, {
            title: manualTitle,
            author: manualAuthor || undefined,
            publisher: manualPublisher || undefined,
          })
        );
        continue;
      }

      const apiData = await fetchBookInfo(scanned.code);
      const book = toBookFromApi(scanned.code, apiData);
      if (book) {
        books.push(book);
        continue;
      }

      if (isMagazineJanCode(scanned.code)) {
        needsManualTitle.push(scanned.code);
        errors.push(`雑誌コード ${scanned.code}: タイトルの手動入力が必要です`);
        continue;
      }

      errors.push(`ISBN ${scanned.code}: 書籍情報を取得できませんでした`);
    } catch (e) {
      errors.push(
        `${scanned.code}: ${e instanceof Error ? e.message : '不明なエラー'}`
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
    needsManualTitle,
    sheet: sheetResult.ok ? { appended: sheetResult.appended } : sheetResult,
  });
}
