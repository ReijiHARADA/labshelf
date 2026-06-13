import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAmazonProductImageUrl,
  extractCoverFromProductHtml,
  extractFirstAsinFromSearchHtml,
  isbn13ToIsbn10,
  upgradeAmazonImageUrl,
} from './amazon-cover.ts';

describe('amazon-cover', () => {
  it('ISBN-13 を ISBN-10 に変換する', () => {
    assert.equal(isbn13ToIsbn10('9784822289125'), '4822289125');
    assert.equal(isbn13ToIsbn10('9791234567890'), null);
  });

  it('商品ページ HTML から hiRes 画像を抽出する', () => {
    const html = `
      <script>
        "colorImages": {
          "initial": [{
            "hiRes":"https://m.media-amazon.com/images/I/71abc._AC_SL500_.jpg"
          }]
        }
      </script>
    `;
    assert.equal(
      extractCoverFromProductHtml(html),
      'https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg'
    );
  });

  it('検索結果 HTML から ASIN を抽出する', () => {
    const html = `
      <div data-asin=""></div>
      <div data-asin="4822289120" class="s-result-item">
        <a href="/dp/4822289120">本</a>
      </div>
    `;
    assert.equal(extractFirstAsinFromSearchHtml(html), '4822289120');
  });

  it('Amazon 画像 URL を高解像度に正規化する', () => {
    assert.equal(
      upgradeAmazonImageUrl(
        'https://m.media-amazon.com/images/I/71abc._AC_UL320_.jpg'
      ),
      'https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg'
    );
    assert.equal(
      buildAmazonProductImageUrl('4822289120'),
      'https://m.media-amazon.com/images/P/4822289120.09._SL1500_.jpg'
    );
  });
});
