import { NextRequest, NextResponse } from 'next/server';
import { backfillMissingDimensions } from '@/lib/sheets-sync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 300;

  const result = await backfillMissingDimensions(
    Number.isFinite(limit) && limit > 0 ? limit : 300
  );

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
