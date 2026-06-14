export type ClassificationResult = {
  category: LabBookCategory;
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
  tags?: string[];
  category: string;
};

export const LAB_BOOK_CATEGORIES = [
  'グラフィックデザイン',
  'タイポグラフィ・フォント',
  '色彩・配色',
  'ロゴ・ブランディング',
  'イラストレーション',
  '写真・映像',
  '3DCG・ゲーム',
  'Webデザイン・制作',
  'UI・UX',
  'デザインリサーチ',
  'サービスデザイン・デザイン思考',
  '情報デザイン・可視化',
  'プロダクト・ものづくり',
  'アート・メディア表現',
  'プログラミング・開発',
  'クリエイティブコーディング',
  'AI・データサイエンス',
  '電子工作・IoT',
  '認知科学・心理学',
  '感性工学・感情',
  '研究法・統計',
  '論文・アカデミックライティング',
  '就活・キャリア',
  'ビジネスマナー・仕事術',
  'マーケティング・ビジネス',
  '教養・社会・カルチャー',
  'その他・未分類',
] as const;

export type LabBookCategory = (typeof LAB_BOOK_CATEGORIES)[number];

export type ApplyAutoClassificationOptions = {
  forceCategory?: boolean;
  clearTags?: boolean;
  preserveManualCategory?: boolean;
};

const FALLBACK_CATEGORY: LabBookCategory = 'その他・未分類';

type CategoryRule = {
  category: LabBookCategory;
  keywords: string[];
  priority: number;
};

