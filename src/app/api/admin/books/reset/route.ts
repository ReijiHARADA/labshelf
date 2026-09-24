import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 蔵書の一括削除 API は無効化済みです。
 * 誤操作防止のため、リクエストを受け付けません。
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: 'この操作は無効化されています。蔵書データの一括削除はできません。',
    },
    { status: 410 }
  );
}
