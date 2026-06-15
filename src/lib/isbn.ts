export type ScannedProductKind = 'isbn' | 'magazine-jan';

export type ScannedProductCode = {
  code: string;
  kind: ScannedProductKind;
};

export function normalizeIsbn(input: string): string {
  return input.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidEan13CheckDigit(digits: string): boolean {
  if (!/^\d{13}$/.test(digits)) return false;
  const sum = digits
    .slice(0, 12)
    .split('')
    .reduce((acc, ch, idx) => {
      const n = parseInt(ch, 10);
      return acc + n * (idx % 2 === 0 ? 1 : 3);
    }, 0);
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(digits[12], 10);
}

function isValidIsbn13Digits(digits: string): boolean {
  return isValidEan13CheckDigit(digits);
}

export function isMagazineJanCode(code: string): boolean {
  const digits = normalizeIsbn(code).replace(/X/g, '');
  return digits.length === 13 && digits.startsWith('491') && isValidEan13CheckDigit(digits);
}

export function normalizeScannedProductCode(input: string): ScannedProductCode | null {
  const digitsOnly = normalizeIsbn(input).replace(/X/g, '');
  if (digitsOnly.length !== 13 || !isValidEan13CheckDigit(digitsOnly)) return null;

  if (digitsOnly.startsWith('978') || digitsOnly.startsWith('979')) {
    return { code: digitsOnly, kind: 'isbn' };
  }
  if (digitsOnly.startsWith('491')) {
    return { code: digitsOnly, kind: 'magazine-jan' };
  }
  return null;
}

export function normalizeToIsbn13(input: string): string | null {
  const scanned = normalizeScannedProductCode(input);
  if (!scanned || scanned.kind !== 'isbn') return null;
  return scanned.code;
}
