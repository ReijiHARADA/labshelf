import { NextRequest, NextResponse } from 'next/server';
import { addCategory, getAllCategories } from '@/lib/books-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({
    categories: getAllCategories(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const category = typeof body?.category === 'string' ? body.category : '';
  const result = addCategory(category);

  return NextResponse.json({
    success: result.success,
    message: result.message,
    categories: getAllCategories(),
  });
}