const LAB_CATEGORY_RULES: CategoryRule[] = [
  {
    category: '色彩・配色',
    priority: 95,
    keywords: [
      '配色',
      '色彩',
      'カラー',
      'color',
      'colour',
      'カラーデザイン',
      '色彩検定',
      '色の',
      '色使い',
      'pantone',
    ],
  },
  {
    category: 'タイポグラフィ・フォント',
    priority: 94,
    keywords: [
      'タイポグラフィ',
      'typography',
      'フォント',
      'font',
      '文字',
      '組版',
      'カリグラフィ',
      'calligraphy',
      'レタリング',
      'lettering',
      '書体',
      '欧文',
      '和文',
    ],
  },
  {
    category: '電子工作・IoT',
    priority: 93,
    keywords: [
      'arduino',
      'gainer',
      '+gainer',
      'raspberry pi',
      'ラズベリー',
      'センサ',
      'sensor',
      'iot',
      '電子工作',
      'physical computing',
      'マイコン',
      '組込',
      '組み込み',
      '回路',
      'mbed',
    ],
  },
  {
    category: 'クリエイティブコーディング',
    priority: 92,
    keywords: [
      'processing',
      'p5.js',
      'p5js',
      'openframeworks',
      'open frameworks',
      'touchdesigner',
      'creative coding',
      'クリエイティブコーディング',
      'generative',
      'ジェネラティブ',
    ],
  },
  {
    category: '就活・キャリア',
    priority: 91,
    keywords: [
      '就活',
      '就職活動',
      'キャリア',
      'career',
      '自己分析',
      'ポートフォリオ',
      '面接',
      'es',
      'エントリーシート',
      'インターン',
      '内定',
      '新卒',
    ],
  },
  {
    category: '論文・アカデミックライティング',
    priority: 90,
    keywords: [
      '論文',
      '卒論',
      '修論',
      '博士論文',
      'academic writing',
      'アカデミックライティング',
      '査読',
      '投稿',
      '学会',
      '紀要',
      'research paper',
      'レポートの書き方',
      '研究発表',
    ],
  },
  {
    category: 'AI・データサイエンス',
    priority: 89,
    keywords: [
      'ai',
      '人工知能',
      '機械学習',
      'machine learning',
      'deep learning',
      '深層学習',
      '生成ai',
      'llm',
      '自然言語処理',
      'nlp',
      'データサイエンス',
      'data science',
      'ニューラル',
      'neural',
      'chatgpt',
    ],
  },
  {
    category: 'UI・UX',
    priority: 88,
    keywords: [
      'ui',
      'ux',
      'user experience',
      'ユーザー体験',
      'ユーザエクスペリエンス',
      'ユーザビリティ',
      'usability',
      'アクセシビリティ',
      'accessibility',
      'インターフェース',
      'interface',
      'ヒューリスティック',
      'ユーザテスト',
      'ユーザーテスト',
      '誰のためのデザイン',
    ],
  },
  {
    category: 'デザインリサーチ',
    priority: 87,
    keywords: [
      'デザインリサーチ',
      'design research',
      'ユーザーリサーチ',
      'user research',
      'インタビュー',
      '観察',
      'フィールドワーク',
      'fieldwork',
      '調査設計',
      'エスノグラフィ',
      'ethnography',
      'コンテクスチュアル',
    ],
  },
  {
    category: 'サービスデザイン・デザイン思考',
    priority: 86,
    keywords: [
      'サービスデザイン',
      'service design',
      'デザイン思考',
      'design thinking',
      'カスタマージャーニー',
      'customer journey',
      '共創',
      'co-creation',
      'ソーシャルイノベーション',
      'ワークショップ',
      'this is service design',
    ],
  },
  {
    category: '3DCG・ゲーム',
    priority: 85,
    keywords: [
      '3dcg',
      '3d cg',
      'cg',
      'blender',
      'unity',
      'unreal',
      'ゲーム制作',
      'ゲームデザイン',
      'game design',
      'ゲーム開発',
      'maya',
      'cinema 4d',
      'c4d',
    ],
  },
  {
    category: '写真・映像',
    priority: 84,
    keywords: [
      '写真',
      'photography',
      'カメラ',
      'camera',
      '撮影',
      '映像',
      '動画',
      'video',
      'film',
      '映画',
      'after effects',
      'premiere',
      'final cut',
      '編集',
      'dtv',
    ],
  },
  {
    category: 'Webデザイン・制作',
    priority: 83,
    keywords: [
      'webデザイン',
      'web design',
      'web制作',
      'webサイト',
      'website',
      'html',
      'css',
      'javascript',
      'フロントエンド',
      'frontend',
      'react',
      'next.js',
      'nextjs',
      'wordpress',
    ],
  },
  {
    category: 'プログラミング・開発',
    priority: 82,
    keywords: [
      'プログラミング',
      'programming',
      '開発',
      'software',
      'ソフトウェア',
      'アプリ開発',
      'swift',
      'xcode',
      'ios',
      'android',
      'python',
      'typescript',
      'java',
      'c++',
      'アルゴリズム',
    ],
  },
  {
    category: 'イラストレーション',
    priority: 81,
    keywords: [
      'イラスト',
      'illustration',
      'イラスト技法',
      'キャラクター',
      'character',
      '漫画',
      'manga',
      'アニメ',
      'animation',
      '絵本',
      'ドローイング',
      'drawing',
    ],
  },
  {
    category: 'ロゴ・ブランディング',
    priority: 80,
    keywords: [
      'ロゴ',
      'logo',
      'ci',
      'vi',
      'ブランド',
      'brand',
      'branding',
      'ブランディング',
      'コーポレートアイデンティティ',
      'identity',
      '広告',
      'ad ',
      'advertising',
      'pr',
    ],
  },
  {
    category: '情報デザイン・可視化',
    priority: 79,
    keywords: [
      '情報デザイン',
      'information design',
      '可視化',
      'visualization',
      'visualisation',
      'infographic',
      'インフォグラフィック',
      '図解',
      'diagram',
      'ビジュアルシンキング',
      'visual thinking',
      'ダイアグラム',
      'チャート',
    ],
  },
  {
    category: 'プロダクト・ものづくり',
    priority: 78,
    keywords: [
      'プロダクト',
      'product',
      'プロダクトデザイン',
      'product design',
      'ものづくり',
      'プロトタイプ',
      'prototyping',
      'prototype',
      'fab',
      'fabrication',
      '3dプリンタ',
      '3d printer',
      'レーザーカッター',
      '工作',
      '制作',
    ],
  },
  {
    category: '研究法・統計',
    priority: 77,
    keywords: [
      '研究法',
      '統計',
      'statistics',
      '調査',
      '実験',
      'アンケート',
      '質的研究',
      '量的研究',
      '評価実験',
      'リサーチメソッド',
      'research method',
      '多変量解析',
      '回帰',
      'spss',
      'r言語',
      '分析手法',
    ],
  },
  {
    category: '認知科学・心理学',
    priority: 76,
    keywords: [
      '認知',
      'cognitive',
      '心理学',
      'psychology',
      '知覚',
      'perception',
      '注意',
      '記憶',
      '脳',
      'brain',
      '行動科学',
      '行動心理学',
      '認知科学',
      '神経',
    ],
  },
  {
    category: '感性工学・感情',
    priority: 75,
    keywords: [
      '感性',
      'kansei',
      '感性工学',
      '感情',
      'emotion',
      'emotional',
      'エモーション',
      '情動',
      'affective',
      '印象',
      '心地よさ',
      '主観評価',
      '嗜好',
    ],
  },
  {
    category: 'アート・メディア表現',
    priority: 74,
    keywords: [
      'メディアアート',
      'media art',
      'アート',
      'art',
      'インスタレーション',
      'installation',
      '展示',
      'exhibition',
      '作品集',
      '画集',
      'サウンド',
      'sound',
      '音',
      'audio',
    ],
  },
  {
    category: 'グラフィックデザイン',
    priority: 73,
    keywords: [
      'グラフィック',
      'graphic',
      'レイアウト',
      'layout',
      'dtp',
      '印刷',
      'print',
      '装丁',
      'エディトリアル',
      'editorial',
      'ポスター',
      'poster',
      'パッケージ',
      'package',
      '誌面',
    ],
  },
  {
    category: 'ビジネスマナー・仕事術',
    priority: 72,
    keywords: [
      'ビジネスマナー',
      'business manner',
      'マナー',
      '敬語',
      'メール',
      '仕事術',
      '働き方',
      'コミュニケーション',
      '会議',
      '資料作成',
      'プレゼン',
      'presentation',
      '仕事の',
    ],
  },
  {
    category: 'マーケティング・ビジネス',
    priority: 71,
    keywords: [
      'マーケティング',
      'marketing',
      'ビジネスモデル',
      'business model',
      '経営',
      'management',
      '起業',
      'startup',
      'マネジメント',
      '消費者行動',
      'consumer',
      '顧客',
      'customer',
      '市場',
      'market',
      '価値提案',
    ],
  },
  {
    category: '教養・社会・カルチャー',
    priority: 70,
    keywords: [
      '教養',
      '社会',
      '思想',
      '哲学',
      'philosophy',
      '文化',
      'culture',
      'カルチャー',
      'ライフスタイル',
      'lifestyle',
      '読み物',
      '教育',
      'education',
      '歴史',
      'history',
    ],
  },
];

