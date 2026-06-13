import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Book } from '@/types/book';
import {
  isManualCoverUrl,
  mergeSyncedBookWithExisting,
  mergeSyncedBooksWithExisting,
  resolveCoverImageUrl,
} from './sync-merge.ts';

const manualCover =
  'https://example.supabase.co/storage/v1/object/public/book-covers/book-1/123.jpg';
const apiCover = 'https://books.google.com/books/content?id=abc';

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: '9784000000001',
    isbn: '9784000000001',
    title: 'テスト本',
    author: '著者',
    publisher: '出版社',
    publishedYear: 2024,
    category: 'UX',
    tags: [],
    recommended: false,
    latestFlag: false,
    popularityScore: 50,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('sync-merge', () => {
  it('手動アップロードURLを判定する', () => {
    assert.equal(isManualCoverUrl(manualCover), true);
    assert.equal(isManualCoverUrl(apiCover), false);
    assert.equal(isManualCoverUrl(undefined), false);
  });

  it('スプシに表紙がない場合は既存表紙を維持する', () => {
    const result = resolveCoverImageUrl(undefined, manualCover, false);
    assert.equal(result, manualCover);
  });

  it('スプシに表紙がない場合はAPI表紙より手動表紙を優先する', () => {
    const result = resolveCoverImageUrl(apiCover, manualCover, false);
    assert.equal(result, manualCover);
  });

  it('スプシに表紙がある場合はスプシ表紙を採用する', () => {
    const sheetCover = 'https://example.com/sheet-cover.jpg';
    const result = resolveCoverImageUrl(sheetCover, manualCover, true);
    assert.equal(result, sheetCover);
  });

  it('同期結果に表紙がなく既存もない場合はundefined', () => {
    const result = resolveCoverImageUrl(undefined, undefined, false);
    assert.equal(result, undefined);
  });

  it('アプリ管理フィールドを既存データから引き継ぐ', () => {
    const existing = baseBook({
      coverImageUrl: manualCover,
      shelfOrder: 3,
      spineColor: '#ff0000',
      borrowedBy: '学生A',
      borrowedAt: '2024-05-01T00:00:00.000Z',
      dueDate: '2024-06-01T00:00:00.000Z',
      loanMemo: '研究室',
      dimensions: { heightMm: 200, manual: true, source: 'manual' },
      createdAt: '2023-01-01T00:00:00.000Z',
    });
    const synced = baseBook({
      coverImageUrl: apiCover,
      category: 'インタラクション',
      updatedAt: '2024-07-01T00:00:00.000Z',
    });

    const merged = mergeSyncedBookWithExisting(synced, existing, {
      sheetHasCoverUrl: false,
    });

    assert.equal(merged.coverImageUrl, manualCover);
    assert.equal(merged.shelfOrder, 3);
    assert.equal(merged.spineColor, '#ff0000');
    assert.equal(merged.borrowedBy, '学生A');
    assert.equal(merged.loanMemo, '研究室');
    assert.equal(merged.dimensions?.heightMm, 200);
    assert.equal(merged.dimensions?.manual, true);
    assert.equal(merged.createdAt, '2023-01-01T00:00:00.000Z');
    assert.equal(merged.category, 'インタラクション');
  });

  it('複数冊をまとめてマージできる', () => {
    const existing = [
      baseBook({ id: '1', isbn: '1', coverImageUrl: manualCover }),
      baseBook({ id: '2', isbn: '2', shelfOrder: 9 }),
    ];
    const synced = [
      baseBook({ id: '1', isbn: '1', coverImageUrl: apiCover }),
      baseBook({ id: '2', isbn: '2', title: '更新タイトル' }),
    ];

    const merged = mergeSyncedBooksWithExisting(synced, existing);
    assert.equal(merged[0].coverImageUrl, manualCover);
    assert.equal(merged[1].shelfOrder, 9);
    assert.equal(merged[1].title, '更新タイトル');
  });
});
