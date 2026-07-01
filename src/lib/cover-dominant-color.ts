import { normalizeCoverUrl } from '@/lib/cover-aspect-ratio';

const colorCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/** 背表紙用: 白文字が読めるよう彩度・明度を調整 */
function toneForSpine(r: number, g: number, b: number): string {
  const { h, s, l } = rgbToHsl(r, g, b);
  const adjusted = hslToRgb(
    h,
    clamp(s * 1.12 + 0.06, 0.12, 0.92),
    clamp(l, 0.26, 0.5)
  );
  return `rgb(${adjusted.r}, ${adjusted.g}, ${adjusted.b})`;
}

function extractDominantColor(img: HTMLImageElement): string | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  const w = 48;
  const h = Math.max(
    24,
    Math.round(w * (img.naturalHeight / Math.max(img.naturalWidth, 1)))
  );
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }

  const buckets = new Map<string, { r: number; g: number; b: number; weight: number }>();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data.data[i]!;
      const g = data.data[i + 1]!;
      const b = data.data[i + 2]!;
      const a = data.data[i + 3]!;
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2 / 255;
      if (lightness > 0.94 || lightness < 0.06) continue;

      const chroma = max - min;
      if (chroma < 12 && lightness > 0.75) continue;

      const qr = Math.round(r / 20) * 20;
      const qg = Math.round(g / 20) * 20;
      const qb = Math.round(b / 20) * 20;
      const key = `${qr},${qg},${qb}`;

      // 左端（背表紙付近）を多めにサンプル
      const edgeWeight = x / w < 0.22 ? 3 : 1;
      const satWeight = 1 + chroma / 255;
      const weight = edgeWeight * satWeight;

      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0 };
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      bucket.weight += weight;
      buckets.set(key, bucket);
    }
  }

  let best: { r: number; g: number; b: number; weight: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.weight > best.weight) best = bucket;
  }

  if (!best || best.weight <= 0) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;
    for (let i = 0; i < data.data.length; i += 4) {
      if (data.data[i + 3]! < 128) continue;
      rSum += data.data[i]!;
      gSum += data.data[i + 1]!;
      bSum += data.data[i + 2]!;
      count++;
    }
    if (count === 0) return null;
    return toneForSpine(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count));
  }

  return toneForSpine(
    Math.round(best.r / best.weight),
    Math.round(best.g / best.weight),
    Math.round(best.b / best.weight)
  );
}

export function getCachedCoverDominantColor(url?: string): string | undefined {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return undefined;
  return colorCache.get(normalized);
}

export function cacheCoverDominantColor(url: string, color: string): void {
  const normalized = normalizeCoverUrl(url);
  if (!normalized || !color.trim()) return;
  colorCache.set(normalized, color);
}

export function loadCoverDominantColor(url?: string): Promise<string | null> {
  const normalized = normalizeCoverUrl(url);
  if (!normalized) return Promise.resolve(null);

  const cached = colorCache.get(normalized);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(normalized);
  if (inflight) return inflight;

  const promise = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const color = extractDominantColor(img);
      if (color) colorCache.set(normalized, color);
      pending.delete(normalized);
      resolve(color);
    };

    img.onerror = () => {
      pending.delete(normalized);
      resolve(null);
    };

    img.src = normalized;
  });

  pending.set(normalized, promise);
  return promise;
}
