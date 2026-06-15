import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isMagazineJanCode,
  normalizeScannedProductCode,
  normalizeToIsbn13,
} from './isbn.ts';

describe('isbn', () => {
  it('ISBN-13 を受け付ける', () => {
    const scanned = normalizeScannedProductCode('978-4-87311-778-2');
    assert.deepEqual(scanned, {
      code: '9784873117782',
      kind: 'isbn',
    });
    assert.equal(normalizeToIsbn13('9784873117782'), '9784873117782');
  });

  it('雑誌JAN (491) を受け付ける', () => {
    const code = '4910180290466';
    assert.equal(isMagazineJanCode(code), true);
    assert.deepEqual(normalizeScannedProductCode(code), {
      code,
      kind: 'magazine-jan',
    });
    assert.equal(normalizeToIsbn13(code), null);
  });

  it('チェックデジットが不正なコードは拒否する', () => {
    assert.equal(normalizeScannedProductCode('4910180290460'), null);
    assert.equal(normalizeScannedProductCode('9784873117780'), null);
  });

  it('ISBN でも雑誌JAN でもない EAN-13 は拒否する', () => {
    assert.equal(normalizeScannedProductCode('4500000000000'), null);
  });
});
