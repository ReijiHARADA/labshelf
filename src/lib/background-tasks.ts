export type BackgroundTaskKind = 'sheets-sync' | 'book-ingest';

export type BackgroundTaskStatus = 'pending' | 'running' | 'success' | 'error' | 'warning';

export type BackgroundTask = {
  id: string;
  kind: BackgroundTaskKind;
  status: BackgroundTaskStatus;
  title: string;
  message?: string;
  detail?: string;
  meta?: {
    isbn?: string;
    bookCount?: number;
  };
  startedAt: number;
  finishedAt?: number;
};

export const LABSHELF_BOOKS_UPDATED_EVENT = 'labshelf:books-updated';

const MAX_TASK_HISTORY = 24;
const FINISHED_TASK_TTL_MS = 8000;
const INGEST_DEBOUNCE_MS = 3000;

type Listener = (tasks: BackgroundTask[]) => void;

type IngestQueueItem = {
  isbn: string;
  itemId: string;
  token: string;
};

type SheetsSyncResult = {
  success: boolean;
  bookCount?: number;
  message: string;
  errors?: string[];
  duration?: number;
};

function notifyBooksUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LABSHELF_BOOKS_UPDATED_EVENT));
  }
}

class BackgroundTaskManager {
  private tasks: BackgroundTask[] = [];
  private listeners = new Set<Listener>();
  private ingestQueue: IngestQueueItem[] = [];
  private ingestProcessing = false;
  private activeIsbns = new Set<string>();
  private lastSubmittedIsbn: { isbn: string; at: number } | null = null;
  private syncRunning = false;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getVisibleTasks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getTasks(): BackgroundTask[] {
    return this.getVisibleTasks();
  }

  isSheetsSyncRunning(): boolean {
    return this.syncRunning;
  }

  getIngestTasks(): BackgroundTask[] {
    return this.tasks.filter((task) => task.kind === 'book-ingest');
  }

  private getVisibleTasks(): BackgroundTask[] {
    const now = Date.now();
    return this.tasks.filter(
      (task) =>
        task.status === 'running' ||
        task.status === 'pending' ||
        (task.finishedAt !== undefined && now - task.finishedAt < FINISHED_TASK_TTL_MS)
    );
  }

