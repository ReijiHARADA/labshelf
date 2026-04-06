import { NextRequest, NextResponse } from 'next/server';
import { fetchBookInfo } from '@/lib/book-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await params;
  
  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBNが指定されていません' },
      { status: 400 }
    );
  }
  
  const bookInfo = await fetchBookInfo(isbn);
  
  if (!bookInfo) {
    return NextResponse.json(
      { error: '書籍情報が見つかりませんでした', isbn },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    success: true,
    book: bookInfo,
  });
}
