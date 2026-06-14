export interface BookDimensions {
  /** 物理サイズ(mm)。manual が true ならローカル補正値。 */
  heightMm?: number;
  widthMm?: number;
  thicknessMm?: number;
  pageCount?: number;
  source?: 'manual' | 'api' | 'estimated';
  manual?: boolean;
}

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
  borrowedBy?: string;
  borrowedAt?: string;
  dueDate?: string;
  loanMemo?: string;
  dimensions?: BookDimensions;
  shelfOrder?: number;
  /** 背表紙の色（CSS変数またはHEX）。未設定時はカテゴリ色 */
  spineColor?: string;
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

import type { LabBookCategory } from '@/lib/book-classifier';

export type BookCategory = LabBookCategory | '未分類';

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
