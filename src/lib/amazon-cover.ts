const AMAZON_FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

const PROBE_OPTIONS = { headers: AMAZON_FETCH_HEADERS };
const FETCH_TIMEOUT_MS = 12_000;
const MIN_HTML_LENGTH = 1_200;
const PROBE_BYTE_LIMIT = 96_000;

export type CoverImageMetrics = {
  width: number;
  height: number;
  bytes: number;
};

/** Amazon CDN URL のサフィックスから想定長辺 px を推定 */
export function parseAmazonSizeHint(url: string): number | null {
  const patterns = [
    /[._]AC_SL(\d+)_/i,
    /[._]SL(\d+)_/i,
    /[._]UL(\d+)_/i,
    /[._]UX(\d+)_/i,
    /[._]SY(\d+)_/i,
    /[._]SX(\d+)_/i,
  ];
  let max = 0;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (!match?.[1]) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max > 0 ? max : null;
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! << 24) |
    (bytes[offset + 1]! << 16) |
    (bytes[offset + 2]! << 8) |
    bytes[offset + 3]!
  );
}

/** JPEG / PNG ヘッダからピクセルサイズを読む */
export function parseImageDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return {
      width: readUint32BE(bytes, 16),
      height: readUint32BE(bytes, 20),
    };
  }

  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1]!;
      const length = readUint16BE(bytes, offset + 2);
      if (length < 2) break;

      if (marker === 0xc0 || marker === 0xc2) {
        return {
          height: readUint16BE(bytes, offset + 5),
          width: readUint16BE(bytes, offset + 7),
        };
      }

      offset += 2 + length;
    }
  }

  return null;
}

export function compareCoverQuality(
  a: CoverImageMetrics | null,
  b: CoverImageMetrics | null
): number {
  const areaA = a ? a.width * a.height : 0;
  const areaB = b ? b.width * b.height : 0;
  if (areaA !== areaB) return areaA - areaB;
  return (a?.bytes ?? 0) - (b?.bytes ?? 0);
}

async function probeCoverImageMetrics(
  url: string,
  options: { headers?: HeadersInit } = {}
): Promise<CoverImageMetrics | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=0-${PROBE_BYTE_LIMIT - 1}`,
        ...(options.headers ?? {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok && response.status !== 206) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 16) return null;

    const parsed = parseImageDimensions(bytes);
    const totalHeader = response.headers.get('content-range');
    const totalMatch = totalHeader?.match(/\/(\d+)$/);
    const totalBytes = totalMatch
      ? Number.parseInt(totalMatch[1]!, 10)
      : Number.parseInt(response.headers.get('content-length') ?? '', 10);

    if (parsed && parsed.width > 0 && parsed.height > 0) {
      return {
        width: parsed.width,
        height: parsed.height,
        bytes: Number.isFinite(totalBytes) ? totalBytes : bytes.length,
      };
    }

    const hint = parseAmazonSizeHint(url);
    if (hint) {
      return { width: hint, height: hint, bytes: bytes.length };
    }

    return null;
  } catch {
    return null;
  }
}

async function isCoverBetterThan(
  currentUrl: string | undefined,
  candidateUrl: string,
  options: { headers?: HeadersInit } = {}
): Promise<boolean> {
  if (!candidateUrl.trim()) return false;
  if (!currentUrl?.trim()) return true;

  const [currentMetrics, candidateMetrics] = await Promise.all([
    probeCoverImageMetrics(currentUrl, options),
    probeCoverImageMetrics(candidateUrl, options),
  ]);

  return compareCoverQuality(candidateMetrics, currentMetrics) > 0;
}

async function pickBestCoverUrl(
  candidates: string[],
  options: { currentCoverUrl?: string; probeOptions?: { headers?: HeadersInit } } = {}
): Promise<string | null> {
  const unique = [...new Set(candidates.map((url) => url.trim()).filter(Boolean))];
  if (unique.length === 0) return null;

  const scored = await Promise.all(
    unique.map(async (url) => ({
      url,
      metrics: await probeCoverImageMetrics(url, options.probeOptions),
    }))
  );

  const valid = scored.filter((entry) => entry.metrics);
  if (valid.length === 0) return null;

  valid.sort((a, b) => compareCoverQuality(b.metrics, a.metrics));
  const best = valid[0]!;
  if (!options.currentCoverUrl?.trim()) return best.url;

  const currentMetrics = await probeCoverImageMetrics(
    options.currentCoverUrl,
    options.probeOptions
  );
  return compareCoverQuality(best.metrics, currentMetrics) > 0 ? best.url : null;
}

export type AmazonCoverHints = {
  title?: string;
  author?: string;
  /** これより解像度が高い場合のみ返す */
  currentCoverUrl?: string;
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

function uniqueUpgradedAmazonUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    if (!raw) continue;
    const url = upgradeAmazonImageUrl(decodeHtmlUrl(raw));
    if (!isAmazonImageUrl(url) || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function extractDynamicImageUrls(html: string): string[] {
  const urls: string[] = [];
  const matches = html.matchAll(/data-a-dynamic-image="(\{[^"]+\})"/g);
  for (const match of matches) {
    if (!match[1]) continue;
    try {
      const json = decodeHtmlUrl(match[1].replace(/&quot;/g, '"'));
      const parsed = JSON.parse(json) as Record<string, unknown>;
      urls.push(...Object.keys(parsed));
    } catch {
      // ignore malformed JSON
    }
  }
  return urls;
}

/** 商品詳細ページ HTML から表紙候補 URL を優先度順に収集 */
export function extractAllCoverCandidatesFromProductHtml(html: string): string[] {
  const ordered: string[] = [];

  const pushMatches = (pattern: RegExp) => {
    for (const match of html.matchAll(pattern)) {
      if (match[1]) ordered.push(match[1]);
    }
  };

  pushMatches(/"hiRes":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g);
  pushMatches(/"large":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g);
  pushMatches(/"mainUrl":"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g);
  pushMatches(/data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g);
  ordered.push(...extractDynamicImageUrls(html));

  const landing = html.match(/id="landingImage"[^>]*\ssrc="(https:\/\/[^"]+)"/i)?.[1];
  if (landing) ordered.push(landing);
  const imgBlkFront = html.match(/id="imgBlkFront"[^>]*\ssrc="(https:\/\/[^"]+)"/i)?.[1];
  if (imgBlkFront) ordered.push(imgBlkFront);

  pushMatches(
    /"(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\._[A-Z0-9_,]+_\.(?:jpg|png|webp))"/gi
  );

  const ogImage = html.match(/property="og:image"\s+content="(https:\/\/[^"]+)"/i)?.[1];
  if (ogImage) ordered.push(ogImage);

  return uniqueUpgradedAmazonUrls(ordered);
}

/** 商品ページ HTML から最良候補 URL を抽出（後方互換） */
export function extractCoverFromProductHtml(html: string): string | null {
  const candidates = extractAllCoverCandidatesFromProductHtml(html);
  return candidates[0] ?? null;
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

/** 検索結果 HTML から先頭商品の表紙 URL を抽出（低解像度・最終手段） */
export function extractCoverFromSearchHtml(html: string): string | null {
  const patterns = [
    /<img[^>]*class="[^"]*s-image[^"]*"[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/i,
    /<img[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"[^>]*class="[^"]*s-image/i,
    /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+._%-]+\._[A-Z0-9_,]+_\.(?:jpg|png|webp))"/i,
  ];

  const raw = patterns.map((pattern) => html.match(pattern)?.[1] ?? null).find(Boolean);
  if (!raw) return null;
  const url = upgradeAmazonImageUrl(decodeHtmlUrl(raw));
  return isAmazonImageUrl(url) ? url : null;
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
    const response = await fetchWithTimeout(url, { method: 'GET' });
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

async function filterValidCoverCandidates(urls: string[]): Promise<string[]> {
  const valid: string[] = [];
  for (const url of urls) {
    const metrics = await probeCoverImageMetrics(url, PROBE_OPTIONS);
    if (metrics) valid.push(url);
  }
  return valid;
}

/** 商品詳細ページ (/dp/{asin}) から表紙を取得 */
async function resolveCoverFromProductPage(
  asin: string,
  currentCoverUrl?: string
): Promise<string | null> {
  const html = await fetchAmazonHtml(`https://www.amazon.co.jp/dp/${asin}`);
  const allCandidates = uniqueUpgradedAmazonUrls([
    buildAmazonProductImageUrl(asin),
    ...(html ? extractAllCoverCandidatesFromProductHtml(html) : []),
  ]);

  const validCandidates = await filterValidCoverCandidates(allCandidates);
  const pool = validCandidates.length > 0 ? validCandidates : allCandidates;

  const best = await pickBestCoverUrl(pool, {
    currentCoverUrl,
    probeOptions: PROBE_OPTIONS,
  });
  if (best) return best;

  if (currentCoverUrl) return null;
  for (const url of allCandidates) {
    if (await isValidAmazonCoverUrl(url)) return url;
  }
  return null;
}

