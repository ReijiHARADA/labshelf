const AMAZON_FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

const FETCH_TIMEOUT_MS = 12_000;

function normalizeIsbnDigits(isbn: string): string {
  return isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
}

/** ISBN-13 (978…) を ISBN-10 に変換。変換できない場合は null */
export function isbn13ToIsbn10(isbn13: string): string | null {
  const digits = normalizeIsbnDigits(isbn13);
  if (digits.length !== 13 || !digits.startsWith('978')) return null;

  const core = digits.slice(3, 12);
  if (!/^\d{9}$/.test(core)) return null;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(core[i]!, 10) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  const checkChar = check === 10 ? 'X' : String(check);
  return `${core}${checkChar}`;
}

function resolveIsbn10(isbn: string): string | null {
  const normalized = normalizeIsbnDigits(isbn);
  if (normalized.length === 10) return normalized;
  if (normalized.length === 13) return isbn13ToIsbn10(normalized);
  return null;
}

function resolveIsbn13(isbn: string): string | null {
  const normalized = normalizeIsbnDigits(isbn).replace(/X/g, '');
  return normalized.length === 13 ? normalized : null;
}

function decodeHtmlUrl(value: string): string {
  return value
    .replace(/\\u002F/g, '/')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, '&');
}

/** 商品ページ HTML からメイン画像（1枚目）URLを抽出 */
export function extractCoverFromProductHtml(html: string): string | null {
  const patterns = [
    /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /id="landingImage"[^>]*\ssrc="(https:\/\/[^"]+)"/,
    /id="imgBlkFront"[^>]*\ssrc="(https:\/\/[^"]+)"/,
    /"(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const url = upgradeAmazonImageUrl(decodeHtmlUrl(match[1]));
    if (url.includes('media-amazon.com/images/')) return url;
  }

  return null;
}

export function extractFirstAsinFromSearchHtml(html: string): string | null {
  const dataAsinMatches = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)];
  for (const match of dataAsinMatches) {
    const asin = match[1];
    if (asin && asin !== '0000000000') return asin;
  }

  const dpMatch = html.match(/\/dp\/([A-Z0-9]{10})/);
  return dpMatch?.[1] ?? null;
}

/** 可能なら高解像度の Amazon CDN URL に正規化 */
export function upgradeAmazonImageUrl(url: string): string {
  const normalized = decodeHtmlUrl(url.trim()).replace(/^http:/, 'https:');

  if (normalized.includes('/images/P/')) {
    return normalized.replace(/\._[A-Z0-9_,]+_\.(?=jpg|png|webp)/i, '._SL1500_.');
  }

  return normalized
    .replace(/\._[A-Z]{2}_[A-Z0-9_,]+_\.(?=jpg|png|webp)/i, '._AC_SL1500_.')
    .replace(/\._[A-Z0-9_,]+_\.(?=jpg|png|webp)/i, '._AC_SL1500_.');
}

export function buildAmazonProductImageUrl(asin: string): string {
  return `https://m.media-amazon.com/images/P/${asin}.09._SL1500_.jpg`;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...AMAZON_FETCH_HEADERS,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

/** 1x1 プレースホルダ GIF 等を除外 */
export async function isValidAmazonCoverUrl(url: string): Promise<boolean> {
  try {
    let response = await fetchWithTimeout(url, { method: 'HEAD' });
    if (response.status === 405 || response.status === 403) {
      response = await fetchWithTimeout(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023' },
      });
    }
    if (!response.ok) return false;

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);

    if (!contentType.startsWith('image/')) return false;
    if (contentType.includes('gif') && contentLength > 0 && contentLength < 200) return false;
    if (contentLength > 0 && contentLength < 200) return false;

    return true;
  } catch {
    return false;
  }
}

async function fetchAmazonHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length < 5_000) return null;
    return html;
  } catch {
    return null;
  }
}

async function resolveCoverFromProductPage(asin: string): Promise<string | null> {
  const html = await fetchAmazonHtml(`https://www.amazon.co.jp/dp/${asin}`);
  if (!html) return null;

  const fromHtml = extractCoverFromProductHtml(html);
  if (fromHtml && (await isValidAmazonCoverUrl(fromHtml))) {
    return fromHtml;
  }

  const cdnUrl = buildAmazonProductImageUrl(asin);
  if (await isValidAmazonCoverUrl(cdnUrl)) {
    return cdnUrl;
  }

  return null;
}

/**
 * Amazon 商品ページのメイン画像（1枚目）を ISBN から取得する。
 * 商品ページ HTML → CDN URL の順で試行し、既存 API のフォールバック用。
 */
export async function fetchAmazonCoverImage(isbn: string): Promise<string | null> {
  const isbn10 = resolveIsbn10(isbn);
  const isbn13 = resolveIsbn13(isbn);
  const lookupKey = isbn13 ?? normalizeIsbnDigits(isbn);

  if (!isbn10 && !lookupKey) return null;

  if (isbn10) {
    const fromProduct = await resolveCoverFromProductPage(isbn10);
    if (fromProduct) return fromProduct;
  }

  if (lookupKey) {
    const searchHtml = await fetchAmazonHtml(
      `https://www.amazon.co.jp/s?k=${encodeURIComponent(lookupKey)}&i=stripbooks`
    );
    const asin = searchHtml ? extractFirstAsinFromSearchHtml(searchHtml) : null;
    if (asin && asin !== isbn10) {
      const fromSearch = await resolveCoverFromProductPage(asin);
      if (fromSearch) return fromSearch;
    }
  }

  return null;
}
