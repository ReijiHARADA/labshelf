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
    
    return {
      isbn: normalizedISBN,
      title: volume.title || '',
      subtitle: volume.subtitle,
      author: volume.authors?.join(', ') || '',
      publisher: volume.publisher || '',
      publishedYear,
      description: volume.description,
      coverImageUrl: volume.imageLinks?.thumbnail?.replace('http:', 'https:'),
      tags: volume.categories || [],
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
    
    return {
      isbn: normalizedISBN,
      title: summary.title || '',
      subtitle: onix?.DescriptiveDetail?.TitleDetail?.TitleElement?.Subtitle?.content,
      author: summary.author || '',
      publisher: summary.publisher || '',
      publishedYear,
      description,
      coverImageUrl: summary.cover,
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
  if (openBDResult && openBDResult.title) {
    return openBDResult;
  }
  
  const googleResult = await fetchBookInfoFromGoogleBooks(normalizedISBN);
  if (googleResult && googleResult.title) {
    return googleResult;
  }
  
  return null;
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
