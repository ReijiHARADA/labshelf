'use client';

import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { useBackgroundTasks } from '@/components/background-tasks/background-tasks-provider';
import { cn } from '@/lib/utils';

function taskTone(status: string) {
  if (status === 'running' || status === 'pending') {
    return 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/80 dark:text-sky-100';
  }
  if (status === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100';
  }
  if (status === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/80 dark:text-amber-100';
  }
  return 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/80 dark:text-red-100';
}

function TaskIcon({ status }: { status: string }) {
  if (status === 'running' || status === 'pending') {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin" />;
  }
  if (status === 'success') {
    return <CheckCircle2 className="h-4 w-4 shrink-0" />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="h-4 w-4 shrink-0" />;
  }
  return <AlertCircle className="h-4 w-4 shrink-0" />;
}

export function BackgroundTaskBanner() {
  const { tasks } = useBackgroundTasks();

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl space-y-2 px-4 py-2 sm:px-6 lg:px-8">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm',
              taskTone(task.status)
            )}
            role="status"
            aria-live="polite"
          >
            <TaskIcon status={task.status} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{task.title}</p>
              {task.message ? (
                <p className="mt-0.5 text-xs opacity-90">{task.message}</p>
              ) : null}
              {task.meta?.isbn ? (
                <p className="mt-0.5 font-mono text-xs opacity-80">{task.meta.isbn}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
