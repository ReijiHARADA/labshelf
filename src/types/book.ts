export interface Book {
  id: string;
  isbn: string;
  title: string;
  subtitle?: string;
  author: string;
  publisher: string;
  publishedYear: number;
  category: string;
  tags: string[];
  description?: string;
  toc?: string;
  coverImageUrl?: string;
  recommended: boolean;
  latestFlag: boolean;
  popularityScore: number;
  createdAt: string;
  updatedAt: string;
  memo?: string;
}

export interface BookSpineStyle {
  color: string;
  width: number;
  height: number;
  hasTexture: boolean;
  hasLabel: boolean;
  labelPosition: 'top' | 'bottom' | 'none';
}

export interface SyncStatus {
  lastSyncAt: string;
  status: 'success' | 'error' | 'syncing' | 'idle';
  bookCount: number;
  errorMessage?: string;
  syncDuration?: number;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  bookCount: number;
  errorMessage?: string;
  duration: number;
}

export type BookCategory =
  | 'プログラミング'
  | '機械学習'
  | 'データサイエンス'
  | '数学・統計'
  | 'デザイン・UX'
  | 'ビジネス'
  | '研究手法'
  | '論文執筆'
  | '未分類';

export type SortOption = 'latest' | 'title' | 'author' | 'popular' | 'year';

export interface FilterOptions {
  category?: string;
  tags?: string[];
  author?: string;
  publishedYear?: number;
  recommended?: boolean;
  search?: string;
}

export interface BookshelfViewMode {
  type: 'all' | 'latest' | 'recommended' | 'category' | 'search';
  categorySlug?: string;
  searchQuery?: string;
}
