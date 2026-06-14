import type { Book } from '@/types/book';

function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

function extractFirstItem(xml: string): string | null {
  const match = xml.match(/<item>([\s\S]*?)<\/item>/);
  return match?.[1] ?? null;
}

function extractTagValue(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`);
  const match = block.match(re);
  if (!match?.[1]) return undefined;
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() || undefined;
}

function parsePublishedYear(value?: string): number {
  if (!value) return new Date().getFullYear();
  const match = value.match(/(\d{4})/);
  return match ? Number.parseInt(match[1], 10) : new Date().getFullYear();
}

/**
 * 国立国会図書館サーチ OpenSearch から書誌情報を取得する。
 * OpenBD / Google Books に無い日本語書籍のフォールバック用。
 */
export async function fetchBookInfoFromNDL(isbn: string): Promise<Partial<Book> | null> {
  const normalizedISBN = normalizeISBN(isbn);
  if (!normalizedISBN || normalizedISBN.length < 10) return null;

  try {
    const response = await fetch(
      `https://ndlsearch.ndl.go.jp/api/opensearch?isbn=${encodeURIComponent(normalizedISBN)}`
    );

    if (!response.ok) {
      console.error(`NDL OpenSearch API error: ${response.status}`);
      return null;
    }

    const xml = await response.text();
    const totalMatch = xml.match(/<openSearch:totalResults>(\d+)<\/openSearch:totalResults>/);
    const total = totalMatch ? Number.parseInt(totalMatch[1], 10) : 0;
    if (!total) return null;

    const item = extractFirstItem(xml);
    if (!item) return null;

    const title = extractTagValue(item, 'dc:title');
    if (!title) return null;

    const author = extractTagValue(item, 'dc:creator');
    const publisher = extractTagValue(item, 'dc:publisher');
    const date =
      extractTagValue(item, 'dcterms:issued') || extractTagValue(item, 'dc:date');

    return {
      isbn: normalizedISBN,
      title,
      author: author || '',
      publisher: publisher || '',
      publishedYear: parsePublishedYear(date),
    };
  } catch (error) {
    console.error('NDL OpenSearch fetch error:', error);
    return null;
  }
}
