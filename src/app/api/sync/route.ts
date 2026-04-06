import { NextResponse } from 'next/server';
import { syncFromGoogleSheets } from '@/lib/sheets-sync';
import { getSyncStatus, getSyncLogs } from '@/lib/books-store';

export async function GET() {
  const status = getSyncStatus();
  const logs = getSyncLogs();

  return NextResponse.json({
    status,
    logs: logs.slice(0, 20),
  });
}

export async function POST() {
  const result = await syncFromGoogleSheets();

  return NextResponse.json({
    success: result.success,
    bookCount: result.bookCount,
    errors: result.errors,
    duration: result.duration,
    timestamp: new Date().toISOString(),
  });
}
