export type BrowseViewMode = 'grid' | 'list' | 'shelf';

export interface BrowseSessionSnapshot {
  url: string;
  scrollY: number;
  viewMode: BrowseViewMode;
}

const SESSION_KEY = 'labshelf:browse-session';
const SCROLL_Y_KEY = 'labshelf:browse-scroll-y';
const SHOULD_RESTORE_KEY = 'labshelf:browse-should-restore';

export function getBrowseUrl(pathname: string, search: string): string {
  return `${pathname}${search ? `?${search}` : ''}`;
}

function getCurrentBrowseUrl(): string {
  if (typeof window === 'undefined') return '/browse';
  return getBrowseUrl('/browse', window.location.search.replace(/^\?/, ''));
}

function readLastBrowseSession(): BrowseSessionSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as BrowseSessionSnapshot;
    if (!Number.isFinite(snapshot.scrollY)) return null;
    if (!['grid', 'list', 'shelf'].includes(snapshot.viewMode)) return null;

    return snapshot;
  } catch {
    return null;
  }
}

function getScrollY(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function saveBrowseSession(snapshot: BrowseSessionSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  sessionStorage.setItem(SCROLL_Y_KEY, String(snapshot.scrollY));
}

export function saveBrowseScrollPosition(viewMode: BrowseViewMode): void {
  if (typeof window === 'undefined') return;

  const scrollY = getScrollY();
  saveBrowseSession({
    url: getCurrentBrowseUrl(),
    scrollY,
    viewMode,
  });
}

export function markBrowseScrollForRestore(viewMode: BrowseViewMode): void {
  if (typeof window === 'undefined') return;

  const session = readLastBrowseSession();
  const scrollY = Math.max(getScrollY(), session?.scrollY ?? 0);

  saveBrowseSession({
    url: getCurrentBrowseUrl(),
    scrollY,
    viewMode,
  });
  sessionStorage.setItem(SHOULD_RESTORE_KEY, '1');
}

export function consumeBrowseScrollRestore(): number | null {
  if (typeof window === 'undefined') return null;
  if (sessionStorage.getItem(SHOULD_RESTORE_KEY) !== '1') return null;

  sessionStorage.removeItem(SHOULD_RESTORE_KEY);

  const fromKey = Number(sessionStorage.getItem(SCROLL_Y_KEY));
  if (Number.isFinite(fromKey) && fromKey > 0) {
    return fromKey;
  }

  const session = readLastBrowseSession();
  return session && session.scrollY > 0 ? session.scrollY : null;
}

export function readInitialBrowseViewMode(): BrowseViewMode {
  const session = readLastBrowseSession();
  return session?.viewMode ?? 'grid';
}

export function enableManualScrollRestoration(): void {
  if (typeof window === 'undefined') return;
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}
