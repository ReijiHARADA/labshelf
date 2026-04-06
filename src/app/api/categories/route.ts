import { NextRequest, NextResponse } from 'next/server';
import { addCategory, getAllCategories, setCustomCategories } from '@/lib/books-store';
import {
  addCategoryToDatabase,
  loadCategoriesFromDatabase,
  updateCategoryColorInDatabase,
} from '@/lib/books-db';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import {
  getCategoryColor,
  setCategoryColorOverride,
} from '@/lib/spine-colors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidCategoryColor(value: string): boolean {
  const t = value.trim();
  if (t.length > 80) return false;
  if (t.startsWith('var(')) return true;
  return HEX_RE.test(t);
}

function buildResolvedColors(): Record<string, string> {
  const list = getAllCategories();
  const out: Record<string, string> = {};
  for (const name of list) {
    out[name] = getCategoryColor(name);
  }
  return out;
}

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
    colors: buildResolvedColors(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const category = typeof body?.category === 'string' ? body.category : '';
  const rawColor =
    typeof body?.color === 'string' ? body.color.trim() : undefined;
  if (rawColor !== undefined && rawColor !== '' && !isValidCategoryColor(rawColor)) {
    return NextResponse.json({
      success: false,
      message: '色は #RRGGBB 形式、または CSS の var(...) で指定してください',
      categories: getAllCategories(),
      colors: buildResolvedColors(),
    });
  }

  const colorToSave =
    rawColor === undefined || rawColor === '' ? undefined : rawColor;

  const result = addCategory(category);
  if (result.success) {
    try {
      await addCategoryToDatabase(category.trim(), colorToSave ?? null);
      if (colorToSave) {
        setCategoryColorOverride(category.trim(), colorToSave);
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        message: error instanceof Error ? error.message : 'カテゴリ保存に失敗しました',
        categories: getAllCategories(),
        colors: buildResolvedColors(),
      });
    }
  }

  return NextResponse.json({
    success: result.success,
    message: result.message,
    categories: getAllCategories(),
    colors: buildResolvedColors(),
  });
}

export async function PATCH(request: NextRequest) {
  await ensureBooksLoaded();
  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const color = typeof body?.color === 'string' ? body.color.trim() : '';

  if (!name) {
    return NextResponse.json(
      { error: 'カテゴリ名が必要です' },
      { status: 400 }
    );
  }
  if (!color || !isValidCategoryColor(color)) {
    return NextResponse.json(
      {
        error:
          '色は #RRGGBB 形式、または CSS の var(...) で指定してください',
      },
      { status: 400 }
    );
  }

  const existing = getAllCategories();
  if (!existing.includes(name)) {
    return NextResponse.json(
      { error: 'そのカテゴリは一覧にありません' },
      { status: 404 }
    );
  }

  try {
    await updateCategoryColorInDatabase(name, color);
    setCategoryColorOverride(name, color);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '色の保存に失敗しました',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    colors: buildResolvedColors(),
  });
}
