# LabShelf - 研究室蔵書管理アプリ

研究室の蔵書を「見やすく・探しやすく・管理しやすく」する Web アプリケーションです。Google スプレッドシートをマスターデータ源とし、Supabase に同期して高速に表示します。

## 主な機能

### ホーム — 3D 書籍レール

- 表紙・背表紙・小口を持つ **CSS 3D カルーセル**で蔵書を表示
- 約 11 冊を円弧上に配置し、スワイプ・ドラッグ・トラックパッドで回転
- 表紙画像から **代表色を抽出**して背表紙に反映（未設定時はカテゴリ色にフォールバック）
- フィルター: すべて / おすすめ / 新着 / カテゴリ

### 一覧（`/browse`）

- 表示形式: **グリッド / リスト / 本棚（VirtualBookshelf）**
- 検索: タイトル・著者・ISBN・タグ・カテゴリ
- 並び替え（デフォルト **出版日順**）: 出版日順 / 新着順 / タイトル順 / 著者順 / 人気順
- 書籍詳細ドロワー、スクロール位置の復元

### 蔵書の取り込み（`/scan`）

- カメラで ISBN バーコードをスキャン、または手入力
- `/api/ingest` 経由で DB 登録 + スプレッドシート A 列へ追記
- 書籍情報は OpenBD / Google Books / NDL 等から自動取得

### その他のページ

| パス | 内容 |
|------|------|
| `/categories` | カテゴリ一覧・冊数表示 |
| `/books/[id]` | 書籍詳細（貸出情報・サイズ編集など） |
| `/my` | お気に入り・読みたい・最近見た（ローカル保存） |
| `/admin` | 同期実行、カテゴリ管理、書籍リセット、環境設定 |

## 技術スタック

| 区分 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router), React 19, TypeScript |
| スタイル | Tailwind CSS 4 |
| UI | Base UI, shadcn/ui 系コンポーネント, Framer Motion |
| データ取得 | TanStack Query, Supabase (PostgreSQL) |
| 外部連携 | Google スプレッドシート, GAS Web アプリ |
| 書籍 API | OpenBD, Google Books API, 国立国会図書館サーチ (NDL) |
| 表紙 | Amazon 表紙 URL（日本語書籍向け） |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数

`.env.local` に以下を設定します。

```bash
# Google スプレッドシート（マスターデータ）
GOOGLE_SHEET_ID=your_google_sheet_id
# 公開シートの場合は省略可
# GOOGLE_API_KEY=your_google_api_key

# Supabase（アプリ DB）
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 取り込み API の共有トークン（研究室内共有用）
LABSHELF_INGEST_TOKEN=your_shared_token

# GAS Web アプリ（スキャン時に A 列へ ISBN 追記）
GOOGLE_SHEETS_APPEND_URL=https://script.google.com/macros/s/xxxxx/exec
```

### 3. Supabase テーブル

Supabase SQL Editor で `supabase/schema.sql` を実行し、続けて `supabase/migrations/` 内のマイグレーションも適用してください。

主な `books` 列:

| 列 | 説明 |
|----|------|
| `isbn`, `title`, `author`, `publisher` | 基本情報 |
| `published_date`, `published_year` | 出版日（ISO 形式）/ 出版年 |
| `category`, `tags` | 分類 |
| `cover_image_url` | 表紙 URL |
| `recommended`, `latest_flag` | おすすめ / 新着フラグ |
| `borrowed_by`, `due_date` 等 | 貸出管理 |
| `spine_color` | 背表紙色（手動上書き） |
| `shelf_order`, `height_mm` 等 | 本棚表示用（dimensions 関連） |

### 4. Google スプレッドシート

**最小構成（ISBN のみ）**

| isbn |
|------|
| 978-4-87311-778-2 |

ISBN だけでも API からタイトル・著者・表紙等を取得します。

**推奨列（抜粋）**

