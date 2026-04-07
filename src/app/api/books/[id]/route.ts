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

  if (!category && !loanAction) {
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
