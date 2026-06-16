export type BrowseViewMode = 'grid' | 'list' | 'shelf';

export interface BrowseSessionSnapshot {
  url: string;
  scrollY: number;
  viewMode: BrowseViewMode;
}

const SESSION_KEY = 'labshelf:browse-session';
const SCROLL_Y_KEY = 'labshelf:browse-scroll-y';
const FROZEN_SCROLL_Y_KEY = 'labshelf:browse-frozen-scroll-y';
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

function readStoredScrollY(): number {
  const fromKey = Number(sessionStorage.getItem(SCROLL_Y_KEY));
  if (Number.isFinite(fromKey) && fromKey > 0) return fromKey;

  const session = readLastBrowseSession();
  return session && session.scrollY > 0 ? session.scrollY : 0;
}

export function getScrollY(): number {
  if (typeof window === 'undefined') return 0;
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function readFrozenBrowseScrollY(): number | null {
  if (typeof window === 'undefined') return null;

  const frozen = Number(sessionStorage.getItem(FROZEN_SCROLL_Y_KEY));
  if (Number.isFinite(frozen) && frozen > 0) return frozen;

  return null;
}

export function saveBrowseSession(snapshot: BrowseSessionSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  sessionStorage.setItem(SCROLL_Y_KEY, String(snapshot.scrollY));
}

function resolveBestScrollY(): number {
  return Math.max(
    readFrozenBrowseScrollY() ?? 0,
    getScrollY(),
    readStoredScrollY()
  );
}

export function freezeBrowseScrollPosition(viewMode: BrowseViewMode): number {
  if (typeof window === 'undefined') return 0;

  const scrollY = resolveBestScrollY();
  sessionStorage.setItem(FROZEN_SCROLL_Y_KEY, String(scrollY));
  saveBrowseSession({
    url: getCurrentBrowseUrl(),
    scrollY,
    viewMode,
  });
  return scrollY;
}

export function clearFrozenBrowseScrollPosition(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FROZEN_SCROLL_Y_KEY);
}

export function saveBrowseScrollPosition(
  viewMode: BrowseViewMode,
  options?: { allowZero?: boolean }
): void {
  if (typeof window === 'undefined') return;

  const scrollY = getScrollY();
  const bestKnown = resolveBestScrollY();

  if (scrollY <= 0 && !options?.allowZero && bestKnown > 0) {
    saveBrowseSession({
      url: getCurrentBrowseUrl(),
      scrollY: bestKnown,
      viewMode,
    });
    return;
  }

  saveBrowseSession({
    url: getCurrentBrowseUrl(),
    scrollY: scrollY > 0 ? scrollY : bestKnown,
    viewMode,
  });
}

export function markBrowseScrollForRestore(viewMode: BrowseViewMode): void {
  if (typeof window === 'undefined') return;

  const scrollY = resolveBestScrollY();

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
  clearFrozenBrowseScrollPosition();

  const scrollY = resolveBestScrollY();
  return scrollY > 0 ? scrollY : null;
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
