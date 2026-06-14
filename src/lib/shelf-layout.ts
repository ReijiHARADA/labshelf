import type { Book } from '@/types/book';
import { getSpineWidth } from '@/lib/spine-colors';

export const SHELF_ROW_PADDING = 32;
export const SHELF_BOOK_GAP = 5;

export function splitBooksIntoShelves(
  books: Book[],
  shelfInnerWidth: number,
  maxRows: number
): Book[][] {
  const rows: Book[][] = [];
  let currentRow: Book[] = [];
  let currentWidth = 0;
  const maxWidth = Math.max(200, shelfInnerWidth - SHELF_ROW_PADDING);

  for (const book of books) {
    const bookWidth = getSpineWidth(book);
    const gap = currentRow.length > 0 ? SHELF_BOOK_GAP : 0;
    const needed = bookWidth + gap;

    if (currentWidth + needed > maxWidth && currentRow.length > 0) {
      rows.push(currentRow);
      if (rows.length >= maxRows) break;
      currentRow = [book];
      currentWidth = bookWidth;
      continue;
    }

    currentRow.push(book);
    currentWidth += needed;
  }

  if (currentRow.length > 0 && rows.length < maxRows) {
    rows.push(currentRow);
  }

  return rows;
}

export function computeRowGap(
  books: Book[],
  shelfInnerWidth: number,
  isLastRow = false
): number {
  if (books.length <= 1) return 0;
  if (isLastRow) return SHELF_BOOK_GAP;

  const totalBooksWidth = books.reduce((sum, book) => sum + getSpineWidth(book), 0);
  const available = shelfInnerWidth - SHELF_ROW_PADDING;
  const slack = available - totalBooksWidth;

  return Math.max(SHELF_BOOK_GAP, slack / (books.length - 1));
}
