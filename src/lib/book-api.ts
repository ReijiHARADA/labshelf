import type { Book } from '@/types/book';

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    language?: string;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface OpenBDResponse {
  summary?: {
    isbn?: string;
    title?: string;
    volume?: string;
    series?: string;
    publisher?: string;
    pubdate?: string;
    cover?: string;
    author?: string;
  };
  onix?: {
    DescriptiveDetail?: {
      Extent?: Array<{
        ExtentType?: string;
        ExtentValue?: string;
      }>;
      Measure?: Array<{
        MeasureType?: string;
        Measurement?: string;
        MeasureUnitCode?: string;
      }>;
      TitleDetail?: {
        TitleElement?: {
          TitleText?: { content?: string };
          Subtitle?: { content?: string };
        };
      };
      Contributor?: Array<{
        PersonName?: { content?: string };
        ContributorRole?: string[];
      }>;
    };
    CollateralDetail?: {
      TextContent?: Array<{
        TextType?: string;
        Text?: string;
      }>;
    };
  };
}

function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

function toMm(measurement?: string, unitCode?: string): number | undefined {
  if (!measurement) return undefined;
  const v = Number.parseFloat(measurement);
  if (!Number.isFinite(v) || v <= 0) return undefined;
  if (!unitCode || unitCode === 'mm') return v;
  if (unitCode === 'cm') return v * 10;
  return undefined;
}

function estimateDimensions(params: {
  pageCount?: number;
  heightMm?: number;
  widthMm?: number;
  thicknessMm?: number;
}) {
  const pageCount = params.pageCount;
  const heightMm = params.heightMm ?? 210;
  const widthMm = params.widthMm ?? 148;
  const thicknessMm =
    params.thicknessMm ??
    (pageCount && pageCount > 0 ? Math.max(10, Math.min(60, 10 + pageCount * 0.055)) : 22);
  return { heightMm, widthMm, thicknessMm, pageCount };
}

export async function fetchBookInfoFromGoogleBooks(isbn: string): Promise<Partial<Book> | null> {
  const normalizedISBN = normalizeISBN(isbn);
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${normalizedISBN}&maxResults=1`
    );
    
    if (!response.ok) {
      console.error(`Google Books API error: ${response.status}`);
      return null;
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    const volume = data.items[0].volumeInfo;
    
    let publishedYear = new Date().getFullYear();
    if (volume.publishedDate) {
      const match = volume.publishedDate.match(/(\d{4})/);
      if (match) {
        publishedYear = parseInt(match[1], 10);
      }
    }
    
    const imageLink =
      volume.imageLinks?.thumbnail ||
      volume.imageLinks?.smallThumbnail;

    return {
      isbn: normalizedISBN,
      title: volume.title || '',
      subtitle: volume.subtitle,
      author: volume.authors?.join(', ') || '',
      publisher: volume.publisher || '',
      publishedYear,
      description: volume.description,
      coverImageUrl: imageLink?.replace('http:', 'https:'),
      tags: volume.categories || [],
      dimensions: {
        ...estimateDimensions({ pageCount: volume.pageCount }),
        source: 'estimated',
      },
    };
  } catch (error) {
    console.error('Google Books API fetch error:', error);
    return null;
  }
}

export async function fetchBookInfoFromOpenBD(isbn: string): Promise<Partial<Book> | null> {
  const normalizedISBN = normalizeISBN(isbn);
  
  try {
    const response = await fetch(
      `https://api.openbd.jp/v1/get?isbn=${normalizedISBN}`
    );
    
    if (!response.ok) {
      console.error(`OpenBD API error: ${response.status}`);
      return null;
    }
    
    const data: (OpenBDResponse | null)[] = await response.json();
    
    if (!data || !data[0]) {
      return null;
    }
    
    const book = data[0];
    const summary = book.summary;
    const onix = book.onix;
    
    if (!summary) {
      return null;
    }
    
    let publishedYear = new Date().getFullYear();
    if (summary.pubdate) {
      const match = summary.pubdate.match(/(\d{4})/);
      if (match) {
        publishedYear = parseInt(match[1], 10);
      }
    }
    
    let description: string | undefined;
    const textContents = onix?.CollateralDetail?.TextContent;
    if (textContents) {
      const descContent = textContents.find(tc => tc.TextType === '03' || tc.TextType === '02');
      description = descContent?.Text;
    }
    
    const measure = onix?.DescriptiveDetail?.Measure ?? [];
    const heightMm = toMm(
      measure.find((m) => m.MeasureType === '01')?.Measurement,
      measure.find((m) => m.MeasureType === '01')?.MeasureUnitCode
    );
    const widthMm = toMm(
      measure.find((m) => m.MeasureType === '02')?.Measurement,
      measure.find((m) => m.MeasureType === '02')?.MeasureUnitCode
    );
    const thicknessMm = toMm(
      measure.find((m) => m.MeasureType === '03')?.Measurement,
      measure.find((m) => m.MeasureType === '03')?.MeasureUnitCode
    );
    const onixPageCount = onix?.DescriptiveDetail?.Extent?.find((e) => e.ExtentType === '11')?.ExtentValue;
    const pageCount = onixPageCount ? Number.parseInt(onixPageCount, 10) : undefined;

    const hasPhysical = Boolean(heightMm || widthMm || thicknessMm);

    return {
      isbn: normalizedISBN,
      title: summary.title || '',
      subtitle: onix?.DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle?.content,
      author: summary.author || '',
      publisher: summary.publisher || '',
      publishedYear,
      description,
      coverImageUrl: summary.cover,
      dimensions: {
        ...estimateDimensions({ pageCount, heightMm, widthMm, thicknessMm }),
        source: hasPhysical ? 'api' : 'estimated',
      },
    };
  } catch (error) {
    console.error('OpenBD API fetch error:', error);
    return null;
  }
}

export async function fetchBookInfo(isbn: string): Promise<Partial<Book> | null> {
  const normalizedISBN = normalizeISBN(isbn);
  
  if (!normalizedISBN || normalizedISBN.length < 10) {
    return null;
  }
  
  const openBDResult = await fetchBookInfoFromOpenBD(normalizedISBN);
  const googleResult = await fetchBookInfoFromGoogleBooks(normalizedISBN);

  if (!openBDResult && !googleResult) {
    return null;
  }

  const primary = openBDResult ?? googleResult ?? {};
  const fallback = googleResult ?? openBDResult ?? {};

  return {
    isbn: normalizedISBN,
    title: primary.title || fallback.title || '',
    subtitle: primary.subtitle || fallback.subtitle,
    author: primary.author || fallback.author || '',
    publisher: primary.publisher || fallback.publisher || '',
    publishedYear: primary.publishedYear || fallback.publishedYear || new Date().getFullYear(),
    description: primary.description || fallback.description,
    coverImageUrl: primary.coverImageUrl || fallback.coverImageUrl,
    tags: primary.tags || fallback.tags || [],
    dimensions: primary.dimensions || fallback.dimensions,
  };
}

export async function fetchMultipleBookInfo(
  isbns: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, Partial<Book>>> {
  const results = new Map<string, Partial<Book>>();
  const total = isbns.length;
  
  for (let i = 0; i < isbns.length; i++) {
    const isbn = isbns[i];
    const normalizedISBN = normalizeISBN(isbn);
    
    if (!normalizedISBN) continue;
    
    const bookInfo = await fetchBookInfo(normalizedISBN);
    if (bookInfo) {
      results.set(normalizedISBN, bookInfo);
    }
    
    onProgress?.(i + 1, total);
    
    if (i < isbns.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}
