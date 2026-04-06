# LabShelf - 研究室蔵書管理アプリ

研究室の蔵書を「見やすく・探しやすく・管理しやすく」するWebアプリケーションです。

![LabShelf](https://via.placeholder.com/800x400?text=LabShelf)

## 特徴

- **仮想本棚UI**: カラフルな背表紙が棚に並ぶインタラクティブな表示
- **多角的な検索**: タイトル、著者、ISBN、タグ、カテゴリで検索
- **レコメンド機能**: おすすめ、新着、人気、分野別のピックアップ
- **Google スプレッドシート連携**: スプレッドシートで簡単にデータ管理
- **Apple風デザイン**: 白基調で静かに洗練されたUI

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UIコンポーネント**: shadcn/ui, Framer Motion
- **データ管理**: TanStack Query
- **データソース**: Google Sheets API

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

以下の列を持つスプレッドシートを作成してください：

| 列名 | 説明 | 必須 |
|------|------|------|
| id | 一意のID | ✓ |
| isbn | ISBN番号 | |
| title | タイトル | ✓ |
| subtitle | サブタイトル | |
| author | 著者 | ✓ |
| publisher | 出版社 | |
| publishedYear | 出版年 | |
| category | カテゴリ | |
| tags | タグ（カンマ区切り） | |
| description | 概要 | |
| toc | 目次 | |
| coverImageUrl | 表紙画像URL | |
| recommended | おすすめフラグ (TRUE/FALSE) | |
| latestFlag | 新着フラグ (TRUE/FALSE) | |
| popularityScore | 人気スコア (0-100) | |
| createdAt | 登録日時 | |
| updatedAt | 更新日時 | |
| memo | メモ | |

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## ページ構成

| パス | 説明 |
|------|------|
| `/` | ホーム - 本棚UI + レコメンド |
| `/browse` | カタログ - 検索・一覧表示 |
| `/books/[id]` | 本の詳細ページ |
| `/categories` | カテゴリ一覧 |
| `/my` | マイページ - お気に入り・履歴 |
| `/admin` | 管理画面 - 同期・設定管理 |

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/books` | GET | 本の一覧取得（検索・フィルター対応） |
| `/api/books/[id]` | GET | 本の詳細取得 |
| `/api/sync` | GET | 同期ステータス取得 |
| `/api/sync` | POST | 手動同期実行 |

## カスタマイズ

### カテゴリの追加

`src/lib/spine-colors.ts` の `categoryColors` にカテゴリと色を追加してください。

### デザインの調整

`src/app/globals.css` でデザイントークン（色、角丸、シャドウなど）を調整できます。

## デプロイ

Vercelでのデプロイを推奨します。

```bash
npm run build
```

環境変数を Vercel のダッシュボードで設定してください。

## ライセンス

MIT

## 作者

研究室蔵書管理プロジェクト
