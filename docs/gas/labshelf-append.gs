/**
 * LabShelf: 通し番号(A列) + ISBN(B列) 追記用 Webアプリ
 *
 * - 対象: A1=no, B1=isbn
 * - A2以降: 通し番号, B2以降: ISBN
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

      normalizeSheetFormat_(sheet);

      // 既存の通し番号から次番号を計算
      var lastRow = sheet.getLastRow();
      var nextNo = getNextSerial_(sheet, lastRow);
      var startRow = Math.max(lastRow + 1, 2);
      var values = cleaned.map(function (isbn) {
        var row = [nextNo, isbn];
        nextNo += 1;
        return row;
      });
      sheet.getRange(startRow, 1, values.length, 2).setValues(values);

      return json_({ ok: true, appended: cleaned }, 200);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) }, 500);
  }
}

/**
 * 旧フォーマット(A1=isbn, A列にISBN)を
 * 新フォーマット(A列=通し番号, B列=ISBN)へ一度だけ整形する。
 */
function normalizeSheetFormat_(sheet) {
  var hA = String(sheet.getRange(1, 1).getValue() || '').trim().toLowerCase();
  var hB = String(sheet.getRange(1, 2).getValue() || '').trim().toLowerCase();

  // 新フォーマットなら何もしない
  if ((hA === 'no' || hA === 'id' || hA === '番号') && hB === 'isbn') return;

  // 旧フォーマット: A1=isbn, B列空
  if (hA === 'isbn' && !hB) {
    var lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      var aVals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var converted = [];
      for (var i = 0; i < aVals.length; i++) {
        var isbn = String(aVals[i][0] || '').replace(/[^0-9]/g, '');
        if (!isbn) continue;
        converted.push([i + 1, isbn]);
      }
      sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
      if (converted.length > 0) {
        sheet.getRange(2, 1, converted.length, 2).setValues(converted);
      }
    }
    sheet.getRange(1, 1).setValue('no');
    sheet.getRange(1, 2).setValue('isbn');
    return;
  }

  // 何も無いシートなどはヘッダだけ整える
  if (!hA && !hB) {
    sheet.getRange(1, 1).setValue('no');
    sheet.getRange(1, 2).setValue('isbn');
    return;
  }
}

function getNextSerial_(sheet, lastRow) {
  if (lastRow < 2) return 1;
  var nums = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var maxNo = 0;
  for (var i = 0; i < nums.length; i++) {
    var n = parseInt(String(nums[i][0] || ''), 10);
    if (!isNaN(n) && n > maxNo) maxNo = n;
  }
  return maxNo + 1;
}

function json_(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

