type AppendResult =
  | { ok: true; appended: string[] }
  | { ok: false; error: string };

function buildCandidateUrls(rawUrl: string, token: string): string[] {
  const trimmed = rawUrl.trim();
  const set = new Set<string>();

  const variants = [trimmed];
  // `.../macros/u/1/s/...` 形式が混ざっている場合を救済。
  variants.push(trimmed.replace(/\/macros\/u\/\d+\/s\//, '/macros/s/'));

  for (const v of variants) {
    try {
      const u = new URL(v);
      // `.../exec` を必須化（不足時は補完）。
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

export async function appendIsbnsToSheet(isbns: string[]): Promise<AppendResult> {
  const rawUrl = process.env.GOOGLE_SHEETS_APPEND_URL;
  const token = process.env.LABSHELF_INGEST_TOKEN;

  const unique = [...new Set(isbns.map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: true, appended: [] };

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

  let lastError = 'スプレッドシート追記に失敗しました';

  for (const candidateUrl of candidateUrls) {
    const res = await fetch(candidateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LabShelf-Token': token,
      },
      body: JSON.stringify({ isbns: unique }),
    }).catch((e) => {
      throw new Error(e instanceof Error ? e.message : 'GASへの接続に失敗しました');
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const bodyText = await res.text().catch(() => '');

    if (!res.ok) {
      if (contentType.includes('text/html') || bodyText.includes('Google ドライブ')) {
        lastError =
          `スプレッドシート追記に失敗しました: ${res.status} GASの実行URLが不正、` +
          `または公開設定不足の可能性があります（/macros/s/.../exec を使用してください）`;
      } else {
        lastError = `スプレッドシート追記に失敗しました: ${res.status}${bodyText ? ` ${bodyText}` : ''}`;
      }
      continue;
    }

    const data = JSON.parse(bodyText || 'null');
    if (!data || data.ok !== true) {
      lastError =
        typeof data?.error === 'string'
          ? `スプレッドシート追記に失敗しました: ${data.error}`
          : 'スプレッドシート追記に失敗しました: GASレスポンスが不正です';
      continue;
    }

    const appended = Array.isArray(data.appended)
      ? data.appended.map((v: unknown) => String(v))
      : unique;
    return { ok: true, appended };
  }

  return { ok: false, error: lastError };
}