function normalizeText(value: string | undefined): string {
  return (value ?? '').toLowerCase().normalize('NFKC');
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
};

function uniqueKeywords(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function scoreRules(input: BookClassificationInput): RuleScore[] {
  const weightedTextParts = [
    { text: normalizeText(`${input.title ?? ''} ${input.subtitle ?? ''}`), weight: 5 },
    { text: normalizeText(`${input.description ?? ''} ${input.toc ?? ''}`), weight: 3 },
    { text: normalizeText(input.publisher ?? ''), weight: 2 },
    { text: normalizeText(input.author ?? ''), weight: 1 },
    { text: normalizeText((input.tags ?? []).join(' ')), weight: 1 },
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
      priority: rule.priority,
      matchedKeywords: uniqueKeywords(matchedKeywords),
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
      confidence: 0,
      matchedKeywords: [],
    };
  }

  return {
    category: best.category,
    confidence: Math.min(best.score / 20, 1),
    matchedKeywords: best.matchedKeywords,
  };
}

export function applyAutoClassification<
  T extends BookClassificationInput & { tags?: string[] },
>(book: T, options: ApplyAutoClassificationOptions = {}): T {
  const result = classifyBook(book);
  const currentCategory = book.category?.trim();

  const shouldPreserveCategory =
    options.preserveManualCategory !== false &&
    !options.forceCategory &&
    currentCategory &&
    currentCategory !== '未分類' &&
    currentCategory !== 'その他・未分類';

  return {
    ...book,
    category: shouldPreserveCategory ? book.category : result.category,
    tags: options.clearTags ? [] : (book.tags ?? []),
  };
}
