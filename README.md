# LabShelf - 研究室蔵書管理アプリ

研究室の蔵書を「見やすく・探しやすく・管理しやすく」するWebアプリケーションです。

## 特徴

- **仮想本棚UI**: カラフルな背表紙が棚に並ぶインタラクティブな表示
- **ISBN自動取得**: ISBNを入力するだけで書籍情報を自動取得
- **多角的な検索**: タイトル、著者、ISBN、タグ、カテゴリで検索
- **Google スプレッドシート連携**: スプレッドシートで簡単にデータ管理
- **Apple風デザイン**: 白基調で静かに洗練されたUI

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UIコンポーネント**: shadcn/ui, Framer Motion
- **データ管理**: TanStack Query
- **書籍情報API**: OpenBD, Google Books API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、必要な値を設定してください。

```bash
cp .env.example .env.local
```

### 3. Google スプレッドシートの準備

**最小構成（ISBNのみ）:**

スプレッドシートに `isbn` 列だけあれば、他の情報はAPIから自動取得されます。

| isbn |
|------|
| 978-4-87311-778-2 |
| 978-4-8222-5477-5 |

**フル構成:**

| 列名 | 説明 | 必須 |
|------|------|------|
| isbn | ISBN番号 | ✓ |
| id | 一意のID（空ならISBNを使用） | |
| title | タイトル（空ならAPI取得） | |
| author | 著者（空ならAPI取得） | |
| publisher | 出版社 | |
| publishedYear | 出版年 | |
| category | カテゴリ | |
| tags | タグ（カンマ区切り） | |
| description | 概要 | |
| coverImageUrl | 表紙画像URL | |
| recommended | おすすめフラグ (TRUE/FALSE) | |
| latestFlag | 新着フラグ (TRUE/FALSE) | |
| memo | メモ | |

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/books` | GET | 本の一覧取得（検索・フィルター対応） |
| `/api/books/[id]` | GET | 本の詳細取得 |
| `/api/isbn/[isbn]` | GET | ISBNから書籍情報を取得 |
| `/api/sync` | GET | 同期ステータス取得 |
| `/api/sync` | POST | 手動同期実行 |

### ISBN検索API

```bash
# ISBNから書籍情報を取得
curl http://localhost:3000/api/isbn/9784873117782
```

レスポンス例:
```json
{
  "success": true,
  "book": {
    "isbn": "9784873117782",
    "title": "リーダブルコード",
    "author": "Dustin Boswell, Trevor Foucher",
    "publisher": "オライリージャパン",
    "publishedYear": 2012,
    "coverImageUrl": "https://..."
  }
}
```

## 書籍情報の取得元

1. **OpenBD** (優先): 日本の書籍情報に強い
2. **Google Books API**: OpenBDで見つからない場合のフォールバック

## デプロイ

Vercelでのデプロイを推奨します。

```bash
npm run build
```

環境変数を Vercel のダッシュボードで設定してください。

## ライセンス

MIT
