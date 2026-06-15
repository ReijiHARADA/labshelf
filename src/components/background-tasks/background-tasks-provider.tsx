'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  backgroundTasks,
  type BackgroundTask,
} from '@/lib/background-tasks';

type BackgroundTasksContextValue = {
  tasks: BackgroundTask[];
  isSheetsSyncRunning: boolean;
  activeTaskCount: number;
  startSheetsSync: (sheetId: string) => ReturnType<typeof backgroundTasks.startSheetsSync>;
  enqueueIngest: (isbn13: string, token: string) => ReturnType<typeof backgroundTasks.enqueueIngest>;
  ingestTasks: BackgroundTask[];
};

const BackgroundTasksContext = createContext<BackgroundTasksContextValue | null>(null);

export function BackgroundTasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>(() => backgroundTasks.getTasks());
  const [syncRunning, setSyncRunning] = useState(() => backgroundTasks.isSheetsSyncRunning());

  useEffect(() => {
    return backgroundTasks.subscribe((nextTasks) => {
      setTasks(nextTasks);
      setSyncRunning(backgroundTasks.isSheetsSyncRunning());
    });
  }, []);

  const value = useMemo<BackgroundTasksContextValue>(
    () => ({
      tasks,
      isSheetsSyncRunning: syncRunning,
      activeTaskCount: tasks.filter(
        (task) => task.status === 'running' || task.status === 'pending'
      ).length,
      startSheetsSync: (sheetId: string) => backgroundTasks.startSheetsSync(sheetId),
      enqueueIngest: (isbn13: string, token: string) =>
        backgroundTasks.enqueueIngest(isbn13, token),
      ingestTasks: tasks.filter((task) => task.kind === 'book-ingest'),
    }),
    [tasks, syncRunning]
  );

  return (
    <BackgroundTasksContext.Provider value={value}>
      {children}
    </BackgroundTasksContext.Provider>
  );
}

export function useBackgroundTasks() {
  const context = useContext(BackgroundTasksContext);
  if (!context) {
    throw new Error('useBackgroundTasks must be used within BackgroundTasksProvider');
  }
  return context;
}
