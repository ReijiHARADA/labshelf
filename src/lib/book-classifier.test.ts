import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyAutoClassification,
  classifyBook,
  LAB_BOOK_CATEGORIES,
  shouldAutoClassifyCategory,
} from './book-classifier.ts';

function baseInput(overrides: Partial<Parameters<typeof classifyBook>[0]> = {}) {
  return {
    title: '',
    subtitle: '',
    author: '',
    publisher: '',
    description: '',
    toc: '',
    tags: [],
    category: '未分類',
    ...overrides,
  };
}

describe('book-classifier', () => {
  it('グラフィック系タイトルがグラフィックデザインになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'レイアウトの基本', description: 'DTPと印刷の入門' })).category,
      'グラフィックデザイン'
    );
  });

  it('フォント・文字・組版系がタイポグラフィ・フォントになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'フォントの教科書', description: '組版とレタリング' })).category,
      'タイポグラフィ・フォント'
    );
  });

  it('配色・色彩系が色彩・配色になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '配色デザインのアイデア', description: '色彩検定対策' })).category,
      '色彩・配色'
    );
  });

  it('UX / UI 系が UI・UX になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '誰のためのデザイン？', description: 'ユーザビリティ' })).category,
      'UI・UX'
    );
  });

  it('デザインリサーチ系がデザインリサーチになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'デザインリサーチの教科書', description: 'インタビューと観察' }))
        .category,
      'デザインリサーチ'
    );
  });

  it('サービスデザイン系がサービスデザイン・デザイン思考になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'サービスデザインの実践', description: 'デザイン思考' })).category,
      'サービスデザイン・デザイン思考'
    );
  });

  it('Processing / p5.js 系がクリエイティブコーディングになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'Processing入門', description: 'p5.jsで描く' })).category,
      'クリエイティブコーディング'
    );
  });

  it('Arduino / Gainer / IoT 系が電子工作・IoT になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '+GAINER', description: 'Arduinoとセンサ' })).category,
      '電子工作・IoT'
    );
  });

  it('AI / 機械学習 / データ分析系が AI・データサイエンスになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '機械学習入門', description: '深層学習とデータサイエンス' }))
        .category,
      'AI・データサイエンス'
    );
  });

  it('統計 / 研究法系が研究法・統計になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '統計学入門', description: '調査と実験の研究法' })).category,
      '研究法・統計'
    );
  });

  it('論文 / アカデミックライティング系が論文・アカデミックライティングになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '論文の書き方', description: 'アカデミックライティング' })).category,
      '論文・アカデミックライティング'
    );
  });

  it('就活 / 面接 / ES 系が就活・キャリアになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '就活完全攻略', description: 'ESと面接' })).category,
      '就活・キャリア'
    );
  });

  it('ビジネスマナー / 仕事術系がビジネスマナー・仕事術になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'ビジネスマナー大全', description: '敬語とメール' })).category,
      'ビジネスマナー・仕事術'
    );
  });

  it('マーケティング / 消費者行動系がマーケティング・ビジネスになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: '消費者行動の心理学', description: 'マーケティング戦略' })).category,
      'マーケティング・ビジネス'
    );
  });

  it('ロゴ・CI系がロゴ・ブランディングになる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'ロゴデザインの教科書', description: 'CIとVI' })).category,
      'ロゴ・ブランディング'
    );
  });

  it('applyAutoClassification(clearTags: true) で tags が空になる', () => {
    const result = applyAutoClassification(
      baseInput({ title: '統計入門', tags: ['統計', '分析'] }),
      { clearTags: true }
    );
    assert.deepEqual(result.tags, []);
  });

  it('通常の applyAutoClassification では既存 tags が維持される', () => {
    const result = applyAutoClassification(
      baseInput({ title: '統計入門', tags: ['手動タグ'] }),
      { clearTags: false }
    );
    assert.deepEqual(result.tags, ['手動タグ']);
  });

  it('自動タグが生成されない', () => {
    const result = applyAutoClassification(baseInput({ title: 'Arduino入門', category: '未分類' }));
    assert.deepEqual(result.tags, []);
  });

  it('classifyBook は tags を返さない', () => {
    const result = classifyBook(baseInput({ title: '統計入門' }));
    assert.equal('tags' in result, false);
  });

  it('分類不能な本はその他・未分類になる', () => {
    assert.equal(
      classifyBook(baseInput({ title: 'xyzabc', description: 'qwerty' })).category,
      'その他・未分類'
    );
  });

  it('手動カテゴリは上書きしない', () => {
    const result = applyAutoClassification(
      baseInput({ title: 'Arduino入門', category: '教養・社会・カルチャー' }),
      { preserveManualCategory: true }
    );
    assert.equal(result.category, '教養・社会・カルチャー');
  });

  it('forceCategory では手動カテゴリも上書きする', () => {
    const result = applyAutoClassification(
      baseInput({ title: 'Arduino入門', category: '教養・社会・カルチャー' }),
      { forceCategory: true, preserveManualCategory: false }
    );
    assert.equal(result.category, '電子工作・IoT');
  });

  it('広すぎる単独カテゴリ名は生成しない', () => {
    for (const category of LAB_BOOK_CATEGORIES) {
      assert.notEqual(category, 'デザイン');
      assert.notEqual(category, 'ビジネス');
      assert.notEqual(category, '技術');
    }
  });

  it('shouldAutoClassifyCategory の判定', () => {
    assert.equal(shouldAutoClassifyCategory(''), true);
    assert.equal(shouldAutoClassifyCategory('未分類'), true);
    assert.equal(shouldAutoClassifyCategory('その他・未分類'), true);
    assert.equal(shouldAutoClassifyCategory('その他'), true);
    assert.equal(shouldAutoClassifyCategory('色彩'), true);
    assert.equal(shouldAutoClassifyCategory('UI・UX'), false);
  });
});
