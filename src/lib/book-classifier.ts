export type ClassificationResult = {
  category: string;
  tags: string[];
  confidence: number;
  matchedKeywords: string[];
};

export type BookClassificationInput = {
  title: string;
  subtitle?: string;
  author: string;
  publisher: string;
  description?: string;
  toc?: string;
  tags: string[];
  category: string;
};

export const LAB_BOOK_CATEGORIES = [
  'インタラクション',
  'UX',
  'ユーザビリティ',
  '感性',
  '感情・エモーション',
  '体験',
  '認知科学・心理学',
  'HCI・人間中心設計',
  'フィジカルコンピューティング',
  'プロトタイピング・制作',
  'クリエイティブコーディング',
  '情報表現・可視化',
  'AI',
  'データ分析・統計',
  '研究法',
  '論文',
  'アカデミックライティング',
  'マーケティング',
  'メディアアート',
  'その他・未分類',
] as const;

export type LabBookCategory = (typeof LAB_BOOK_CATEGORIES)[number];

const FALLBACK_CATEGORY: LabBookCategory = 'その他・未分類';
const MAX_AUTO_TAGS = 10;

type CategoryRule = {
  category: LabBookCategory;
  keywords: string[];
  tags: string[];
  priority?: number;
};

const LAB_CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'インタラクション',
    priority: 90,
    keywords: [
      'インタラクション',
      'interaction',
      'interactive',
      'インターフェース',
      'interface',
      'ui',
      '操作',
      '入力',
      '触れる',
      '使う',
      '体験設計',
    ],
    tags: ['インタラクション', 'UI', 'インターフェース'],
  },
  {
    category: 'UX',
    priority: 85,
    keywords: [
      'ux',
      'user experience',
      'ユーザー体験',
      'ユーザエクスペリエンス',
      '体験設計',
      'ユーザーリサーチ',
      'ペルソナ',
      'カスタマージャーニー',
      'ジャーニー',
      'サービスデザイン',
      'service design',
      '価値設計',
    ],
    tags: ['UX', 'ユーザー体験', 'ユーザーリサーチ'],
  },
  {
    category: 'ユーザビリティ',
    priority: 88,
    keywords: [
      'ユーザビリティ',
      'usability',
      '使いやすさ',
      'アクセシビリティ',
      'accessibility',
      'ヒューリスティック評価',
      'ユーザテスト',
      'ユーザーテスト',
      '評価',
      '誰のため',
      'ユーザー中心',
      'user-centered',
      'user centered',
    ],
    tags: ['ユーザビリティ', '使いやすさ', '評価'],
  },
  {
    category: '感性',
    priority: 95,
    keywords: [
      '感性',
      'kansei',
      '感性工学',
      '印象',
      '心地よさ',
      '質感',
      '主観評価',
      '嗜好',
      '美しさ',
    ],
    tags: ['感性', '感性工学', '主観評価'],
  },
  {
    category: '感情・エモーション',
    priority: 94,
    keywords: [
      '感情',
      'emotion',
      'emotional',
      'affective',
      'エモーション',
      '情動',
      '気分',
      '共感',
      'affect',
    ],
    tags: ['感情', 'エモーション', 'affective'],
  },
  {
    category: '体験',
    priority: 78,
    keywords: [
      '体験',
      'experience',
      '体験価値',
      '経験',
      'experiential',
      '没入',
      '没入感',
      'experience design',
    ],
    tags: ['体験', '体験価値', '体験設計'],
  },
  {
    category: '認知科学・心理学',
    priority: 92,
    keywords: [
      '認知',
      '心理',
      '心理学',
      '脳',
      '知覚',
      '注意',
      '記憶',
      '学習',
      '行動',
      'cognitive',
      'psychology',
      'perception',
    ],
    tags: ['認知科学', '心理学', '知覚'],
  },
  {
    category: 'HCI・人間中心設計',
    priority: 91,
    keywords: [
      'hci',
      'human-computer interaction',
      'human computer interaction',
      '人間中心設計',
      'human centered',
      'human-centred',
      '人間工学',
      'ergonomics',
    ],
    tags: ['HCI', '人間中心設計', '人間工学'],
  },
  {
    category: 'フィジカルコンピューティング',
    priority: 96,
    keywords: [
      'arduino',
      'gainer',
      '+gainer',
      'raspberry pi',
      'センサ',
      'sensor',
      'iot',
      '電子工作',
      'physical computing',
      'マイコン',
      '回路',
      'ロボット',
    ],
    tags: ['フィジカルコンピューティング', '電子工作', 'センサ'],
  },
  {
    category: 'プロトタイピング・制作',
    priority: 83,
    keywords: [
      'プロトタイプ',
      'prototyping',
      'prototype',
      '制作',
      '工作',
      'fab',
      'fabrication',
      '3dプリンタ',
      'レーザーカッター',
      'ものづくり',
    ],
    tags: ['プロトタイピング', '制作', 'ものづくり'],
  },
  {
    category: 'クリエイティブコーディング',
    priority: 89,
    keywords: [
      'processing',
      'p5.js',
      'openframeworks',
      'touchdesigner',
      'creative coding',
      'generative',
      'ジェネラティブ',
      '生成',
      'xcode',
      'swift',
      'プログラミング',
      'ios',
    ],
    tags: ['クリエイティブコーディング', '実装', 'プログラミング'],
  },
  {
    category: '情報表現・可視化',
    priority: 84,
    keywords: [
      '情報デザイン',
      '可視化',
      'visualization',
      'infographic',
      'インフォグラフィック',
      'グラフィック',
      'diagram',
      'チャート',
      '情報表現',
      '図解',
      '配色',
      '色彩',
      'カラー',
      'color',
    ],
    tags: ['情報可視化', '情報表現', '図解'],
  },
  {
    category: 'AI',
    priority: 93,
    keywords: [
      'ai',
      '人工知能',
      '機械学習',
      'machine learning',
      'deep learning',
      '生成ai',
      'llm',
      '自然言語処理',
      'nlp',
      'neural network',
      'ニューラルネットワーク',
    ],
    tags: ['AI', '機械学習', '人工知能'],
  },
  {
    category: 'データ分析・統計',
    priority: 87,
    keywords: [
      '統計',
      'statistics',
      'データ分析',
      'data analysis',
      '分析',
      'python',
      'r言語',
      '回帰',
      '多変量解析',
      '可視化分析',
    ],
    tags: ['データ分析', '統計', '分析'],
  },
  {
    category: '研究法',
    priority: 86,
    keywords: [
      '研究法',
      '調査',
      '実験',
      'インタビュー',
      'アンケート',
      '質的研究',
      '量的研究',
      'フィールドワーク',
      '評価実験',
      'リサーチメソッド',
    ],
    tags: ['研究法', '調査', '実験'],
  },
  {
    category: '論文',
    priority: 82,
    keywords: [
      '論文',
      'paper',
      'journal',
      'proceedings',
      '査読',
      '投稿',
      '学会',
      '紀要',
    ],
    tags: ['論文', '学会', '査読'],
  },
  {
    category: 'アカデミックライティング',
    priority: 80,
    keywords: [
      'academic writing',
      'アカデミックライティング',
      'ライティング',
      '執筆',
      '文章術',
      'レポート',
      '発表',
      'プレゼンテーション',
      'プレゼン',
    ],
    tags: ['アカデミックライティング', '執筆', '発表'],
  },
  {
    category: 'マーケティング',
    priority: 75,
    keywords: [
      'marketing',
      'マーケティング',
      'ブランド',
      '消費者行動',
      '価値提案',
      'ビジネスモデル',
      '顧客',
      '市場',
      '広告',
    ],
    tags: ['マーケティング', 'ブランド', '消費者行動'],
  },
  {
    category: 'メディアアート',
    priority: 88,
    keywords: [
      'メディアアート',
      'media art',
      'インスタレーション',
      '展示',
      '映像',
      'サウンド',
      '音',
      'アート',
      '作品',
    ],
    tags: ['メディアアート', '展示', '作品'],
  },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').toLowerCase().normalize('NFKC');
}

