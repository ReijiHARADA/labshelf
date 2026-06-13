import type { LabBookCategory } from '@/lib/book-classifier';

export type CategoryColor = {
  background: string;
  border: string;
  text: string;
};

export const LAB_CATEGORY_COLORS: Partial<Record<LabBookCategory, CategoryColor>> = {
  インタラクション: {
    background: '#E0F2FE',
    border: '#38BDF8',
    text: '#075985',
  },
  UX: {
    background: '#EDE9FE',
    border: '#8B5CF6',
    text: '#4C1D95',
  },
  ユーザビリティ: {
    background: '#DCFCE7',
    border: '#22C55E',
    text: '#14532D',
  },
  感性: {
    background: '#FCE7F3',
    border: '#EC4899',
    text: '#831843',
  },
  '感情・エモーション': {
    background: '#FFE4E6',
    border: '#F43F5E',
    text: '#881337',
  },
  体験: {
    background: '#FEF3C7',
    border: '#F59E0B',
    text: '#78350F',
  },
  '認知科学・心理学': {
    background: '#E0E7FF',
    border: '#6366F1',
    text: '#312E81',
  },
  'HCI・人間中心設計': {
    background: '#CCFBF1',
    border: '#14B8A6',
    text: '#134E4A',
  },
  フィジカルコンピューティング: {
    background: '#FFEDD5',
    border: '#F97316',
    text: '#7C2D12',
  },
  'プロトタイピング・制作': {
    background: '#F5F5F4',
    border: '#78716C',
    text: '#292524',
  },
  クリエイティブコーディング: {
    background: '#FAE8FF',
    border: '#D946EF',
    text: '#701A75',
  },
  '情報表現・可視化': {
    background: '#DBEAFE',
    border: '#3B82F6',
    text: '#1E3A8A',
  },
  AI: {
    background: '#D1FAE5',
    border: '#10B981',
    text: '#064E3B',
  },
  'データ分析・統計': {
    background: '#ECFCCB',
    border: '#84CC16',
    text: '#365314',
  },
  研究法: {
    background: '#F3E8FF',
    border: '#A855F7',
    text: '#581C87',
  },
  論文: {
    background: '#E5E7EB',
    border: '#6B7280',
    text: '#111827',
  },
  アカデミックライティング: {
    background: '#FEF9C3',
    border: '#EAB308',
    text: '#713F12',
  },
  マーケティング: {
    background: '#FFE4E6',
    border: '#FB7185',
    text: '#881337',
  },
  メディアアート: {
    background: '#FCE7F3',
    border: '#DB2777',
    text: '#831843',
  },
  'その他・未分類': {
    background: '#F3F4F6',
    border: '#D1D5DB',
    text: '#374151',
  },
};

const DEFAULT_CATEGORY_COLOR: CategoryColor = {
  background: '#F3F4F6',
  border: '#D1D5DB',
  text: '#374151',
};

const LEGACY_CATEGORY_COLORS: Record<string, CategoryColor> = {
  未分類: LAB_CATEGORY_COLORS['その他・未分類']!,
  その他: LAB_CATEGORY_COLORS['その他・未分類']!,
  デザイン: {
    background: '#FCE7F3',
    border: '#F472B6',
    text: '#831843',
  },
  ビジネス: {
    background: '#FFEDD5',
    border: '#FB923C',
    text: '#7C2D12',
  },
  技術: {
    background: '#E0F2FE',
    border: '#38BDF8',
    text: '#075985',
  },
};

export function getCategoryColor(category: string | undefined): CategoryColor {
  if (!category?.trim()) return DEFAULT_CATEGORY_COLOR;

  const trimmed = category.trim();
  return (
    LAB_CATEGORY_COLORS[trimmed as LabBookCategory] ??
    LEGACY_CATEGORY_COLORS[trimmed] ??
    DEFAULT_CATEGORY_COLOR
  );
}

export function getUniqueCategoryColors(categories: string[]): Array<{
  category: string;
  color: CategoryColor;
}> {
  const seen = new Set<string>();
  const result: Array<{ category: string; color: CategoryColor }> = [];
  for (const category of categories) {
    const trimmed = category?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push({ category: trimmed, color: getCategoryColor(trimmed) });
  }
  return result;
}
