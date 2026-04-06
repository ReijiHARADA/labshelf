import { NextRequest, NextResponse } from 'next/server';
import { getBookById, getRelatedBooks } from '@/lib/books-store';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
