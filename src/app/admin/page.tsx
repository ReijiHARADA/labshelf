'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Settings,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
  Save,
  ExternalLink,
  FolderPlus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SyncLog, Book } from '@/types/book';

const SHEET_ID_KEY = 'labshelf_sheet_id';

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [sheetId, setSheetId] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState('');
  const [sheetIdSaved, setSheetIdSaved] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    bookCount?: number;
  } | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [categoryMessage, setCategoryMessage] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const recommendedBooks = books.filter((book) => book.recommended);
  const latestBooks = books.filter((book) => book.latestFlag);

  const loadBooks = useCallback(async () => {
    try {
      const response = await fetch('/api/books?limit=1000', {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const data = await response.json();
      setBooks(Array.isArray(data.books) ? data.books : []);
    } catch {
      setBooks([]);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    const savedSheetId = localStorage.getItem(SHEET_ID_KEY);
    if (savedSheetId) {
      setSheetId(savedSheetId);
      setSheetIdInput(savedSheetId);
    }
    loadBooks();
    loadCategories();
  }, [loadBooks, loadCategories]);

  const extractSheetId = (input: string): string => {
    const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    if (/^[a-zA-Z0-9-_]+$/.test(input.trim())) {
      return input.trim();
    }
    return input.trim();
  };

  const handleSaveSheetId = () => {
    const extractedId = extractSheetId(sheetIdInput);
    setSheetId(extractedId);
    localStorage.setItem(SHEET_ID_KEY, extractedId);
    setSheetIdSaved(true);
    setTimeout(() => setSheetIdSaved(false), 2000);
  };

  const handleSync = async () => {
    if (!sheetId) {
      setSyncResult({
        success: false,
        message: 'スプレッドシートIDを設定してください',
      });
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(`/api/sync?sheetId=${encodeURIComponent(sheetId)}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await loadBooks();
        const newLog: SyncLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          status: 'success',
          bookCount: data.bookCount,
          duration: data.duration || 0,
        };
        setSyncLogs((prev) => [newLog, ...prev]);
        setLastSyncAt(new Date());
        setSyncResult({
          success: true,
          message: `${data.bookCount}冊の本を同期しました`,
          bookCount: data.bookCount,
        });
      } else {
        const newLog: SyncLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          status: 'error',
          bookCount: 0,
          errorMessage: data.errors?.[0] || '同期に失敗しました',
          duration: data.duration || 0,
        };
        setSyncLogs((prev) => [newLog, ...prev]);
        setSyncResult({
          success: false,
          message: data.errors?.[0] || '同期に失敗しました',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      const newLog: SyncLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'error',
        bookCount: 0,
        errorMessage,
        duration: 0,
      };
      setSyncLogs((prev) => [newLog, ...prev]);
      setSyncResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddCategory = async () => {
    setCategoryMessage(null);
    if (!newCategory.trim()) {
      setCategoryMessage({ success: false, message: 'カテゴリ名を入力してください' });
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
      const data = await response.json();
      setCategoryMessage({
        success: Boolean(data.success),
        message: data.message || 'カテゴリ追加に失敗しました',
      });
      if (data.success) {
        setNewCategory('');
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch {
      setCategoryMessage({ success: false, message: 'カテゴリ追加に失敗しました' });
    }
  };

  const canSubmitReset =
    resetPassword === 'admin' && resetConfirmText === 'DELETE ALL BOOKS';

  const handleResetBooks = async () => {
    setResetResult(null);
    if (!canSubmitReset) {
      setResetResult({
        success: false,
        message: 'パスワードと確認キーワードを正しく入力してください',
      });
      return;
    }

    const ok = window.confirm(
      '警告: データベース上の蔵書データを全件削除します。元に戻せません。続行しますか？'
    );
    if (!ok) return;

    setIsResetting(true);
    try {
      const response = await fetch('/api/admin/books/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPassword,
          confirmText: resetConfirmText,
        }),
      });
      const data = await response.json().catch(() => ({}));
      const success = Boolean(data?.success) && response.ok;
      setResetResult({
        success,
        message: data?.message || (success ? '削除しました' : '削除に失敗しました'),
      });
      if (success) {
        setResetPassword('');
        setResetConfirmText('');
        await loadBooks();
      }
    } catch (error) {
      setResetResult({
        success: false,
        message: error instanceof Error ? error.message : '削除に失敗しました',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const booksWithIssues = books.filter(
    (book) => !book.isbn || !book.description
  );

  const getSheetUrl = () => {
    if (!sheetId) return null;
    return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">管理画面</h1>
            <p className="mt-2 text-muted-foreground">
              データ同期と蔵書の管理を行います
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing || !sheetId}
            size="lg"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? '同期中...' : '今すぐ同期'}
          </Button>
        </div>

        {/* Sheet ID Setting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              スプレッドシート設定
            </CardTitle>
            <CardDescription>
              Google スプレッドシートのURLまたはIDを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/xxxxx/edit または シートID"
                  value={sheetIdInput}
                  onChange={(e) => setSheetIdInput(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button onClick={handleSaveSheetId} className="h-11">
                {sheetIdSaved ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {sheetIdSaved ? '保存しました' : '保存'}
              </Button>
            </div>
            {sheetId && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">設定中のID:</span>
                <code className="bg-muted px-2 py-0.5 rounded text-xs">{sheetId}</code>
                <a
                  href={getSheetUrl() || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {!sheetId && (
              <p className="mt-3 text-sm text-amber-600">
                スプレッドシートIDを設定すると同期が有効になります
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sync Result */}
        {syncResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              syncResult.success
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className={syncResult.success ? 'text-emerald-800' : 'text-red-800'}>
                {syncResult.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{books.length}</p>
                  <p className="text-sm text-muted-foreground">総蔵書数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {sheetId ? '設定済み' : '未設定'}
                  </p>
                  <p className="text-sm text-muted-foreground">シート接続</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {lastSyncAt
                      ? `${Math.round((Date.now() - lastSyncAt.getTime()) / 1000 / 60)}分前`
                      : '未同期'}
                  </p>
                  <p className="text-sm text-muted-foreground">最終同期</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{booksWithIssues.length}</p>
                  <p className="text-sm text-muted-foreground">要確認データ</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sync" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              同期ログ
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              データ警告
            </TabsTrigger>
            <TabsTrigger value="featured" className="gap-2">
              <Settings className="h-4 w-4" />
              特集設定
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderPlus className="h-4 w-4" />
              カテゴリ管理
            </TabsTrigger>
          </TabsList>

          {/* Sync logs */}
          <TabsContent value="sync">
            <Card>
              <CardHeader>
                <CardTitle>同期履歴</CardTitle>
                <CardDescription>
                  Google スプレッドシートとの同期履歴を表示します
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {syncLogs.map((log, index) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-4 p-4 rounded-lg bg-muted/30"
                        >
                          {log.status === 'success' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {log.status === 'success' ? '同期完了' : '同期失敗'}
                              </p>
                              <Badge
                                variant={log.status === 'success' ? 'secondary' : 'destructive'}
                              >
                                {log.status === 'success' ? `${log.bookCount}冊` : 'エラー'}
                              </Badge>
                            </div>
                            {log.errorMessage && (
                              <p className="text-sm text-red-600 mt-1">
                                {log.errorMessage}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(log.timestamp).toLocaleString('ja-JP')}
                              {log.duration > 0 && ` ・ ${(log.duration / 1000).toFixed(1)}秒`}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>まだ同期履歴がありません</p>
                    <p className="text-sm mt-1">「今すぐ同期」ボタンで同期を開始してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data issues */}
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>データ警告</CardTitle>
                <CardDescription>
                  情報が不足している本や、データに問題がある可能性のある本を表示します
                </CardDescription>
              </CardHeader>
              <CardContent>
                {booksWithIssues.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {booksWithIssues.map((book) => (
                        <div
                          key={book.id}
                          className="flex items-start gap-4 p-4 rounded-lg bg-amber-50 border border-amber-200"
                        >
                          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {book.author}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {!book.isbn && (
                                <Badge variant="outline" className="text-amber-700 border-amber-300">
                                  ISBNなし
                                </Badge>
                              )}
                              {!book.description && (
                                <Badge variant="outline" className="text-amber-700 border-amber-300">
                                  概要なし
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">問題のあるデータはありません</p>
                    <p className="text-muted-foreground">
                      すべての本のデータが正常です
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured settings */}
          <TabsContent value="featured">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>おすすめの本</CardTitle>
                  <CardDescription>
                    現在おすすめフラグが設定されている本
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {recommendedBooks.map((book) => (
                        <div
                          key={book.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="min-w-0">
                            <p className="font-medium line-clamp-1">{book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {book.author}
                            </p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            おすすめ
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>新着の本</CardTitle>
                  <CardDescription>
                    現在新着フラグが設定されている本
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {latestBooks.map((book) => (
                        <div
                          key={book.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        >
                          <div className="min-w-0">
                            <p className="font-medium line-clamp-1">{book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {book.author}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            新着
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>スプレッドシートの設定方法</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="font-medium text-foreground">1. スプレッドシートを作成</p>
                  <p>
                    最低限 <code className="bg-muted px-1.5 py-0.5 rounded text-xs">isbn</code> 列があればOKです。
                    他の情報（タイトル、著者など）はISBNから自動取得されます。
                  </p>
                  
                  <p className="font-medium text-foreground mt-4">2. 共有設定</p>
                  <p>
                    スプレッドシートの共有設定で「リンクを知っている全員が閲覧可能」に設定してください。
                  </p>

                  <p className="font-medium text-foreground mt-4">3. 利用可能な列</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">isbn</code> - ISBN番号（必須）</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">title</code> - タイトル（空ならAPI取得）</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">author</code> - 著者（空ならAPI取得）</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">category</code> - カテゴリ</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">tags</code> - タグ（カンマ区切り）</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">recommended</code> - おすすめ（TRUE/FALSE）</li>
                    <li><code className="bg-muted px-1.5 py-0.5 rounded text-xs">memo</code> - メモ</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category settings */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ管理</CardTitle>
                <CardDescription>
                  新しいカテゴリを追加できます
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="例: HCI / 哲学 / 生物学"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-11"
                  />
                  <Button className="h-11" onClick={handleAddCategory}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    追加
                  </Button>
                </div>
                {categoryMessage && (
                  <p
                    className={`text-sm ${
                      categoryMessage.success ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {categoryMessage.message}
                  </p>
                )}

                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    登録済みカテゴリ ({categories.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-10 border-red-300 bg-red-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Trash2 className="h-5 w-5" />
              危険操作: DB蔵書データ全削除
            </CardTitle>
            <CardDescription className="text-red-700/90">
              この操作は元に戻せません。実行にはパスワード
              <code className="mx-1 rounded bg-red-100 px-1.5 py-0.5 text-xs">admin</code>
              と確認キーワード
              <code className="mx-1 rounded bg-red-100 px-1.5 py-0.5 text-xs">DELETE ALL BOOKS</code>
              の両方が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="password"
                placeholder="パスワード (admin)"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="h-11 bg-white"
              />
              <Input
                placeholder="確認キーワード: DELETE ALL BOOKS"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                className="h-11 bg-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                className="h-11"
                onClick={handleResetBooks}
                disabled={isResetting || !canSubmitReset}
              >
                {isResetting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                {isResetting ? '削除中...' : 'DBを全削除'}
              </Button>
              <p className="text-xs text-red-700/80">
                条件が一致した時のみ削除ボタンが有効になります
              </p>
            </div>
            {resetResult && (
              <p
                className={`text-sm ${
                  resetResult.success ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {resetResult.message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