async function resolveCoverFromSearch(
  query: string,
  currentCoverUrl?: string
): Promise<string | null> {
  const searchHtml = await fetchAmazonHtml(buildAmazonSearchUrl(query));
  if (!searchHtml) return null;

  const asin = extractFirstAsinFromSearchHtml(searchHtml);
  if (asin) {
    const fromProduct = await resolveCoverFromProductPage(asin, currentCoverUrl);
    if (fromProduct) return fromProduct;
  }

  const fromSearchImage = extractCoverFromSearchHtml(searchHtml);
  if (!fromSearchImage) return null;
  if (!(await isValidAmazonCoverUrl(fromSearchImage))) return null;

  if (!currentCoverUrl) return fromSearchImage;
  return (await isCoverBetterThan(currentCoverUrl, fromSearchImage, PROBE_OPTIONS))
    ? fromSearchImage
    : null;
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
 * Amazon 商品詳細ページを優先し、現状より高解像度の表紙があれば返す。
 */
export async function fetchAmazonCoverImage(
  isbn: string,
  hints: AmazonCoverHints = {}
): Promise<string | null> {
  const { currentCoverUrl, ...searchHints } = hints;
  const isbn10 = resolveIsbn10(isbn);
  const isbn13 = resolveIsbn13(isbn);
  const lookupKey = isbn13 ?? normalizeIsbnDigits(isbn);

  if (!isbn10 && !lookupKey && !searchHints.title) return null;

  if (isbn10) {
    const fromProduct = await resolveCoverFromProductPage(isbn10, currentCoverUrl);
    if (fromProduct) return fromProduct;
  }

  const isbnQueries = [...new Set([lookupKey, isbn10].filter(Boolean) as string[])];
  for (const query of isbnQueries) {
    const fromIsbnSearch = await resolveCoverFromSearch(query, currentCoverUrl);
    if (fromIsbnSearch) return fromIsbnSearch;
  }

  for (const query of buildTitleSearchQueries(searchHints)) {
    const fromTitleSearch = await resolveCoverFromSearch(query, currentCoverUrl);
    if (fromTitleSearch) return fromTitleSearch;
  }

  return null;
}
