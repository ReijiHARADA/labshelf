import type { Book } from '@/types/book';

const DEFAULT_COVER_ASPECT_RATIO = 148 / 210;
const aspectRatioCache = new Map<string, number>();

export function normalizeCoverUrl(url?: string): string | undefined {
  return url?.replace(/^http:\/\//, 'https://');
}

export function getDefaultCoverAspectRatio(): number {
  return DEFAULT_COVER_ASPECT_RATIO;
}

function clampAspectRatio(ratio: number): number {
  return Math.max(0.25, Math.min(3, ratio));
}

export function cacheCoverAspectRatio(url: string, ratio: number): void {
  const normalized = normalizeCoverUrl(url);
  if (!normalized || !Number.isFinite(ratio) || ratio <= 0) return;
  aspectRatioCache.set(normalized, clampAspectRatio(ratio));
}

export function getCachedCoverAspectRatio(url?: string): number | undefined {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return undefined;
  return aspectRatioCache.get(normalized);
}

/** キャッシュ済みの表紙比率。未読込時はデフォルト比率 */
export function getCoverAspectRatio(book: Book): number {
  return getCachedCoverAspectRatio(book.coverImageUrl) ?? DEFAULT_COVER_ASPECT_RATIO;
}

export function loadCoverAspectRatio(url?: string): Promise<number> {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return Promise.resolve(DEFAULT_COVER_ASPECT_RATIO);

  const cached = aspectRatioCache.get(normalized);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? clampAspectRatio(img.naturalWidth / img.naturalHeight)
          : DEFAULT_COVER_ASPECT_RATIO;
      aspectRatioCache.set(normalized, ratio);
      resolve(ratio);
    };
    img.onerror = () => resolve(DEFAULT_COVER_ASPECT_RATIO);
    img.src = normalized;
  });
}

export function getCoverSizeFromHeight(
  aspectRatio: number,
  height: number
): { width: number; height: number } {
  return {
    width: Math.round(aspectRatio * height),
    height: Math.round(height),
  };
}

export function getBookCoverSizeFromHeight(
  book: Book,
  height: number,
  aspectRatio = getCoverAspectRatio(book)
): { width: number; height: number } {
  return getCoverSizeFromHeight(aspectRatio, height);
}
