import type { LabBookCategory } from '@/lib/book-classifier';

export type CategoryColor = {
  background: string;
  border: string;
  text: string;
};

export const LAB_CATEGORY_COLORS: Partial<Record<LabBookCategory, CategoryColor>> = {
  グラフィックデザイン: { background: '#FEE2E2', border: '#F87171', text: '#991B1B' },
  'タイポグラフィ・フォント': { background: '#FFEDD5', border: '#FB923C', text: '#9A3412' },
  '色彩・配色': { background: '#FCE7F3', border: '#F472B6', text: '#9D174D' },
  'ロゴ・ブランディング': { background: '#FEF3C7', border: '#FBBF24', text: '#92400E' },
  イラストレーション: { background: '#FEF9C3', border: '#EAB308', text: '#854D0E' },
  '写真・映像': { background: '#ECFEFF', border: '#22D3EE', text: '#155E75' },
  '3DCG・ゲーム': { background: '#E0E7FF', border: '#818CF8', text: '#3730A3' },
  'Webデザイン・制作': { background: '#DBEAFE', border: '#60A5FA', text: '#1E40AF' },
  'UI・UX': { background: '#EDE9FE', border: '#A78BFA', text: '#5B21B6' },
  デザインリサーチ: { background: '#F3E8FF', border: '#C084FC', text: '#6B21A8' },
  'サービスデザイン・デザイン思考': { background: '#FAE8FF', border: '#E879F9', text: '#86198F' },
  '情報デザイン・可視化': { background: '#E0F2FE', border: '#38BDF8', text: '#075985' },
  'プロダクト・ものづくり': { background: '#F5F5F4', border: '#A8A29E', text: '#44403C' },
  'アート・メディア表現': { background: '#FDF2F8', border: '#F9A8D4', text: '#831843' },
  'プログラミング・開発': { background: '#CCFBF1', border: '#2DD4BF', text: '#115E59' },
  クリエイティブコーディング: { background: '#D1FAE5', border: '#34D399', text: '#065F46' },
  'AI・データサイエンス': { background: '#DCFCE7', border: '#4ADE80', text: '#166534' },
  '電子工作・IoT': { background: '#FFEDD5', border: '#F97316', text: '#9A3412' },
  '認知科学・心理学': { background: '#E0E7FF', border: '#6366F1', text: '#312E81' },
  '感性工学・感情': { background: '#FFE4E6', border: '#FB7185', text: '#9F1239' },
  '研究法・統計': { background: '#ECFCCB', border: '#84CC16', text: '#3F6212' },
  '論文・アカデミックライティング': { background: '#E5E7EB', border: '#9CA3AF', text: '#374151' },
  '就活・キャリア': { background: '#FEF3C7', border: '#F59E0B', text: '#78350F' },
  'ビジネスマナー・仕事術': { background: '#F1F5F9', border: '#94A3B8', text: '#334155' },
  'マーケティング・ビジネス': { background: '#FEE2E2', border: '#FCA5A5', text: '#B91C1C' },
  '教養・社会・カルチャー': { background: '#F8FAFC', border: '#CBD5E1', text: '#475569' },
  'その他・未分類': { background: '#F3F4F6', border: '#D1D5DB', text: '#374151' },
};

const DEFAULT_CATEGORY_COLOR: CategoryColor = {
  background: '#F3F4F6',
  border: '#D1D5DB',
  text: '#374151',
};

const LEGACY_CATEGORY_COLORS: Record<string, CategoryColor> = {
  未分類: LAB_CATEGORY_COLORS['その他・未分類']!,
  その他: LAB_CATEGORY_COLORS['その他・未分類']!,
  デザイン: LAB_CATEGORY_COLORS['グラフィックデザイン']!,
  ビジネス: LAB_CATEGORY_COLORS['マーケティング・ビジネス']!,
  技術: LAB_CATEGORY_COLORS['プログラミング・開発']!,
  UX: LAB_CATEGORY_COLORS['UI・UX']!,
  インタラクション: LAB_CATEGORY_COLORS['UI・UX']!,
  ユーザビリティ: LAB_CATEGORY_COLORS['UI・UX']!,
  感性: LAB_CATEGORY_COLORS['感性工学・感情']!,
  '感情・エモーション': LAB_CATEGORY_COLORS['感性工学・感情']!,
  'HCI・人間中心設計': LAB_CATEGORY_COLORS['UI・UX']!,
  フィジカルコンピューティング: LAB_CATEGORY_COLORS['電子工作・IoT']!,
  'プロトタイピング・制作': LAB_CATEGORY_COLORS['プロダクト・ものづくり']!,
  '情報表現・可視化': LAB_CATEGORY_COLORS['情報デザイン・可視化']!,
  AI: LAB_CATEGORY_COLORS['AI・データサイエンス']!,
  'データ分析・統計': LAB_CATEGORY_COLORS['研究法・統計']!,
  研究法: LAB_CATEGORY_COLORS['研究法・統計']!,
  論文: LAB_CATEGORY_COLORS['論文・アカデミックライティング']!,
  アカデミックライティング: LAB_CATEGORY_COLORS['論文・アカデミックライティング']!,
  マーケティング: LAB_CATEGORY_COLORS['マーケティング・ビジネス']!,
  メディアアート: LAB_CATEGORY_COLORS['アート・メディア表現']!,
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
