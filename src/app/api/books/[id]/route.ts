import { NextRequest, NextResponse } from 'next/server';
import {
  getBookById,
  getRelatedBooks,
  getAllCategories,
  addCategory,
  updateBookInStore,
} from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import { updateBookCategoryInDatabase, addCategoryToDatabase } from '@/lib/books-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureBooksLoaded();
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    return NextResponse.json(
      { error: '本が見つかりませんでした' },
      { status: 404 }
    );
  }

  const relatedBooks = getRelatedBooks(book, 6);

  return NextResponse.json({
    book,
    relatedBooks,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureBooksLoaded();
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    return NextResponse.json(
      { error: '本が見つかりませんでした' },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const category =
    typeof body?.category === 'string' ? body.category.trim() : '';

  if (!category) {
    return NextResponse.json(
      { error: 'カテゴリ名を入力してください' },
      { status: 400 }
    );
  }

  const existing = getAllCategories();
  if (!existing.includes(category)) {
    const added = addCategory(category);
    if (added.success) {
      try {
        await addCategoryToDatabase(category);
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : 'カテゴリの登録に失敗しました',
          },
          { status: 500 }
        );
      }
    }
  }

  const updated: typeof book = {
    ...book,
    category,
    updatedAt: new Date().toISOString(),
  };

  updateBookInStore(updated);

  try {
    await updateBookCategoryInDatabase(id, category);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'データベースの更新に失敗しました',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ book: updated });
}
