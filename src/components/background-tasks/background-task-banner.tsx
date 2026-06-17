'use client';

import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useBackgroundTasks } from '@/components/background-tasks/background-tasks-provider';
import type { BackgroundTask } from '@/lib/background-tasks';
import { cn } from '@/lib/utils';

function taskTone(status: string) {
  if (status === 'running' || status === 'pending') {
    return 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100';
  }
  if (status === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100';
  }
  if (status === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100';
  }
  return 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100';
}

function TaskIcon({ status, dense = false }: { status: string; dense?: boolean }) {
  const className = dense ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0';
  if (status === 'running' || status === 'pending') {
    return <Loader2 className={cn(className, 'animate-spin')} />;
  }
  if (status === 'success') {
    return <CheckCircle2 className={className} />;
  }
  if (status === 'warning') {
    return <AlertTriangle className={className} />;
  }
  return <AlertCircle className={className} />;
}

function summarizeIngestTasks(tasks: BackgroundTask[]): BackgroundTask | null {
  if (tasks.length === 0) return null;

  const active = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'running'
  );
  const issues = tasks.filter(
    (task) => task.status === 'error' || task.status === 'warning'
  );

  if (issues.length > 0) {
    return issues[0];
  }

  if (active.length > 0) {
    return {
      ...active[0],
      title:
        active.length > 1
          ? `本を登録中（${active.length}件）`
          : active[0].title,
      message: 'バックグラウンドで登録しています',
    };
  }

  const latest = tasks[0];
  return {
    ...latest,
    title:
      tasks.length > 1 ? `登録完了（直近 ${tasks.length}件）` : latest.title,
  };
}

type BackgroundTaskBannerProps = {
  showBottomBorder?: boolean;
  compactIngest?: boolean;
  dense?: boolean;
};

export function BackgroundTaskBanner({
  showBottomBorder = false,
  compactIngest = false,
  dense = false,
}: BackgroundTaskBannerProps) {
  const { tasks } = useBackgroundTasks();

  if (tasks.length === 0) {
    return null;
  }

  const syncTasks = tasks.filter((task) => task.kind === 'sheets-sync');
  const ingestTasks = tasks.filter((task) => task.kind === 'book-ingest');
  const ingestSummary = compactIngest ? summarizeIngestTasks(ingestTasks) : null;
  const ingestItems = compactIngest
    ? ingestSummary
      ? [ingestSummary]
      : []
    : ingestTasks;
  const bannerTasks = [...syncTasks, ...ingestItems];

  if (bannerTasks.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        dense ? 'pb-1' : 'space-y-2 pb-2',
        showBottomBorder && 'border-b border-border/50'
      )}
    >
      {bannerTasks.map((task) => (
        <div
          key={compactIngest && task.kind === 'book-ingest' ? 'ingest-summary' : task.id}
          className={cn(
            'flex gap-2 rounded-lg border',
            dense
              ? 'items-center px-2.5 py-1.5 text-xs'
              : 'items-start px-3 py-2 text-sm',
            taskTone(task.status)
          )}
          role="status"
          aria-live="polite"
        >
          <TaskIcon status={task.status} dense={dense} />
          <div className="min-w-0 flex-1">
            {dense ? (
              <p className="truncate font-medium">
                {task.title}
                {task.meta?.isbn ? (
                  <span className="font-mono font-normal opacity-80">
                    {` · ${task.meta.isbn}`}
                  </span>
                ) : null}
              </p>
            ) : (
              <>
                <p className="font-medium">{task.title}</p>
                {task.message ? (
                  <p className="mt-0.5 text-xs opacity-90">{task.message}</p>
                ) : null}
                {task.meta?.isbn ? (
                  <p className="mt-0.5 font-mono text-xs opacity-80">
                    {task.meta.isbn}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
