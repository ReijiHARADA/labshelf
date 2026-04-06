'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Settings,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dummyBooks, getRecommendedBooks, getLatestBooks } from '@/data/dummy-books';
import type { SyncLog } from '@/types/book';

const mockSyncLogs: SyncLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'success',
    bookCount: 40,
    duration: 2340,
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'success',
    bookCount: 40,
    duration: 2120,
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    status: 'error',
    bookCount: 0,
    errorMessage: 'ネットワークエラー: タイムアウト',
    duration: 30000,
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    status: 'success',
    bookCount: 39,
    duration: 1980,
  },
];

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(mockSyncLogs);
  const [lastSyncAt, setLastSyncAt] = useState(new Date(Date.now() - 1000 * 60 * 30));

  const recommendedBooks = getRecommendedBooks();
  const latestBooks = getLatestBooks();

  const handleSync = async () => {
    setIsSyncing(true);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const newLog: SyncLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      status: 'success',
      bookCount: dummyBooks.length,
      duration: 2150,
    };
    
    setSyncLogs((prev) => [newLog, ...prev]);
    setLastSyncAt(new Date());
    setIsSyncing(false);
  };

  const booksWithIssues = dummyBooks.filter(
    (book) => !book.isbn || !book.description
  );

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
            disabled={isSyncing}
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

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dummyBooks.length}</p>
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
                  <p className="text-2xl font-bold">正常</p>
                  <p className="text-sm text-muted-foreground">同期ステータス</p>
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
                    {Math.round((Date.now() - lastSyncAt.getTime()) / 1000 / 60)}分前
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
                            {new Date(log.timestamp).toLocaleString('ja-JP')} ・{' '}
                            {(log.duration / 1000).toFixed(1)}秒
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
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
                <CardTitle>設定方法</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p>
                    おすすめフラグや新着フラグは、Google スプレッドシートで直接編集できます。
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">recommended</code> 列に{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">TRUE</code> を設定すると、おすすめとして表示されます
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">latestFlag</code> 列に{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs">TRUE</code> を設定すると、新着として表示されます
                    </li>
                  </ul>
                  <p className="mt-4">
                    変更後、「今すぐ同期」ボタンを押すか、定期同期を待つとアプリに反映されます。
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
