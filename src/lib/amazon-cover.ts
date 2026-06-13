const AMAZON_FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

const FETCH_TIMEOUT_MS = 12_000;
const MIN_HTML_LENGTH = 1_200;

export type AmazonCoverHints = {
  title?: string;
  author?: string;
};

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
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function isAmazonImageUrl(url: string): boolean {
  return /media-amazon\.com\/images\/(I|P)\//i.test(url);
}

function normalizeSearchQuery(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildAmazonSearchUrl(query: string, category = 'stripbooks'): string {
  const params = new URLSearchParams({ k: query, i: category });
  return `https://www.amazon.co.jp/s?${params.toString()}`;
}

function pickFirstAmazonImageUrl(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const url = upgradeAmazonImageUrl(decodeHtmlUrl(candidate));
    if (isAmazonImageUrl(url)) return url;
  }
  return null;
}

/** 商品ページ HTML からメイン画像（1枚目）URLを抽出 */
export function extractCoverFromProductHtml(html: string): string | null {
  const patterns = [
    /property="og:image"\s+content="(https:\/\/[^"]+)"/i,
    /"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"mainUrl":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /id="landingImage"[^>]*\ssrc="(https:\/\/[^"]+)"/,
    /id="imgBlkFront"[^>]*\ssrc="(https:\/\/[^"]+)"/,
    /data-a-dynamic-image="\{&quot;(https:\/\/m\.media-amazon\.com\/images\/I\/[^&]+)/,
    /"(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\._[A-Z0-9_,]+_\.(?:jpg|png|webp))"/i,
  ];

  return pickFirstAmazonImageUrl(
    patterns.map((pattern) => html.match(pattern)?.[1] ?? null)
  );
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

/** 検索結果 HTML から先頭商品の表紙 URL を抽出 */
export function extractCoverFromSearchHtml(html: string): string | null {
  const patterns = [
    /<img[^>]*class="[^"]*s-image[^"]*"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/i,
    /<img[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"[^>]*class="[^"]*s-image/i,
    /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\._[A-Z0-9_,]+_\.(?:jpg|png|webp))"/i,
  ];

  return pickFirstAmazonImageUrl(
    patterns.map((pattern) => html.match(pattern)?.[1] ?? null)
  );
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

function isLikelyRealImage(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const isTinyGif =
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes.length < 200;

  if (isTinyGif) return false;
  return isJpeg || isPng || isWebp || bytes.length > 500;
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
    let response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) return false;

    const sample = new Uint8Array(await response.arrayBuffer());
    return isLikelyRealImage(sample);
  } catch {
    return false;
  }
}

async function fetchAmazonHtml(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;
    const html = await response.text();
    if (html.length < MIN_HTML_LENGTH) return null;
    return html;
  } catch {
    return null;
  }
}

async function acceptCoverUrl(
  url: string | null,
  options: { trustWithoutValidation?: boolean } = {}
): Promise<string | null> {
  if (!url || !isAmazonImageUrl(url)) return null;
  if (await isValidAmazonCoverUrl(url)) return url;
  return options.trustWithoutValidation ? url : null;
}

async function resolveCoverFromProductPage(asin: string): Promise<string | null> {
  const html = await fetchAmazonHtml(`https://www.amazon.co.jp/dp/${asin}`);
  if (html) {
    const fromHtml = await acceptCoverUrl(extractCoverFromProductHtml(html), {
      trustWithoutValidation: true,
    });
    if (fromHtml) return fromHtml;
  }

  const cdnUrl = buildAmazonProductImageUrl(asin);
  return acceptCoverUrl(cdnUrl);
}

async function resolveCoverFromSearch(query: string): Promise<string | null> {
  const searchHtml = await fetchAmazonHtml(buildAmazonSearchUrl(query));
  if (!searchHtml) return null;

  const fromSearchImage = await acceptCoverUrl(extractCoverFromSearchHtml(searchHtml), {
    trustWithoutValidation: true,
  });
  if (fromSearchImage) return fromSearchImage;

  const asin = extractFirstAsinFromSearchHtml(searchHtml);
  if (!asin) return null;

  return resolveCoverFromProductPage(asin);
}

function buildTitleSearchQueries(hints: AmazonCoverHints): string[] {
  const title = normalizeSearchQuery(hints.title);
  const author = normalizeSearchQuery(hints.author);
  if (!title) return [];

  const queries = [title];
  if (author) queries.push(`${title} ${author}`);
  return [...new Set(queries)];
}

/**
 * Amazon 商品ページのメイン画像（1枚目）を ISBN / タイトルから取得する。
 */
export async function fetchAmazonCoverImage(
  isbn: string,
  hints: AmazonCoverHints = {}
): Promise<string | null> {
  const isbn10 = resolveIsbn10(isbn);
  const isbn13 = resolveIsbn13(isbn);
  const lookupKey = isbn13 ?? normalizeIsbnDigits(isbn);

  if (!isbn10 && !lookupKey && !hints.title) return null;

  if (isbn10) {
    const fromProduct = await resolveCoverFromProductPage(isbn10);
    if (fromProduct) return fromProduct;
  }

  const isbnQueries = [...new Set([lookupKey, isbn10].filter(Boolean) as string[])];
  for (const query of isbnQueries) {
    const fromIsbnSearch = await resolveCoverFromSearch(query);
    if (fromIsbnSearch) return fromIsbnSearch;
  }

  for (const query of buildTitleSearchQueries(hints)) {
    const fromTitleSearch = await resolveCoverFromSearch(query);
    if (fromTitleSearch) return fromTitleSearch;
  }

  return null;
}
