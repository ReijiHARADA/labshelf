export function normalizeIsbn(input: string): string {
  return input.replace(/[^0-9Xx]/g, '').toUpperCase();
}

function isValidIsbn13Digits(digits: string): boolean {
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

export function normalizeToIsbn13(input: string): string | null {
  const n = normalizeIsbn(input);
  const digitsOnly = n.replace(/X/g, '');
  if (digitsOnly.length !== 13) return null;
  if (!isValidIsbn13Digits(digitsOnly)) return null;
  if (!digitsOnly.startsWith('978') && !digitsOnly.startsWith('979')) return null;
  return digitsOnly;
}

