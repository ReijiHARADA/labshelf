import { NextRequest, NextResponse } from 'next/server';
import {
  addCategory,
  deleteCategoryInStore,
  getAllCategories,
  renameCategoryInStore,
} from '@/lib/books-store';
import { ensureBooksLoaded } from '@/lib/sheets-sync';
import {
  addCategoryToDatabase,
  bulkUpdateBookCategoryInDatabase,
  deleteCategoryFromDatabase,
  renameCategoryInDatabase,
  updateCategoryColorInDatabase,
} from '@/lib/books-db';
import {
  deleteCategoryColorOverride,
  renameCategoryColorOverride,
  setCategoryColorOverride,
} from '@/lib/spine-colors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidColor(value: string): boolean {
  const t = value.trim();
  if (t.length > 80) return false;
  if (t.startsWith('var(')) return true;
  return HEX_RE.test(t);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/categories/[name]'>
) {
  await ensureBooksLoaded();
  const { name } = await context.params;
  const currentName = decodeURIComponent(name).trim();
  const body = await request.json().catch(() => ({}));
  const nextName =
    typeof body?.newName === 'string' ? body.newName.trim() : '';
  const color =
    typeof body?.color === 'string' ? body.color.trim() : undefined;

  if (!currentName) {
    return NextResponse.json({ error: 'カテゴリ名が不正です' }, { status: 400 });
  }
  if (!getAllCategories().includes(currentName)) {
    return NextResponse.json(
      { error: 'カテゴリが見つかりません' },
      { status: 404 }
    );
  }
  if (nextName && nextName !== currentName && getAllCategories().includes(nextName)) {
    return NextResponse.json(
      { error: '変更先カテゴリ名は既に存在します' },
      { status: 409 }
    );
  }
  if (color !== undefined && (!color || !isValidColor(color))) {
    return NextResponse.json(
      { error: '色は #RRGGBB 形式、または CSS の var(...) で指定してください' },
      { status: 400 }
    );
  }

  const renamed = nextName && nextName !== currentName;
  const finalName = renamed ? nextName : currentName;

  try {
    if (renamed) {
      await bulkUpdateBookCategoryInDatabase(currentName, nextName);
      await renameCategoryInDatabase(currentName, nextName);
    }
    if (color !== undefined) {
      await updateCategoryColorInDatabase(finalName, color);
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'カテゴリ更新に失敗しました',
      },
      { status: 500 }
    );
  }

  if (renamed) {
    renameCategoryInStore(currentName, nextName);
    renameCategoryColorOverride(currentName, nextName);
  }
  if (color !== undefined) {
    setCategoryColorOverride(finalName, color);
  }

  return NextResponse.json({ success: true, category: finalName });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<'/api/categories/[name]'>
) {
  await ensureBooksLoaded();
  const { name } = await context.params;
  const target = decodeURIComponent(name).trim();
  const fallback = 'その他';

  if (!target) {
    return NextResponse.json({ error: 'カテゴリ名が不正です' }, { status: 400 });
  }
  if (target === fallback) {
    return NextResponse.json(
      { error: '「その他」は削除できません' },
      { status: 400 }
    );
  }
  if (!getAllCategories().includes(target)) {
    return NextResponse.json(
      { error: 'カテゴリが見つかりません' },
      { status: 404 }
    );
  }

  addCategory(fallback);
  try {
    await addCategoryToDatabase(fallback, null);
    await bulkUpdateBookCategoryInDatabase(target, fallback);
    await deleteCategoryFromDatabase(target);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'カテゴリ削除に失敗しました',
      },
      { status: 500 }
    );
  }

  const result = deleteCategoryInStore(target, fallback);
  deleteCategoryColorOverride(target);

  return NextResponse.json({
    success: true,
    movedBooks: result.movedBooks,
    fallbackCategory: fallback,
  });
}
