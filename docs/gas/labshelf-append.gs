/**
 * LabShelf: ISBN(A列) 追記用 Webアプリ
 *
 * - 対象: A1=isbn, A2以降にISBNが縦に並ぶシート
 * - POST(JSON): { "isbns": ["978...","978..."] }
 * - Header: X-LabShelf-Token: <shared token>
 *
 * 事前に以下をスクリプトプロパティに設定:
 * - LABSHELF_TOKEN: 共有トークン
 * - SPREADSHEET_ID: 対象スプレッドシートID
 * - SHEET_NAME: シート名（例: シート1）
 */

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var expectedToken = props.getProperty('LABSHELF_TOKEN');
    var ssId = props.getProperty('SPREADSHEET_ID');
    var sheetName = props.getProperty('SHEET_NAME') || 'シート1';

    var gotToken = (e && e.parameter && e.parameter.token) ? String(e.parameter.token) : '';
    // ヘッダはGASの制約で取りにくいことがあるので、クエリtokenも許可する。
    // ただし Next.js 側からはヘッダ送信でOK（環境によってはヘッダも取れます）。
    // 可能なら両方チェックして一致で通す。
    var headerToken = '';
    try {
      headerToken = (e && e.headers && e.headers['X-LabShelf-Token']) ? String(e.headers['X-LabShelf-Token']) : '';
    } catch (_) {}

    var tokenOk = expectedToken && (headerToken === expectedToken || gotToken === expectedToken);
    if (!tokenOk) {
      return json_({ ok: false, error: 'Unauthorized' }, 401);
    }
    if (!ssId) {
      return json_({ ok: false, error: 'SPREADSHEET_ID is missing' }, 500);
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return json_({ ok: false, error: 'Sheet not found: ' + sheetName }, 404);
      }

      var body = {};
      try {
        body = JSON.parse(e.postData.contents || '{}');
      } catch (_) {
        body = {};
      }
      var isbns = Array.isArray(body.isbns) ? body.isbns : [];
      var cleaned = [];
      var seen = {};
      for (var i = 0; i < isbns.length; i++) {
        var v = String(isbns[i] || '').replace(/[^0-9]/g, '');
        if (!v) continue;
        if (seen[v]) continue;
        seen[v] = true;
        cleaned.push(v);
      }
      if (cleaned.length === 0) {
        return json_({ ok: true, appended: [] }, 200);
      }

      // 末尾にまとめて追記（A列のみ）
      var lastRow = sheet.getLastRow();
      var startRow = Math.max(lastRow + 1, 2);
      var values = cleaned.map(function (x) { return [x]; });
      sheet.getRange(startRow, 1, values.length, 1).setValues(values);

      return json_({ ok: true, appended: cleaned }, 200);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  }
}

function json_(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

