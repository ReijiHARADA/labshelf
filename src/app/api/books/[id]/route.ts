import { NextRequest, NextResponse } from 'next/server';
import {
  getBookById,
  getRelatedBooks,
  getAllCategories,
  addCategory,
  updateBookInStore,
} from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import {
  updateBookCategoryInDatabase,
  addCategoryToDatabase,
  updateBookLoanInDatabase,
  updateBookDimensionsInDatabase,
  updateBookShelfInDatabase,
} from '@/lib/books-db';

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
    typeof body?.category === 'string' ? body.category.trim() : undefined;
  const loanAction =
    body?.loanAction === 'borrow' || body?.loanAction === 'return'
      ? body.loanAction
      : undefined;
  const borrowerName =
    typeof body?.borrowerName === 'string' ? body.borrowerName.trim() : '';
  const dueDate = typeof body?.dueDate === 'string' ? body.dueDate.trim() : '';
  const loanMemo =
    typeof body?.loanMemo === 'string' ? body.loanMemo.trim() : '';
  const dimensionsInput =
    body?.dimensions && typeof body.dimensions === 'object' ? body.dimensions : undefined;
  const parseNumeric = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  };
  const dimensions = dimensionsInput
    ? {
        heightMm: parseNumeric(dimensionsInput.heightMm),
        widthMm: parseNumeric(dimensionsInput.widthMm),
        thicknessMm: parseNumeric(dimensionsInput.thicknessMm),
        pageCount: parseNumeric(dimensionsInput.pageCount),
      }
    : undefined;
  const shelfInput = body?.shelf && typeof body.shelf === 'object' ? body.shelf : undefined;
  const shelf =
    shelfInput
      ? {
          order:
            typeof shelfInput.order === 'number' && Number.isFinite(shelfInput.order)
              ? Math.round(shelfInput.order)
              : undefined,
          orientation:
            shelfInput.orientation === 'vertical' ||
            shelfInput.orientation === 'horizontal' ||
            shelfInput.orientation === 'cover'
              ? shelfInput.orientation
              : undefined,
        }
      : undefined;

  if (!category && !loanAction && !dimensions && !shelf) {
    return NextResponse.json(
      { error: '更新内容を指定してください' },
      { status: 400 }
    );
  }

  if (loanAction === 'borrow' && !borrowerName) {
    return NextResponse.json(
      { error: '借りる人の名前を入力してください' },
      { status: 400 }
    );
  }

  if (category) {
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
  }

  const updated: typeof book = {
    ...book,
    category: category ?? book.category,
    borrowedBy:
      loanAction === 'borrow'
        ? borrowerName
        : loanAction === 'return'
          ? undefined
          : book.borrowedBy,
    borrowedAt:
      loanAction === 'borrow'
        ? new Date().toISOString()
        : loanAction === 'return'
          ? undefined
          : book.borrowedAt,
    dueDate:
      loanAction === 'borrow'
        ? dueDate || undefined
        : loanAction === 'return'
          ? undefined
          : book.dueDate,
    loanMemo:
      loanAction === 'borrow'
        ? loanMemo || undefined
        : loanAction === 'return'
          ? undefined
          : book.loanMemo,
    dimensions: dimensions
      ? {
          heightMm: dimensions.heightMm,
          widthMm: dimensions.widthMm,
          thicknessMm: dimensions.thicknessMm,
          pageCount:
            typeof dimensions.pageCount === 'number'
              ? Math.round(dimensions.pageCount)
              : undefined,
          source: 'manual' as const,
          manual: true,
        }
      : book.dimensions,
    shelfOrder: shelf?.order ?? book.shelfOrder,
    shelfOrientation: shelf?.orientation ?? book.shelfOrientation,
    updatedAt: new Date().toISOString(),
  };

  updateBookInStore(updated);

  try {
    if (category) {
      await updateBookCategoryInDatabase(id, category);
    }
    if (loanAction) {
      await updateBookLoanInDatabase(id, {
        borrowedBy: updated.borrowedBy ?? null,
        borrowedAt: updated.borrowedAt ?? null,
        dueDate: updated.dueDate ?? null,
        loanMemo: updated.loanMemo ?? null,
      });
    }
    if (dimensions) {
      await updateBookDimensionsInDatabase(id, {
        heightMm: updated.dimensions?.heightMm ?? null,
        widthMm: updated.dimensions?.widthMm ?? null,
        thicknessMm: updated.dimensions?.thicknessMm ?? null,
        pageCount: updated.dimensions?.pageCount ?? null,
        source: 'manual',
        manual: true,
      });
    }
    if (shelf) {
      await updateBookShelfInDatabase(id, {
        order: updated.shelfOrder ?? null,
        orientation: updated.shelfOrientation ?? null,
      });
    }
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
