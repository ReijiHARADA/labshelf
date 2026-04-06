import { NextRequest, NextResponse } from 'next/server';
import { addCategory, getAllCategories, setCustomCategories } from '@/lib/books-store';
import { addCategoryToDatabase, loadCategoriesFromDatabase } from '@/lib/books-db';
import { ensureBooksLoaded } from '@/lib/sheets-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await ensureBooksLoaded();
  try {
    const dbCategories = await loadCategoriesFromDatabase();
    if (dbCategories.length > 0) {
      setCustomCategories(dbCategories);
    }
  } catch (error) {
    console.error('Category DB load error:', error);
  }

  return NextResponse.json({
    categories: getAllCategories(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const category = typeof body?.category === 'string' ? body.category : '';
  const result = addCategory(category);
  if (result.success) {
    try {
      await addCategoryToDatabase(category.trim());
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: error instanceof Error ? error.message : 'カテゴリ保存に失敗しました',
        categories: getAllCategories(),
      });
    }
  }

  return NextResponse.json({
    success: result.success,
    message: result.message,
    categories: getAllCategories(),
  });
}