  private emit() {
    const snapshot = this.getVisibleTasks();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private upsertTask(task: BackgroundTask) {
    const index = this.tasks.findIndex((item) => item.id === task.id);
    if (index === -1) {
      this.tasks.unshift(task);
    } else {
      this.tasks[index] = task;
    }
    this.tasks = this.tasks.slice(0, MAX_TASK_HISTORY);
    this.emit();
  }

  async startSheetsSync(sheetId: string): Promise<SheetsSyncResult> {
    if (!sheetId.trim()) {
      return { success: false, message: 'スプレッドシートIDを設定してください' };
    }
    if (this.syncRunning) {
      return { success: false, message: '同期は既に実行中です' };
    }

    const taskId = `sync-${Date.now()}`;
    this.syncRunning = true;
    this.upsertTask({
      id: taskId,
      kind: 'sheets-sync',
      status: 'running',
      title: 'スプレッドシート同期中',
      message: 'Googleスプレッドシートから蔵書データを取得しています',
      startedAt: Date.now(),
    });

    try {
      const response = await fetch(
        `/api/sync?sheetId=${encodeURIComponent(sheetId.trim())}`,
        {
          method: 'POST',
          cache: 'no-store',
        }
      );
      const data = await response.json().catch(() => ({}));

      if (data.success) {
        this.upsertTask({
          id: taskId,
          kind: 'sheets-sync',
          status: 'success',
          title: '同期完了',
          message: `${data.bookCount ?? 0}冊の本を同期しました`,
          meta: { bookCount: data.bookCount },
          startedAt: this.tasks.find((task) => task.id === taskId)?.startedAt ?? Date.now(),
          finishedAt: Date.now(),
        });
        notifyBooksUpdated();
        return {
          success: true,
          bookCount: data.bookCount,
          message: `${data.bookCount ?? 0}冊の本を同期しました`,
          duration: data.duration,
        };
      }

      const errorMessage = data.errors?.[0] || '同期に失敗しました';
      this.upsertTask({
        id: taskId,
        kind: 'sheets-sync',
        status: 'error',
        title: '同期失敗',
        message: errorMessage,
        detail: Array.isArray(data.errors) ? data.errors.join(' / ') : undefined,
        startedAt: this.tasks.find((task) => task.id === taskId)?.startedAt ?? Date.now(),
        finishedAt: Date.now(),
      });
      return {
        success: false,
        message: errorMessage,
        errors: data.errors,
        duration: data.duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      this.upsertTask({
        id: taskId,
        kind: 'sheets-sync',
        status: 'error',
        title: '同期失敗',
        message: errorMessage,
        startedAt: this.tasks.find((task) => task.id === taskId)?.startedAt ?? Date.now(),
        finishedAt: Date.now(),
      });
      return { success: false, message: errorMessage };
    } finally {
      this.syncRunning = false;
    }
  }

  enqueueIngest(isbn13: string, token: string) {
    const now = Date.now();
    const last = this.lastSubmittedIsbn;
    if (last && last.isbn === isbn13 && now - last.at < INGEST_DEBOUNCE_MS) {
      return null;
    }
    if (this.activeIsbns.has(isbn13)) {
      return null;
    }

    this.lastSubmittedIsbn = { isbn: isbn13, at: now };
    this.activeIsbns.add(isbn13);

    const itemId = `${isbn13}-${now}`;
    this.upsertTask({
      id: itemId,
      kind: 'book-ingest',
      status: 'pending',
      title: '登録待ち',
      message: 'バックグラウンドで登録します',
      meta: { isbn: isbn13 },
      startedAt: now,
    });

    this.ingestQueue.push({ isbn: isbn13, itemId, token });
    void this.drainIngestQueue();
    return itemId;
  }

  private async drainIngestQueue() {
    if (this.ingestProcessing) return;
    this.ingestProcessing = true;

    try {
      while (this.ingestQueue.length > 0) {
        const next = this.ingestQueue.shift();
        if (!next) continue;
        await this.processIngestItem(next);
      }
    } finally {
      this.ingestProcessing = false;
      if (this.ingestQueue.length > 0) {
        void this.drainIngestQueue();
      }
    }
  }

  private async processIngestItem(item: IngestQueueItem) {
    const { isbn: isbn13, itemId, token } = item;

    this.upsertTask({
      id: itemId,
      kind: 'book-ingest',
      status: 'running',
      title: '本を登録中',
      message: 'データベースとスプレッドシートへ反映しています',
      meta: { isbn: isbn13 },
      startedAt: this.tasks.find((task) => task.id === itemId)?.startedAt ?? Date.now(),
    });

    const authToken = token.trim();
    if (!authToken) {
      this.upsertTask({
        id: itemId,
        kind: 'book-ingest',
        status: 'error',
        title: '送信できません',
        message: '共有トークンを入力してください',
        meta: { isbn: isbn13 },
        startedAt: this.tasks.find((task) => task.id === itemId)?.startedAt ?? Date.now(),
        finishedAt: Date.now(),
      });
      this.activeIsbns.delete(isbn13);
      return;
    }

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-LabShelf-Token': authToken,
        },
        body: JSON.stringify({ isbn: isbn13 }),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.upsertTask({
          id: itemId,
          kind: 'book-ingest',
          status: 'error',
          title: '追加に失敗しました',
          message: data?.error || `追加に失敗しました (${response.status})`,
          detail: typeof data?.sheet?.error === 'string' ? data.sheet.error : undefined,
          meta: { isbn: isbn13 },
          startedAt: this.tasks.find((task) => task.id === itemId)?.startedAt ?? Date.now(),
          finishedAt: Date.now(),
        });
        return;
      }

      const added = Array.isArray(data?.added) ? data.added : [];
      const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
      const sheetError =
        typeof data?.sheet?.error === 'string' ? data.sheet.error : undefined;
      const hasSheetError = Boolean(sheetError);
      const hasAdded = added.length > 0;
      const hasSkipped = skipped.length > 0;

      this.upsertTask({
        id: itemId,
        kind: 'book-ingest',
        status: hasSheetError ? 'error' : hasAdded ? 'success' : hasSkipped ? 'warning' : 'error',
        title: hasAdded
          ? hasSheetError
            ? '一部失敗（スプレッドシート未反映）'
            : '登録完了'
          : hasSkipped
            ? '既に登録済み'
            : '追加に失敗しました',
        message:
          hasAdded && !hasSheetError
            ? 'データベースとスプレッドシートへ追加しました'
            : hasAdded && hasSheetError
              ? 'データベースへの追加は成功しましたが、スプレッドシート追記に失敗しました'
              : hasSkipped
                ? 'このISBNは既に登録済みのためスキップしました'
                : '追加できませんでした',
        detail: sheetError,
        meta: { isbn: isbn13 },
        startedAt: this.tasks.find((task) => task.id === itemId)?.startedAt ?? Date.now(),
        finishedAt: Date.now(),
      });

      if (hasAdded) {
        notifyBooksUpdated();
      }
    } catch (error) {
      this.upsertTask({
        id: itemId,
        kind: 'book-ingest',
        status: 'error',
        title: '追加に失敗しました',
        message: error instanceof Error ? error.message : '追加に失敗しました',
        meta: { isbn: isbn13 },
        startedAt: this.tasks.find((task) => task.id === itemId)?.startedAt ?? Date.now(),
        finishedAt: Date.now(),
      });
    } finally {
      this.activeIsbns.delete(isbn13);
    }
  }
}

export const backgroundTasks = new BackgroundTaskManager();