| 列名 | 説明 |
|------|------|
| `isbn` | ISBN（必須） |
| `title`, `author`, `publisher` | 空なら API 取得 |
| `publishedYear` / `published_date` | 出版年 / 出版日 |
| `category`, `tags` | 分類・タグ |
| `recommended`, `latestFlag` | TRUE/FALSE |
| `coverImageUrl` | 表紙 URL（任意） |

### 5. GAS 追記 Web アプリ（推奨）

スプレッドシートを閲覧専用にしつつ、スキャン画面から ISBN を追記する構成です。

- スクリプト例: `docs/gas/labshelf-append.gs`
- GAS スクリプトプロパティ: `LABSHELF_TOKEN`, `SPREADSHEET_ID`, `SHEET_NAME`
- デプロイ URL を `GOOGLE_SHEETS_APPEND_URL` に設定

### 6. 開発サーバー

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で起動します。

```bash
npm run build   # 本番ビルド
npm run test    # ユニットテスト
npm run lint    # ESLint
```

## データの流れ

```
Google スプレッドシート
        ↓ 同期 (/api/sync)
    Supabase (books)
        ↓
  Next.js サーバー (books-store)
        ↓
   各ページ・API
```

スキャン取り込み時:

```
/scan → /api/ingest → Supabase + GAS（シート追記）
                     → OpenBD 等でメタデータ取得
```

## 書籍情報の取得元

ISBN  lookup（`src/lib/book-api.ts`）の優先順位:

1. **OpenBD** — 日本の書籍情報
2. **Google Books API** — フォールバック
3. **NDL サーチ** — 出版日等の補完
4. **Amazon 表紙** — 日本語書籍の高解像度表紙（API 表紙より優先）

## API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/books` | GET | 一覧（検索・フィルター・ページング） |
| `/api/books/[id]` | GET, PATCH | 詳細取得・更新（貸出・サイズ・背表紙色など） |
| `/api/books/[id]/cover` | POST | 表紙画像アップロード |
| `/api/books/backfill-dimensions` | POST | 寸法データの一括補完 |
| `/api/isbn/[isbn]` | GET | ISBN から書籍情報プレビュー |
| `/api/ingest` | POST | ISBN 取り込み（要トークン） |
| `/api/sync` | GET, POST | 同期ステータス / 手動同期 |
| `/api/categories` | GET, POST | カテゴリ一覧・追加 |
| `/api/categories/[name]` | PATCH, DELETE | カテゴリ更新・削除 |
| `/api/admin/books/reset` | POST | 全書籍リセット（管理用） |
| `/api/admin/consolidate-categories` | POST | カテゴリ統合 |
| `/api/admin/reclassify-books` | POST | AI カテゴリ再分類 |

### 例: ISBN 検索

```bash
curl http://localhost:3000/api/isbn/9784873117782
```

## プロジェクト構成（抜粋）

```
src/
├── app/                    # App Router ページ・API
│   ├── page.tsx            # ホーム（3D レール）
│   ├── browse/             # 一覧
│   ├── scan/               # ISBN スキャン
│   └── api/                # REST API
├── components/
│   ├── bookshelf/          # Book3DCard, CoverFlowBookshelf, VirtualBookshelf 等
│   └── home/               # ホームセクション
└── lib/
    ├── book-api.ts         # 外部書籍 API
    ├── cover-dominant-color.ts  # 表紙から背表紙色を抽出
    ├── sheets-sync.ts      # スプレッドシート同期
    └── books-db.ts         # Supabase アクセス
supabase/
├── schema.sql
└── migrations/
```

## デプロイ

Vercel へのデプロイを想定しています。

```bash
npm run build
```

Vercel ダッシュボードで環境変数を設定してください。

**必須**

- `GOOGLE_SHEET_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**推奨**

- `LABSHELF_INGEST_TOKEN`
- `GOOGLE_SHEETS_APPEND_URL`

## ライセンス

MIT
