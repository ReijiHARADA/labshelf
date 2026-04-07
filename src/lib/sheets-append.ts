type AppendResult =
  | { ok: true; appended: string[] }
  | { ok: false; error: string };

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

  // GAS Web アプリは環境によってカスタムヘッダを取得しにくいため、
  // token クエリにも付与して認証を通せるようにする。
  const url = new URL(rawUrl);
  url.searchParams.set('token', token);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LabShelf-Token': token,
    },
    body: JSON.stringify({ isbns: unique }),
  }).catch((e) => {
    throw new Error(e instanceof Error ? e.message : 'GASへの接続に失敗しました');
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      error: `スプレッドシート追記に失敗しました: ${res.status}${text ? ` ${text}` : ''}`,
    };
  }

  const data = await res.json().catch(() => null);
  if (!data || data.ok !== true) {
    return {
      ok: false,
      error:
        typeof data?.error === 'string'
          ? `スプレッドシート追記に失敗しました: ${data.error}`
          : 'スプレッドシート追記に失敗しました: GASレスポンスが不正です',
    };
  }

  const appended = Array.isArray(data.appended)
    ? data.appended.map((v: unknown) => String(v))
    : unique;
  return { ok: true, appended };
}

