import { NextRequest, NextResponse } from 'next/server';
import { syncFromGoogleSheets, syncFromISBNList } from '@/lib/sheets-sync';
import { getSyncStatus, getSyncLogs } from '@/lib/books-store';

export async function GET() {
  const status = getSyncStatus();
  const logs = getSyncLogs();

  return NextResponse.json({
    status,
    logs: logs.slice(0, 20),
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    try {
      const body = await request.json();
      
      if (body.isbns && Array.isArray(body.isbns)) {
        const result = await syncFromISBNList(body.isbns);
        return NextResponse.json({
          success: result.success,
          books: result.books,
          bookCount: result.books.length,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
    }
  }
  
  const result = await syncFromGoogleSheets();

  return NextResponse.json({
    success: result.success,
    bookCount: result.bookCount,
    errors: result.errors,
    duration: result.duration,
    timestamp: new Date().toISOString(),
  });
}