export function uniqueTags(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function shouldAutoClassifyCategory(category?: string): boolean {
  const current = category?.trim();
  return !current || current === '未分類' || current === 'その他・未分類';
}

type RuleScore = {
  category: LabBookCategory;
  score: number;
  priority: number;
  matchedKeywords: string[];
  tags: string[];
};

function scoreRules(input: BookClassificationInput): RuleScore[] {
  const weightedTextParts = [
    { text: normalizeText(`${input.title ?? ''} ${input.subtitle ?? ''}`), weight: 4 },
    { text: normalizeText((input.tags ?? []).join(' ')), weight: 3 },
    { text: normalizeText(`${input.description ?? ''} ${input.toc ?? ''}`), weight: 2 },
    { text: normalizeText(`${input.author ?? ''} ${input.publisher ?? ''}`), weight: 1 },
  ];

  return LAB_CATEGORY_RULES.map((rule) => {
    let score = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (!normalizedKeyword) continue;

      for (const part of weightedTextParts) {
        if (!part.text.includes(normalizedKeyword)) continue;
        score += part.weight;
        matchedKeywords.push(keyword);
      }
    }

    return {
      category: rule.category,
      score,
      priority: rule.priority ?? 50,
      matchedKeywords: uniqueTags(matchedKeywords),
      tags: rule.tags,
    };
  });
}

export function classifyBook(input: BookClassificationInput): ClassificationResult {
  const scores = scoreRules(input);
  const ranked = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });

  const best = ranked[0];
  if (!best || best.score <= 0) {
    return {
      category: FALLBACK_CATEGORY,
      tags: [],
      confidence: 0,
      matchedKeywords: [],
    };
  }

  const autoTags = ranked
    .filter((entry) => entry.score > 0 && entry.category !== FALLBACK_CATEGORY)
    .flatMap((entry) => entry.tags);

  return {
    category: best.category,
    tags: uniqueTags(autoTags),
    confidence: Math.min(best.score / 16, 1),
    matchedKeywords: best.matchedKeywords,
  };
}

export function applyAutoClassification<
  T extends BookClassificationInput & { tags?: string[] },
>(book: T): T {
  const result = classifyBook(book);
  const hasManualCategory = !shouldAutoClassifyCategory(book.category);

  return {
    ...book,
    category: hasManualCategory ? book.category : result.category,
    tags: uniqueTags([...(book.tags ?? []), ...result.tags]).slice(0, MAX_AUTO_TAGS),
  };
}
