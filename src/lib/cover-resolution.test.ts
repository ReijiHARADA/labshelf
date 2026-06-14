import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  compareCoverQuality,
  parseAmazonSizeHint,
  parseImageDimensions,
} from './amazon-cover.ts';

describe('cover-resolution', () => {
  it('Amazon URL からサイズヒントを読む', () => {
    assert.equal(
      parseAmazonSizeHint('https://m.media-amazon.com/images/I/x._AC_UL320_.jpg'),
      320
    );
    assert.equal(
      parseAmazonSizeHint('https://m.media-amazon.com/images/I/x._AC_SL1500_.jpg'),
      1500
    );
  });

  it('JPEG ヘッダから寸法を読む', () => {
    const jpeg = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x00, 0xf0, 0x03, 0x01, 0x21, 0x00,
    ]);
    const dims = parseImageDimensions(jpeg);
    assert.deepEqual(dims, { width: 240, height: 300 });
  });

  it('解像度をピクセル面積で比較する', () => {
    const low = { width: 320, height: 480, bytes: 1000 };
    const high = { width: 1000, height: 1500, bytes: 2000 };
    assert.ok(compareCoverQuality(high, low) > 0);
  });
});
