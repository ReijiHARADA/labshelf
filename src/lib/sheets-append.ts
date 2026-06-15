type AppendResult =
  | { ok: true; appended: string[] }
  | { ok: false; error: string };

type DeleteResult =
  | { ok: true; deleted: string[]; skipped?: boolean }
  | { ok: false; error: string };

export type SheetAppendItem = {
  isbn: string;
  title?: string;
};

function buildCandidateUrls(rawUrl: string, token: string): string[] {
  const trimmed = rawUrl.trim();
  const set = new Set<string>();

  const variants = [trimmed];
  variants.push(trimmed.replace(/\/macros\/u\/\d+\/s\//, '/macros/s/'));

  for (const v of variants) {
    try {
      const u = new URL(v);
      if (!u.pathname.endsWith('/exec')) {
        u.pathname = u.pathname.replace(/\/+$/, '') + '/exec';
      }
      u.searchParams.set('token', token);
      set.add(u.toString());
    } catch {
      // ignore invalid variant
    }
  }
  return [...set];
}

function getGasConfig():
  | { rawUrl: string; token: string; candidateUrls: string[] }
  | { ok: false; error: string } {
  const rawUrl = process.env.GOOGLE_SHEETS_APPEND_URL;
  const token = process.env.LABSHELF_INGEST_TOKEN;

  if (!rawUrl) {
    return { ok: false, error: 'GOOGLE_SHEETS_APPEND_URL が設定されていません' };
  }
  if (!token) {
    return { ok: false, error: 'LABSHELF_INGEST_TOKEN が設定されていません' };
  }

  const candidateUrls = buildCandidateUrls(rawUrl, token);
  if (candidateUrls.length === 0) {
    return { ok: false, error: 'GOOGLE_SHEETS_APPEND_URL の形式が不正です' };
  }

  return { rawUrl, token, candidateUrls };
}

async function postToGasWebApp(
  payload: Record<string, unknown>,
  actionLabel: string
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const config = getGasConfig();
  if ('ok' in config) {
    return config;
  }

  let lastError = `スプレッドシート${actionLabel}に失敗しました`;

  for (const candidateUrl of config.candidateUrls) {
    const res = await fetch(candidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LabShelf-Token': config.token,
      },
      body: JSON.stringify(payload),
    }).catch((e) => {
      throw new Error(e instanceof Error ? e.message : 'GASへの接続に失敗しました');
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const bodyText = await res.text().catch(() => '');

    if (!res.ok) {
      if (contentType.includes('text/html') || bodyText.includes('Google ドライブ')) {
        lastError =
          `スプレッドシート${actionLabel}に失敗しました: ${res.status} GASの実行URLが不正、` +
          `または公開設定不足の可能性があります（/macros/s/.../exec を使用してください）`;
      } else {
        lastError = `スプレッドシート${actionLabel}に失敗しました: ${res.status}${bodyText ? ` ${bodyText}` : ''}`;
      }
      continue;
    }

    const data = JSON.parse(bodyText || 'null');
    if (!data || data.ok !== true) {
      lastError =
        typeof data?.error === 'string'
          ? `スプレッドシート${actionLabel}に失敗しました: ${data.error}`
          : `スプレッドシート${actionLabel}に失敗しました: GASレスポンスが不正です`;
      continue;
    }

    return { ok: true, data };
  }

  return { ok: false, error: lastError };
}

export async function appendItemsToSheet(items: SheetAppendItem[]): Promise<AppendResult> {
  const uniqMap = new Map<string, SheetAppendItem>();
  for (const item of items) {
    const isbn = (item?.isbn || '').trim();
    if (!isbn) continue;
    if (!uniqMap.has(isbn)) uniqMap.set(isbn, { isbn, title: item.title });
  }
  const unique = [...uniqMap.values()];
  if (unique.length === 0) return { ok: true, appended: [] };

  const result = await postToGasWebApp({ items: unique }, '追記');
  if (!result.ok) {
    return result;
  }

  const appended = Array.isArray(result.data.appended)
    ? result.data.appended.map((v: unknown) => String(v))
    : unique.map((i) => i.isbn);
  return { ok: true, appended };
}

export async function deleteIsbnsFromSheet(isbns: string[]): Promise<DeleteResult> {
  const normalized = [
    ...new Set(isbns.map((value) => value.replace(/[^0-9]/g, '')).filter(Boolean)),
  ];
  if (normalized.length === 0) return { ok: true, deleted: [] };

  if (!process.env.GOOGLE_SHEETS_APPEND_URL) {
    return { ok: true, deleted: [], skipped: true };
  }

  const result = await postToGasWebApp(
    { action: 'delete', isbns: normalized },
    '削除'
  );
  if (!result.ok) {
    return result;
  }

  const deleted = Array.isArray(result.data.deleted)
    ? result.data.deleted.map((v: unknown) => String(v))
    : [];
  return { ok: true, deleted };
}

export async function appendIsbnsToSheet(isbns: string[]): Promise<AppendResult> {
  return appendItemsToSheet(isbns.map((isbn) => ({ isbn })));
}
