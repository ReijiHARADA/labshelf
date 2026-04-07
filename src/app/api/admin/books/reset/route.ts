import { NextRequest, NextResponse } from 'next/server';
import { deleteAllBooksFromDatabase } from '@/lib/books-db';
import { updateBooks, updateSyncStatus } from '@/lib/books-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RESET_PASSWORD = 'admin';
const RESET_CONFIRM = 'DELETE ALL BOOKS';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';
  const confirmText = typeof body?.confirmText === 'string' ? body.confirmText : '';

  if (password !== RESET_PASSWORD || confirmText !== RESET_CONFIRM) {
    return NextResponse.json(
      { success: false, message: '認証情報が正しくありません' },
      { status: 401 }
    );
  }

  try {
    const deleted = await deleteAllBooksFromDatabase();
    updateBooks([]);
    updateSyncStatus({ bookCount: 0, status: 'idle', errorMessage: undefined });
    return NextResponse.json({
      success: true,
      message: `DB上の蔵書を全削除しました (${deleted}件)`,
      deleted,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'DB全削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

