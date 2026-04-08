import type { Book, BookCategory, BookDimensions } from '@/types/book';

export const categoryColors: Record<BookCategory | string, string> = {
  プログラミング: 'var(--spine-blue)',
  機械学習: 'var(--spine-purple)',
  データサイエンス: 'var(--spine-teal)',
  '数学・統計': 'var(--spine-indigo)',
  'デザイン・UX': 'var(--spine-pink)',
  ビジネス: 'var(--spine-orange)',
  研究手法: 'var(--spine-green)',
  論文執筆: 'var(--spine-brown)',
  未分類: 'var(--spine-gray)',
  その他: 'var(--spine-gray)',
};

const colorPalette = [
  'var(--spine-red)',
  'var(--spine-orange)',
  'var(--spine-yellow)',
  'var(--spine-green)',
  'var(--spine-teal)',
  'var(--spine-blue)',
  'var(--spine-indigo)',
  'var(--spine-purple)',
  'var(--spine-pink)',
  'var(--spine-brown)',
  'var(--spine-navy)',
];

/** ユーザー指定（DB）やセッション内の上書き。キーはカテゴリ名 */
let categoryColorOverrides: Record<string, string> = {};

export function setCategoryColorOverrides(map: Record<string, string>): void {
  categoryColorOverrides = { ...map };
}

export function setCategoryColorOverride(category: string, color: string): void {
  const key = category.trim();
  categoryColorOverrides = { ...categoryColorOverrides, [key]: color };
}

export function renameCategoryColorOverride(oldName: string, newName: string): void {
  const from = oldName.trim();
  const to = newName.trim();
  if (!from || !to || from === to) return;
  const current = categoryColorOverrides[from];
  const next = { ...categoryColorOverrides };
  delete next[from];
  if (current) next[to] = current;
  categoryColorOverrides = next;
}

export function deleteCategoryColorOverride(category: string): void {
  const key = category.trim();
  if (!key) return;
  const next = { ...categoryColorOverrides };
  delete next[key];
  categoryColorOverrides = next;
}

export function getCategoryColorOverrides(): Record<string, string> {
  return { ...categoryColorOverrides };
}

/**
 * カテゴリに対応する1色（カテゴリ一覧アイコン・背表紙で共通）
 * - ユーザー指定色があれば最優先
 * - 既知ラベルは固定トークン
 * - それ以外はカテゴリ名のハッシュ（bookId は使わない＝カテゴリ変更で色が変わる）
 */
export function getCategoryColor(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return 'var(--spine-gray)';

  const override = categoryColorOverrides[trimmed];
  if (override) return override;

  if (categoryColors[trimmed]) {
    return categoryColors[trimmed];
  }

  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
}

/** @deprecated bookId は色計算に使わない。getCategoryColor と同じ */
export function getSpineColor(category: string, _bookId?: string): string {
  return getCategoryColor(category);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateThicknessFromPageCount(pageCount?: number): number {
  if (!pageCount || pageCount <= 0) return 22;
  // 概算: 紙厚 + 表紙分を加味
  return clamp(10 + pageCount * 0.055, 10, 60);
}

export function getNormalizedBookDimensions(
  dimensions?: BookDimensions
): { heightMm: number; widthMm: number; thicknessMm: number } {
  const estimatedThickness = estimateThicknessFromPageCount(dimensions?.pageCount);
  return {
    heightMm: clamp(dimensions?.heightMm ?? 210, 170, 320),
    widthMm: clamp(dimensions?.widthMm ?? 148, 105, 230),
    thicknessMm: clamp(dimensions?.thicknessMm ?? estimatedThickness, 10, 60),
  };
}

export function getSpineWidth(book: Book): number {
  const baseWidth = 28;
  const maxWidth = 48;
  const minWidth = 20;

  const { thicknessMm } = getNormalizedBookDimensions(book.dimensions);
  const normalized = (thicknessMm - 10) / (60 - 10);
  const width = baseWidth + normalized * (maxWidth - baseWidth);

  return clamp(width, minWidth, maxWidth);
}

export function getSpineHeight(book: Book): number {
  const baseHeight = 180;
  const variation = 40;
  const { heightMm } = getNormalizedBookDimensions(book.dimensions);
  const normalized = (heightMm - 170) / (320 - 170);
  return clamp(baseHeight + normalized * variation, 165, 220);
}

export function shouldHaveTexture(bookId: string): boolean {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = ((hash << 5) - hash) + bookId.charCodeAt(i);
  }
  return Math.abs(hash) % 3 === 0;
}

export function shouldHaveLabel(bookId: string): boolean {
  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = ((hash << 5) - hash) + bookId.charCodeAt(i);
  }
  return Math.abs(hash) % 4 !== 0;
}

export function getLabelPosition(bookId: string): 'top' | 'bottom' | 'none' {
  if (!shouldHaveLabel(bookId)) return 'none';

  let hash = 0;
  for (let i = 0; i < bookId.length; i++) {
    hash = ((hash << 5) - hash) + bookId.charCodeAt(i);
  }
  return Math.abs(hash) % 2 === 0 ? 'top' : 'bottom';
}
