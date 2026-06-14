import { NextRequest, NextResponse } from 'next/server';
import { consolidateLegacyCategories } from '@/lib/consolidate-categories';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function requireReclassifyToken(request: NextRequest): boolean {
  const expected = process.env.RECLASSIFY_ADMIN_TOKEN;
  if (!expected) return false;
  const got =
    request.headers.get('x-reclassify-token') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  return got === expected;
}

export async function POST(request: NextRequest) {
  if (!process.env.RECLASSIFY_ADMIN_TOKEN) {
    return NextResponse.json(
      { error: 'RECLASSIFY_ADMIN_TOKEN が設定されていません' },
      { status: 403 }
    );
  }

  if (!requireReclassifyToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await consolidateLegacyCategories();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'カテゴリ統合に失敗しました',
      },
      { status: 500 }
    );
  }
}
