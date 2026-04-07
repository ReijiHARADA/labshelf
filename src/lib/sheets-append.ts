type AppendResult =
  | { ok: true; appended: string[] }
  | { ok: false; error: string };

export async function appendIsbnsToSheet(isbns: string[]): Promise<AppendResult> {
  const url = process.env.GOOGLE_SHEETS_APPEND_URL;
  const token = process.env.LABSHELF_INGEST_TOKEN;

  const unique = [...new Set(isbns.map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return { ok: true, appended: [] };

  if (!url) {
    return { ok: false, error: 'GOOGLE_SHEETS_APPEND_URL が設定されていません' };
  }
  if (!token) {
    return { ok: false, error: 'LABSHELF_INGEST_TOKEN が設定されていません' };
  }

  const res = await fetch(url, {
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

  return { ok: true, appended: unique };
}

