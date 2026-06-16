export type BrowseViewMode = 'grid' | 'list' | 'shelf';

export interface BrowseSessionSnapshot {
  url: string;
  scrollY: number;
  viewMode: BrowseViewMode;
}

const SESSION_KEY = 'labshelf:browse-session';
const RETURN_URL_KEY = 'labshelf:browse-return-url';

export function getBrowseUrl(pathname: string, search: string): string {
  return `${pathname}${search ? `?${search}` : ''}`;
}

export function saveBrowseSession(snapshot: BrowseSessionSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  sessionStorage.setItem(RETURN_URL_KEY, snapshot.url);
}

export function readBrowseSession(url: string): BrowseSessionSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const snapshot = JSON.parse(raw) as BrowseSessionSnapshot;
    if (snapshot.url !== url) return null;
    if (!Number.isFinite(snapshot.scrollY)) return null;
    if (!['grid', 'list', 'shelf'].includes(snapshot.viewMode)) return null;

    return snapshot;
  } catch {
    return null;
  }
}

export function readBrowseReturnUrl(): string {
  if (typeof window === 'undefined') return '/browse';
  return sessionStorage.getItem(RETURN_URL_KEY) ?? '/browse';
}

export function readInitialBrowseViewMode(search: string): BrowseViewMode {
  const session = readBrowseSession(getBrowseUrl('/browse', search));
  return session?.viewMode ?? 'grid';
}
