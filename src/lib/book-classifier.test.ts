import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyAutoClassification,
  classifyBook,
  LAB_BOOK_CATEGORIES,
  shouldAutoClassifyCategory,
  uniqueTags,
} from './book-classifier.ts';

describe('book-classifier', () => {
  it('空カテゴリは自動分類される', () => {
    const result = applyAutoClassification({
      title: 'Arduinoをはじめよう',
      subtitle: '',
      author: '不明',
      publisher: '',
      description: 'センサと電子工作の入門',
      toc: '',
      tags: [],
      category: '',
    });
    assert.equal(result.category, 'フィジカルコンピューティング');
    assert.ok(result.tags.length > 0);
  });

  it('未分類は自動分類される', () => {
    const result = applyAutoClassification({
      title: '誰のためのデザイン？',
      subtitle: '',
      author: 'Don Norman',
      publisher: '',
      description: 'ユーザビリティと使いやすさ',
      toc: '',
      tags: [],
      category: '未分類',
    });
    assert.ok(['ユーザビリティ', 'UX', 'HCI・人間中心設計'].includes(result.category));
  });

  it('その他・未分類は自動分類される', () => {
    const result = applyAutoClassification({
      title: 'Xcodeプログラミング入門',
      subtitle: '',
      author: '不明',
      publisher: '',
      description: 'SwiftでiOSアプリを作る',
      toc: '',
      tags: [],
      category: 'その他・未分類',
    });
    assert.equal(result.category, 'クリエイティブコーディング');
  });

  it('手動カテゴリは上書きしない', () => {
    const result = applyAutoClassification({
      title: 'Arduinoをはじめよう',
      subtitle: '',
      author: '不明',
      publisher: '',
      description: '',
      toc: '',
      tags: [],
      category: '感性',
    });
    assert.equal(result.category, '感性');
  });

  it('既存タグと自動タグをマージし重複を除去する', () => {
    const result = applyAutoClassification({
      title: '脳のしくみとユーザー体験',
      subtitle: '',
      author: 'Whalen',
      publisher: '',
      description: '認知と心理学',
      toc: '',
      tags: ['UX', '認知'],
      category: '未分類',
    });
    assert.ok(result.tags.includes('UX'));
    assert.ok(result.tags.includes('認知'));
    assert.equal(uniqueTags(result.tags).length, result.tags.length);
  });

  it('分類不能な本はその他・未分類になる', () => {
    const result = classifyBook({
      title: '無関係な文字列',
      subtitle: '',
      author: '',
      publisher: '',
      description: 'abcdefg',
      toc: '',
      tags: [],
      category: '未分類',
    });
    assert.equal(result.category, 'その他・未分類');
    assert.equal(result.confidence, 0);
  });

  it('広すぎるカテゴリ名は生成しない', () => {
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
    assert.equal(shouldAutoClassifyCategory('UX'), false);
  });
});
